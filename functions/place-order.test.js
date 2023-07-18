const when = require('../__tests__/steps/when')
const teardown = require('../__tests__/steps/teardown')
const given = require('../__tests__/steps/given')
const {EventBridgeClient} = require('@aws-sdk/client-eventbridge')

// note: to validate the events that are sent to EventBridge
// it'll take a bit of extra infrastructure set up.
// Because you can't just call EventBridge and ask what events it had just received on a bus recently.
// You need to subscribe to the bus and capture events in real-time as they happen.
//  We'll explore how to do this in the next couple of lessons. For now, let's just mock these tests.

describe('When we invoke the POST /orders endpoint', () => {
  let user
  let resp
  const restaurantName = 'Fangtasia'

  // integration test doesn't require auth
  if (process.env.TEST_MODE === 'http') {
    beforeAll(async () => {
      user = await given.an_authenticated_user()
    })
    afterAll(async () => {
      await teardown.remove_authenticated_user(user)
    })
  }

  // mockSend is a mock for EventBridgeClient.prototype.send,
  // which sends an event to AWS EventBridge
  // and returns a promise that resolves with the response from AWS EventBridge.
  const mockSend = jest.fn()
  EventBridgeClient.prototype.send = mockSend

  beforeAll(async () => {
    // By calling mockSend.mockReturnValue({}), you're saying that whenever mockSend is called,
    // it should return a Promise that resolves to an empty object.
    // This mimics the behavior of the real EventBridgeClient.prototype.send method,
    // but without actually sending any events to AWS EventBridge.
    mockSend.mockReturnValue({})

    resp = await when.we_invoke_place_order(restaurantName, user)
  })

  it(`Should return 200`, async () => {
    expect(resp.statusCode).toEqual(200)
    expect(resp.body).toHaveProperty('orderId')
  })

  if (process.env.TEST_MODE !== 'http') {
    it(`Should publish a message to EventBridge bus`, async () => {
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
  }
})

// mock.calls cheat sheet

/*
Each entry in the mock.calls array represents a call to the mock function, 
and inside each of these entries, Jest stores the arguments used for that specific call 
in the order they were received.

For instance, if you had a mock function that was called twice:

mockSend('argument1', 'argument2')
mockSend('argument3', 'argument4')

Then mock.calls would look like this:
[
  ['argument1', 'argument2'],
  ['argument3', 'argument4']
]

*/
