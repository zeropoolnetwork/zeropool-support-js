"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NearClient = void 0;
const bn_js_1 = __importDefault(require("bn.js"));
const format_1 = require("near-api-js/lib/utils/format");
const near_api_js_1 = require("near-api-js");
const client_1 = require("../client");
class NearClient extends client_1.Client {
    static async create(config, poolAddress) {
        let self = new NearClient();
        // self.keyStore = new BrowserLocalStorageKeyStore();
        self.near = await (0, near_api_js_1.connect)(config);
        self.wallet = new near_api_js_1.WalletConnection(self.near, 'zeropool');
        self.config = config;
        self.poolContract = new near_api_js_1.Contract(self.wallet.account(), poolAddress, {
            changeMethods: ['transact', 'reserve', 'release', 'pool_index'],
            viewMethods: [],
        });
        // self.wallet.requestSignIn(
        //   "example-contract.testnet", // contract requesting access
        //   "ZeroPool client", // optional title
        // );
        return self;
    }
    async approve(_tokenAddress, _spender, amount) {
        // @ts-ignore
        await this.poolContract.reserve({
            meta: 'some info',
            callbackUrl: 'https://example.com/callback',
            amount: amount
        });
    }
    async getAddress() {
        return this.wallet.getAccountId();
    }
    async getBalance() {
        const balance = await this.wallet.account().getAccountBalance();
        return balance.available;
    }
    async getTokenBalance(_tokenAddress) {
        // FIXME: change to token balance once the frontend starts to support tokens
        return await this.getBalance();
    }
    /**
     * @param to
     * @param amount in yoctoNEAR
     */
    async transfer(to, amount) {
        await this.wallet.account().sendMoney(to, new bn_js_1.default(amount));
    }
    /**
     * Convert human-readable NEAR to yoctoNEAR
     **/
    toBaseUnit(amount) {
        return (0, format_1.parseNearAmount)(amount);
    }
    /**
    * Convert yoctoNEAR to human-readable NEAR
    **/
    fromBaseUnit(amount) {
        return (0, format_1.formatNearAmount)(amount);
    }
    async estimateTxFee() {
        const status = await this.near.connection.provider.status();
        const latestBlock = status.sync_info.latest_block_hash;
        const res = await this.rpc.gasPrice(latestBlock);
        const gasPrice = new bn_js_1.default(res.gas_price);
        const gas = new bn_js_1.default('30000000000000');
        const fee = gas.mul(gasPrice).toString();
        const feeFormatted = (0, format_1.formatNearAmount)(fee);
        return {
            gas: gas.toString(),
            gasPrice: gasPrice.toString(),
            fee: feeFormatted,
        };
    }
}
exports.NearClient = NearClient;
//# sourceMappingURL=client.js.map