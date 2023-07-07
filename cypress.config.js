/* eslint-disable no-unused-vars */
const {defineConfig} = require('cypress')
require('dotenv').config()

module.exports = defineConfig({
  projectId: '69umec',
  viewportWidth: 1380,
  viewportHeight: 1080,
  env: {
    ...process.env,
  },
  e2e: {
    baseUrl: process.env.baseUrl,
    setupNodeEvents(on, config) {
      return config
    },
  },
})
