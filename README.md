# Production ready serverless

dev url: https://d27lew3mfrizo7.cloudfront.net/dev

stage url: https://d27lew3mfrizo7.cloudfront.net/stage

[![prod-ready-serverless](https://img.shields.io/endpoint?url=https://cloud.cypress.io/badge/simple/69umec/main&style=for-the-badge&logo=cypress)](https://cloud.cypress.io/projects/69umec/runs)

An event driven serverless app in NodeJs with API Gateway, Lambda, Cognito,
EventBridge, DDB etc.

In order to execute the tests, you either need an aws account that you can
deploy to, and deploy the app first.

Alternatively you can get a copy of the `.env` file for dev, stage or any temp
branch that pre-exists, and comment out data seeding from Cypress and Jest tests
since you would not have the permissions to seed data to someone else's stack.

```js
// cypress.config.js
await seedRestaurants() // comment out this line

// __tests__/setup/globalSetup.js
await init() // comment out this line
await seedRestaurants() // comment out this line
```

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
npm run cy:open # open mode
npm run cy:run  # CLI/run mode

# lint
npm run lint

# (fix) format
npm run format

# invoke function locally
npx sls invoke local --function get-index
npx sls invoke local --function get-restaurants
npx sls invoke local --function search-restaurants --data '{"body":"{\"theme\": \"theme1\"}"}'
npx sls invoke local --function place-order --data '{"body":"{\"restaurantName\": \"restaurant1\"}"}'

# invoke function remotely
npx sls invoke --function get-index
npx sls invoke --function get-restaurants
npx sls invoke --function search-restaurants --data '{"body":"{\"theme\": \"theme1\"}"}'
npx sls invoke --function place-order --data '{"body":"{\"restaurantName\": \"restaurant1\"}"}'

# you ran into CodeStorage limit exceeded error (too many lambda versions)
# prune the last n versions
npm run sls -- prune -n 2
```

## Working on a branch

```bash
# deploy the temporary stack, the stack name can be anything
# conventionally we match it to the branch name
# npm run sls -- deploy -s tmp
npm run deploy:branch

# export the new env vars to .env file
# npm run sls export-env -- -s tmp --all
npm run export:env-branch

# destroy the branch
# npm run sls -- remove -s tmp
npm run remove:branch
```
