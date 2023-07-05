const {readFileSync} = require('fs')
const html = readFileSync('static/index.html', 'utf-8')
// variables and imports outside the lambda handler are used across lambda invocations
// they're initialized only once, during a cold start

/**
 * This Lambda function handler serves an HTML page as the response.
 *
 * @param {Object} event - The event object contains information from the invoking service.
 * @param {Object} context - The context object contains information about the invocation, function, and execution environment.
 * @returns {Object} The HTTP response object.
 */
const handler = async () => ({
  statusCode: 200,
  headers: {
    'Content-Type': 'text/html; charset=UTF-8',
  },
  body: html,
})

module.exports = {
  handler,
}
