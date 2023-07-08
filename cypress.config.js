/* eslint-disable no-unused-vars */
const {defineConfig} = require('cypress')
require('dotenv').config()

/**
 * Use CloudFront for dev and stage, otherwise (for temp branches) use baseUrl
 */
const getBaseUrl = () => {
  const {deployment, baseUrl, CLOUDFRONT_URL} = process.env
  const url =
    deployment === 'dev' || deployment === 'stage' || deployment === 'prod'
      ? `${CLOUDFRONT_URL}/${deployment}`
      : baseUrl
  return url
}

module.exports = defineConfig({
  projectId: '69umec',
  viewportWidth: 1380,
  viewportHeight: 1080,
  env: {
    ...process.env,
    MAILOSAUR_SERVERID: 'x4be6xxf',
    MAILOSAUR_PASSWORD: 'khgxIn3g',
    MAILOSAUR_API_KEY: 'eRjQZRo8VMvSssIS',
    MAILOSAUR_API: 'https://mailosaur.com/api',
    MAILOSAUR_SERVERNAME: 'cypress-test-server',
  },
  e2e: {
    baseUrl: getBaseUrl(),
    setupNodeEvents(on, config) {
      return config
    },
  },
})
