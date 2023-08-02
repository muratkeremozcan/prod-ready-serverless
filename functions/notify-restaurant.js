const {
  EventBridgeClient,
  PutEventsCommand,
} = require('@aws-sdk/client-eventbridge')
const eventBridge = new EventBridgeClient()
const {SNSClient, PublishCommand} = require('@aws-sdk/client-sns')
const sns = new SNSClient()
const {Logger, injectLambdaContext} = require('@aws-lambda-powertools/logger')
const logger = new Logger({serviceName: process.env.serviceName})
const middy = require('@middy/core')

const busName = process.env.bus_name
const topicArn = process.env.restaurant_notification_topic

/**
 * Handles order event from EventBridge and then publishes an SNS message and
 * an EventBridge event to notify the restaurant of the order.
 *
 * @async
 * @param {object} event - The AWS EventBridge event object containing the order details.
 * @param {object} event.detail - The detail field of the event object should contain the order object.
 * @param {string} event.detail.restaurantName - The name of the restaurant.
 * @param {string} event.detail.orderId - The ID of the order.
 * @returns {Promise<object>} A Promise that resolves to an object containing the response of the AWS EventBridge `PutEventsCommand`.
 * @throws Will throw an error if the publishing to SNS or EventBridge fails.
 */
const handler = middy(async event => {
  // at the start or end of every invocation to force the logger to re-evaluate
  logger.refreshSampleRateCalculation()

  const order = event.detail
  const {restaurantName, orderId} = order

  // publish a message to the RestaurantNotificationTopic SNS topic to notify the restaurant of a new order.
  const publishCmd = new PublishCommand({
    Message: JSON.stringify(order),
    TopicArn: topicArn,
  })
  try {
    await sns.send(publishCmd)
    // console.log(`notified restaurant [${restaurantName}] of order [${orderId}]`)
    logger.debug('published message to RestaurantNotificationTopic SNS topic', {
      restaurantName,
      orderId,
    })
  } catch (error) {
    // console.error(
    //   `failed to notify restaurant [${restaurantName}] of order [${orderId}] with error: ${error}`,
    // )
    logger.error(
      'failed to publish message to RestaurantNotificationTopic SNS topic',
      {
        restaurantName,
        orderId,
        error,
      },
    )
    throw error
  }

  // publish an EventBridge event a 'restaurant_notified' event
  const putEventsCmd = new PutEventsCommand({
    Entries: [
      {
        Source: 'big-mouth',
        DetailType: 'restaurant_notified',
        Detail: JSON.stringify(order),
        EventBusName: busName,
      },
    ],
  })
  try {
    const response = await eventBridge.send(putEventsCmd)
    // console.log(`published 'restaurant_notified' event to EventBridge`)
    logger.debug('published event to EventBridge', {
      eventType: 'restaurant_notified',
      restaurantName,
      orderId,
    })

    return response
  } catch (error) {
    // console.error(
    //   `failed to publish order 'restaurant_notified' event for order ${orderId} with error: ${error}`,
    // )
    logger.error('failed to publish event', {
      eventType: 'restaurant_notified',
      restaurantName,
      orderId,
      error,
    })
    throw error
  }
}).use(injectLambdaContext(logger))

module.exports = {handler}
