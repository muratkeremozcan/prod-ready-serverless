const {get} = require('lodash')
const aws4 = require('aws4')
const URL = require('url')

/** Function to sign the HTTP request using IAM credentials.
 * @param {string} url - The URL to be signed.
 * @returns {object} The signed headers. */
const signHttpRequest = url => {
  const urlData = URL.parse(url)
  const opts = {
    host: urlData.hostname,
    path: urlData.pathname,
  }

  aws4.sign(opts)
  return opts.headers
}

// Helper function to create headers
const createHeaders = (url, opts) => {
  const headers = get(opts, 'iam_auth', false) ? signHttpRequest(url) : {}

  const authHeader = get(opts, 'auth')
  return authHeader ? {...headers, Authorization: authHeader} : headers
}

module.exports = {
  createHeaders,
}
