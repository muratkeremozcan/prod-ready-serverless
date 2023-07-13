const middy = require('@middy/core')
const ssm = require('@middy/ssm')
// We need to parse the two new environment variables
// because all environment variables would come in as strings
const middyCacheEnabled = JSON.parse(process.env.middy_cache_enabled)
const middyCacheExpiry = parseInt(process.env.middy_cache_expiry_milliseconds)
const {serviceName, ssmStage} = process.env

const commonMiddleware = f =>
  middy(f).use(
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

module.exports = {commonMiddleware}
