const when = require('../__tests__/steps/when')
const teardown = require('../__tests__/steps/teardown')
const given = require('../__tests__/steps/given')
const messages = require('../__tests__/messages')

// skip on everything besides PRs/temp environments
const envStage = process.env.stage
const shouldSkipTests = ['dev', 'stage', 'prod'].includes(envStage)

;(shouldSkipTests ? describe.skip : describe)(
  'Given an authenticated user',
  () => {
    let user, listener
    const restaurantName = 'Fangtasia'

    beforeAll(async () => {
      user = await given.an_authenticated_user()
      listener = messages.startListening()
    })

    afterAll(async () => {
      await teardown.remove_authenticated_user(user)
      await listener.stop()
    })

    describe(`When we invoke the POST /orders endpoint`, () => {
      let resp

      beforeAll(async () => {
        resp = await when.we_invoke_place_order(restaurantName, user)
      })

      it(`Should return 200`, async () => {
        expect(resp.statusCode).toEqual(200)
      })

      it(`Should publish a message to EventBridge bus`, async () => {
        const {orderId} = resp.body
        const expectedMsg = JSON.stringify({
          source: 'big-mouth',
          'detail-type': 'order_placed',
          detail: {
            orderId,
            restaurantName: restaurantName,
          },
        })

        await listener.waitForMessage(
          x =>
            x.sourceType === 'eventbridge' &&
            x.source === process.env.bus_name &&
            x.message === expectedMsg,
        )
      }, 10000)
    })
  },
)
