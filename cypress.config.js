/* eslint-disable no-unused-vars */
const {defineConfig} = require('cypress')
const tasks = require('./cypress/support/tasks')
const chance = require('chance').Chance()
const seedRestaurants = require('./__tests__/setup/seed-restaurants')
const {generateRandomUser} = require('./cypress/support/generate-random-user')
require('dotenv').config()

const MAILOSAUR_SERVERID = 'x4be6xxf'

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
    // MAILOSAUR_API_KEY: '***', // this is in SSM param store & env vars; gets into .env file
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
