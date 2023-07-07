const {DynamoDB} = require('@aws-sdk/client-dynamodb')
const {unmarshall} = require('@aws-sdk/util-dynamodb')
const dynamodb = new DynamoDB()

const defaultResults = process.env.defaultResults || 8
const tableName = process.env.restaurants_table

const getRestaurants = async count => {
  console.log(`fetching ${count} restaurants from ${tableName}...`)
  const req = {
    TableName: tableName,
    Limit: count,
  }
  console.log(`table name: ${tableName}`)

  const resp = await dynamodb.scan(req)
  console.log(`found ${resp.Items.length} restaurants`)

  // unmarshall converts the DynamoDB record into a JS object
  return resp.Items.map(unmarshall)
}

const handler = async () => {
  const restaurants = await getRestaurants(defaultResults)

  return {
    statusCode: 200,
    body: JSON.stringify(restaurants),
  }
}

module.exports = {
  handler,
}
