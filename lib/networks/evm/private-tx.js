"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flattenSnarkProof = exports.parseHashes = exports.EthPrivateTransaction = exports.txTypeToString = exports.TxType = exports.InvalidNumberOfOutputs = void 0;
const libzeropool_rs_1 = require("../../libzeropool-rs");
const utils_1 = require("../../utils");
const utils_2 = require("./utils");
// Sizes in bytes
const MEMO_META_SIZE = 8; // fee (u64)
const MEMO_META_WITHDRAW_SIZE = 8 + 8 + 20; // fee (u64) + amount + address (u160)
class InvalidNumberOfOutputs extends Error {
    constructor(numOutputs) {
        super(`Invalid transaction: invalid number of outputs ${numOutputs}`);
        this.numOutputs = numOutputs;
    }
}
exports.InvalidNumberOfOutputs = InvalidNumberOfOutputs;
var TxType;
(function (TxType) {
    TxType["Deposit"] = "0000";
    TxType["Transfer"] = "0001";
    TxType["Withdraw"] = "0002";
})(TxType = exports.TxType || (exports.TxType = {}));
function txTypeToString(txType) {
    switch (txType) {
        case TxType.Deposit: return 'deposit';
        case TxType.Transfer: return 'transfer';
        case TxType.Withdraw: return 'withdraw';
    }
}
exports.txTypeToString = txTypeToString;
class EthPrivateTransaction {
    static async fromData(txData, txType, acc, snarkParams, web3, worker) {
        const tx = new EthPrivateTransaction();
        const nextIndex = acc.nextTreeIndex();
        let curIndex = nextIndex - BigInt(utils_2.CONSTANTS.OUT + 1);
        if (curIndex < BigInt(0)) {
            curIndex = BigInt(0);
        }
        const prevCommitmentIndex = curIndex / BigInt(2 ** utils_2.CONSTANTS.OUTLOG);
        const nextCommitmentIndex = acc.nextTreeIndex() / BigInt(2 ** utils_2.CONSTANTS.OUTLOG);
        const proofFilled = acc.getCommitmentMerkleProof(prevCommitmentIndex);
        const proofFree = acc.getCommitmentMerkleProof(nextCommitmentIndex);
        const prevLeaf = acc.getMerkleNode(utils_2.CONSTANTS.OUTLOG, prevCommitmentIndex);
        const rootBefore = acc.getRoot();
        const rootAfter = acc.getMerkleRootAfterCommitment(nextCommitmentIndex, txData.commitment_root);
        // TODO: If not using worker
        // const txProof = Proof.tx(snarkParams.transferParams, txData.public, txData.secret);
        // const treeProof = Proof.tree(snarkParams.treeParams, {
        //   root_before: rootBefore,
        //   root_after: rootAfter,
        //   leaf: txData.commitment_root,
        // }, {
        //   proof_filled: proofFilled,
        //   proof_free: proofFree,
        //   prev_leaf: prevLeaf,
        // });
        const txProof = await worker.proveTx(txData.public, txData.secret);
        const treeProof = await worker.proveTree({
            root_before: rootBefore,
            root_after: rootAfter,
            leaf: txData.commitment_root,
        }, {
            proof_filled: proofFilled,
            proof_free: proofFree,
            prev_leaf: prevLeaf,
        });
        const txValid = libzeropool_rs_1.Proof.verify(snarkParams.transferVk, txProof.inputs, txProof.proof);
        if (!txValid) {
            throw new Error('invalid tx proof');
        }
        const treeValid = libzeropool_rs_1.Proof.verify(snarkParams.treeVk, treeProof.inputs, treeProof.proof);
        if (!treeValid) {
            throw new Error('invalid tree proof');
        }
        tx.selector = web3.eth.abi.encodeFunctionSignature('transact()').slice(2);
        tx.nullifier = BigInt(txData.public.nullifier);
        tx.outCommit = BigInt(txData.public.out_commit);
        tx.transferIndex = BigInt(txData.parsed_delta.index);
        tx.energyAmount = BigInt(txData.parsed_delta.e);
        tx.tokenAmount = BigInt(txData.parsed_delta.v);
        tx.transactProof = flattenSnarkProof(txProof.proof);
        tx.rootAfter = BigInt(rootAfter);
        tx.treeProof = flattenSnarkProof(treeProof.proof);
        tx.txType = txType;
        tx.memo = txData.memo;
        return tx;
    }
    get ciphertext() {
        if (this.txType === TxType.Withdraw) {
            return this.memo.slice(MEMO_META_WITHDRAW_SIZE * 2);
        }
        return this.memo.slice(MEMO_META_SIZE * 2);
    }
    get hashes() {
        const ciphertext = this.ciphertext;
        return parseHashes(ciphertext);
    }
    /**
     * Returns encoded transaction ready to use as data for the smart contract.
     */
    encode() {
        const writer = new utils_1.HexStringWriter();
        writer.writeHex(this.selector);
        writer.writeBigInt(this.nullifier, 32);
        writer.writeBigInt(this.outCommit, 32);
        writer.writeBigInt(this.transferIndex, 6);
        writer.writeBigInt(this.energyAmount, 14);
        writer.writeBigInt(this.tokenAmount, 8);
        writer.writeBigIntArray(this.transactProof, 32);
        writer.writeBigInt(this.rootAfter, 32);
        writer.writeBigIntArray(this.treeProof, 32);
        writer.writeHex(this.txType.toString());
        writer.writeNumber(this.memo.length / 2, 2);
        writer.writeHex(this.memo);
        return writer.toString();
    }
    static decode(data) {
        let tx = new EthPrivateTransaction();
        let reader = new utils_1.HexStringReader(data);
        tx.selector = reader.readHex(4);
        assertNotNull(tx.selector);
        tx.nullifier = reader.readBigInt(32);
        assertNotNull(tx.nullifier);
        tx.outCommit = reader.readBigInt(32);
        assertNotNull(tx.outCommit);
        tx.transferIndex = reader.readBigInt(6);
        assertNotNull(tx.transferIndex);
        tx.energyAmount = reader.readBigInt(14);
        assertNotNull(tx.energyAmount);
        tx.tokenAmount = reader.readBigInt(8);
        assertNotNull(tx.tokenAmount);
        tx.transactProof = reader.readBigIntArray(8, 32);
        tx.rootAfter = reader.readBigInt(32);
        assertNotNull(tx.rootAfter);
        tx.treeProof = reader.readBigIntArray(8, 32);
        tx.txType = reader.readHex(2);
        assertNotNull(tx.txType);
        const memoSize = reader.readNumber(2);
        assertNotNull(memoSize);
        tx.memo = reader.readHex(memoSize);
        assertNotNull(tx.memo);
        return tx;
    }
}
exports.EthPrivateTransaction = EthPrivateTransaction;
function parseHashes(ciphertext) {
    const reader = new utils_1.HexStringReader(ciphertext);
    let numItems = reader.readNumber(4, true);
    if (!numItems || numItems > utils_2.CONSTANTS.OUT + 1) {
        throw new InvalidNumberOfOutputs(numItems);
    }
    const hashes = reader.readBigIntArray(numItems, 32, true).map(num => num.toString());
    return hashes;
}
exports.parseHashes = parseHashes;
function flattenSnarkProof(p) {
    return [p.a, p.b.flat(), p.c].flat().map(n => {
        return BigInt(n);
    });
}
exports.flattenSnarkProof = flattenSnarkProof;
function assertNotNull(val) {
    if (val === undefined || val === null) {
        throw new Error('Unexpected null');
    }
}
//# sourceMappingURL=private-tx.js.map