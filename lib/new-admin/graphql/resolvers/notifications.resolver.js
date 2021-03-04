const forex = require('../../../forex')
const settingsLoader = require('../../../new-settings-loader')
const notifierQueries = require('../../../notifier/queries')
const plugins = require('../../../plugins')

const resolvers = {
  Query: {
    cryptoRates: () =>
      settingsLoader.loadLatest().then(settings => {
        const pi = plugins(settings)
        return pi.getRawRates().then(r => {
          return {
            withCommissions: pi.buildRates(r),
            withoutCommissions: pi.buildRatesNoCommission(r)
          }
        })
      }),
    fiatRates: () => forex.getFiatRates(),
    notifications: () => notifierQueries.getNotifications(),
    hasUnreadNotifications: () => notifierQueries.hasUnreadNotifications(),
    alerts: () => notifierQueries.getAlerts()
  },
  Mutation: {
    toggleClearNotification: (...[, { id, read }]) => notifierQueries.setRead(id, read),
    clearAllNotifications: () => notifierQueries.markAllAsRead()
  }
}

module.exports = resolvers
