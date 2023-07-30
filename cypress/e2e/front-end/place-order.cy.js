const {generateRandomUser} = require('../../support/generate-random-user')

describe('place an order', () => {
  const {fullName, userName, email, password} = generateRandomUser(
    Cypress.env('MAILOSAUR_SERVERID'),
  )
  beforeEach(() => {
    cy.visit('/')

    cy.registerAndSignIn({
      fullName,
      userName,
      email,
      password,
    })
  })

  it('should place an order', () => {
    cy.on('window:alert', cy.stub().as('alert'))
    cy.intercept('POST', '**/orders').as('placeOrder')

    cy.get('#restaurantsUl > :nth-child(1)').click()
    cy.wait('@placeOrder').its('response.statusCode').should('eq', 200)
    cy.get('@alert').should('be.calledOnce')
  })

  it('should do something else', () => {
    cy.log('we are logged in with the same user')
  })
})
