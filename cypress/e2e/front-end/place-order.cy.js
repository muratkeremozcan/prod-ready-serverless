// @ts-check
describe('place an order', () => {
  beforeEach(() => {
    cy.visit('/')

    cy.registerAndSignIn({
      fullName: Cypress.env('fullName'),
      userName: Cypress.env('userName'),
      email: Cypress.env('email'),
      password: Cypress.env('password'),
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
