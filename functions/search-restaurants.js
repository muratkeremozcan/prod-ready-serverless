const {commonMiddleware} = require('../lib/middleware')
const {DynamoDB} = require('@aws-sdk/client-dynamodb')
const {marshall, unmarshall} = require('@aws-sdk/util-dynamodb')
const dynamodb = new DynamoDB()
const tableName = process.env.restaurants_table
const {Logger} = require('@aws-lambda-powertools/logger')
const logger = new Logger({serviceName: process.env.serviceName})

// schema validator challenge
const validator = require('@middy/validator')
const {transpileSchema} = require('@middy/validator/transpile')
const schema = {
  type: 'object',
  properties: {
    body: {
      type: 'string',
      contentMediaType: 'application/json',
      contentSchema: {
        type: 'object',
        properties: {
          theme: {
            type: 'string',
          },
        },
        required: ['theme'],
      },
    },
  },
  required: ['body'],
}
// it is better to enable request validation at the API gateway (vs our code)
// this way, invalid requests do not cost us
// check serverless.yml file: application/json: ${file(lib/search-restaurants-request.json)}

/**
 * Looks for restaurants based on the given theme and returns up to a certain count.
 *
 * @async
 * @param {string} theme - The theme to look for in restaurants.
 * @param {number} count - The maximum number of restaurants to return.
 * @returns {Promise<Array<object>>} A promise that resolves to an array of restaurant objects that match the theme.
 * @throws Will throw an error if the scan operation on DynamoDB fails.
 */
const findRestaurantsByTheme = async (theme, count) => {
  // at the start or end of every invocation to force the logger to re-evaluate
  logger.refreshSampleRateCalculation()

  // console.log(`finding (up to ${count}) restaurants with the theme ${theme}...`)
  logger.debug('finding restaurants...', {
    theme,
    count,
  })

  const req = {
    TableName: tableName,
    Limit: count,
    FilterExpression: 'contains(themes, :theme)',
    ExpressionAttributeValues: marshall({':theme': theme}),
  }

  try {
    const resp = await dynamodb.scan(req)
    // console.log(`found ${resp.Items.length} restaurants`)
    logger.debug('found restaurants...', {count: resp.Items.length})
    return resp.Items.map(unmarshall)
  } catch (error) {
    // console.log(`Error scanning DynamoDB: ${error}`)
    logger.error('Error scanning DynamoDB', {error})
    throw error
  }
}

// Load app configurations from SSM Parameter Store with cache and cache invalidation

/**
 * AWS Lambda event handler function. Handles POST requests to search for restaurants by theme.
 * Parses the 'theme' from the request body and uses it to find matching restaurants.
 * It returns an HTTP response object containing the status code and the array of matching restaurants as JSON.
 *
 * @async
 * @param {object} event - The AWS Lambda event object, containing the HTTP request information.
 * @param {object} context - The AWS Lambda context object, containing runtime information.
 * @param {object} context.config - Configuration object for the handler.
 * @param {number} context.config.defaultResults - The maximum number of results to return.
 * @param {string} event.body - The body of the request, which should be a JSON string containing a field 'theme'.
 * @returns {Promise<object>} A Promise that resolves to an HTTP response object.
 * The object has two fields: 'statusCode', which is the HTTP status of the response, and 'body',
 * which is a JSON string containing an array of matching restaurants.
 */
module.exports.handler = commonMiddleware(async (event, context) => {
  const {theme} = JSON.parse(event.body)
  const restaurants = await findRestaurantsByTheme(
    theme,
    context.config.defaultResults,
  )
  const response = {
    statusCode: 200,
    body: JSON.stringify(restaurants),
  }

  return response
}).use(validator({eventSchema: transpileSchema(schema)}))
