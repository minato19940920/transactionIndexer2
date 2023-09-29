import { Document } from "mongoose";


export interface ITransactionData extends Document{
    blockHash: string,
    blockNumber: number,
    from: string,
    gas: number,
    gasPrice: number,
    maxFeePerGas: number,
    maxPriorityFeePerGas: number,
    hash: string,
    input: string,
    nonce: number,
    to: string,
    transactionIndex: number,
    value: number,
    type: number,
    chainId: number;
    v: number,
    r: string,
    s: string,
    data: string;
}
