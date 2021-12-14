import { UserAccount, reduceSpendingKey, UserState, Output } from '../libzeropool-rs';;
import { hash } from 'tweetnacl';

import { Transaction, TxFee } from './transaction';
import { CoinType } from './coin-type';
import { bufToHex, deriveEd25519 } from '@/utils';
import { ZeroPoolState } from '@/state';

export class Balance {
  public address: string;
  public balance: string;
}

export abstract class Coin {
  abstract getPrivateKey(account: number): string;
  abstract getPublicKey(account: number): string;
  abstract getAddress(account: number): string;

  public zpState: ZeroPoolState;
  protected mnemonic: string;
  protected worker: any;

  constructor(mnemonic: string, state: ZeroPoolState, worker: any) {
    this.mnemonic = mnemonic;
    this.worker = worker;
    this.zpState = state;
  }

  public generatePrivateAddress(): string {
    return this.zpState.account.generateAddress();
  }

  public isOwnPrivateAddress(address: string): boolean {
    return this.zpState.account.isOwnAddress(address);
  }

  public getPrivateSpendingKey(): Uint8Array {
    const path = CoinType.privateDerivationPath(this.getCoinType());
    const pair = deriveEd25519(path, this.mnemonic); // FIXME: Derive on BabyJubJub

    return reduceSpendingKey(pair.secretKey.slice(0, 32));
  }

  /**
   * Get native coin balance.
   */
  public abstract getBalance(account: number): Promise<string>;

  public getTokenBalance(account: number, /* tokenAddress: string */): Promise<string> {
    throw new Error('unimplemented');
  }

  /**
   * Get balances for specified number of accounts with offset.
   * @param numAccounts
   * @param offset
   */
  public async getBalances(numAccounts: number, offset: number = 0): Promise<Balance[]> {
    const promises: Promise<Balance>[] = [];

    for (let account = offset; account < offset + numAccounts; ++account) {
      const promise = this.getBalance(account)
        .catch(_err => '0') // TODO: Log errors
        .then((balance) => ({
          address: this.getAddress(account),
          balance,
        }));

      promises.push(promise);
    }

    return Promise.all(promises);
  }

  /**
   * Transfer native coin.
   * @param to destination address
   * @param amount as base unit
   */
  abstract transfer(account: number, to: string, amount: string): Promise<void>;

  public mint(account: number, amount: string): Promise<void> {
    throw new Error('unimplemented');
  }

  // TODO: Extract private tx methods into a separate class
  public transferPublicToPrivate(account: number, outputs: Output[]): Promise<void> {
    throw new Error('unimplemented');
  }

  public transferPrivateToPrivate(account: number, outputs: Output[]): Promise<void> {
    throw new Error('unimplemented');
  }

  public depositPrivate(account: number, amount: string): Promise<void> {
    throw new Error('unimplemented');
  }

  public mergePrivate(): Promise<void> {
    throw new Error('unimplemented');
  }

  public withdrawPrivate(account: number, amount: string): Promise<void> {
    throw new Error('unimplemented');
  }

  /**
   * Get current total private balance (account + unspent notes).
   */
  public getPrivateBalance(): string {
    throw new Error('unimplemented');
  }

  /**
 * Get total, account, and note balances.
 */
  public getPrivateBalances(): [string, string, string] {
    throw new Error('unimplemented');
  }

  public updatePrivateState(): Promise<void> {
    throw new Error('unimplemented');
  }

  /**
   * Fetch account transactions.
   */
  public abstract getTransactions(account: number, limit?: number, offset?: number): Promise<Transaction[]>;

  /**
   * Convert human-readable representation of coin to smallest non-divisible (base) representation.
   * @param amount
   */
  public abstract toBaseUnit(amount: string): string;

  /**
  * Convert coin represented with smallest non-divisible units to a human-readable representation.
  * @param amount
  */
  public abstract fromBaseUnit(amount: string): string;

  /**
   * Get estimated transaction fee.
   */
  public abstract estimateTxFee(): Promise<TxFee>;

  public abstract getCoinType(): CoinType;

  public async getNotes(): Promise<[string]> {
    throw new Error('unimplemented');
  }

  public free(): void { }
}
