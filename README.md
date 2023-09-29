
## Indexer
Aprocess that keeps the transactions injected in the last 10,000 blocks of the c-chain updated in a suitable database.


## API
API that returns:
- list of transactions made or received from a certain address sorted by `blockNumber` and `transactionIndex`
- number of transactions made or received from a certain address
- list of transactions sorted by `value` (quantity of $AVAX moved)
- list of the 100 addresses with the highest balance that have made or received a transaction



## starting application
1. Run `npm install`.
2. Run `npm run build`.
3. Run `npm run start`. 