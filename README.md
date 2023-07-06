```bash
# needs node 18
nvm use
npm i

# configure credentials (needed for deploy and e2e tests)
npx config credentials --provider aws --key <yourAWSAccessKeyId> --secret <AWSSecretKey> --overwrite

# deploy
npm run deploy

# deploy 1 function
npm run deploy -- -f <functionName>

# export env vars to .env file
npm run export:env

# test (unit, integration and e2e)
npm t

# test with Cypress (e2e)
npm run cy:open
npm run cy:run

# lint
npm run lint

# (fix) format
npm run format

# invoke function locally
npx sls invoke local --function get-index
npx sls invoke local --function get-restaurants

# invoke function remotely
npx sls invoke --function get-index
npx sls invoke --function get-restaurants

# you ran into CodeStorage limit exceeded error (too many lambda versions)
# prune the last n versions
npm run sls -- prune -n 2
```
