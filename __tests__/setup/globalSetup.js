// @ts-check
const init = require('./init')
const seedRestaurants = require('./seed-restaurants')

module.exports = async () => {
  await init()
  await seedRestaurants()
}
