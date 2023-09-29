import express from 'express'
import { getTransactionByUser, getNumberOfTransactionByUser, getTransactionByValue, getHighestUsers } from '../controllers/APIController';

const router = express.Router();

router.get("/transaction-by-user", getTransactionByUser);
router.get("/number-of-transaction", getNumberOfTransactionByUser);
router.get("/transaction-by-value", getTransactionByValue);
router.get("/get-highest-users", getHighestUsers);

export default router;
