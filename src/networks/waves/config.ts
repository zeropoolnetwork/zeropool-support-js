export enum ChainId {
  Mainnet = 'mainnet',
  Testnet = 'testnet',
  Stagenet = 'stagenet',
}

export namespace ChainId {
  export function chainIdNumber(chainId: ChainId): number {
    switch (chainId) {
      case ChainId.Mainnet:
        return 87;
      case ChainId.Testnet:
        return 84;
      case ChainId.Stagenet:
        return 83;
    }
  }
}

export interface Config {
  nodeUrl: string;
  chainId: ChainId;
}
