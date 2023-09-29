import { model, Schema } from "mongoose";
import { IUserBalance } from "../types/userBalance";

const IUserBalanceSchema = new Schema<IUserBalance>({
    address: String,
    balance: Number,
});

export default model<IUserBalance>("UserBalance", IUserBalanceSchema);