import BN from 'bn.js';

import { DEFAULT_FUNCTION_CALL_GAS } from 'near-api-js';
import { formatNearAmount, parseNearAmount } from 'near-api-js/lib/utils/format';
// import { KeyStore, InMemoryKeyStore, BrowserLocalStorageKeyStore } from 'near-api-js/lib/key_stores';
import { JsonRpcProvider } from 'near-api-js/lib/providers';
import { connect, ConnectConfig, Contract, Near, WalletConnection } from 'near-api-js';

import { Client } from '../client';
import { TxFee } from '../transaction';

export { ConnectConfig };

export class NearClient extends Client {
  // private keyStore: KeyStore;
  private config: ConnectConfig;
  private rpc: JsonRpcProvider;
  private near: Near;
  private wallet: WalletConnection;
  private poolContract: Contract;

  public static async create(config: ConnectConfig, poolAddress: string): Promise<NearClient> {
    let self = new NearClient();
    // self.keyStore = new BrowserLocalStorageKeyStore();
    self.near = await connect(config);
    self.wallet = new WalletConnection(self.near, 'zeropool');
    self.config = config;
    self.poolContract = new Contract(self.wallet.account(), poolAddress!, {
      changeMethods: ['lock', 'release'],
      viewMethods: [],
    });

    // self.wallet.requestSignIn(
    //   "example-contract.testnet", // contract requesting access
    //   "ZeroPool client", // optional title
    // );

    return self;
  }

  public async approve(_tokenAddress: string, _spender: string, amount: string): Promise<void> {
    // @ts-ignore
    await this.poolContract.lock({
      amount: amount
    }, DEFAULT_FUNCTION_CALL_GAS, amount);
  }

  public async getAddress(): Promise<string> {
    return this.wallet.getAccountId();
  }

  public async getBalance(): Promise<string> {
    const balance = await this.wallet.account().getAccountBalance();

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
    await this.wallet.account().sendMoney(to, new BN(amount));
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
}
