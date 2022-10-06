import BN from 'bn.js';

import { Account, DEFAULT_FUNCTION_CALL_GAS, KeyPair } from 'near-api-js';
import { formatNearAmount, parseNearAmount } from 'near-api-js/lib/utils/format';
import { InMemoryKeyStore } from 'near-api-js/lib/key_stores';
import { JsonRpcProvider } from 'near-api-js/lib/providers';
import { connect, ConnectConfig, Contract, Near } from 'near-api-js';
import { parseSeedPhrase } from 'near-seed-phrase';
import { Buffer } from 'buffer';

import { Client } from '../client';
import { TxFee } from '../transaction';

export { ConnectConfig };

export class NearClient extends Client {
  private config: ConnectConfig;
  private rpc: JsonRpcProvider;
  private near: Near;
  private poolContract: Contract;
  private account: Account;

  public static async create(config: ConnectConfig, poolAddress: string, accountId: string, seedPhrase: string): Promise<NearClient> {
    let self = new NearClient();
    config.keyStore = config.keyStore || new InMemoryKeyStore();
    const { secretKey } = parseSeedPhrase(seedPhrase);
    const keyPair = KeyPair.fromString(secretKey);
    await config.keyStore.setKey(config.networkId, accountId, keyPair);

    self.near = await connect(config);
    self.config = config;
    self.account = await self.near.account(accountId);

    self.poolContract = new Contract(self.account, poolAddress, {
      changeMethods: ['lock', 'release', 'account_locks'],
      viewMethods: [],
    });

    return self;
  }

  public async approve(_tokenAddress: string, _spender: string, amount: string): Promise<number | null> {
    // @ts-ignore
    const locks: { nonce: number, amount: string, timestamp: string }[] = await this.poolContract.account_locks({ account_id: this.account.accountId });
    const lock = locks.find(lock => lock.amount === amount);

    if (lock) {
      console.log('Lock found. No need to approve.', lock);
      return lock.nonce;
    }

    // @ts-ignore
    return await this.poolContract.lock({
      amount: amount
    }, DEFAULT_FUNCTION_CALL_GAS, amount);
  }

  public async getAddress(): Promise<string> {
    return this.account.accountId;
  }

  public async getBalance(): Promise<string> {
    const balance = await this.account.getAccountBalance();

    return balance.available;
  }

  public async getTokenBalance(_tokenAddress: string): Promise<string> {
    // FIXME: change to token balance once the frontend starts to support tokens
    return await this.getBalance();
  }

  /**
   * @param to
   * @param amount in yoctoNEAR
   */
  public async transfer(to: string, amount: string): Promise<void> {
    await this.account.sendMoney(to, new BN(amount));
  }

  /**
   * Convert human-readable NEAR to yoctoNEAR
   **/
  public toBaseUnit(amount: string): string {
    return parseNearAmount(amount)!;
  }

  /**
  * Convert yoctoNEAR to human-readable NEAR
  **/
  public fromBaseUnit(amount: string): string {
    return formatNearAmount(amount);
  }

  public async estimateTxFee(): Promise<TxFee> {
    const status = await this.near.connection.provider.status();
    const latestBlock = status.sync_info.latest_block_hash;

    const res = await this.rpc.gasPrice(latestBlock);

    const gasPrice = new BN(res.gas_price);
    const gas = new BN('30000000000000');
    const fee = gas.mul(gasPrice).toString();
    const feeFormatted = formatNearAmount(fee);

    return {
      gas: gas.toString(),
      gasPrice: gasPrice.toString(),
      fee: feeFormatted,
    };
  }

  public async sign(data: string): Promise<string> {
    if (data.slice(0, 2) == '0x') {
      data = data.slice(2);
    }
    const dataArray = new Uint8Array(Buffer.from(data, 'hex'));
    const sign = await this.account.connection.signer.signMessage(dataArray, this.account.accountId, this.config.networkId);
    return Buffer.from(sign.signature).toString('hex');
  }
}
