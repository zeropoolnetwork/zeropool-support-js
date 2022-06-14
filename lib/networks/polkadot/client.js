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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolkadotClient = void 0;
require("@polkadot/api-augment/substrate");
const api_1 = require("@polkadot/api");
const keyring_1 = require("@polkadot/keyring");
const util_1 = require("@polkadot/util");
const util_crypto_1 = require("@polkadot/util-crypto");
const client_1 = require("../../networks/client");
class PolkadotClient extends client_1.Client {
    static create(account, config) {
        return __awaiter(this, void 0, void 0, function* () {
            yield (0, util_crypto_1.cryptoWaitReady)();
            const client = new PolkadotClient();
            client.keyring = new keyring_1.Keyring({ type: 'sr25519' });
            client.account = client.keyring.addFromUri(account);
            const wsProvider = new api_1.WsProvider(config.rpcUrl);
            client.api = yield api_1.ApiPromise.create({ provider: wsProvider });
            client.transactionUrl = config.transactionUrl;
            return client;
        });
    }
    getAddress() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.account.address;
        });
    }
    getPublicKey() {
        return __awaiter(this, void 0, void 0, function* () {
            return (0, util_1.u8aToHex)(this.account.publicKey, -1, false);
        });
    }
    getBalance() {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: What to do with the reserved balance?
            // @ts-ignore
            const { data: { free } } = yield this.api.query.system.account(this.account.address);
            return free.toString();
        });
    }
    transfer(to, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.api.tx.balances.transfer(to, amount)
                .signAndSend(this.account);
        });
    }
    /**
     * Converts DOT to Planck.
     * @param amount in Ether
     */
    toBaseUnit(amount) {
        return amount; // FIXME: How to properly implement these methods? Use a configurable denominator?
    }
    /**
     * Converts Planck to DOT.
     * @param amount in Wei
     */
    fromBaseUnit(amount) {
        return amount; // FIXME:
    }
    mint(tokenAddress, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            const alice = this.keyring.addFromUri('//Alice');
            // @ts-ignore
            const { nonce } = yield this.api.query.system.account(alice.address);
            yield this.api.tx.sudo
                .sudo(this.api.tx.balances.setBalance(this.account.address, amount, '0'))
                .signAndSend(alice, { nonce });
        });
    }
    /** Expects a hex string and returns a hex string */
    sign(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const message = (0, util_1.hexToU8a)(data);
            const signature = (0, util_1.u8aToHex)(this.account.sign(message), -1, false);
            return signature;
        });
    }
}
exports.PolkadotClient = PolkadotClient;
//# sourceMappingURL=client.js.map