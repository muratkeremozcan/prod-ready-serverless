const when = require('../__tests__/steps/when')
const chance = require('chance').Chance()
const {EventBridgeClient} = require('@aws-sdk/client-eventbridge')
const {SNSClient} = require('@aws-sdk/client-sns')

const mockEvbSend = jest.fn()
EventBridgeClient.prototype.send = mockEvbSend

const mockSnsSend = jest.fn()
SNSClient.prototype.send = mockSnsSend

describe(`When we invoke the notify-restaurant function`, () => {
  if (process.env.TEST_MODE !== 'http') {
    beforeAll(async () => {
      mockEvbSend.mockClear()
      mockSnsSend.mockClear()

      mockEvbSend.mockReturnValue({})
      mockSnsSend.mockReturnValue({})

      const event = {
        source: 'big-mouth',
        'detail-type': 'order_placed',
        detail: {
          orderId: chance.guid(),
          userEmail: chance.email(),
          restaurantName: 'Fangtasia',
        },
      }
      await when.we_invoke_notify_restaurant(event)
    })

    it(`Should publish message to SNS`, async () => {
      expect(mockSnsSend).toHaveBeenCalledTimes(1)
      const [publishCmd] = mockSnsSend.mock.calls[0]

      expect(publishCmd.input).toEqual({
        Message: expect.stringMatching(`"restaurantName":"Fangtasia"`),
        TopicArn: expect.stringMatching(
          process.env.restaurant_notification_topic,
        ),
      })
    })

    it(`Should publish event to EventBridge`, async () => {
      expect(mockEvbSend).toHaveBeenCalledTimes(1)
      const [putEventsCmd] = mockEvbSend.mock.calls[0]
      expect(putEventsCmd.input).toEqual({
        Entries: [
          expect.objectContaining({
            Source: 'big-mouth',
            DetailType: 'restaurant_notified',
            Detail: expect.stringContaining(`"restaurantName":"Fangtasia"`),
            EventBusName: process.env.bus_name,
          }),
        ],
      })
    })
  } else {
    it('no acceptance test', () => {})
  }
})
