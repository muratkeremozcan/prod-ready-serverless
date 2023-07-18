const {
  EventBridgeClient,
  PutEventsCommand,
} = require('@aws-sdk/client-eventbridge')
const eventBridge = new EventBridgeClient()
const chance = require('chance').Chance()

const busName = process.env.bus_name

/**
 * Handles requests to create an order via the POST /orders endpoint.
 * Expects the restaurantName to be passed in the body of the request.
 * Upon receiving a request, it publishes an event to the EventBridge bus.
 *
 * @async
 * @param {object} event - The event containing the request parameters.
 * @param {string} event.body - The body of the event containing the restaurantName.
 * @returns {object} The HTTP response object.
 * @returns {number} .statusCode - The HTTP status of the response.
 * @returns {string} .body - The body of the response containing the orderId.
 * @throws Will throw an error if the request fails.
 */
const handler = async event => {
  const restaurantName = JSON.parse(event.body).restaurantName

  const orderId = chance.guid()
  console.log(`placing order ID [${orderId}] to [${restaurantName}]`)

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
    console.log(`published 'order_placed' event into EventBridge`)

    return {
      statusCode: 200,
      body: JSON.stringify({orderId}),
    }
  } catch (error) {
    console.error(`failed to publish ${orderId} with error: ${error.message}`)
  }
}

module.exports = {
  handler,
}
