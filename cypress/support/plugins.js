const cyDataSession = require('cypress-data-session/src/plugin')
/**
 * The collection of plugins to use with Cypress
 * @param on  `on` is used to hook into various events Cypress emits
 * @param config  `config` is the resolved Cypress config
 */
module.exports = function plugins(on, config) {
  return {
    // add plugins here
    ...cyDataSession(on, config), // example
  }
}
