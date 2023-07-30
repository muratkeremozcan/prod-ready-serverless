describe('sign in with test user', () => {
  it('should register & log in with the test user', () => {
    cy.visit('/')

    cy.registerAndSignIn({
      fullName: Cypress.env('fullName'),
      userName: Cypress.env('userName'),
      email: Cypress.env('email'),
      password: Cypress.env('password'),
    })
  })
})
