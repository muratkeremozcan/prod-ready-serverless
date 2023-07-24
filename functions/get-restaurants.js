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
// We need to parse the two new environment variables
// because all environment variables would come in as strings
const middyCacheEnabled = JSON.parse(process.env.middy_cache_enabled)
const middyCacheExpiry = parseInt(process.env.middy_cache_expiry_milliseconds)

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
// [Middy](https://github.com/middyjs/middy) is a middleware engine that lets you run middlewares (basically, bits of logic before and after your handler code runs). To use it you have to wrap the handler code, i.e.
//  This returns a wrapped function, which exposes a **.use** function, that lets you chain middlewares that you want to apply. You can read about how it works [here](https://middy.js.org/docs/intro/how-it-works).
// - **cache: true** tells the middleware to cache the SSM parameter value, so we don't hammer SSM Parameter Store with requests.
// - **cacheExpiry: 1 \* 60 \* 1000** tells the cached value to expire after 1 minute. So if we change the configuration in SSM Parameter Store, then the concurrent executions would load the new value when their cache expires, without needing a deployment.
// - **fetchData: { config: ... }** fetches individual parameters and stores them in either the invocation **context** object or the environment variables. By default, they are stored in the environment variables, but we can use the optional config **setToContext** to tell the middleware to store them in the **context** object instead.
// - notice on line22, where we call the **getRestaurants** function? Now, we're passing **context.config.defaultResults** that we set above.

module.exports = {
  handler,
}
