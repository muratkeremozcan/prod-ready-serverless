const {generateRandomUser} = require('../../support/generate-random-user')

it('should place an order', () => {
  cy.visit('/')

  const {fullName, userName, email, password} = generateRandomUser(
    Cypress.env('MAILOSAUR_SERVERID'),
  )

  cy.registerAndSignIn({
    fullName,
    userName,
    email,
    password,
  })

  cy.on('window:alert', cy.stub().as('alert'))
  cy.intercept('POST', '**/orders').as('placeOrder')

  cy.get('#restaurantsUl > :nth-child(1)').click()
  cy.wait('@placeOrder').its('response.statusCode').should('eq', 200)
  cy.get('@alert').should(
    'be.calledWith',
    `your order has been placed, we'll let you know once it's been accepted by the restaurant!`,
  )
})
