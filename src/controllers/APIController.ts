import { Request, Response } from "express";
import { ITransactionData } from "src/types/transactionData";
import TRANSACTIONDATA from "../models/transactionData";
import  USERBALANCE  from "../models/userBalance"

export const getTransactionByUser =  async (req: Request, res: Response) => {
    try {
        const { user, sortIndex } = req.query;
        console.log(user);
        if(!isEthereumAddress(user)) {
                return res.status(400).json({
                    message: "Invalid address", 
                    status: 400,
                })
        }

        let result = await TRANSACTIONDATA.find({ 
            $or: [ {from: user}, {to: user} ],
        });

        if(sortIndex == "blockNumber") {
            result.sort((res1: ITransactionData, res2: ITransactionData) => res1.blockNumber - res2.blockNumber);
        } else if (sortIndex == "transactionIndex") {
            result.sort((res1: ITransactionData, res2: ITransactionData) => res1.transactionIndex - res2.transactionIndex);
        } else {
            return res.status(400).json({
                message: "Invalid sort index", 
                status: 400,
            });
        }

        console.log(isEthereumAddress(user));
        return res.status(200).json({
            result,
            status: 200,
        });
    } catch (error) {
        return res.status(400).json({
            message: error.message,
            status: 400,
        });
    }
}

export const getNumberOfTransactionByUser =  async (req: Request, res: Response) => {
    try {
        const { user } = req.query;
        console.log(user);
        if(!isEthereumAddress(user)) {
            return res.status(400).json({
                message: "Invalid address", 
                status: 400,
            });
        }
        let madeTransaction = await TRANSACTIONDATA.find({ from: user });
        let receivedTransaction = await TRANSACTIONDATA.find({ to: user });
        
        let numberMade = madeTransaction.length;
        let numberReceived = receivedTransaction.length;

        let result = { 
            made: numberMade,
            received: numberReceived,
        };
        return res.status(200).json({
            result,
            status: 200,
        });
    } catch (error) {
        return res.status(400).json({
            message: error.message,
            status: 400,
        })
    }
}

export const getTransactionByValue =  async (req: Request, res: Response) => {
    try {
        const { sortIndex, num } = req.query;
        console.log(sortIndex);
        let number = Number(num);
        if(sortIndex == "value") {
            await TRANSACTIONDATA.find()
                .sort({value: -1})
                .limit(number)
                .then(result => {
                    return res.status(200).json({
                        result, 
                        status: 200,
                    });
                });
        } 
        else {
            return res.status(400).json({
                message: "Invalid sort index", 
                status: 400,
            });
        }
    } catch (error) {
        return res.status(400).json({
            message: error.message,
            status: 400,
        })
    }
}

export const getHighestUsers =  async (req: Request, res: Response) => {
    try {
        await USERBALANCE.find()
            .then(userInfo => {
                const result = userInfo.map((data: any) => (
                    {address: data.address, balance: Number(data.balance)}
                ));
                return res.status(200).json({
                    result, 
                    status: 200,
                });
            });
    } catch (error) {
        return res.status(400).json({
            message: error.message,
            status: 400,
        })
    }
}

function isEthereumAddress(address: any) {
    if (!/^(0x)?[0-9a-fA-F]{40}$/.test(address)) {
      // Check if it matches the basic Ethereum address format
      return false;
    }
    // Additional checks for checksum address format
    if (/^(0x)?[0-9a-fA-F]{40}$/.test(address) || /^(0x)?[0-9A-F]{40}$/.test(address)) {
      return true;
    } else {
      return false;
    }
  }