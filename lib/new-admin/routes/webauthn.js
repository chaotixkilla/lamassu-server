const simpleWebauthn = require('@simplewebauthn/server')

const rpID = `localhost`
const expectedOrigin = `https://${rpID}:3001`
const usersMem = {}

module.exports = function (app) {
  app.post('/api/generate-attestation-options', (req, res) => {
    const username = req.body.username

    const options = simpleWebauthn.generateAttestationOptions({
      rpName: 'Lamassu',
      rpID,
      userName: 'adminTest',
      userID: 'adminTestID',
      timeout: 60000,
      attestationType: 'indirect',
      excludeCredentials: [],
      authenticatorSelection: {
        userVerification: 'preferred',
        requireResidentKey: false
      }
    })

    usersMem[username] = {
      currentChallenge: options.challenge
    }
    console.log(usersMem)

    return res.send(options)
  })

  app.post('/api/verify-attestation', (req, res) => {
    const username = req.body.username
    const attestationRes = req.body.attestationRes

    console.log(attestationRes)

    const expectedChallenge = usersMem[username].currentChallenge

    return simpleWebauthn.verifyAttestationResponse({
      credential: JSON.parse(attestationRes),
      expectedChallenge: `${expectedChallenge}`,
      expectedOrigin,
      expectedRPID: rpID
    }).then(verification => {
      const { verified, authenticatorInfo } = verification

      /* if (verified && authenticatorInfo) {
        const { base64PublicKey, base64CredentialID, counter } = authenticatorInfo

        const existingDevice = user.devices.find(device => device.credentialID === base64CredentialID)

        if (!existingDevice) {
          user.devices.push({
            publicKey: base64PublicKey,
            credentialID: base64CredentialID,
            counter
          })
        }
      } */

      return res.send({ verified })
    })
  })
}
