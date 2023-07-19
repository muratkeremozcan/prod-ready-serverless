describe.skip('sign in with test user', () => {
  it('should register & log in with the test user', () => {
    cy.visit('/')

    cy.registerAndSignIn({
      fullName: Cypress.env('test_fullName'),
      userName: Cypress.env('test_userName'),
      email: Cypress.env('test_email'),
      password: Cypress.env('test_password'),
    })
  })
})
