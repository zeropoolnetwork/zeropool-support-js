import BN from 'bn.js';
import { connect, ConnectConfig, Contract, Near, Account, DEFAULT_FUNCTION_CALL_GAS, KeyPair } from 'near-api-js';
import { formatNearAmount, parseNearAmount } from 'near-api-js/lib/utils/format';
import { InMemoryKeyStore } from 'near-api-js/lib/key_stores';
import { JsonRpcProvider } from 'near-api-js/lib/providers';
import { parseSeedPhrase } from 'near-seed-phrase';
import { Buffer } from 'buffer';
import bs58 from 'bs58';

import { Client } from '../client';
import { TxFee } from '../transaction';

export { ConnectConfig };

export class NearClient extends Client {
  private config: ConnectConfig;
  private rpc: JsonRpcProvider;
  private near: Near;
  private poolContract: Contract;
  private account: Account;

  public static async create(config: ConnectConfig, poolAddress: string, seedPhrase: string, accountId?: string): Promise<NearClient> {
    let self = new NearClient();
    config.keyStore = config.keyStore || new InMemoryKeyStore();
    const { secretKey, publicKey } = parseSeedPhrase(seedPhrase);

    let address = accountId!;
    if (!address) {
      address = bs58.decode(publicKey.split('ed25519:')[1]).toString('hex');
    }

    const keyPair = KeyPair.fromString(secretKey);
    await config.keyStore.setKey(config.networkId, address, keyPair);

    self.near = await connect(config);
    self.config = config;
    self.account = await self.near.account(address);

    if (accountId) {
      const res = await self.near.connection.provider.query({
        request_type: 'view_access_key_list',
        finality: 'final',
        account_id: address,
      }) as any;

      let key = res.keys.find((key: any) => key.public_key === publicKey);

      if (!key) {
        throw new Error('Seed phrase is not associated with the account ID');
      }
    }

    self.poolContract = new Contract(self.account, poolAddress, {
      changeMethods: ['lock', 'release'],
      viewMethods: ['account_locks'],
    });

    return self;
  }

  public async approve(_tokenAddress: string, _spender: string, amount: string): Promise<number | null> {
    type Lock = {
      nonce: number,
      amount: string,
      timestamp: string,
    };

    // @ts-ignore
    const locks: Lock[] = await this.poolContract.account_locks({ account_id: this.account.accountId });
    console.log('Existing locks:', locks);
    const foundLock = locks.find(lock => lock.amount === amount);

    if (foundLock) {
      console.log('Lock found. No need to approve.', foundLock);
      return foundLock.nonce;
    } else {
      // @ts-ignore
      return await this.poolContract.lock({
        amount: amount
      }, DEFAULT_FUNCTION_CALL_GAS, amount);
    }
  }

  public async getAddress(): Promise<string> {
    return this.account.accountId;
  }

  public async getBalance(): Promise<string> {
    try {
      return (await this.account.getAccountBalance()).available;
    } catch (err) {
      console.log('Failed to get balance', err);
      return '0';
    }
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
    const dataArray = Buffer.from(data, 'hex');
    const sign = await this.account.connection.signer.signMessage(dataArray, this.account.accountId, this.config.networkId);
    return Buffer.from(sign.signature).toString('hex');
  }

  public transferToken(tokenAddress: string, to: string, amount: string): Promise<void> {
    if (tokenAddress) {
      return this.transfer(to, amount);
    } else {
      throw new Error('FT transfers are not supported yet');
    }
  }

  public getTransactionUrl(hash: string): string {
    return 'https://explorer.testnet.near.org/transactions/' + hash; // FIXME: Make it configurable
  }
}
