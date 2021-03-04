const express = require('express')
const router = express.Router()

const BN = require('../bn')
const couponManager = require('../coupons')
const commissionMath = require('../commission-math')
const configManager = require('../new-config-manager')

function verifyCoupon (req, res, next) {
  couponManager.getCoupon(req.body.codeInput)
    .then(coupon => {
      if (!coupon) return next()

      const transaction = req.body.tx
      const commissions = configManager.getCommissions(transaction.cryptoCode, req.deviceId, req.settings.config)
      const tickerRate = BN(transaction.rawTickerPrice)
      const discount = commissionMath.getDiscountRate(coupon.discount, commissions[transaction.direction])
      const rates = {
        [transaction.cryptoCode]: {
          [transaction.direction]: (transaction.direction === 'cashIn')
            ? tickerRate.mul(discount).round(5)
            : tickerRate.div(discount).round(5)
        }
      }
      return res.status(200).json({
        coupon: coupon,
        newRates: rates
      })
    })
    .catch(next)
}

router.post('/', verifyCoupon)

module.exports = router
