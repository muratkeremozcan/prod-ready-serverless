const when = require('../__tests__/steps/when')
const teardown = require('../__tests__/steps/teardown')
const given = require('../__tests__/steps/given')

describe(`When we invoke the POST /restaurants/search endpoint with theme 'cartoon'`, () => {
  let user

  // integration test doesn't require auth
  if (process.env.TEST_MODE === 'http') {
    beforeAll(async () => {
      user = await given.an_authenticated_user()
    })
    afterAll(async () => {
      await teardown.remove_authenticated_user(user)
    })
  }

  it(`Should return an array of 4 restaurants`, async () => {
    const res = await when.we_invoke_search_restaurants('cartoon', user)

    expect(res.statusCode).toEqual(200)
    expect(res.body).toHaveLength(4)

    for (let restaurant of res.body) {
      expect(restaurant).toHaveProperty('name')
      expect(restaurant).toHaveProperty('image')
    }
  })
})
