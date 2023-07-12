/* eslint-disable no-unused-vars */
const {defineConfig} = require('cypress')
const tasks = require('./cypress/support/tasks')
const chance = require('chance').Chance()
const seedRestaurants = require('./__tests__/setup/seed-restaurants')
require('dotenv').config()

const MAILOSAUR_SERVERID = 'x4be6xxf'
const fullName = chance.name()
const [firstName, lastName] = fullName.split(' ')
const userName = `${firstName.toLowerCase()}-${lastName.toLowerCase()}-${chance.string(
  {
    length: 5,
  },
)}`
const email = `${userName}@${MAILOSAUR_SERVERID}.mailosaur.net`
const password = chance.hash({length: 16})

module.exports = defineConfig({
  projectId: '69umec',
  viewportWidth: 1380,
  viewportHeight: 1080,
  retries: {
    runMode: 2,
    openMode: 0,
  },
  env: {
    ...process.env,
    TEST_MODE: 'http', // for demoing how to map Jest to cy.task 1:1
    MAILOSAUR_SERVERID,
    MAILOSAUR_API_KEY: 'eRjQZRo8VMvSssIS', // get this from cypress.env.json file later...
    test_fullName: fullName,
    test_firstName: firstName,
    test_lastName: firstName,
    test_userName: userName,
    test_email: email,
    test_password: password,
  },
  e2e: {
    baseUrl: process.env.baseUrl,
    setupNodeEvents: async (on, config) => {
      await seedRestaurants() // seed once as Cypress opens

      tasks(on)
      return config
    },
  },
})
