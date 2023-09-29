import { getWeb3 } from "../util/web3.utils";
import { MainNetworkData } from "../configs/web3.config";
import TRANSACTIONDATA from "../models/transactionData";
import USERBALANCE from "../models/userBalance";
import { LIMIT } from "../configs/transactionIndexer.config";

// Initialize web3 with a provider URL
const web3 = getWeb3(MainNetworkData.url);

/**
 * Main function for indexing transactions. 
 * - Waits for the Ethereum node to synchronize and provide a valid block number
 * - Fetches transactions within a specific range based on existing data and the LIMIT constant
 * - Updates the top 100 addresses based on their balances
 */
export const transactionIndexer = async () => {
    try {
        // Wait until the Ethereum node provides a valid block number
        while (isNaN(Number((await web3.eth.getBlock('latest')).number))) {
            await delay(3000);
        }

        const currentBlockNumber = Number((await web3.eth.getBlock('latest')).number);

        const saveLimit = LIMIT;

        // Remove transactions that lack an associated block number
        await TRANSACTIONDATA.deleteMany({ blockNumber: { $exists: false } });

        const txDatas = await TRANSACTIONDATA.find().sort({ blockNumber: 1 });
        const txLength = txDatas.length;

        // If there's no transaction data, fetch transactions from a calculated starting block
        if (txLength == 0) {
            const from = currentBlockNumber - saveLimit + 1 > 0 ? currentBlockNumber - saveLimit + 1 : 0;
            await getTransactions(from, currentBlockNumber);
        } else {
            const from = currentBlockNumber - saveLimit + 1 > 0 ? currentBlockNumber - saveLimit + 1 : 0;
            const to = currentBlockNumber;
            const start = Number(txDatas[0].blockNumber);
            const end = Number(txDatas[txLength - 1].blockNumber);

            // Identify the block intervals that need to be updated
            const subInterval = subtractIntervals([from, to], [start, end]);

            // Fetch transactions for identified intervals
            for (const interval of subInterval) {
                await getTransactions(interval[0], interval[1]);
            }

            // Identify and delete transactions from block intervals that are outdated
            const outdatedIntervals = subtractIntervals([start, end], [from, to]);
            for (const interval of outdatedIntervals) {
                await TRANSACTIONDATA.deleteMany({ blockNumber: { $gte: interval[0], $lte: interval[1] } });
            }
        }
        // Update the top 100 addresses by their balances
        await getTop100Balance();
    } catch (error) {
        console.error('Error indexing transactions:', error);
    }
};

/**
 * Updates the USERBALANCE collection to reflect the top 100 addresses by their balances.
 * - First, the existing USERBALANCE data is cleared.
 * - Then, from the TRANSACTIONDATA, addresses involved in transactions are identified.
 * - The balances for these addresses are fetched and sorted.
 * - Finally, the top 100 addresses and their balances are stored in the USERBALANCE collection.
 */
export const getTop100Balance = async () => {
    // Clear existing data
    await USERBALANCE.deleteMany({});
    const transactionsForBalance = await TRANSACTIONDATA.find();
    const addressSet: Set<string> = new Set();

    // Identify addresses from the transaction data
    transactionsForBalance.forEach(tx => {
        if (isEthereumAddress(tx.from) && isEthereumAddress(tx.to)) {
            addressSet.add(tx.from);
            addressSet.add(tx.to);
        }
    });

    const addresses = Array.from(addressSet);
    const totalAddresses = addresses.length;
    const fetchBatchSize = 200;
    let balanceInfo = [];

    // Fetch balances for identified addresses in batches
    for (let i = 0; i < totalAddresses;) {
        const step = i + fetchBatchSize > totalAddresses ? totalAddresses - i : fetchBatchSize;
        const currentBatch = addresses.slice(i, i + step);
        const balances = await Promise.all(currentBatch.map(address => getBalance(address)));
        i += step;
        balanceInfo = [...balanceInfo, ...balances];
    }

    // Sort by balance and take the top 100
    balanceInfo.sort((a, b) => Number(b.balance) - Number(a.balance));
    const top100Balances = balanceInfo.slice(0, 100).map(data => ({ address: data.address, balance: Number(data.balance) }));
    
    // Store the top 100 balances
    await USERBALANCE.insertMany(top100Balances);
};

const getBalance = async (address: string): Promise<{ address: string, balance: bigint }> => {
    const balance = await web3.eth.getBalance(address);
    return { address, balance: BigInt(balance) };
};

const getTransactions = async (from: any, to: any) => {
    try {
        const STEP = 100;
        while(from < to) {
            let saveDataPromises = [];
            let step = from + STEP - 1 > to ? to - from + 1 : STEP;
            for (let blockNumber = from; blockNumber < from + step; blockNumber++) {
                saveDataPromises.push(fetchTransactionsForBlock(web3, blockNumber));
            }
            const saveDataResults = await Promise.all(saveDataPromises);
            let allTransactions = [].concat(...saveDataResults);

            await TRANSACTIONDATA.insertMany(allTransactions);
            from += step;
        }
    } catch (error) {
        console.error('Error initializing:', error);
    }
}

export const subtractIntervals = (intervalA: [number, number], intervalB: [number, number]): [number, number][] => {
    const [a, b] = intervalA;
    const [c, d] = intervalB;
  
    // Check for no overlap
    if (b < c || a > d) {
      return [intervalA];
    }
  
    // Calculate the result intervals
    const result: [number, number][] = [];
  
    if (a < c) {
      result.push([a, c - 1]);
    }
  
    if (b > d) {
      result.push([d + 1, b]);
    }
    // console.log("result", result);
    return result;
  }

  const fetchTransactionsForBlock = async (web3: any, blockNumber: any) => {
    try {
        const block = await web3.eth.getBlock(blockNumber);
        const transactionPromises = block.transactions.map(tx => web3.eth.getTransaction(tx));
    
        const transactions = await Promise.all(transactionPromises);
        return transactions.map(data => ({
            blockHash: data.blockHash,
            blockNumber: Number(data.blockNumber),
            from: data.from,
            hash: data.hash,
            input: data.input,
            nonce: Number(data.nonce),
            to: data.to,
            transactionIndex: Number(data.transactionIndex),
            value: Number(data.value),
            type: Number(data.type),
            chainId: Number(data.chainId),
            data: data.data
        }));
    } catch(error) {
        console.log(`message: ${blockNumber}block does not have transaction.`);
    }
}

const delay = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const isEthereumAddress = (address: any) => {
    // Check if it matches the basic Ethereum address format
    if (!/^(0x)?[0-9a-fA-F]{40}$/.test(address)) {
        return false;
    }

    // Additional checks for checksum address format
    if (/^(0x)?[0-9a-fA-F]{40}$/.test(address) || /^(0x)?[0-9A-F]{40}$/.test(address)) {
        return true;
    } else {
        return false;
    }
}