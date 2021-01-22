const DataLoader = require('dataloader')
const { parseAsync } = require('json2csv')

const transactions = require('../../modules/transactions')

const transactionsLoader = new DataLoader(ids => transactions.getCustomerTransactionsBatch(ids))

const resolvers = {
  Customer: {
    transactions: parent => transactionsLoader.load(parent.id)
  },
  Query: {
    transactions: (...[, { from, until, limit, offset }]) =>
      transactions.batch(from, until, limit, offset),
    transactionsCsv: (...[, { from, until, limit, offset }]) =>
      transactions.batch(from, until, limit, offset).then(parseAsync)
  }
}

module.exports = resolvers
