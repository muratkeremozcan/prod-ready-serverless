// @ts-check
import spok from 'cy-spok'

describe(`When we invoke the POST /restaurants/search endpoint with theme 'cartoon'`, () => {
  let user
  before(() => {
    cy.task('an_authenticated_user').then(u => {
      user = u
    })
  })
  after(() => cy.task('remove_authenticated_user', user))

  it(`Should return an array of 4 restaurants - via cy.request`, () => {
    cy.viaHttp('restaurants/search', 'POST', {
      body: {theme: 'cartoon'},
      auth: user.idToken,
    })
      .should(
        spok({
          status: 200,
          body: arr => arr.length === 4,
        }),
      )
      .its('body')
      .each(
        spok({
          name: spok.string,
          image: spok.string,
        }),
      )
  })
})
