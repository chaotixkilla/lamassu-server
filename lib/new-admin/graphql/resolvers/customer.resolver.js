const customers = require('../../../customers')

const resolvers = {
  Query: {
    customers: () => customers.getCustomersList(),
    customer: (...[, { customerId }]) => customers.getCustomerById(customerId)
  },
  Mutation: {
    setCustomer: (root, args, context, info) => {
      const token = context.req.cookies && context.req.cookies.token
      return customers.updateCustomer(args.customerId, args.customerInput, token)
    }
  }
}

module.exports = resolvers
