const simpleWebauthn = require('@simplewebauthn/server')
const _ = require('lodash')

const users = require('../../users')
// const login = require('../login')

const rpID = `localhost`
const expectedOrigin = `https://${rpID}:3001`

module.exports = function (app) {
  app.post('/api/generate-attestation-options', async (req, res) => {
    const userID = req.body.userID

    const user = await users.findById(userID)

    const options = simpleWebauthn.generateAttestationOptions({
      rpName: 'Lamassu',
      rpID,
      userName: user.username,
      userID: user.id,
      timeout: 60000,
      attestationType: 'indirect',
      excludeCredentials: [],
      authenticatorSelection: {
        userVerification: 'preferred',
        requireResidentKey: false
      }
    })

    try {
      if (!user.hardware_credentials) {
        await users.initializeHardwareCredentials(user.id, options.challenge)
      } else {
        await users.updateHardwareCredentialChallenge(user.id, options.challenge)
      }
    } catch (e) {
      throw new Error(`An error occurred when updating challenge for user ${user.id}`)
    }

    return res.send(options)
  })

  app.post('/api/verify-attestation', async (req, res) => {
    const userID = req.body.userID
    const attestationRes = req.body.attestationRes

    const expectedChallenge = (await users.getCurrentChallenge(userID)).challenge

    return simpleWebauthn.verifyAttestationResponse({
      credential: JSON.parse(attestationRes),
      expectedChallenge: `${expectedChallenge}`,
      expectedOrigin,
      expectedRPID: rpID
    }).then(async verification => {
      const { verified, authenticatorInfo } = verification

      if (verified && authenticatorInfo) {
        const { base64PublicKey, base64CredentialID, counter } = authenticatorInfo

        const userDevices = JSON.parse((await users.getHardwareDevices(userID)).devices)
        const existingDevice = userDevices.find(device => device.credentialID === base64CredentialID)

        if (!existingDevice) {
          const newDevice = {
            publicKey: base64PublicKey,
            credentialID: base64CredentialID,
            counter
          }
          userDevices.push(newDevice)
          await users.saveHardwareDevices(userID, userDevices)
        }
      }

      return res.send({ verified })
    })
  })

  app.post('/api/generate-assertion-options', async (req, res) => {
    const user = await users.getByName(req.body.username)
    const userDevices = await JSON.parse((await users.getHardwareDevices(user.id)).devices)

    const options = simpleWebauthn.generateAssertionOptions({
      timeout: 60000,
      allowCredentials: userDevices.map(dev => ({
        id: dev.credentialID,
        type: 'public-key',
        transports: ['usb', 'ble', 'nfc', 'internal']
      })),
      userVerification: 'preferred',
      rpID
    })
    await users.updateHardwareCredentialChallenge(user.id, options.challenge)

    return res.send(options)
  })

  app.post('/api/verify-assertion', async (req, res) => {
    const user = await users.getByName(req.body.username)
    const rememberMeInput = req.body.rememberMe
    const assertionRes = req.body.assertionRes
    const assertionResObj = JSON.parse(assertionRes)

    const expectedChallenge = (await users.getCurrentChallenge(user.id)).challenge
    const userDevices = await JSON.parse((await users.getHardwareDevices(user.id)).devices)

    const dbAuthenticator = _.find(userDevices, dev => {
      return dev.credentialID === assertionResObj.id
    })

    if (!dbAuthenticator) {
      throw new Error(`could not find authenticator matching ${assertionResObj.id}`)
    }

    const verification = simpleWebauthn.verifyAssertionResponse({
      credential: assertionResObj,
      expectedChallenge: `${expectedChallenge}`,
      expectedOrigin,
      expectedRPID: rpID,
      authenticator: dbAuthenticator
    })

    const { verified, authenticatorInfo } = verification

    if (verified) {
      dbAuthenticator.counter = authenticatorInfo.counter
      await users.saveHardwareDevices(user.id, userDevices)

      const finalUser = { id: user.id, username: user.username, role: user.role }
      req.session.user = finalUser
      if (rememberMeInput) req.session.cookie.maxAge = 90 * 24 * 60 * 60 * 1000 // 90 days
    }

    return res.send({ verified })
  })

  // Testing routes for FIDO on userManagement screen
  app.post('/api/generate-assertion-options-test', async (req, res) => {
    const user = await users.findById(req.body.userID)
    const userDevices = await JSON.parse((await users.getHardwareDevices(user.id)).devices)

    const options = simpleWebauthn.generateAssertionOptions({
      timeout: 60000,
      allowCredentials: userDevices.map(dev => ({
        id: dev.credentialID,
        type: 'public-key',
        transports: ['usb', 'ble', 'nfc', 'internal']
      })),
      userVerification: 'preferred',
      rpID
    })
    await users.updateHardwareCredentialChallenge(user.id, options.challenge)

    return res.send(options)
  })

  app.post('/api/verify-assertion-test', async (req, res) => {
    const user = await users.findById(req.body.userID)
    const assertionRes = req.body.assertionRes
    const assertionResObj = JSON.parse(assertionRes)

    const expectedChallenge = (await users.getCurrentChallenge(user.id)).challenge
    const userDevices = await JSON.parse((await users.getHardwareDevices(user.id)).devices)

    const dbAuthenticator = _.find(userDevices, dev => {
      return dev.credentialID === assertionResObj.id
    })

    if (!dbAuthenticator) {
      throw new Error(`could not find authenticator matching ${assertionResObj.id}`)
    }

    const verification = simpleWebauthn.verifyAssertionResponse({
      credential: assertionResObj,
      expectedChallenge: `${expectedChallenge}`,
      expectedOrigin,
      expectedRPID: rpID,
      authenticator: dbAuthenticator
    })

    const { verified, authenticatorInfo } = verification

    if (verified) {
      dbAuthenticator.counter = authenticatorInfo.counter
      await users.saveHardwareDevices(user.id, userDevices)
    }

    return res.send({ verified })
  })
}
