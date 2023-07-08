const chance = require('chance').Chance()

describe('sign up a new user', () => {
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

    cy.registerUser({
      fullName,
      userName,
      email,
      password,
    })
  })
})
