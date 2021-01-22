const couponManager = require('../../../coupons')

const resolvers = {
  Query: {
    coupons: () => couponManager.getAvailableCoupons()
  },
  Mutation: {
    createCoupon: (...[, { code, discount }]) => couponManager.createCoupon(code, discount),
    deleteCoupon: (...[, { couponId }]) => couponManager.deleteCoupon(couponId)
  }
}

module.exports = resolvers
