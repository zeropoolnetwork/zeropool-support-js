import { nodeInteraction, broadcast, transfer, invokeScript } from "@waves/waves-transactions";
import { signBytes, base58Decode } from '@waves/ts-lib-crypto'
import { Seed } from "@waves/waves-transactions/dist/seedUtils";

import { Client } from '../client';
import { TxFee } from '../transaction';
import { Config } from './config';

export class WavesClient extends Client {
  private config: Config;
  private account: Seed;
  private poolAddress: string;

  constructor(poolAddress: string, mnemonic: string, config: Config) {
    super();
    this.config = config;
    this.account = new Seed(mnemonic, config.chainId);
    this.poolAddress = poolAddress;
  }

  public async getAddress(): Promise<string> {
    return this.account.address;
  }

  public async getBalance(): Promise<string> {
    const balance = await nodeInteraction.balance(await this.getAddress(), this.config.nodeUrl);
    return balance.toString();
  }

  public async transfer(to: string, amount: string): Promise<void> {
    const txParams = {
      recipient: to,
      amount,
    }

    const transferTx = transfer(txParams, this.account.keyPair);
    await broadcast(transferTx, this.config.nodeUrl);
  }

  public async transferToken(tokenAddress: string, to: string, amount: string): Promise<void> {
    const txParams = {
      recipient: to,
      amount,
      assetId: tokenAddress,
    }

    const transferTx = transfer(txParams, this.account.keyPair);
    await broadcast(transferTx, this.config.nodeUrl);
  }

  public async approve(tokenAddress: string, spender: string, amount: string): Promise<number | null> {
    await broadcast(invokeScript({
      dApp: this.poolAddress,
      call: {
        function: 'deposit'
      },
      payment: [{
        assetId: tokenAddress,
        amount
      }],
    }, this.account.keyPair), this.config.nodeUrl);

    return null;
  }


  public getTransactionUrl(hash: string): string {
    return `https://wavesexplorer.com/transactions/${hash}?network=${this.config.chainId}}`;
  }

  public toBaseUnit(amount: string): string {
    return (parseFloat(amount) * 10000000).toString();
  }

  public fromBaseUnit(amount: string): string {
    return (parseInt(amount) / 10000000).toString();
  }

  // TODO: Estimate fee for private transactions
  public async estimateTxFee(): Promise<TxFee> {
    return {
      gas: '1',
      gasPrice: '100000',
      fee: '100000',
    };
  }

  public async sign(data: string): Promise<string> {
    if (data.slice(0, 2) == '0x') {
      data = data.slice(2);
    }
    const dataArray = Buffer.from(data, 'hex');
    const signature = signBytes(this.account.keyPair, dataArray);
    return Buffer.from(base58Decode(signature)).toString('hex');
  }
}
