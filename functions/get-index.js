const {readFileSync} = require('fs')
const Mustache = require('mustache')
const http = require('axios')
const aws4 = require('aws4')
const URL = require('url')
// variables and imports outside the lambda handler are used across lambda invocations
// they're initialized only once, during a cold start

const restaurantsApiRoot = process.env.restaurants_api
const cognitoUserPoolId = process.env.cognito_user_pool_id
const cognitoClientId = process.env.cognito_client_id
const awsRegion = process.env.AWS_REGION
const template = readFileSync('static/index.html', 'utf-8')
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

// Protect the API Gateway endpoint with AWS_IAM: use aws4.sign() to sign the http request
const getRestaurants = async () => {
  console.log(`loading restaurants from ${restaurantsApiRoot}...`)
  const url = URL.parse(restaurantsApiRoot)
  const opts = {
    host: url.hostname,
    path: url.pathname,
  }

  aws4.sign(opts)

  const httpReq = http.get(restaurantsApiRoot, {
    headers: opts.headers,
  })
  return (await httpReq).data
}

const handler = async (event, context) => {
  const restaurants = await getRestaurants()
  console.log(`found ${restaurants.length} restaurants`)
  const dayOfWeek = days[new Date().getDay()]
  const view = {
    awsRegion,
    cognitoUserPoolId,
    cognitoClientId,
    dayOfWeek,
    restaurants,
    searchUrl: `${restaurantsApiRoot}/search`,
  }
  const html = Mustache.render(template, view)

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
