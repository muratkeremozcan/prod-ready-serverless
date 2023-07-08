describe('sign up a new user', () => {
  it('should register the new user and log in', () => {
    cy.visit('/')

    cy.registerUser({
      fullName: Cypress.env('fullName'),
      userName: Cypress.env('userName'),
      email: Cypress.env('email'),
      password: Cypress.env('password'),
    })
  })
})
