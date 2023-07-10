const APP_ROOT = '../../'
const {get} = require('lodash')

/** Feeds an event into a lambda function handler and processes the response.
 * If the Content-Type of the response is 'application/json' and a body is present,
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
  const contentType = get(response, 'headers.Content-Type', 'application/json')

  return response.body && contentType === 'application/json'
    ? {...response, body: JSON.parse(response.body)}
    : response
}

// Feeds an event into a lambda function handler and processes the response.
const we_invoke_get_index = () => viaHandler({}, 'get-index')
const we_invoke_get_restaurants = () => viaHandler({}, 'get-restaurants')
const we_invoke_search_restaurants = theme => {
  const event = {
    body: JSON.stringify({theme}),
  }
  return viaHandler(event, 'search-restaurants')
}

module.exports = {
  we_invoke_get_index,
  we_invoke_get_restaurants,
  we_invoke_search_restaurants,
}
