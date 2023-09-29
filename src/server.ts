import express from 'express'
import mongoose from 'mongoose'
import routes from './routes';
import cors from "cors"
import { configDotenv } from "dotenv";
import { transactionIndexer } from './services/transactionService';
import axios from "axios";

configDotenv();

axios.defaults.timeout = 6000000;


const INTERVAL_TIME = 20 * 60 * 1000;

// const mongoURI = db_URL;
const mongoURI = "mongodb://127.0.0.1:27017/Store";
mongoose.connect(mongoURI, {autoIndex: true, serverSelectionTimeoutMS: 6000000, });

const app = express();
app.use(cors());
app.use('/api', routes);

app.listen(process.env.PORT || 5000, () => {
    console.log("Server is Runing On port 5000");
});

let state = false;
setTimeout(async() => {
    await transactionIndexer();
    console.log("**********");
    state = true;
}, 0);

setInterval(async() => {
    if(state == true) {
        await transactionIndexer();
    }
}, INTERVAL_TIME);