const configManager = require('./config-manager')
const settingsLoader = require('./settings-loader')

function sendMessage (rec) {
  return Promise.resolve()
  .then(() => {
    const settings = settingsLoader.settings
    const pluginCode = configManager.unscoped(settings.config).extraServices.email

    if (!pluginCode) throw new Error('No email plugin defined')
    const account = settings.accounts.plugin
    const plugin = require('lamassu-' + plugin)

    return plugin.sendMessage(account, rec)
  })
}

module.exports({sendMessage})