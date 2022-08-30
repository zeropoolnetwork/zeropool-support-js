"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NearClient = exports.PolkadotClient = exports.EthereumClient = exports.Client = void 0;
var client_1 = require("./networks/client");
Object.defineProperty(exports, "Client", { enumerable: true, get: function () { return client_1.Client; } });
var evm_1 = require("./networks/evm");
Object.defineProperty(exports, "EthereumClient", { enumerable: true, get: function () { return evm_1.EthereumClient; } });
var polkadot_1 = require("./networks/polkadot");
Object.defineProperty(exports, "PolkadotClient", { enumerable: true, get: function () { return polkadot_1.PolkadotClient; } });
var near_1 = require("./networks/near");
Object.defineProperty(exports, "NearClient", { enumerable: true, get: function () { return near_1.NearClient; } });
//# sourceMappingURL=index.js.map