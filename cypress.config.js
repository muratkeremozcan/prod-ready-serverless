/* eslint-disable no-unused-vars */
const {defineConfig} = require('cypress')
require('dotenv').config()
const chance = require('chance').Chance()

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
  retries: 1,
  env: {
    ...process.env,
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
    setupNodeEvents(on, config) {
      return config
    },
  },
})
