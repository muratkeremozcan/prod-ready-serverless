const Mustache = require('mustache')
const {readFileSync} = require('fs')
const http = require('axios')
// variables and imports outside the lambda handler are used across lambda invocations
// they're initialized only once, during a cold start

const restaurantsApiRoot = process.env.restaurants_api
const days = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

let html

function loadHtml() {
  if (!html) {
    console.log('loading index.html')
    html = readFileSync('static/index.html', 'utf-8')
    console.log('loaded index.html')
  }

  return html
}

const getRestaurants = async () => (await http.get(restaurantsApiRoot)).data

/**
 * This Lambda function handler serves an HTML page as the response.
 *
 * @param {Object} event - The event object contains information from the invoking service.
 * @param {Object} context - The context object contains information about the invocation, function, and execution environment.
 * @returns {Object} The HTTP response object.
 */
const handler = async (event, context) => {
  const template = loadHtml()
  const restaurants = await getRestaurants()
  const dayOfWeek = days[new Date().getDay()]
  const html = Mustache.render(template, {dayOfWeek, restaurants})

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
    },
    body: html,
  }
}

module.exports = {
  handler,
}
