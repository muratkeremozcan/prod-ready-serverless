const {DynamoDB} = require('@aws-sdk/client-dynamodb')
const {marshall, unmarshall} = require('@aws-sdk/util-dynamodb')
const dynamodb = new DynamoDB()

const defaultResults = process.env.defaultResults || 8
const tableName = process.env.restaurants_table

const findRestaurantsByTheme = async (theme, count) => {
  console.log(`finding (up to ${count}) restaurants with the theme ${theme}...`)

  const req = {
    TableName: tableName,
    Limit: count,
    FilterExpression: 'contains(themes, :theme)',
    // marshall converts the JS object to DDB record
    ExpressionAttributeValues: marshall({':theme': theme}),
  }

  const resp = await dynamodb.scan(req)
  console.log(`found ${resp.Items.length} restaurants`)
  return resp.Items.map(unmarshall)
}

const handler = async (event, context) => {
  const req = JSON.parse(event.body)
  const theme = req.theme
  const restaurants = await findRestaurantsByTheme(theme, defaultResults)

  return {
    statusCode: 200,
    body: JSON.stringify(restaurants),
  }
}

module.exports = {
  handler,
}
