it('should place an order', () => {
  cy.visit('/')

  cy.registerAndSignIn({
    fullName: Cypress.env('test_fullName'),
    userName: Cypress.env('test_userName'),
    email: Cypress.env('test_email'),
    password: Cypress.env('test_password'),
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
