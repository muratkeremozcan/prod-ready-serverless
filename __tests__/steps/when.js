// @ts-check
const {createHeaders} = require('./headers')
const APP_ROOT = '../../'
const {get} = require('lodash')
const http = require('axios')
const mode = process.env.TEST_MODE
// SNS & EventBridge in e2e tests
const {
  EventBridgeClient,
  PutEventsCommand,
} = require('@aws-sdk/client-eventbridge')

const viaEventBridge = async (busName, source, detailType, detail) => {
  // @ts-ignore
  const eventBridge = new EventBridgeClient()
  const putEventsCmd = new PutEventsCommand({
    Entries: [
      {
        Source: source,
        DetailType: detailType,
        Detail: JSON.stringify(detail),
        EventBusName: busName,
      },
    ],
  })
  return await eventBridge.send(putEventsCmd)
}

/** Feeds an event into a lambda function handler and processes the response.
 * If the content-type of the response is 'application/json' and a body is present,
 * the body of the response is parsed from JSON into an object.
 * @async
 * @param {Object} event - The event object to pass to the handler.
 * @param {string} functionName - The name of the handler to execute.
 * @param {Object} [context={}] - The context object to pass to the handler.
 * @returns {Promise<Object>} - The response from the handler, potentially with a parsed body. */
const viaHandler = async (event, functionName, context = {}) => {
  const handler = require(`${APP_ROOT}/functions/${functionName}`).handler

  const response = await handler(event, context)
  // obj, path, defaultValue
  const contentType = get(response, 'headers.content-type', 'application/json')

  return response.body && contentType === 'application/json'
    ? {...response, body: JSON.parse(response.body)}
    : response
}

/** Function to convert HTTP response into the required structure.
 * @param {object} httpRes - The original HTTP response.
 * @returns {object} The response in the required structure. */
const respondFrom = httpRes => ({
  statusCode: httpRes.status,
  body: httpRes.data,
  headers: httpRes.headers,
})

/** Function to make an HTTP request.
 * Pass in an 'opts' object for additional arguments:
 *  - 'body': for POST and PUT requests.
 *  - 'iam_auth': sign the HTTP request with IAM credentials.
 *  - 'auth': for the Authorization header, used for authentication against Cognito-protected endpoints.
 * @async
 * @param {string} relPath - The relative path for the HTTP request.
 * @param {string} method - The HTTP method.
 * @param {object} opts - Optional settings.
 * @returns {Promise<any>} The response from the HTTP request.
 * @throws Will throw an error if the request fails.
 */
const viaHttp = async (relPath, method, opts) => {
  const url = `${process.env.rest_api_url}/${relPath}`
  console.info(`invoking via HTTP ${method} ${url}`)

  try {
    const headers = createHeaders(url, opts)
    const data = get(opts, 'body')

    // @ts-ignore
    const httpReq = http.request({
      method,
      url,
      headers,
      data,
    })

    const res = await httpReq
    console.log({nick: res})
    return respondFrom(res)
  } catch (err) {
    console.log({nick: err})
    if (err.status) {
      return {
        statusCode: err.status,
        headers: err.response.headers,
      }
    } else {
      throw err
    }
  }
}

const we_invoke_get_index = async () =>
  mode === 'http' ? await viaHttp('', 'GET') : await viaHandler({}, 'get-index')

const we_invoke_get_restaurants = async () =>
  mode === 'http'
    ? await viaHttp('restaurants', 'GET', {iam_auth: true})
    : await viaHandler({}, 'get-restaurants')

const we_invoke_search_restaurants = (theme, user) => {
  const body = JSON.stringify({theme})
  const event = {body}
  const auth = user ? user.idToken : null // integration test doesn't require auth

  return mode === 'http'
    ? viaHttp('restaurants/search', 'POST', {body, auth})
    : viaHandler(event, 'search-restaurants')
}

const we_invoke_place_order = async (restaurantName, user) => {
  const body = JSON.stringify({restaurantName})
  const event = {body}
  const auth = user ? user.idToken : null // integration test doesn't require auth

  return mode === 'http'
    ? viaHttp('orders', 'POST', {body, auth})
    : viaHandler(event, 'place-order')
}

const we_invoke_notify_restaurant = async event => {
  if (mode === 'handler') {
    await viaHandler(event, 'notify-restaurant')
  } else {
    const busName = process.env.bus_name
    await viaEventBridge(
      busName,
      event.source,
      event['detail-type'],
      event.detail,
    )
  }
}

module.exports = {
  we_invoke_get_index,
  we_invoke_get_restaurants,
  we_invoke_search_restaurants,
  we_invoke_place_order,
  we_invoke_notify_restaurant,
}
