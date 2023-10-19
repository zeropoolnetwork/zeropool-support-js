export enum ChainId {
  Mainnet = 'W',
  Testnet = 'T',
  Stagenet = 'S',
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
      default:
        throw new Error(`Invalid chainId: ${chainId}`);
    }
  }
}

export interface Config {
  nodeUrl: string;
  chainId: ChainId;
}
