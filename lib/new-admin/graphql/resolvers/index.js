const { mergeResolvers } = require('@graphql-tools/merge')

const blacklist = require('./blacklist.resolver')
const config = require('./config.resolver')
const coupon = require('./coupon.resolver')
const currency = require('./currency.resolver')
const customer = require('./customer.resolver')
const funding = require('./funding.resolver')
const log = require('./log.resolver')
const machine = require('./machine.resolver')
const pairing = require('./pairing.resolver')
const scalar = require('./scalar.resolver')
const settings = require('./settings.resolver')
const status = require('./status.resolver')
const transaction = require('./transaction.resolver')
const version = require('./version.resolver')

const resolvers = [
  blacklist,
  config,
  coupon,
  currency,
  customer,
  funding,
  log,
  machine,
  pairing,
  scalar,
  settings,
  status,
  transaction,
  version
]

module.exports = mergeResolvers(resolvers)
