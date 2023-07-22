describe.skip('sign in with test user', () => {
  it('should register & log in with the test user', () => {
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
  })
})
