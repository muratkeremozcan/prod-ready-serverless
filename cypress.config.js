/* eslint-disable no-unused-vars */
const {defineConfig} = require('cypress')
require('dotenv').config()
const chance = require('chance').Chance()

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
const MAILOSAUR_SERVERID = 'x4be6xxf'
const fullName = chance.name()
const firstName = fullName.split(' ')[0]
const lastName = fullName.split(' ')[1]
const userName = `${firstName.toLowerCase()}-${lastName.toLowerCase()}`
const email = `${userName}@${MAILOSAUR_SERVERID}.mailosaur.net`
const password = chance.string({length: 16})

module.exports = defineConfig({
  projectId: '69umec',
  viewportWidth: 1380,
  viewportHeight: 1080,
  env: {
    ...process.env,
    MAILOSAUR_SERVERID,
    MAILOSAUR_API_KEY: 'eRjQZRo8VMvSssIS', // get this from cypress.env.json file later...
    fullName,
    firstName,
    lastName,
    userName,
    email,
    password,
  },
  e2e: {
    baseUrl: getBaseUrl(),
    setupNodeEvents(on, config) {
      return config
    },
  },
})
