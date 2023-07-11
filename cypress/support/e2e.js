import './commands'
import 'cypress-mailosaur'
import 'cypress-data-session'

// ignore random app render errors
// https://cloud.cypress.io/projects/69umec/runs/81b9fbaf-ecc8-4344-bf6c-397034471e1b/test-results/b541f422-9bc6-4437-ad68-43169759844a/screenshots
Cypress.on('uncaught:exception', () => false)

const parseConfirmationCode = str => {
  const regex = /Your confirmation code is (\w+)/
  const match = str.match(regex)

  return match ? match[1] : null
}

export const getConfirmationCode = userEmail => {
  return cy
    .mailosaurGetMessage(Cypress.env('MAILOSAUR_SERVERID'), {
      sentTo: userEmail,
    })
    .should(Cypress._.noop) // no retries, if html body doesn't exist, conf code does not either
    .its('html.body')
    .then(parseConfirmationCode)
}

const fillRegistrationForm = ({fullName, userName, email, password}) => {
  cy.intercept('POST', 'https://cognito-idp*').as('cognito')

  const [firstName, lastName] = fullName.split(' ')
  cy.contains('Register').click()
  cy.get('#reg-dialog-form').should('be.visible')
  cy.get('#first-name').type(firstName, {delay: 0})
  cy.get('#last-name').type(lastName, {delay: 0})
  cy.get('#email').type(email, {delay: 0})
  cy.get('#username').type(userName, {delay: 0})
  cy.get('#password').type(password, {delay: 0})
  cy.contains('button', 'Create an account').click()
  cy.wait('@cognito').its('response.statusCode').should('equal', 200)
}

const confirmRegistration = email =>
  getConfirmationCode(email).then(confirmationCode => {
    cy.intercept('POST', 'https://cognito-idp*').as('cognito')
    cy.get('#verification-code').type(confirmationCode, {delay: 0})
    cy.contains('button', 'Confirm registration').click()
    cy.wait('@cognito')
    cy.contains('You are now registered!').should('be.visible')
    cy.contains('button', /ok/i).click()
    return cy.wrap(confirmationCode)
  })

const register = ({fullName, userName, email, password}) => {
  fillRegistrationForm({fullName, userName, email, password})
  return confirmRegistration(email)
}

const signIn = ({userName, password}) => {
  cy.intercept('POST', 'https://cognito-idp*').as('cognito')
  cy.contains('Sign in').click()
  cy.get('#sign-in-username').type(userName, {delay: 0})
  cy.get('#sign-in-password').type(password, {delay: 0})
  cy.contains('button', 'Sign in').click()
  return cy.wait('@cognito')
}

const registerAndSignIn = ({fullName, userName, email, password}) =>
  cy.dataSession({
    name: email, // unique name of the data session will be the email address. With any new email address, the data session will be recreated
    init: () => register({fullName, userName, email, password}), // only registers initially, yields confirmationCode, calls validate
    setup: () => {
      cy.log('**Called Setup**')
      return confirmRegistration(email)
    },
    validate: confirmationCode => Boolean(confirmationCode), // if confirmationCode is valid/exists, signs in (recreate), if the same user is used again, validates and signs in
    recreate: () => signIn({userName, password}),
    cacheAcrossSpecs: true,
  })
Cypress.Commands.add('registerAndSignIn', registerAndSignIn)
