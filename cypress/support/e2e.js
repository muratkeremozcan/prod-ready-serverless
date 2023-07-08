import './commands'
import 'cypress-mailosaur'
import 'cypress-data-session'

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

/**
 * Registers a new user, retrieves and enters the confirmation code, and signs the user in.
 *
 * @param {Object} param0 - An object containing the user's full name, username, email, and password.
 * @param {string} param0.fullName - The user's full name.
 * @param {string} param0.userName - The user's username.
 * @param {string} param0.email - The user's email address.
 * @param {string} param0.password - The user's password.
 */
const registerUserOnce = ({fullName, userName, email, password}) => {
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

  return getConfirmationCode(email).then(code => {
    cy.get('#verification-code').type(code, {delay: 0})
    cy.contains('button', 'Confirm registration').click()
    cy.wait('@cognito')
    cy.contains('You are now registered!').should('be.visible')
    cy.contains('button', /ok/i).click()
    return cy.wrap(userName) // if the user gets registered, we return their email address
  })
}

const signIn = ({userName, password}) => {
  cy.intercept('POST', 'https://cognito-idp*').as('cognito')
  cy.contains('Sign in').click()
  cy.get('#sign-in-username').type(userName, {delay: 0})
  cy.get('#sign-in-password').type(password, {delay: 0})
  cy.contains('button', 'Sign in').click()
  return cy.wait('@cognito')
}

const registerUser = ({fullName, userName, email, password}) =>
  cy.dataSession({
    name: email, // unique name of the data session will be the email address
    setup: () => registerUserOnce({fullName, userName, email, password}), // yields the registered user's email address to validate and recreate as an argument
    validate: registeredEmail => registeredEmail === email, // if the email address is the same as the registered user's email address, the user is valid, otherwise run setup again
    recreate: () => signIn({userName, password}), // if the user is valid/registered, just sign in with them
    cacheAcrossSpecs: true,
  })
Cypress.Commands.add('registerUser', registerUser)
