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
  },
  e2e: {
    baseUrl: getBaseUrl(),
    setupNodeEvents(on, config) {
      return config
    },
  },
})
