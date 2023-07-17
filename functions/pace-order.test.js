const when = require('../__tests__/steps/when')
const teardown = require('../__tests__/steps/teardown')
const given = require('../__tests__/steps/given')
const {EventBridgeClient} = require('@aws-sdk/client-eventbridge')

const mockSend = jest.fn()
EventBridgeClient.prototype.send = mockSend

// note: to validate the events that are sent to EventBridge
// it'll take a bit of extra infrastructure set up.
// Because you can't just call EventBridge and ask what events it had just received on a bus recently.
// You need to subscribe to the bus and capture events in real-time as they happen.
//  We'll explore how to do this in the next couple of lessons. For now, let's just mock these tests.

describe('Given an authenticated user', () => {
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

  describe(`When we invoke the POST /orders endpoint`, () => {
    let resp
    const restaurantName = 'Fangtasia'

    beforeAll(async () => {
      mockSend.mockClear()
      mockSend.mockReturnValue({})

      resp = await when.we_invoke_place_order(restaurantName, user)
    })

    it(`Should return 200`, async () => {
      expect(resp.statusCode).toEqual(200)
    })

    it(`Should publish a message to EventBridge bus`, async () => {
      // the lambda is called, but mockSend is called 0 times
      expect(mockSend).toHaveBeenCalledTimes(1)
      const [[putEventsCmd]] = mockSend.mock.calls

      expect(putEventsCmd.input).toEqual({
        Entries: [
          expect.objectContaining({
            Source: 'big-mouth',
            DetailType: 'order_placed',
            Detail: expect.stringContaining(
              `"restaurantName":"${restaurantName}"`,
            ),
            EventBusName: process.env.bus_name,
          }),
        ],
      })
    })
  })
})
