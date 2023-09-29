import { configDotenv } from "dotenv";

configDotenv();

export const db_URL = process.env.MONGO_URI;