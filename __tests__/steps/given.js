const {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminInitiateAuthCommand,
  AdminRespondToAuthChallengeCommand,
} = require('@aws-sdk/client-cognito-identity-provider')
const chance = require('chance').Chance()

// needs number, special char, upper and lower case
const random_password = () => `${chance.string({length: 8})}B!gM0uth`

/**
 * Creates an authenticated user.
 *
 * @async
 * @returns {Promise<Object>} A promise that resolves to an object containing user details:
 *    - username: a string containing the username of the newly created user.
 *    - firstName: a string containing the first name of the newly created user.
 *    - lastName: a string containing the last name of the newly created user.
 *    - idToken: a string containing the ID token for the newly authenticated user.
 * @throws {Error} Throws an error if there is a problem creating the user or authenticating.
 */
const an_authenticated_user = async () => {
  const cognito = new CognitoIdentityProviderClient()

  const userpoolId = process.env.cognito_user_pool_id
  // const clientId = process.env.cognito_server_client_id // replaced with the below as of SNS & EventBridge in e2e tests > Capture CloudFormation outputs in .env file
  const clientId = process.env.CognitoUserPoolServerClientId

  const firstName = chance.first({nationality: 'en'})
  const lastName = chance.last({nationality: 'en'})
  const suffix = chance.string({length: 8, pool: 'abcdefghijklmnopqrstuvwxyz'})
  const username = `test-${firstName}-${lastName}-${suffix}`
  const password = random_password()
  const email = `${firstName}-${lastName}@big-mouth.com`

  const createReq = new AdminCreateUserCommand({
    UserPoolId: userpoolId,
    Username: username,
    MessageAction: 'SUPPRESS',
    TemporaryPassword: password,
    UserAttributes: [
      {Name: 'given_name', Value: firstName},
      {Name: 'family_name', Value: lastName},
      {Name: 'email', Value: email},
    ],
  })
  await cognito.send(createReq)

  console.log(`[${username}] - user is created`)

  const req = new AdminInitiateAuthCommand({
    AuthFlow: 'ADMIN_NO_SRP_AUTH',
    UserPoolId: userpoolId,
    ClientId: clientId,
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
    },
  })
  const resp = await cognito.send(req)

  console.log(`[${username}] - initialised auth flow`)

  const challengeReq = new AdminRespondToAuthChallengeCommand({
    UserPoolId: userpoolId,
    ClientId: clientId,
    ChallengeName: resp.ChallengeName,
    Session: resp.Session,
    ChallengeResponses: {
      USERNAME: username,
      NEW_PASSWORD: random_password(),
    },
  })
  const challengeResp = await cognito.send(challengeReq)

  console.log(`[${username}] - responded to auth challenge`)

  return {
    username,
    firstName,
    lastName,
    idToken: challengeResp.AuthenticationResult.IdToken,
  }
}

module.exports = {
  an_authenticated_user,
}
