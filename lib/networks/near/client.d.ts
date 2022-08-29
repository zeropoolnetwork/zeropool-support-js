import { ConnectConfig } from 'near-api-js';
import { Client } from '../client';
import { TxFee } from '../transaction';
export { ConnectConfig };
export declare class NearClient extends Client {
    private config;
    private rpc;
    private near;
    private wallet;
    private poolContract;
    static create(config: ConnectConfig, poolAddress: string): Promise<NearClient>;
    approve(_tokenAddress: string, _spender: string, amount: string): Promise<void>;
    getAddress(): Promise<string>;
    getBalance(): Promise<string>;
    /**
     * @param to
     * @param amount in yoctoNEAR
     */
    transfer(to: string, amount: string): Promise<void>;
    /**
     * Convert human-readable NEAR to yoctoNEAR
     **/
    toBaseUnit(amount: string): string;
    /**
    * Convert yoctoNEAR to human-readable NEAR
    **/
    fromBaseUnit(amount: string): string;
    estimateTxFee(): Promise<TxFee>;
}
