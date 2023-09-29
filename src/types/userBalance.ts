import { Document } from "mongoose";


export interface IUserBalance extends Document{
    address: string,
    balance: number,
}