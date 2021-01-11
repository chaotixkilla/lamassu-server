const simpleWebauthn = require('@simplewebauthn/server')

const users = require('../../users')
// const login = require('../login')

const rpID = `localhost`
const expectedOrigin = `https://${rpID}:3001`
const usersMem = {}

module.exports = function (app) {
  app.post('/api/generate-attestation-options', (req, res) => {
    const userID = req.body.userID

    return users.findById(userID).then(user => {
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
          users.initializeHardwareCredentials(user.id, options.challenge)
        } else {
          users.updateHardwareCredentialChallenge(user.id, options.challenge)
        }
      } catch (e) {
        throw new Error(`An error occurred when updating challenge for user ${user.id}`)
      }

      /* if (!(userID in usersMem)) {
        usersMem[userID] = {
          currentChallenge: options.challenge,
          devices: []
        }
      } else {
        usersMem[userID].currentChallenge = options.challenge
      } */

      return res.send(options)
    })
  })

  app.post('/api/verify-attestation', async (req, res) => {
    const userID = req.body.userID
    const attestationRes = req.body.attestationRes

    // const expectedChallenge = usersMem[userID].currentChallenge
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
          /* usersMem[userID].devices.push({
            publicKey: base64PublicKey,
            credentialID: base64CredentialID,
            counter
          }) */
        }
      }

      return res.send({ verified })
    })
  })

  app.post('/api/generate-assertion-options', (req, res) => {
    const userID = req.body.userID

    const options = simpleWebauthn.generateAssertionOptions({
      timeout: 60000,
      allowCredentials: usersMem[userID].devices.map(dev => ({
        id: dev.credentialID,
        type: 'public-key',
        transports: ['usb', 'ble', 'nfc', 'internal']
      })),
      userVerification: 'preferred',
      rpID
    })
    usersMem[userID].currentChallenge = options.challenge

    return res.send(options)
  })

  app.post('/api/verify-assertion', (req, res) => {
    const userID = req.body.userID
    const assertionRes = req.body.assertionRes
    const assertionResObj = JSON.parse(assertionRes)
    const expectedChallenge = usersMem[userID].currentChallenge

    let dbAuthenticator
    for (const dev of usersMem[userID].devices) {
      if (dev.credentialID === assertionResObj.id) {
        dbAuthenticator = dev
        break
      }
    }

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
    console.log(verification)

    if (verified) {
      dbAuthenticator.counter = authenticatorInfo.counter
    }

    return res.send({ verified })
  })
}
