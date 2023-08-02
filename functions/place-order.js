const {
  EventBridgeClient,
  PutEventsCommand,
} = require('@aws-sdk/client-eventbridge')
const eventBridge = new EventBridgeClient()
const chance = require('chance').Chance()
const {Logger, injectLambdaContext} = require('@aws-lambda-powertools/logger')
const logger = new Logger({serviceName: process.env.serviceName})
const middy = require('@middy/core')

const busName = process.env.bus_name

/**
 * Handles requests to create an order via the POST /orders endpoint.
 * Expects the restaurantName to be passed in the body of the request as a JSON.
 * Upon receiving a request, it publishes an event to the EventBridge bus.
 *
 * @async
 * @param {object} event - The AWS Lambda event object, containing the HTTP request information.
 * @param {string} event.body - The body of the request, which should be a JSON string containing a field 'restaurantName'.
 * @returns {Promise<object>} A Promise that resolves to an HTTP response object. The object has two fields:
 * 'statusCode', which is the HTTP status of the response, and 'body', which is a JSON string containing a field 'orderId'.
 * @throws Will throw an error if the request fails or if publishing the event to EventBridge fails.
 */

const handler = middy(async event => {
  // at the start or end of every invocation to force the logger to re-evaluate
  logger.refreshSampleRateCalculation()

  const restaurantName = JSON.parse(event.body).restaurantName

  const orderId = chance.guid()
  // console.log(`placing order ID [${orderId}] to [${restaurantName}]`)
  logger.debug('placing order...', {orderId, restaurantName})

  const putEvent = new PutEventsCommand({
    Entries: [
      {
        Source: 'big-mouth',
        DetailType: 'order_placed',
        Detail: JSON.stringify({
          orderId,
          restaurantName,
        }),
        EventBusName: busName,
      },
    ],
  })

  try {
    await eventBridge.send(putEvent)
    // console.log(`published 'order_placed' event into EventBridge`)
    logger.debug('published event into EventBridge', {
      eventType: 'order_placed',
      busName,
    })

    // In the real world, you will probably save the order in a DynamoDB table somewhere,
    // but we'll skip that in this demo app to focus on the event processing side of thing

    return {
      statusCode: 200,
      body: JSON.stringify({orderId}),
    }
  } catch (error) {
    logger.error('failed to publish event into EventBridge', {
      eventType: 'order_placed',
      busName,
      error,
    })
  }
}).use(injectLambdaContext(logger)) // log the incoming event
// enriches the log messages with these additional fields:
// - cold_start
// - function_name
// - function_memory_size
// - function_arn
// - function_request_id

module.exports = {
  handler,
}
