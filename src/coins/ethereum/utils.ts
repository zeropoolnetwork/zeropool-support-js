import { Transaction, TxStatus } from '../transaction';
import { Transaction as NativeTx } from 'web3-core';

export function convertTransaction(tx: NativeTx, timestamp: number, customStatus?: TxStatus): Transaction {
  return {
    status: customStatus || TxStatus.Completed,
    amount: tx.value,
    from: tx.from,
    to: tx.to || '',
    timestamp: timestamp,
    blockHash: tx.blockHash || '',
    hash: tx.hash,
  };
}

export function toCompactSignature(signature: string) {
  let v = signature.substr(130, 2);
  if (v == "1c") {
    return `${signature.slice(0, 66)}${(parseInt(signature[66], 16) | 8).toString(16)}${signature.slice(67, 130)}`;
  } else if (v != "1b") {
    throw ("invalid signature: v should be 27 or 28");
  }

  return signature.slice(0, 130);
}

export function toCanonicalSignature(signature) {
  let v = "1c";
  if (parseInt(signature[66], 16) > 7) {
    v = "1e";
  }
  return signature + v;
}
