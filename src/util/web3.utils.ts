import Web3 from "web3";
import { configDotenv } from "dotenv";
configDotenv();

export const getWeb3 = (url: string): any => {
    return new Web3(new Web3.providers.HttpProvider(url));
}
