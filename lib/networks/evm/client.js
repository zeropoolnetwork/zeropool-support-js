"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EthereumClient = void 0;
const web3_1 = __importDefault(require("web3"));
const bn_js_1 = __importDefault(require("bn.js"));
const transaction_1 = require("../../networks/transaction");
const utils_1 = require("./utils");
const token_abi_json_1 = __importDefault(require("./token-abi.json"));
const client_1 = require("../../networks/client");
class EthereumClient extends client_1.Client {
    constructor(provider, config = { transactionUrl: '{{hash}}' }) {
        super();
        this.web3 = new web3_1.default(provider);
        this.token = new this.web3.eth.Contract(token_abi_json_1.default);
        this.transactionUrl = config.transactionUrl;
    }
    getAddress() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.web3.eth.getAccounts())[0];
        });
    }
    getBalance() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.web3.eth.getBalance(yield this.getAddress());
        });
    }
    getTokenBalance(tokenAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const address = yield this.getAddress();
            this.token.options.address = tokenAddress; // TODO: Is it possible to pass the contract address to the `call` method?
            const balance = this.token.methods.balanceOf(address).call();
            return balance;
        });
    }
    transferToken(tokenAddress, to, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            const from = yield this.getAddress();
            const nonce = yield this.web3.eth.getTransactionCount(from);
            const gas = yield this.web3.eth.estimateGas({ from, to, value: amount });
            const gasPrice = yield this.web3.eth.getGasPrice();
            const data = this.token.methods.transfer(to, amount).encodeABI();
            const raw = {
                nonce,
                gas,
                gasPrice,
                to: tokenAddress,
                value: 0,
                data,
            };
            const signed = yield this.web3.eth.signTransaction(raw);
            const receipt = yield this.web3.eth.sendSignedTransaction(signed.raw);
            const block = yield this.web3.eth.getBlock(receipt.blockNumber);
            let timestamp;
            if (typeof block.timestamp == 'string') {
                timestamp = parseInt(block.timestamp);
            }
            else {
                timestamp = block.timestamp;
            }
            let status = transaction_1.TxStatus.Completed;
            if (!receipt.status) {
                status = transaction_1.TxStatus.Error;
            }
            const nativeTx = yield this.web3.eth.getTransaction(receipt.transactionHash);
            (0, utils_1.convertTransaction)(nativeTx, timestamp, status);
        });
    }
    transfer(to, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            const from = yield this.getAddress();
            const nonce = yield this.web3.eth.getTransactionCount(from);
            const gas = yield this.web3.eth.estimateGas({ from, to, value: amount });
            const gasPrice = yield this.web3.eth.getGasPrice();
            const signed = yield this.web3.eth.signTransaction({
                from,
                to,
                value: amount,
                nonce,
                gas,
                gasPrice,
            });
            const receipt = yield this.web3.eth.sendSignedTransaction(signed.raw);
            const block = yield this.web3.eth.getBlock(receipt.blockNumber);
            let timestamp;
            if (typeof block.timestamp == 'string') {
                timestamp = parseInt(block.timestamp);
            }
            else {
                timestamp = block.timestamp;
            }
            let status = transaction_1.TxStatus.Completed;
            if (!receipt.status) {
                status = transaction_1.TxStatus.Error;
            }
            const nativeTx = yield this.web3.eth.getTransaction(receipt.transactionHash);
            (0, utils_1.convertTransaction)(nativeTx, timestamp, status);
        });
    }
    /**
     * Converts ether to Wei.
     * @param amount in Ether
     */
    toBaseUnit(amount) {
        return this.web3.utils.toWei(amount, 'ether');
    }
    /**
     * Converts Wei to ether.
     * @param amount in Wei
     */
    fromBaseUnit(amount) {
        return this.web3.utils.fromWei(amount, 'ether');
    }
    estimateTxFee() {
        return __awaiter(this, void 0, void 0, function* () {
            const address = yield this.getAddress();
            const gas = yield this.web3.eth.estimateGas({
                from: address,
                to: address,
                value: this.toBaseUnit('1'),
            });
            const gasPrice = yield this.web3.eth.getGasPrice();
            const fee = new bn_js_1.default(gas).mul(new bn_js_1.default(gasPrice));
            return {
                gas: gas.toString(),
                gasPrice,
                fee: this.fromBaseUnit(fee.toString()),
            };
        });
    }
    mint(tokenAddress, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            const address = yield this.getAddress();
            const encodedTx = yield this.token.methods.mint(address, BigInt(amount)).encodeABI();
            var txObject = {
                from: address,
                to: tokenAddress,
                data: encodedTx,
            };
            const gas = yield this.web3.eth.estimateGas(txObject);
            const gasPrice = BigInt(yield this.web3.eth.getGasPrice());
            const nonce = yield this.web3.eth.getTransactionCount(address);
            txObject.gas = gas;
            txObject.gasPrice = `0x${gasPrice.toString(16)}`;
            txObject.nonce = nonce;
            const signedTx = yield this.web3.eth.signTransaction(txObject);
            yield this.web3.eth.sendSignedTransaction(signedTx.raw);
        });
    }
    approve(tokenAddress, spender, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            const address = yield this.getAddress();
            const encodedTx = yield this.token.methods.approve(spender, BigInt(amount)).encodeABI();
            var txObject = {
                from: address,
                to: tokenAddress,
                data: encodedTx,
            };
            const gas = yield this.web3.eth.estimateGas(txObject);
            const gasPrice = BigInt(yield this.web3.eth.getGasPrice());
            const nonce = yield this.web3.eth.getTransactionCount(address);
            txObject.gas = gas;
            txObject.gasPrice = `0x${gasPrice.toString(16)}`;
            txObject.nonce = nonce;
            const signedTx = yield this.web3.eth.signTransaction(txObject);
            yield this.web3.eth.sendSignedTransaction(signedTx.raw);
        });
    }
    sign(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const address = yield this.getAddress();
            const signature = yield this.web3.eth.sign(data, address);
            return signature;
        });
    }
}
exports.EthereumClient = EthereumClient;
//# sourceMappingURL=client.js.map