import './commands'
import 'cypress-mailosaur'

/**
 * Parses a confirmation code from a given string.
 *
 * @param {string} str - The string to parse.
 * @returns {(string|null)} The parsed confirmation code or null if no code is found.
 */
const parseConfirmationCode = str => {
  const regex = /Your confirmation code is (\w+)/
  const match = str.match(regex)

  return match ? match[1] : null
}

/**
 * Retrieves an email message and extracts the confirmation code.
 *
 * @param {string} userEmail - The email address to which the message was sent.
 * @returns {(string|null)} The extracted confirmation code or null if no code is found.
 */
const getConfirmationCode = userEmail => {
  return cy
    .mailosaurGetMessage(Cypress.env('MAILOSAUR_SERVERID'), {
      sentTo: userEmail,
    })
    .its('html.body')
    .should('be.a', 'string')
    .then(parseConfirmationCode)
}
Cypress.Commands.add('getConfirmationCode', getConfirmationCode)

/**
 * Registers a new user, retrieves and enters the confirmation code, and signs the user in.
 *
 * @param {Object} param0 - An object containing the user's full name, username, email, and password.
 * @param {string} param0.fullName - The user's full name.
 * @param {string} param0.userName - The user's username.
 * @param {string} param0.email - The user's email address.
 * @param {string} param0.password - The user's password.
 */
const registerUser = ({fullName, userName, email, password}) => {
  const firstName = fullName.split(' ')[0]
  const lastName = fullName.split(' ')[1]

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
}
Cypress.Commands.add('registerUser', registerUser)
