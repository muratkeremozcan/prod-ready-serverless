const {DynamoDB} = require('@aws-sdk/client-dynamodb')
const {unmarshall} = require('@aws-sdk/util-dynamodb')
const middy = require('@middy/core')
const ssm = require('@middy/ssm')
const validator = require('@middy/validator')
const {transpileSchema} = require('@middy/validator/transpile')
const responseSchema = require('../lib/response-schema.json')
const dynamodb = new DynamoDB()
const {serviceName, ssmStage} = process.env
const tableName = process.env.restaurants_table
const {Logger, injectLambdaContext} = require('@aws-lambda-powertools/logger')
const logger = new Logger({serviceName: process.env.serviceName})
// Distributed tracing with X-ray
// const {Tracer, captureLambdaHandler} = require('@aws-lambda-powertools/tracer')
// const tracer = new Tracer({serviceName: process.env.serviceName})
// tracer.captureAWSv3Client(dynamodb)
// We need to parse the two new environment variables
// because all environment variables would come in as strings
const middyCacheEnabled = JSON.parse(process.env.middy_cache_enabled)
const middyCacheExpiry = parseInt(process.env.middy_cache_expiry_milliseconds)

/**
 * GET /restaurants
 * @summary Returns a list of restaurants.
 * @description Get a list of restaurants. The number of restaurants returned
 * can be limited by a count parameter.
 * @param {number} count - The number of restaurants to return (optional).
 * @response 200 - OK
 * @responseContent {Restaurant[]} 200.application/json
 * @response 500 - Error scanning DynamoDB.
 */
const getRestaurants = async count => {
  // at the start or end of every invocation to force the logger to re-evaluate
  logger.refreshSampleRateCalculation()

  // console.log(`fetching ${count} restaurants from ${tableName}...`)
  logger.debug('getting restaurants from DynamoDB...', {
    count,
    tableName,
  })

  const req = {
    TableName: tableName,
    Limit: count,
  }

  try {
    const resp = await dynamodb.scan(req)
    // console.log(`found ${resp.Items.length} restaurants`)
    logger.debug('found restaurants', {
      count: resp.Items.length,
    })
    return resp.Items.map(unmarshall)
  } catch (error) {
    // console.error(`Error scanning DynamoDB: ${error}`)
    logger.error(`Error scanning DynamoDB: ${error}`)
  }
}

// Load app configurations from SSM Parameter store with cache and cache invalidation (instead of env vars)
/**
 * @module handler
 * @summary Lambda function for retrieving a list of restaurants.
 * @description This lambda function retrieves a list of restaurants from DynamoDB.
 * The number of restaurants returned can be limited by `context.config.defaultResults`.
 * It uses middy middleware for fetching SSM parameters, validation, and adding lambda context to the logger.
 * @param {Object} event - The AWS Lambda event object. Not used in this function.
 * @param {Object} context - The AWS Lambda context object.
 * @param {Object} context.config - The configuration object fetched from SSM Parameter store.
 * @param {number} context.config.defaultResults - The number of restaurants to return (optional).
 * @returns {Promise<Object>} The API Gateway response object.
 * The body contains a JSON string with a list of restaurants.
 * @throws {Error} If there is an error scanning DynamoDB.
 */
const handler = middy(async (event, context) => {
  const restaurants = await getRestaurants(context.config.defaultResults)

  return {
    statusCode: 200,
    body: JSON.stringify(restaurants),
  }
})
  .use(
    ssm({
      cache: middyCacheEnabled,
      cacheExpiry: middyCacheExpiry,
      setToContext: true,
      fetchData: {
        config: `/${serviceName}/${ssmStage}/get-restaurants/config`,
      },
    }),
  )
  .use(validator({responseSchema: transpileSchema(responseSchema)}))
  .use(injectLambdaContext(logger))
// .use(captureLambdaHandler(tracer)) // Distributed tracing with X-ray
// [Middy](https://github.com/middyjs/middy) is a middleware engine that lets you run middlewares (basically, bits of logic before and after your handler code runs). To use it you have to wrap the handler code, i.e.
//  This returns a wrapped function, which exposes a **.use** function, that lets you chain middlewares that you want to apply. You can read about how it works [here](https://middy.js.org/docs/intro/how-it-works).
// - **cache: true** tells the middleware to cache the SSM parameter value, so we don't hammer SSM Parameter Store with requests.
// - **cacheExpiry: 1 \* 60 \* 1000** tells the cached value to expire after 1 minute. So if we change the configuration in SSM Parameter Store, then the concurrent executions would load the new value when their cache expires, without needing a deployment.
// - **fetchData: { config: ... }** fetches individual parameters and stores them in either the invocation **context** object or the environment variables. By default, they are stored in the environment variables, but we can use the optional config **setToContext** to tell the middleware to store them in the **context** object instead.
// - notice on line22, where we call the **getRestaurants** function? Now, we're passing **context.config.defaultResults** that we set above.

module.exports = {
  handler,
}
