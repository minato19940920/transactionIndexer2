
import { getWeb3 } from "../util/web3.utils";
import { MainNetworkData } from "../configs/web3.config";
import TRANSACTIONDATA from "../models/transactionData";
import USERBALANCE from "../models/userBalance";
import { LIMIT } from "../configs/transactionIndexer.config";

const web3 = getWeb3(MainNetworkData.url);

export const transactionIndexer = async () => {
    try {
        // const web3 = getWeb3(MainNetworkData.url);
        console.log("starting!");

        while(isNaN(Number((await web3.eth.getBlock('latest')).number))) {
            await delay(3000);
        }
        
        const currentBlockNumber  = Number((await web3.eth.getBlock('latest')).number);
        console.log(currentBlockNumber);

        const saveLimit = LIMIT;

        await TRANSACTIONDATA.deleteMany({ blockNumber: { $exists: false } });

        let txDatas = await TRANSACTIONDATA.find().sort({blockNumber: 1});
        let txLength = txDatas.length;
        

        if(txLength == 0) {
            const from = currentBlockNumber - saveLimit + 1 > 0 ? currentBlockNumber - saveLimit + 1 : 0; 
            await getTransactions(from, currentBlockNumber);
        } else {
            const from = currentBlockNumber - saveLimit + 1 > 0 ? currentBlockNumber - saveLimit + 1 : 0;
            const to = currentBlockNumber;

            let start: number = Number(txDatas[0].blockNumber);
            let end: number = Number(txDatas[txLength - 1].blockNumber);
            let subInterval = subtractIntervals([from, to], [start, end]);

            // let promises = subInterval.forEach((interval: [number, number]) => getTransactions(interval[0], interval[1]));

            for(let i = 0; i < subInterval.length; i++) {
                await getTransactions(subInterval[i][0], subInterval[i][1]);
            }

            subInterval = subtractIntervals([start, end], [from, to]);
            for(let i = 0; i < subInterval.length; i++) {
                await TRANSACTIONDATA.deleteMany({ blockNumber: { $gte: subInterval[i][0], $lte: subInterval[i][1] } });
            }
        }
        console.log("blocks have updated!");
        await getTop100Balance();
        console.log("Address of top balance have updated!");
    } catch (error) {
        console.error('Error indexing transactions:', error);
    }
}

export const getTop100Balance = async () => {
    await USERBALANCE.deleteMany({});
    const TransactionsForBalance = await TRANSACTIONDATA.find();
    const addressSet: Set<string> = new Set();

    TransactionsForBalance.forEach(tx => {
        if(isEthereumAddress(tx.from) && isEthereumAddress(tx.to)) {
            addressSet.add(tx.from);
            addressSet.add(tx.to);
        }
    });

    let addresses: string[] = Array.from(addressSet);
    let total_len = addresses.length;
    let len = 200;
    let balanceInfo = [];
    for(let i = 0; i < total_len;) {
        let step = i + len > total_len ? total_len - i: len;
        let subAddress = addresses.slice(i, i + step - 1);
        const balances = await Promise.all(subAddress.map(address => getBalance(address)));        
        i += step;
        balanceInfo = [...balanceInfo, ...balances];
    }

    balanceInfo.sort((info1: any, info2: any) => Number(info2.balance) - Number(info1.balance));
    balanceInfo = balanceInfo.slice(0, 100);
    // let topAddresses = balanceInfo.map((res: any) => res.address);
    // console.log(balanceInfo);
    console.log("getting top balance finished");
    balanceInfo = balanceInfo.map((data : any) => ({address: data.address, balance: Number(data.balance)}));
    await USERBALANCE.insertMany(balanceInfo);
    console.log("userbalance saved");
}

const getBalance = async (address: string): Promise<{ address: string, balance: bigint }> => {
    // const web3 = getWeb3(MainNetworkData.url);
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
            console.log("from:", from);
            // await delay(1000);
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