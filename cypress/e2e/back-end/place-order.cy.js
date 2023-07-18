import spok from 'cy-spok'

describe(`When we invoke the POST /orders endpoint`, () => {
  let user
  before(() => {
    cy.task('an_authenticated_user').then(u => {
      user = u
    })
  })
  after(() => cy.task('remove_authenticated_user', user))

  it(`Should publish a message to EventBridge bu`, () => {
    cy.viaHttp('orders', 'POST', {
      body: {theme: 'Fangtasia'},
      auth: user.idToken,
    }).should(
      spok({
        status: 200,
        body: {
          orderId: spok.string,
        },
      }),
    )
  })
})
