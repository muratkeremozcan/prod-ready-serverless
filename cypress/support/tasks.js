const {an_authenticated_user} = require('../../__tests__/steps/given')
const {remove_authenticated_user} = require('../../__tests__/steps/teardown')
const {
  we_invoke_get_restaurants,
  we_invoke_search_restaurants,
} = require('../../__tests__/steps/when')

function tasks(on) {
  on('task', {
    an_authenticated_user,
    remove_authenticated_user,
    we_invoke_get_restaurants,
    we_invoke_search_restaurants,
  })
}

module.exports = tasks
