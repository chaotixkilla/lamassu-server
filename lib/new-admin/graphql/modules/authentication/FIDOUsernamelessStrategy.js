const simpleWebauthn = require('@simplewebauthn/server')
const base64url = require('base64url')
const _ = require('lodash/fp')

const credentials = require('../../../../credentials')
const T = require('../../../../time')
const users = require('../../../../users')

const REMEMBER_ME_AGE = 90 * T.day

const rpID = `localhost`
const expectedOrigin = `https://${rpID}:3001`

const generateAttestationOptions = (userID, session) => {
  return credentials.getHardwareCredentials().then(devices => {
    const options = simpleWebauthn.generateAttestationOptions({
      rpName: 'Lamassu',
      rpID,
      userName: `Usernameless user created at ${new Date().toISOString()}`,
      userID: userID,
      timeout: 60000,
      attestationType: 'direct',
      excludeCredentials: devices.map(dev => ({
        id: dev.data.credentialID,
        type: 'public-key',
        transports: ['usb', 'ble', 'nfc', 'internal']
      })),
      authenticatorSelection: {
        authenticatorAttachment: 'cross-platform',
        userVerification: 'discouraged',
        requireResidentKey: false
      }
    })

    session.webauthn = {
      attestation: {
        challenge: options.challenge
      }
    }

    return options
  })
}

const generateAssertionOptions = context => {
  return credentials.getHardwareCredentials().then(devices => {
    const options = simpleWebauthn.generateAssertionOptions({
      timeout: 60000,
      allowCredentials: devices.map(dev => ({
        id: dev.data.credentialID,
        type: 'public-key',
        transports: ['usb', 'ble', 'nfc', 'internal']
      })),
      userVerification: 'discouraged',
      rpID
    })

    context.req.session.webauthn = {
      assertion: {
        challenge: options.challenge
      }
    }
    return options
  })
}

const validateAttestation = (userID, attestationResponse, context) => {
  const webauthnData = context.req.session.webauthn.attestation
  const expectedChallenge = webauthnData.challenge

  return users.findById(userID).then(user => {
    return simpleWebauthn.verifyAttestationResponse({
      credential: attestationResponse,
      expectedChallenge: `${expectedChallenge}`,
      expectedOrigin,
      expectedRPID: rpID
    }).then(async verification => {
      const { verified, attestationInfo } = verification

      if (verified && attestationInfo) {
        const {
          fmt,
          counter,
          aaguid,
          credentialPublicKey,
          credentialID,
          credentialType,
          userVerified,
          attestationObject
        } = attestationInfo

        const userDevices = await credentials.getHardwareCredentialsOfUser(user.id)
        const existingDevice = userDevices.find(device => device.data.credentialID === credentialID)

        if (!existingDevice) {
          const newDevice = {
            fmt,
            counter,
            aaguid,
            credentialPublicKey,
            credentialID,
            credentialType,
            userVerified,
            attestationObject
          }
          credentials.createHardwareCredential(user.id, newDevice)
        }
      }

      context.req.session.webauthn = null
      return verified
    })
  })
}

const validateAssertion = (assertionResponse, context) => {
  const expectedChallenge = context.req.session.webauthn.assertion.challenge

  return credentials.getHardwareCredentials().then(async devices => {
    const dbAuthenticator = _.find(dev => {
      return Buffer.from(dev.data.credentialID).compare(base64url.toBuffer(assertionResponse.rawId)) === 0
    }, devices)

    if (!dbAuthenticator.data) {
      throw new Error(`Could not find authenticator matching ${assertionResponse.id}`)
    }

    const convertedAuthenticator = _.merge(
      dbAuthenticator.data,
      { credentialPublicKey: Buffer.from(dbAuthenticator.data.credentialPublicKey) }
    )

    let verification
    try {
      verification = simpleWebauthn.verifyAssertionResponse({
        credential: assertionResponse,
        expectedChallenge: `${expectedChallenge}`,
        expectedOrigin,
        expectedRPID: rpID,
        authenticator: convertedAuthenticator
      })
    } catch (err) {
      console.error(err)
      return false
    }

    const { verified, assertionInfo } = verification

    if (verified) {
      dbAuthenticator.data.counter = assertionInfo.newCounter
      await credentials.updateHardwareCredential(dbAuthenticator)

      const user = await users.findById(dbAuthenticator.user_id)
      const finalUser = { id: user.id, username: user.username, role: user.role }
      context.req.session.user = finalUser
      context.req.session.cookie.maxAge = REMEMBER_ME_AGE
    }

    context.req.session.webauthn = null
    return verified
  })
}

module.exports = {
  generateAttestationOptions,
  generateAssertionOptions,
  validateAttestation,
  validateAssertion
}