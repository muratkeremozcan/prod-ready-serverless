const chance = require('chance').Chance()

describe('Sign in with new user', () => {
  it('should register the new user and log in', () => {
    cy.visit('/')

    const fullName = chance.name()
    const firstName = fullName.split(' ')[0]
    const lastName = fullName.split(' ')[1]
    const userName = `${firstName.toLowerCase()}-${lastName.toLowerCase()}`
    const email = `${userName}@${Cypress.env(
      'MAILOSAUR_SERVERID',
    )}.mailosaur.net`
    const password = chance.string({length: 16})

    cy.registerAndSignIn({
      fullName,
      userName,
      email,
      password,
    })
  })
})
