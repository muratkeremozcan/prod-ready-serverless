const {
  CognitoIdentityProviderClient,
  AdminDeleteUserCommand,
} = require('@aws-sdk/client-cognito-identity-provider')

/** Deletes a user.
 * @async
 * @param {Object} user - The user to delete.
 * @param {string} user.username - The username of the user to delete.
 * @throws {Error} Throws an error if there is a problem deleting the user.
 */
const an_authenticated_user = async user => {
  const cognito = new CognitoIdentityProviderClient()

  let req = new AdminDeleteUserCommand({
    UserPoolId: process.env.cognito_user_pool_id,
    Username: user.username,
  })
  await cognito.send(req)

  console.log(`[${user.username}] - user deleted`)
}

module.exports = {
  an_authenticated_user,
}
