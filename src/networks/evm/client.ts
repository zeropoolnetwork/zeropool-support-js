import BN from 'bn.js';
import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import { Contract } from 'web3-eth-contract';
import { provider } from 'web3-core';
import { TransactionConfig } from 'web3-core';

import ddAbi from './delegated-deposit-storage.json';

import {
  delay,
  fetchFundTransactions,
  fetchTokenTransactions,
} from './etherscan.api';
import { convertTransaction } from './utils';
import { TxFee, TxStatus } from '../../networks/transaction';
import { Client } from '../../networks/client';
import tokenAbi from './token-abi.json';

export interface Config {
  transactionUrl: string;
  ddStorageAddress: string;
}
export class EthereumClient extends Client {
  private web3: Web3;
  private token: Contract;
  private ddStorage: Contract;

  constructor(
    provider: provider,
    config: Config = { transactionUrl: '{{hash}}', ddStorageAddress: '' }
  ) {
    super();
    this.web3 = new Web3(provider);
    this.token = new this.web3.eth.Contract(tokenAbi as AbiItem[]) as Contract;
    this.ddStorage = new this.web3.eth.Contract(ddAbi as AbiItem[], config.ddStorageAddress) as Contract;
    this.transactionUrl = config.transactionUrl;
  }

  public async getAddress(): Promise<string> {
    return (await this.web3.eth.getAccounts())[0];
  }

  public async getBalance(): Promise<string> {
    const address = await this.getAddress();
    const balance = await this.web3.eth.getBalance(address);

    return balance;
  }

  public async getTokenBalance(tokenAddress: string): Promise<string> {
    const address = await this.getAddress();
    this.token.options.address = tokenAddress; // TODO: Is it possible to pass the contract address to the `call` method?
    const balance = this.token.methods.balanceOf(address).call();

    return balance;
  }

  public async getAllHistory(
    tokenAddress: string,
    apiKey?: string
  ): Promise<any[]> {
    const address = await this.getAddress();
    const fundTransactions = await fetchFundTransactions(address, apiKey);

    await delay(apiKey ? 0 : 5000);

    const tokenTransactions = await fetchTokenTransactions(
      address,
      tokenAddress,
      apiKey
    );

    return fundTransactions.concat(tokenTransactions);
  }

  public async transferToken(
    tokenAddress: string,
    to: string,
    amount: string
  ): Promise<void> {
    const from = await this.getAddress();
    const nonce = await this.web3.eth.getTransactionCount(from);

    this.token.options.address = tokenAddress;
    const gas = await this.token.methods
      .transfer(to, amount)
      .estimateGas({ from });
    const gasPrice = await this.web3.eth.getGasPrice();

    const data = this.token.methods.transfer(to, amount).encodeABI();
    const raw = {
      nonce,
      gas,
      gasPrice,
      from,
      to: tokenAddress,
      value: 0,
      data,
    };

    const signed = await this.web3.eth.signTransaction(raw);
    const receipt = await this.web3.eth.sendSignedTransaction(signed.raw);
    const block = await this.web3.eth.getBlock(receipt.blockNumber);

    let timestamp;
    if (typeof block.timestamp == 'string') {
      timestamp = parseInt(block.timestamp);
    } else {
      timestamp = block.timestamp;
    }

    let status = TxStatus.Completed;
    if (!receipt.status) {
      status = TxStatus.Error;
    }

    const nativeTx = await this.web3.eth.getTransaction(
      receipt.transactionHash
    );
    convertTransaction(nativeTx, timestamp, status);
  }

  public async transfer(to: string, amount: string): Promise<void> {
    const from = await this.getAddress();
    const nonce = await this.web3.eth.getTransactionCount(from);
    const gas = await this.web3.eth.estimateGas({ from, to, value: amount });
    const gasPrice = await this.web3.eth.getGasPrice();
    const signed = await this.web3.eth.signTransaction({
      from,
      to,
      value: amount,
      nonce,
      gas,
      gasPrice,
    });

    const receipt = await this.web3.eth.sendSignedTransaction(signed.raw);
    const block = await this.web3.eth.getBlock(receipt.blockNumber);

    let timestamp;
    if (typeof block.timestamp == 'string') {
      timestamp = parseInt(block.timestamp);
    } else {
      timestamp = block.timestamp;
    }

    let status = TxStatus.Completed;
    if (!receipt.status) {
      status = TxStatus.Error;
    }

    const nativeTx = await this.web3.eth.getTransaction(
      receipt.transactionHash
    );
    convertTransaction(nativeTx, timestamp, status);
  }

  public async depositDelegated(_tokenAddress: string, receiverD: Uint8Array, receiverP: Uint8Array, amount: string, fee: string = '0'): Promise<void> {
    const from = await this.getAddress();
    const nonce = await this.web3.eth.getTransactionCount(from);

    // bytes10 receiver_d, bytes32 receiver_p, uint256 amount, uint256 fee
    const receiverDHex = '0x' + Buffer.from(receiverD.slice(0, 10)).toString('hex');
    const receiverPHex = '0x' + Buffer.from(receiverP).toString('hex');
    const gas = await this.ddStorage.methods
      .deposit(receiverDHex, receiverPHex, amount, fee)
      .estimateGas({ from });
    const gasPrice = await this.web3.eth.getGasPrice();

    const data = this.ddStorage.methods.deposit(receiverDHex, receiverPHex, amount, fee).encodeABI();
    const raw = {
      nonce,
      gas,
      gasPrice,
      from,
      to: this.ddStorage.options.address,
      value: 0,
      data,
    };

    const signed = await this.web3.eth.signTransaction(raw);
    const receipt = await this.web3.eth.sendSignedTransaction(signed.raw);
    const block = await this.web3.eth.getBlock(receipt.blockNumber);

    let timestamp;
    if (typeof block.timestamp == 'string') {
      timestamp = parseInt(block.timestamp);
    } else {
      timestamp = block.timestamp;
    }

    let status = TxStatus.Completed;
    if (!receipt.status) {
      status = TxStatus.Error;
    }

    const nativeTx = await this.web3.eth.getTransaction(
      receipt.transactionHash
    );
    convertTransaction(nativeTx, timestamp, status);
  }

  /**
   * Converts ether to Wei.
   * @param amount in Ether
   */
  public toBaseUnit(amount: string): string {
    return this.web3.utils.toWei(amount, 'ether');
  }

  /**
   * Converts Wei to ether.
   * @param amount in Wei
   */
  public fromBaseUnit(amount: string): string {
    return this.web3.utils.fromWei(amount, 'ether');
  }

  public async estimateTxFee(): Promise<TxFee> {
    const address = await this.getAddress();
    const gas = await this.web3.eth.estimateGas({
      from: address,
      to: address,
      value: this.toBaseUnit('1'),
    });
    const gasPrice = await this.web3.eth.getGasPrice();
    const fee = new BN(gas).mul(new BN(gasPrice));

    return {
      gas: gas.toString(),
      gasPrice,
      fee: this.fromBaseUnit(fee.toString()),
    };
  }

  public async mint(tokenAddress: string, amount: string): Promise<void> {
    const address = await this.getAddress();
    this.token.options.address = tokenAddress;
    const encodedTx = await this.token.methods
      .mint(address, BigInt(amount))
      .encodeABI();
    var txObject: TransactionConfig = {
      from: address,
      to: tokenAddress,
      data: encodedTx,
    };

    const gas = await this.web3.eth.estimateGas(txObject);
    const gasPrice = BigInt(await this.web3.eth.getGasPrice());
    const nonce = await this.web3.eth.getTransactionCount(address);
    txObject.gas = gas;
    txObject.gasPrice = `0x${gasPrice.toString(16)}`;
    txObject.nonce = nonce;

    const signedTx = await this.web3.eth.signTransaction(txObject);
    await this.web3.eth.sendSignedTransaction(signedTx.raw);
  }

  public async approve(
    tokenAddress: string,
    spender: string,
    amount: string,
  ): Promise<number | null> {
    const MAX_AMOUNT =
      '115792089237316195423570985008687907853269984665640564039457584007913129639935';

    const address = await this.getAddress();
    this.token.options.address = tokenAddress;
    const curAllowance = await this.token.methods
      .allowance(address, spender)
      .call();

    if (BigInt(amount) <= BigInt(curAllowance)) {
      console.log(
        `No need to approve allowance. Current: ${curAllowance}, needed: ${amount}.`
      );
      return null;
    } else {
      console.log(
        `Approving allowance. Current: ${curAllowance}, needed: ${amount}.`
      );
      // amount = (BigInt(amount) - BigInt(curAllowance)).toString();
    }

    const encodedTx = await this.token.methods
      .approve(spender, MAX_AMOUNT)
      .encodeABI();
    var txObject: TransactionConfig = {
      from: address,
      to: tokenAddress,
      data: encodedTx,
    };

    const gas = await this.web3.eth.estimateGas(txObject);
    const gasPrice = BigInt(await this.web3.eth.getGasPrice());
    const nonce = await this.web3.eth.getTransactionCount(address);
    txObject.gas = gas;
    txObject.gasPrice = `0x${gasPrice.toString(16)}`;
    txObject.nonce = nonce;

    const signedTx = await this.web3.eth.signTransaction(txObject);
    await this.web3.eth.sendSignedTransaction(signedTx.raw);

    return null;
  }

  public async sign(data: string): Promise<string> {
    const address = await this.getAddress();
    const signature = await this.web3.eth.sign(data, address);

    return signature;
  }
}
