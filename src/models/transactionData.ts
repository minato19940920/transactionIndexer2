import { model, Schema } from "mongoose";
import { ITransactionData } from "../types/transactionData";

const ITransactionDataSchema = new Schema<ITransactionData>({
    blockHash: String,
    blockNumber: Number,
    from: String,
    gas: Number,
    gasPrice: Number,
    maxFeePerGas: Number,
    maxPriorityFeePerGas: Number,
    hash: String,
    input: String,
    nonce: Number,
    to: String,
    transactionIndex: Number,
    value: Number,
    type: Number,
    chainId: Number,
    v: Number,
    r: String,
    s: String,
    data: String,
});

export default model<ITransactionData>("TransactionData", ITransactionDataSchema);