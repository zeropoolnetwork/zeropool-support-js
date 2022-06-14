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
exports.Client = void 0;
class Client {
    constructor() {
        this.transactionUrl = '{{hash}}';
    }
    getPublicKey() {
        throw new Error('unimplemented');
    }
    getTokenBalance(tokenAddress) {
        throw new Error('unimplemented');
    }
    transferToken(tokenAddress, to, amount) {
        throw new Error('unimplemented');
    }
    mint(tokenAddres, amount) {
        throw new Error('unimplemented');
    }
    approve(tokenAddress, spender, amount) {
        throw new Error('unimplemented');
    }
    getTransactionUrl(hash) {
        return this.transactionUrl.replace('{{hash}}', hash);
    }
    /**
     *
     */
    updateState() {
        throw new Error('unimplemented');
    }
    /**
     * Get estimated transaction fee.
     */
    estimateTxFee() {
        throw new Error('unimplemented');
    }
    sign(data) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error('unimplemented');
        });
    }
}
exports.Client = Client;
//# sourceMappingURL=client.js.map