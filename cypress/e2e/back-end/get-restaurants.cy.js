// @ts-check
import spok from 'cy-spok'

describe(`When we invoke the GET /restaurants endpoint`, () => {
  it(`Should return an array of 8 restaurants`, () => {
    cy.task('we_invoke_get_restaurants').should(
      spok({
        statusCode: 200,
        body: arr =>
          arr.length === 8 &&
          arr.every(restaurant => restaurant.name && restaurant.image),
      }),
    )
  })
})
