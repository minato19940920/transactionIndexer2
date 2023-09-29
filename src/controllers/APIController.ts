import { Request, Response } from "express";
import { ITransactionData } from "src/types/transactionData";
import TRANSACTIONDATA from "../models/transactionData";
import  USERBALANCE  from "../models/userBalance"

/**
 * Fetches all transactions associated with a specific user (either as sender or recipient).
 * The user can also specify a sorting order using the query parameter `sortIndex`.
 */
export const getTransactionByUser =  async (req: Request, res: Response) => {
    try {
        const { user, sortIndex } = req.query;

        // Validate Ethereum address format
        if(!isEthereumAddress(user)) {
            return res.status(400).json({
                message: "Invalid address", 
                status: 400,
            });
        }

        // Fetch transactions involving the user
        let result = await TRANSACTIONDATA.find({ 
            $or: [ {from: user}, {to: user} ],
        });

        // Sort transactions based on user's preference
        if(sortIndex === "blockNumber") {
            result.sort((res1: ITransactionData, res2: ITransactionData) => res1.blockNumber - res2.blockNumber);
        } else if (sortIndex === "transactionIndex") {
            result.sort((res1: ITransactionData, res2: ITransactionData) => res1.transactionIndex - res2.transactionIndex);
        } else {
            return res.status(400).json({
                message: "Invalid sort index", 
                status: 400,
            });
        }

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

/**
 * Retrieves the number of transactions made and received by a specific user.
 */
export const getNumberOfTransactionByUser =  async (req: Request, res: Response) => {
    try {
        const { user } = req.query;

        // Validate Ethereum address format
        if(!isEthereumAddress(user)) {
            return res.status(400).json({
                message: "Invalid address", 
                status: 400,
            });
        }

        const madeTransaction = await TRANSACTIONDATA.find({ from: user });
        const receivedTransaction = await TRANSACTIONDATA.find({ to: user });

        const result = { 
            made: madeTransaction.length,
            received: receivedTransaction.length,
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

/**
 * Fetches the top `num` transactions sorted by value.
 */
export const getTransactionByValue =  async (req: Request, res: Response) => {
    try {
        const { sortIndex, num } = req.query;
        const number = Number(num);

        if(sortIndex === "value") {
            await TRANSACTIONDATA.find()
                .sort({value: -1})
                .limit(number)
                .then(result => {
                    return res.status(200).json({
                        result, 
                        status: 200,
                    });
                });
        } else {
            return res.status(400).json({
                message: "Invalid sort index", 
                status: 400,
            });
        }
    } catch (error) {
        return res.status(400).json({
            message: error.message,
            status: 400,
        });
    }
}

/**
 * Retrieves the list of users with the highest balances.
 */
export const getHighestUsers =  async (req: Request, res: Response) => {
    try {
        await USERBALANCE.find()
            .then(userInfo => {
                const result = userInfo.map(data => (
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

/**
 * Utility function to validate if a given string adheres to the Ethereum address format.
 * @param {string} address - The address string to be validated.
 * @returns {boolean} True if valid, False otherwise.
 */
function isEthereumAddress(address: any) {
    // Basic format check for Ethereum address
    if (!/^(0x)?[0-9a-fA-F]{40}$/.test(address)) {
      return false;
    }

    // Check for valid checksum format, if used
    if (/^(0x)?[0-9a-fA-F]{40}$/.test(address) || /^(0x)?[0-9A-F]{40}$/.test(address)) {
      return true;
    } else {
      return false;
    }
}