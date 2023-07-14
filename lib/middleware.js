const middy = require('@middy/core')
const ssm = require('@middy/ssm')
// schema validator challenge
const validator = require('@middy/validator')
const {transpileSchema} = require('@middy/validator/transpile')
const responseSchema = require('../lib/response-schema.json')
// We need to parse the two new environment variables
// because all environment variables would come in as strings
const middyCacheEnabled = JSON.parse(process.env.middy_cache_enabled)
const middyCacheExpiry = parseInt(process.env.middy_cache_expiry_milliseconds)
const {serviceName, ssmStage} = process.env

const commonMiddleware = f =>
  middy(f)
    .use(
      ssm({
        cache: middyCacheEnabled,
        cacheExpiry: middyCacheExpiry,
        setToContext: true,
        fetchData: {
          config: `/${serviceName}/${ssmStage}/search-restaurants/config`,
          secretString: `/${serviceName}/${ssmStage}/search-restaurants/secretString`,
        },
      }),
    )
    .use(validator({responseSchema: transpileSchema(responseSchema)}))

module.exports = {commonMiddleware}

// could do a super customized version of this
/*
const middy = require('@middy/core')
const ssm = require('@middy/ssm')

const commonMiddleware = (f, { fetchDataConfig = true, fetchDataSecretString = true } = {}) => {
  const {serviceName, ssmStage} = process.env
  const middyCacheEnabled = JSON.parse(process.env.middy_cache_enabled)
  const middyCacheExpiry = parseInt(process.env.middy_cache_expiry_milliseconds)

  const fetchData = {
    ...(fetchDataConfig && {config: `/${serviceName}/${ssmStage}/search-restaurants/config`}),
    ...(fetchDataSecretString && {secretString: `/${serviceName}/${ssmStage}/search-restaurants/secretString`}),
  }

  return middy(f).use(
    ssm({
      cache: middyCacheEnabled,
      cacheExpiry: middyCacheExpiry,
      setToContext: true,
      fetchData
    })
  )
}

module.exports = {commonMiddleware}
*/
