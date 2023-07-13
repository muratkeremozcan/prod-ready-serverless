const {commonMiddleware} = require('../lib/middleware')
const {DynamoDB} = require('@aws-sdk/client-dynamodb')
const {marshall, unmarshall} = require('@aws-sdk/util-dynamodb')
const dynamodb = new DynamoDB()
const tableName = process.env.restaurants_table

const findRestaurantsByTheme = async (theme, count) => {
  console.log(`finding (up to ${count}) restaurants with the theme ${theme}...`)
  const req = {
    TableName: tableName,
    Limit: count,
    FilterExpression: 'contains(themes, :theme)',
    ExpressionAttributeValues: marshall({':theme': theme}),
  }

  try {
    const resp = await dynamodb.scan(req)
    console.log(`found ${resp.Items.length} restaurants`)
    return resp.Items.map(x => unmarshall(x))
  } catch (error) {
    console.log(`Error scanning DynamoDB: ${error}`)
  }
}

// Load app configurations from SSM Parameter Store with cache and cache invalidation
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
})
