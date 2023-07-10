const when = require('../__tests__/steps/when')
const seedRestaurants = require('../__tests__/setup/seed-restaurants')

describe(`When we invoke the POST /restaurants/search endpoint with theme 'cartoon'`, () => {
  beforeAll(seedRestaurants)
  it(`Should return an array of 4 restaurants`, async () => {
    const res = await when.we_invoke_search_restaurants('cartoon')

    expect(res.statusCode).toEqual(200)
    expect(res.body).toHaveLength(4)

    for (let restaurant of res.body) {
      expect(restaurant).toHaveProperty('name')
      expect(restaurant).toHaveProperty('image')
    }
  })
})
