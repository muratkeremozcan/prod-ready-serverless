import {getConfirmationCode} from '../../support/e2e'
const chance = require('chance').Chance()

describe('sign up a new user', () => {
  it('should register the new user and log in', () => {
    cy.visit('/')

    const fullName = chance.name()
    const [firstName, lastName] = fullName.split(' ')
    const userName = `${firstName.toLowerCase()}-${lastName.toLowerCase()}`
    const email = `${userName}@${Cypress.env(
      'MAILOSAUR_SERVERID',
    )}.mailosaur.net`
    const password = chance.string({length: 16})

    cy.intercept('POST', 'https://cognito-idp*').as('cognito')

    cy.contains('Register').click()
    cy.get('#reg-dialog-form').should('be.visible')
    cy.get('#first-name').type(firstName, {delay: 0})
    cy.get('#last-name').type(lastName, {delay: 0})
    cy.get('#email').type(email, {delay: 0})
    cy.get('#username').type(userName, {delay: 0})
    cy.get('#password').type(password, {delay: 0})
    cy.contains('button', 'Create an account').click()
    cy.wait('@cognito').its('response.statusCode').should('equal', 200)

    getConfirmationCode(email).then(code => {
      cy.get('#verification-code').type(code, {delay: 0})
      cy.contains('button', 'Confirm registration').click()
      cy.wait('@cognito')
      cy.contains('You are now registered!').should('be.visible')
      cy.contains('button', /ok/i).click()

      cy.contains('Sign in').click()
      cy.get('#sign-in-username').type(userName, {delay: 0})
      cy.get('#sign-in-password').type(password, {delay: 0})
      cy.contains('button', 'Sign in').click()
      cy.wait('@cognito')

      cy.contains('Sign out')
    })
  })
})
