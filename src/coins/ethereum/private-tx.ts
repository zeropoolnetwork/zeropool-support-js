import { TransactionData, Proof, Params, SnarkProof, TreePub, TreeSec, UserAccount } from 'libzeropool-rs-wasm-bundler';
import Web3 from 'web3';
import { Sign } from 'web3-core';
import { SignatureObject } from 'web3-eth-accounts';

import { base64ToHex } from '../../utils';

// Sizes in bytes
const MEMO_META_SIZE: number = 8;

export enum TxType {
  Deposit = '00',
  Transfer = '01',
  Withdraw = '02',
}

export class EthPrivateTransaction {
  /** Hex encoded smart contract method id */
  public selector: string;
  public nullifier: bigint;
  public outCommit: bigint;
  public transferIndex: bigint;
  public energyAmount: bigint;
  public tokenAmount: bigint;
  public transactProof: bigint[];
  public rootAfter: bigint;
  public treeProof: bigint[];
  public txType: TxType;
  public memoSize: number;
  public memo: string;

  static fromData(txData: TransactionData, txType: TxType, acc: UserAccount, transferParams: Params, treeParams: Params, web3: Web3): EthPrivateTransaction {
    const tx = new EthPrivateTransaction();

    let curIndex = acc.nextTreeIndex() as bigint - BigInt(1);
    if (curIndex < BigInt(0)) {
      curIndex = BigInt(0);
    }

    const commitmentProofBefore = acc.getCommitmentMerkleProof(curIndex);
    const commitmentProofAfter = acc.getCommitmentMerkleProof(curIndex + BigInt(1));

    const prevLeaf = acc.getLastLeaf();
    const proofBefore = acc.getMerkleProof(curIndex);
    const proofAfter = acc.getMerkleProofAfter(txData.out_hashes)[txData.out_hashes.length - 1];

    const rootBefore = proofBefore?.sibling[proofBefore.sibling.length - 1]!;
    const rootAfter = proofAfter?.sibling[proofAfter.sibling.length - 1]!;

    const txProof = Proof.tx(transferParams, txData.public, txData.secret);
    const treeProof = Proof.tree(treeParams, {
      root_before: rootBefore,
      root_after: rootAfter,
      leaf: txData.commitment_root,
    }, {
      proof_filled: commitmentProofBefore,
      proof_free: commitmentProofAfter,
      prev_leaf: prevLeaf,
    });

    tx.selector = web3.eth.abi.encodeFunctionSignature('transact()').slice(2);
    tx.nullifier = BigInt(txData.public.nullifier);
    tx.outCommit = BigInt(txData.public.out_commit);

    tx.transferIndex = BigInt(txData.parsed_delta.index);
    tx.energyAmount = BigInt(txData.parsed_delta.e);
    tx.tokenAmount = BigInt(txData.parsed_delta.v);

    tx.transactProof = formatSnarkProof(txProof.proof);
    tx.rootAfter = BigInt(rootAfter);
    tx.treeProof = formatSnarkProof(treeProof.proof);
    tx.txType = txType;

    tx.memo = txData.memo;

    return tx;
  }

  get ciphertext(): string {
    return this.memo.slice(MEMO_META_SIZE * 2);
  }

  /**
   * Returns encoded transaction ready to use as data for the smart contract.
   */
  encode(): string {
    const writer = new HexStringWriter();

    writer.writeHex(this.selector);
    writer.writeBigInt(this.nullifier, 32);
    writer.writeBigInt(this.outCommit, 32);
    writer.writeBigInt(this.transferIndex, 6);
    writer.writeBigInt(this.energyAmount, 8);
    writer.writeBigInt(this.tokenAmount, 8);
    writer.writeBigIntArray(this.transactProof, 32);
    writer.writeBigInt(this.rootAfter, 32);
    writer.writeBigIntArray(this.treeProof, 32);
    writer.writeHex(this.txType.toString());
    writer.writeNumber(this.memo.length / 2, 1);
    writer.writeHex(this.memo);

    return writer.toString();
  }

  static decode(data: string): EthPrivateTransaction {
    let tx = new EthPrivateTransaction();
    let reader = new HexStringReader(data);

    tx.selector = reader.readHex(4);
    tx.nullifier = reader.readBigInt(32);
    tx.outCommit = reader.readBigInt(32);
    tx.transferIndex = reader.readBigInt(6);
    tx.energyAmount = reader.readBigInt(8);
    tx.tokenAmount = reader.readBigInt(8);
    tx.transactProof = reader.readBigIntArray(8, 32);
    tx.rootAfter = reader.readBigInt(32);
    tx.treeProof = reader.readBigIntArray(8, 32);
    tx.txType = reader.readHex(1) as TxType;
    const memoSize = reader.readNumber(2);
    tx.memo = reader.readHex(memoSize);

    return tx;
  }
}

function formatSnarkProof(proof: SnarkProof): bigint[] {
  const a = proof.a.map(num => BigInt(num));
  const b = proof.b.flat().map(num => BigInt(num));
  const c = proof.c.map(num => BigInt(num));

  return [...a, ...b, ...c];
}

// TODO: Use borsh for serialization?
class HexStringWriter {
  buf: string;

  constructor() {
    this.buf = '0x';
  }

  toString() {
    return this.buf;
  }

  writeHex(hex: string) {
    this.buf += hex;
  }

  writeBigInt(num: bigint, numBytes: number) {
    this.buf += num.toString(16).slice(-numBytes * 2).padStart(numBytes * 2, '0');
  }

  writeBigIntArray(nums: bigint[], numBytes: number) {
    for (let num of nums) {
      this.writeBigInt(num, numBytes);
    }
  }

  writeNumber(num: number, numBytes: number) {
    this.buf += num.toString(16).slice(-numBytes * 2).padStart(numBytes * 2, '0');
  }
}

class HexStringReader {
  data: string;
  curIndex: number;

  constructor(data: string) {
    if (data.slice(0, 2) == '0x') {
      data = data.slice(2);
    }

    this.data = data;
    this.curIndex = 0;
  }

  readHex(numBytes: number): string {
    const sliceEnd = this.curIndex + numBytes * 2;
    const res = this.data.slice(this.curIndex, sliceEnd);
    this.curIndex = sliceEnd;
    return res;
  }

  readNumber(numBytes: number): number {
    const hex = this.readHex(numBytes);
    return parseInt(hex, 16);
  }

  readBigInt(numBytes: number): bigint {
    const hex = this.readHex(numBytes);
    return BigInt('0x' + hex);
  }

  readBigIntArray(numElements: number, numBytesPerElement: number): bigint[] {
    return [...Array(numElements)]
      .map(() => this.readBigInt(numBytesPerElement));
  }
}
