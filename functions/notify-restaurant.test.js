const when = require('../__tests__/steps/when')
const messages = require('../__tests__/messages')
const chance = require('chance').Chance()

// skip on everything besides PRs/temp environments
const envStage = process.env.stage
const shouldSkipTests = ['dev', 'stage', 'prod'].includes(envStage)

;(shouldSkipTests ? describe.skip : describe)(
  `When we invoke the notify-restaurant function`,
  () => {
    const event = {
      source: 'big-mouth',
      'detail-type': 'order_placed',
      detail: {
        orderId: chance.guid(),
        restaurantName: 'Fangtasia',
      },
    }

    let listener

    beforeAll(async () => {
      listener = messages.startListening()
      await when.we_invoke_notify_restaurant(event)
    })

    afterAll(async () => {
      await listener.stop()
    })

    it(`Should publish message to SNS`, async () => {
      const expectedMsg = JSON.stringify(event.detail)
      await listener.waitForMessage(
        x =>
          x.sourceType === 'sns' &&
          x.source === process.env.restaurant_notification_topic &&
          x.message === expectedMsg,
      )
    }, 10000)

    it(`Should publish "restaurant_notified" event to EventBridge`, async () => {
      const expectedMsg = JSON.stringify({
        ...event,
        'detail-type': 'restaurant_notified',
      })
      await listener.waitForMessage(
        x =>
          x.sourceType === 'eventbridge' &&
          x.source === process.env.bus_name &&
          x.message === expectedMsg,
      )
    }, 10000)
  },
)
