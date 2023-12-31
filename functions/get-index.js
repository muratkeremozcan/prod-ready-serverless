const {readFileSync} = require('fs')
const Mustache = require('mustache')
const http = require('axios')
const aws4 = require('aws4')
const URL = require('url')
const {Logger, injectLambdaContext} = require('@aws-lambda-powertools/logger')
const logger = new Logger({serviceName: process.env.serviceName})
const middy = require('@middy/core')
// Distributed tracing with X-ray
// const {Tracer, captureLambdaHandler} = require('@aws-lambda-powertools/tracer')
// const tracer = new Tracer({serviceName: process.env.serviceName})

// variables and imports outside the lambda handler are used across lambda invocations
// they're initialized only once, during a cold start

const restaurantsApiRoot = process.env.restaurants_api
const ordersApiRoot = process.env.orders_api
// Secure API Gateway with User Pools:
// enable the UI to register and sign in with the Cognito User Pool
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

// Securing the API Gateway, Protect the API Gateway endpoint with AWS_IAM:
// use aws4.sign() to sign the http request
const getRestaurants = async () => {
  // console.log(`loading restaurants from ${restaurantsApiRoot}...`)
  logger.debug('getting restaurants...', {url: restaurantsApiRoot})

  const url = URL.parse(restaurantsApiRoot)
  const opts = {
    host: url.hostname,
    path: url.pathname,
  }

  aws4.sign(opts)

  // @ts-ignore
  const httpReq = http.get(restaurantsApiRoot, {
    headers: opts.headers,
  })

  // Distributed tracing with X-ray
  // const data = (await httpReq).data
  // tracer.addResponseAsMetadata(data, 'GET /restaurants')
  // return data

  return (await httpReq).data
}

/**
 * @module handler
 * @summary Lambda function for serving the homepage of a restaurant application.
 * @description This lambda function fetches a list of restaurants from an external API, then
 * renders a Mustache template with the fetched data. The homepage shows the day of the week,
 * a list of restaurants, and provides functionality for searching and placing orders.
 * It uses middy middleware for adding lambda context to the logger.
 * @returns {Promise<Object>} The API Gateway response object.
 * The body contains HTML content of the rendered homepage.
 * @throws {Error} If there is an error while fetching restaurants or rendering the template.
 */
const handler = middy(async () => {
  // at the start or end of every invocation to force the logger to re-evaluate
  logger.refreshSampleRateCalculation()

  const restaurants = await getRestaurants()
  // console.log(`found ${restaurants.length} restaurants`)
  logger.debug('got restaurants', {count: restaurants.length})

  const dayOfWeek = days[new Date().getDay()]
  // Secure API Gateway with User Pools:
  // enable the UI to register and sign in with the Cognito User Pool
  const view = {
    awsRegion,
    cognitoUserPoolId,
    cognitoClientId,
    dayOfWeek,
    restaurants,
    searchUrl: `${restaurantsApiRoot}/search`,
    placeOrderUrl: ordersApiRoot,
  }
  const html = Mustache.render(template, view)

  return {
    statusCode: 200,
    headers: {
      'content-type': 'text/html; charset=UTF-8',
    },
    body: html,
  }
}).use(injectLambdaContext(logger))
// .use(captureLambdaHandler(tracer)) // Distributed tracing with X-ray

module.exports = {
  handler,
}
