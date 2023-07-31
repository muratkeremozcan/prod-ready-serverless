// @ts-check
import spok from 'cy-spok'
describe(`When we invoke the GET / endpoint`, () => {
  it(`Should return the index page with 8 restaurants`, () => {
    cy.viaHttp('', 'GET').should(
      spok({
        status: 200,
        headers: {
          'content-type': 'text/html; charset=UTF-8',
        },
        body: spok.string,
      }),
    )
  })
})
