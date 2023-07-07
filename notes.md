## Lambda EFS integration

Lambda offers a number of storage options:

1. **Lambda Layers:** These allow for bundling of additional libraries as part
   of the Lambda function deployment package. A function can have up to five
   layers and this can be an effective way to bundle large dependencies.
   However, layers are static once deployed, and the contents can only be
   changed by deploying a new version.

2. **Temporary Storage with /tmp:** The Lambda execution environment offers a
   /tmp file system with a fixed size of 512 MB, which became 10 GB (same as
   EFS) in 2022. Each Lambda function has its own instance of `/tmp` directory
   and they don’t share any data. It is intended for ephemeral storage and
   should be used for data required for a single invocation. More performant
   than EFS (10x).

3. **Amazon EFS:** This is a fully managed, elastic, shared file system that
   integrates with other AWS services, and can be mounted in Lambda functions.
   It allows for sharing of data across invocations, supports standard file
   operations and is ideal for deploying code libraries or working with packages
   that exceed the limit of layers. Compared to S3, EFS is slightly faster and
   has more predictable latency. Has no impact on cold start performance. We can
   use Provisioned concurrency to mitigate the high read latency.

4. **Amazon S3:** This object storage service scales elastically, offering high
   availability and durability. Ideal for storing unstructured data such as
   images, media, log files and sensor data, it features event integrations with
   Lambda and allows for automated workflows.

So EFS has 10GB limit (same as /tmp), slower than /tmp, but can share data
between all the components (Lambda functions, EC2 instances or containers) that
are connected to the same EFS file system.

General rule of thumb is to use S3 for storing user data, whereas EFS & /tmp are
useful for storing system data, and only use Lambda layers as an optimization to
avoid uploading the same dependencies over & over.

> From Yan: I’ve come across very few legit use cases for using the /tmp folder,
> the best two is to 1) download large static file at cold start and then cache
> it in the /tmp folder, and 2) clone git repos into
>
> Same goes for EFS, can be useful for putting large files, like ML models in
> there, so you can share it with multiple functions, and get some benefit from
> the caching at the NFS layer, which might make it faster to load than S3

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/4vrlxp6wvvm13c165s7r.png)

## Lambda extensions

Lambda extensions allows to do background tasks that you do not want to do
during lambda invocations, in between lambda invocations.

Built-in background tasks: ship logs to CloudWatch Logs, put CloudWatch Metrics,
put X-ray traces.

What if you don't use CloudWatch logs? Lambda extensions allow vendors to do
their thing during the invocations.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/3023ykh6codjvbg1l5pw.png)

Existing Application Performance Management (APM) solutions require the
deployment of an agent or daemon to collect and send telemetry data. Prior to
AWS Lambda Extensions, it was difficult to install these agents/daemons on
Lambda due to constraints, leading to challenges for third-party vendors who had
to choose between sending telemetry data at the end of each invocation or
writing telemetry data to CloudWatch Logs, both of which have their
disadvantages.

Lambda Extensions, however, are scripts that run alongside code, receiving
updates about functions via a poll-based API. These can be internal (modifying
the Lambda runtime environment and running in-process with code) or external
(running in a separate process to code). They can impact the performance of
functions, given they share the same resources - CPU, memory, storage, and
network bandwidth. Lambda Extensions thus change the lifecycle of a Lambda
Execution Environment with additional steps during initialization, invocation,
and shut down. Lambda Extensions allow vendors to offer more comprehensive
observability, security, and governance.

When should we use Lambda Extensions? Letting the lambda runtime ship your logs
to CloudWatch Logs is simpler in most cases, even if we have to ship them to
another log application platform later. But, if the CloudWatch Logs costs are
getting expensive, and it is worth optimizing at the expense of seeing your logs
with a higher latency, then do it.

## Provisioned Concurrency

[Provisioned Concurrency - the end of cold starts](https://lumigo.io/blog/provisioned-concurrency-the-end-of-cold-starts/#:~:text=Once%20enabled%2C%20Provisioned%20Concurrency%20will,at%20lunch%20and%20dinner%20time.)
: Once enabled, Provisioned Concurrency will keep your desired number of
concurrent executions initialized and ready to respond to requests. This means
an end to cold starts!

Mind that when provisioned concurrency happens, the init duration does not seem
to change. It still happens, but happens ahead of time; that's why it feels much
faster but still reports a high duration.

**Difference between Provisioned Concurrency and warm starts**: It's about the
instances. Warm start is 1 instance of the lambda, and the rest still cold
start. P.C. can be set to scale

From Yan: _The actual problem with warm starts is that they don't scale beyond
keeping a handful of instances of your functions warm because there's no way to
direct an invocation to specific instances (ie. worker) of a function. So if you
have a handful of functions and you just need to keep 1 instance of each warm
for a low throughput API, then warmers are a good, cheap way to do it compared
to using Provisioned Concurrency. But if you need an enterprise-scale solution
that can keep 50, 100 instances of your functions warm, and auto-scale the no.
of warm instances based on traffic patterns or based on a schedule, and you
don't mind (potentially) paying extra for these, then use Provisioned
Concurrency. I said potentially paying extra, because Provisioned Concurrency
can actually work out cheaper than on-demand concurrency if you have good
utilization of the Provisioned Concurrency you have (~60% is the break-even
point)._

When to use Provisioned Concurrency?

- When we cannot optimize cold start any further.

- Cold starts are stacking up in a service call (spiky traffic).

## Lambda Destinations

Lambda Destinations allows to configure a destination / target, so that when an
event succeeds or fails, the target receives a notification.

Destinations feature provides a simple, powerful mechanism to handle the
asynchronous invocations of your AWS Lambda functions.

In an asynchronous invocation, when a function is invoked, AWS Lambda sends the
event to a queue. A separate process reads events from the queue and runs your
function. When all retries fail, or if the function returns an error, Lambda can
direct the failed event record to a dead-letter queue (DLQ), an SNS topic, or a
Lambda function (configured via the function's on-failure destination), which
developers can then handle in their own way.

The Lambda Destinations feature takes this further by providing routing options
for both successful and failed function invocations. This means you can specify
different destinations for success (on-success destination) and failure
scenarios (on-failure destination), thus making the error handling and event
management more streamlined and effective.

Destinations could be another Lambda function, an Amazon SNS topic, an Amazon
SQS queue, or an Amazon EventBridge event bus.

For failure events, prefer Lambda Destinations to DLQs.

For success events, if it is a simple 1 hop, use Lambda Destinations over
complex step functions.

## CloudFormation

IaC. Template -> Stack

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/dkdoz8ta1u1i1mm5ggag.png)

Parameters are like values.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/vkgrcsyofg9054ntc3l3.png)

Resources are where you define the AWS resources you want CloudFormation to
provision.

[CloudFormation Ref & GetAtt cheatsheet](https://theburningmonk.com/cloudformation-ref-and-getatt-cheatsheet/)

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/mqst1yqvpwbp7vzty57u.png)

## IAM

Identity and Access Management.

Who or What can access which AWS resources.

- Users:

- Groups: collections of Users

- Policies: where the permissions are defined, to access AWS resources via Allow
  or Deny statements

- Roles: collection of permissions, assumed by Users or AWS resources

## Exercise: create a serverless project

```bash
  mkdir hello-world
  cd hello-world
  npm init -y
  npm i -D serverless
  npx sls create --template aws-nodejs
```

At `serverless.yml` renamed the service and modify the function

```yml
# ./serverless.yml

service: hello-world-murat
frameworkVersion: '3'

provider:
  name: aws
  runtime: nodejs18.x

functions:
  hello:
    handler: functions/hello.handler
    # When you use the http event in Serverless Framework with AWS as your provider,
    # it automatically creates an Amazon API Gateway for you
    # the properties you set under the http key (like path, method, and cors) define the configuration for this API Gateway.
    events:
      - http:
          path: /
          method: get
          cors: true
  goodbye:
    handler: functions/goodbye.handler
    events:
      - http:
          path: /goodbye
          method: get
          cors: true
```

Invoke a function locally

```bash
npx sls invoke local --function hello
npx sls invoke local --function hello -p test.json
```

You can also invoke the function with a debugger. Use the VScode
`JavaScript Debug Terminal`.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/0rneerke8zgxsr8bvi1u.png)

Deploy

```bash
# configure credentials (needed for deploy and e2e tests)
npx sls config credentials --provider aws --key <yourAWSAccessKeyId> --secret <AWSSecretKey> --overwrite

npx sls deploy
```

Invoke the function remotely:

```bash
npx sls invoke --function hello
npx sls invoke --function goodbye
```

Curl the function:

```bash
curl https://5zysn8bmui.execute-api.us-east-1.amazonaws.com/dev/
curl https://5zysn8bmui.execute-api.us-east-1.amazonaws.com/dev/goodbye
```

Delete the stack

```bash
npx sls remove
```

By default, the Serverless Framework deploys your resources to the **us-east-1**
region in AWS. It also defaults the project stage to **dev**, so all the Lambda
functions and APIs would have "dev" as part of their names.

You can override both the deployed region and stage using CLI command line
override. So you can just as easily deploy your resources to another AWS region,
or create another stage - "test", "staging", "production", whatever.

Combine this with the fact that with serverless components like Lambda and API
Gateway, you only pay for them when you use them, it makes a lot of sense to use
temporary stages when working on features (or even in the CI/CD pipeline) so
each developer can have his/her own environment.

```bash
npx sls deploy --stage test
```

Remove the stack

```bash
npx sls remove --stage test
```

## DDB

**DynamoDB is Amazon’s NoSQL database**. Tables, items, and attributes are
Dynamo’s main concepts.

A **table** stores a collection of **items**. An item is made up of a collection
of **attributes**.

Each attribute is a simple piece of data such as a person’s name or phone
number.

multi-AZ by default

multi-region via global tables (by request)

Here there is one table, with a few items, the attributes being name, image,
themes.

The primary key consists of just the partition key `name`. So, `name` attribute
has to be unique in the table

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/mwutpn2sf92lnnvrb5cv.png)

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/g7sqd04v9m8jteillqg2.png)

On-demand mode is good for unpredictable workload; pay for what you use.

Provisioned mode is good for predictable and consistent workload.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/eh51gcqgw2ldxgx63xhb.png)

Prefer to search for items via Query (partition key + sort key)

Avoid Scan if possible

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/23qxe74igxpvcdlbu7lg.png)

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/24jupinzpv7ityfjeogw.png)

## API Gateway

The Amazon API Gateway is a service that you can use to create an API layer
between the frontend and backend services (an http router).

Allows multiple versions of the API to be run at the same time, and it supports
multiple release stages such as development, staging, and production. Supports
Authentication, Request Validation, Rate Limiting, Web-sockets, Caching,
Monitoring, custom domain names, integrates with web application firewall (WAF).

The API is defined around resources and methods. A resource is a logical entity
such as a user or product. A method is a combination of an HTTP verb (such as
GET, POST, PUT, or DELETE) and the resource path.

## Create an API with API gateway and Lambda

```js
// ./functions/get-index.js

const {readFileSync} = require('fs')
const html = readFileSync('static/index.html', 'utf-8')
// variables and imports outside the lambda handler are used across lambda invocations
// they're initialized only once, during a cold start

/**
 * This Lambda function handler serves an HTML page as the response.
 *
 * @param {Object} event - The event object contains information from the invoking service.
 * @param {Object} context - The context object contains information about the invocation, function, and execution environment.
 * @returns {Object} The HTTP response object.
 */
const handler = async (event, context) => {
  const response = {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
    },
    body: html,
  }

  return response
}

module.exports = {
  handler,
}
```

```yml
# ./serverless.yml

service: workshop-${self:custom.name}

frameworkVersion: '3'

custom:
  name: murat

provider:
  name: aws
  runtime: nodejs18.x

functions:
  get-index:
    handler: functions/get-index.handler
    # When you use the http event in Serverless Framework with AWS as your provider,
    # it automatically creates an Amazon API Gateway for you
    # the properties you set under the http key (like path, method, and cors) define the configuration for this API Gateway.
    events:
      - http:
          path: /
          method: get
          cors: true
```

(Also add a file **index.html** under the newly created **static** folder.)

`npm run deploy`

```bash
# needs node 18
nvm use
npm i # may need force

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

# generate cloud formation template
npm run sls -- package

# you ran into CodeStorage limit exceeded error (too many lambda versions)
# prune the last n versions
npm run sls -- prune -n 2

# invoke function locally
npm run sls invoke local --function get-index

# invoke function remotely
npm run sls invoke --function get-index
```

Deploy and verify by visiting the url
https://1h4wvq2hr3.execute-api.us-east-1.amazonaws.com/dev/.

---

When you declare functions and variables in a Lambda function, whether you
should declare them inside the handler or outside depends on several factors.

Declaring functions and variables outside the handler pros:

1. **Usage across multiple invocations:** Global variables and functions (those
   declared outside of the handler function) can be used across multiple
   invocations of the Lambda function during the lifetime of the container. AWS
   Lambda reuses the container for multiple invocations of the function, so any
   state (like data in global variables) is preserved between invocations. This
   can be beneficial if you want to store data or state that can be reused
   across invocations.
2. **Initialization cost:** Initializing functions and variables outside the
   handler means they're initialized only once, during a cold start. If the
   initializations are computationally expensive or require network calls (like
   setting up a database connection), doing so globally can save time and
   resources over doing the same work on every invocation.
3. **Cleanliness of code:** Separating variable and function declarations (i.e.,
   putting them outside the handler) can make your code cleaner and easier to
   read, especially if you follow a modular programming approach.

Declaring functions and variables inside the handler pros:

1. **State isolation:** If your functions and variables are stateful and you
   want the state to be completely isolated between invocations (meaning no
   state from one invocation is seen by another), then you should declare them
   inside the handler. For example, if you have a variable that holds
   user-specific data and you don't want data from one user to accidentally leak
   to another, you should declare the variable inside the handler.

2. **Testability:** Code that's inside the handler function can be easier to
   test, since you can invoke the handler function in a controlled environment
   and mock any dependencies.

When a Node.js Lambda function cold starts, a number of things happen:

- the Lambda service has to find a server with enough capacity to host the new
  container
- the new container is initialized
- the Node.js runtime is initialized
- your handler module is initialized, which includes initializing any global
  variables and functions you declare outside the handler function

To reduce cold starts

- Use lean imports; if you need just DDB, don't import the whole AWS SDK

- Prefer not to instrument the code if it can be helped (x-ray sdk)

- Use module bundlers (webpack, esbuild). But note that the impact in the
  experiments was not significant when the full AWS SDK was used. The greatest
  improvement was observed when only the DynamoDB client was required.

  > Yan says: I don't do bundling anymore, run into a few problems and it's
  > changed my mind about bundling. Problem is with the source maps, for
  > non-trivial projects, they get really big (affects cold start) and unhandled
  > exceptions add quite a bit of latency (took seconds to get a 502 back in one
  > API)

---

## Creating the Restaurants API

In server-side rendering use cases, it's common for you to call other backend
APIs to collect the necessary data to render the intended HTML.

To simulate this behaviour, we're going to display a list of restaurants on the
landing page. We need to create a new Restaurants API and add an endpoint to
return a list of restaurants. The **get-index** function would call this
endpoint to fetch a page of restaurants and then render them into the HTML
output.

In practice, the Restaurants API would be a separate API with its own repo and
serverless.yml and CI/CD pipeline. This API would also likely have a number of
different endpoints to support numerous CRUD operations. But, for simplicity's
sake, we'll add a **GET /restaurants** endpoint to our existing project.

```bash
npm i -D @aws-sdk/client-dynamodb @aws-sdk/util-dynamodb
```

Notice that here we are installing the AWS SDK as a dev dependency to the
project instead of a production dependency. The reason for this is that the
**AWS SDK is already available in the Lambda execution environment, so we don't
need to include it in our bundle, which helps reduce deployment time and also
helps improve Lambda's cold start performance as well.**

```js
// ./functions/get-restaurants.js

const {DynamoDB} = require('@aws-sdk/client-dynamodb')
const {unmarshall} = require('@aws-sdk/util-dynamodb')
const dynamodb = new DynamoDB()

const defaultResults = process.env.defaultResults || 8
const tableName = process.env.restaurants_table

const getRestaurants = async count => {
  console.log(`fetching ${count} restaurants from ${tableName}...`)
  const req = {
    TableName: tableName,
    Limit: count,
  }

  const resp = await dynamodb.scan(req)
  console.log(`found ${resp.Items.length} restaurants`)

  // unmarshall converts the DynamoDB record into a JS object
  return resp.Items.map(x => unmarshall(x))
}

const handler = async () => {
  const restaurants = await getRestaurants(defaultResults)

  return {
    statusCode: 200,
    body: JSON.stringify(restaurants),
  }
}

module.exports = {
  handler,
}
```

```yml
# ./serverless.yml

service: workshop-${self:custom.name}

frameworkVersion: '3'

custom:
  name: murat
  export-env:
    overwrite: true

provider:
  name: aws
  runtime: nodejs18.x
  iam:
    role:
      statements:
        - Effect: Allow
          Action: dynamodb:scan
          Resource: !GetAtt RestaurantsTable.Arn

plugins:
  # exports the environment variables to a **.env** file.
  - serverless-export-env

functions:
  get-index:
    handler: functions/get-index.handler
    # When you use the http event in Serverless Framework with AWS as your provider,
    # it automatically creates an Amazon API Gateway for you
    # the properties you set under the http key (like path, method, and cors) define the configuration for this API Gateway.
    events:
      - http:
          path: /
          method: get
          cors: true

  get-restaurants:
    handler: functions/get-restaurants.handler
    events:
      - http:
          path: /restaurants
          method: get
          cors: true
    # Notice that the restaurants_table environment variable is referencing (using the CloudFormation pseudo function !Ref)
    environment:
      restaurants_table: !Ref RestaurantsTable

# everything under the lower case resources section is custom CloudFormation resources
# that you want to include in the CloudFormation template, all in raw CloudFormation
resources:
  Resources:
    # RestaurantsTable is called the logical Id in CloudFormation,
    # it is a unique id in the CloudFormation template
    # use !Ref or !GetAtt functions to reference a resource
    RestaurantsTable:
      Type: AWS::DynamoDB::Table
      Properties:
        # DDB has 2 billing modes, PAY_PER_REQUEST (on demand) and provisioned
        BillingMode: PAY_PER_REQUEST
        # DynamoDB operates with HASH and RANGE keys as the schemas you need to specify
        # When you specify an attribute in the key schema
        # you also need to add them to the AttributeDefinitions list so you can specify their type
        AttributeDefinitions:
          - AttributeName: name
            AttributeType: S
        KeySchema:
          - AttributeName: name
            KeyType: HASH

  # Since we have added a DynamoDB table to the stack as a custom resource,
  # it's useful to add its name to the stack output.
  # It's not required for the application to work,
  # but it's a good practice to keep important resource information (like DynamoDB table names)
  # in the CloudFormation output so they're easier to find.
  Outputs:
    RestaurantsTableName:
      Value: !Ref RestaurantsTable
```

Deploy wit `npm run deploy`.

The DynamoDB table name is randomly generated, how do we write this script so
that it doesn't require us to go into the AWS console and copy the name of the
table?

There are a couple of solutions to this:

1. Use the
   [**serverless-export-env**](https://github.com/arabold/serverless-export-env/)
   plugin to export the environment variables to a **.env** file.
2. Programmatically reference the **RestaurantsTableName** stack output we added
   above.
3. Export the table name as an **SSM parameter** (by adding an
   AWS::SSM::Parameter resource to our serverless.yml) and programmatically
   reference it from the script.

For the purpose of this demo app, let's use option 1, as it'll come in handy for
us later on when we start writing tests.

`npm i -D serverless-export-env`

Make sure the plugin is added to `serverless.yml` (as above).

```bash
npx sls export-env --all

npm run export:env
# or
npx export-env --all
```

This command should generate a **.env** file in your project root, and the file
content should look something like this:

```
restaurants_table=workshop-murat-dev-RestaurantsTable-*********
```

This is because our **get-restaurants** function has an environment variable
called **restaurants_table**. The **serverless-export-env** plugin has resolved
the **!Ref RestaurantTable** reference and helpfully added the resolved table
name to the .env file.

By default, the serverless-export-env plugin **would not overwrite** the .env
file, but we want it to do just that whenever we run the command to make sure we
have the latest values in the .env file. Your custom section should look like
this:

```
custom:
  name: murat
  export-env:
    overwrite: true
```

Seed the restaurants to DDB with this script

```js
// ./seed-restaurants.js

const {DynamoDB} = require('@aws-sdk/client-dynamodb')
const {marshall} = require('@aws-sdk/util-dynamodb')
const dynamodb = new DynamoDB({
  region: 'us-east-1',
})
require('dotenv').config()

const restaurants = [
  {
    name: 'Fangtasia',
    image: 'https://d2qt42rcwzspd6.cloudfront.net/manning/fangtasia.png',
    themes: ['true blood'],
  },
  {
    name: "Shoney's",
    image: "https://d2qt42rcwzspd6.cloudfront.net/manning/shoney's.png",
    themes: ['cartoon', 'rick and morty'],
  },
  {
    name: "Freddy's BBQ Joint",
    image:
      "https://d2qt42rcwzspd6.cloudfront.net/manning/freddy's+bbq+joint.png",
    themes: ['netflix', 'house of cards'],
  },
  {
    name: 'Pizza Planet',
    image: 'https://d2qt42rcwzspd6.cloudfront.net/manning/pizza+planet.png',
    themes: ['netflix', 'toy story'],
  },
  {
    name: 'Leaky Cauldron',
    image: 'https://d2qt42rcwzspd6.cloudfront.net/manning/leaky+cauldron.png',
    themes: ['movie', 'harry potter'],
  },
  {
    name: "Lil' Bits",
    image: 'https://d2qt42rcwzspd6.cloudfront.net/manning/lil+bits.png',
    themes: ['cartoon', 'rick and morty'],
  },
  {
    name: 'Fancy Eats',
    image: 'https://d2qt42rcwzspd6.cloudfront.net/manning/fancy+eats.png',
    themes: ['cartoon', 'rick and morty'],
  },
  {
    name: 'Don Cuco',
    image: 'https://d2qt42rcwzspd6.cloudfront.net/manning/don%20cuco.png',
    themes: ['cartoon', 'rick and morty'],
  },
]

const putReqs = restaurants.map(x => ({
  PutRequest: {
    Item: marshall(x),
  },
}))

const req = {
  RequestItems: {
    [process.env.restaurants_table]: putReqs,
  },
}
dynamodb
  .batchWriteItem(req)
  .then(() => console.log('all done'))
  .catch(err => console.error(err))
```

`node seed-restaurants.js`.

**Configure IAM permission**

Now that we have added a DynamoDB table to host all the restaurant data and we
have run a script to populate the table with some data. The last thing we need
to do for this **GET /restaurants** endpoint is to ensure our Lambda function
has the **necessary IAM permission** to read from this table!

1. Modify **serverless.yml** and add an **iam** section under **provider** (make
   sure you check for proper indentation!):

```
provider:
  name: aws
  runtime: nodejs18.x

  iam:
    role:
      statements:
        - Effect: Allow
          Action: dynamodb:scan
          Resource: !GetAtt RestaurantsTable.Arn
```

This adds the **dynamodb:scan** permission to the Lambda execution role.

Deploy with `npm run deploy`

Test locally and remotely:

```bash
npx sls invoke --function get-restaurants
npx sls invoke local --furnction get-restaurants

# may need to set credentials again
npm run sls -- config credentials --provider aws --key **** --secret **** --overwrite
```

## Exercise: Displaying restaurants on the landing page

(Modify the index.html file)

Install `mustache` (templating lib for JS) and `axios` ad dependencies

```bash
npm i mustache axios
```

Update the `serverless.yml` file with the environment var for `restaurants_api`.

Serverless framework ALWAYS uses the logical ID ApiGatewayRestApi for the API
Gateway REST API resource it creates.

So you can construct the URL for the /restaurants endpoint using the Fn::Sub
CloudFormation pseudo function (or the !Sub shorthand)
`!Sub https://${ApiGatewayRestApi}.execute-api.${AWS::Region}.amazonaws.com/${sls:stage}/restaurants`

The **Fn::Sub** pseudo function (we used the **!Sub** shorthand) lets you
reference other CloudFormation resources as well as CloudFormation pseudo
parameters with the **${}** syntax. Here we needed to reference two of these:

- **${ApiGatewayRestApi}**: this references the ApiGatewayRestApi resource that
  the Serverless framework has generated for the API Gateway REST API object.
  This is equivalent to **!Ref ApiGatewayRestApi**, which returns the API Id
  which is part of the API's url.
- **${AWS::Region}**: this references the **AWS::Region** pseudo parameter, that
  is, the AWS region (e.g. us-east-1) that you're deploying the CloudFormation
  stack.

```yml
# ./serverless.yml

service: workshop-${self:custom.name}

frameworkVersion: '3'

custom:
  name: murat
  export-env:
    overwrite: true

provider:
  name: aws
  runtime: nodejs18.x
  iam:
    role:
      statements:
        - Effect: Allow
          Action: dynamodb:scan
          Resource: !GetAtt RestaurantsTable.Arn

plugins:
  # exports the environment variables to a **.env** file.
  - serverless-export-env

functions:
  get-index:
    handler: functions/get-index.handler
    # When you use the http event in Serverless Framework with AWS as your provider,
    # it automatically creates an Amazon API Gateway for you
    # the properties you set under the http key (like path, method, and cors) define the configuration for this API Gateway.
    events:
      - http:
          path: /
          method: get
          cors: true
    # the Serverless framework ALWAYS uses the logical ID ApiGatewayRestApi for the API Gateway REST API resource it creates.
    # So you can construct the URL for the /restaurants endpoint using the Fn::Sub CloudFormation pseudo function (or the !Sub shorthand)
    # !Sub https://${ApiGatewayRestApi}.execute-api.${AWS::Region}.amazonaws.com/${sls:stage}/restaurants
    environment:
      restaurants_api: !Sub https://${ApiGatewayRestApi}.execute-api.${AWS::Region}.amazonaws.com/${sls:stage}/restaurants

  get-restaurants:
    handler: functions/get-restaurants.handler
    events:
      - http:
          path: /restaurants
          method: get
          cors: true
    # Notice that the restaurants_table environment variable is referencing (using the CloudFormation pseudo function !Ref)
    environment:
      restaurants_table: !Ref RestaurantsTable

# everything under the lower case resources section is custom CloudFormation resources
# that you want to include in the CloudFormation template, all in raw CloudFormation
resources:
  Resources:
    # RestaurantsTable is called the logical Id in CloudFormation,
    # it is a unique id in the CloudFormation template
    # use !Ref or !GetAtt functions to reference a resource
    RestaurantsTable:
      Type: AWS::DynamoDB::Table
      Properties:
        # DDB has 2 billing modes, PAY_PER_REQUEST (on demand) and provisioned
        BillingMode: PAY_PER_REQUEST
        # DynamoDB operates with HASH and RANGE keys as the schemas you need to specify
        # When you specify an attribute in the key schema
        # you also need to add them to the AttributeDefinitions list so you can specify their type
        AttributeDefinitions:
          - AttributeName: name
            AttributeType: S
        KeySchema:
          - AttributeName: name
            KeyType: HASH

  # Since we have added a DynamoDB table to the stack as a custom resource,
  # it's useful to add its name to the stack output.
  # It's not required for the application to work,
  # but it's a good practice to keep important resource information (like DynamoDB table names)
  # in the CloudFormation output so they're easier to find.
  Outputs:
    RestaurantsTableName:
      Value: !Ref RestaurantsTable
```

Visit https://1h4wvq2hr3.execute-api.us-east-1.amazonaws.com/dev to test.

## Securing API Gateway

**Usage plans + API keys**

- Designed for rate limiting, not authentication & authorization
- Allow client to access selected APIs at agreed upon request rates and quotas
- Request rates & quotas apply to all APIs and stages covered by the usage plan

**AWS IAM**

Restrict access to endpoints using the role based permission model.

We are doing this for now:

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/za81iprsmqq8bw6z59cd.png)

### [When to sign requests](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_aws-signing.html)

When you write custom code that sends API requests to AWS, you must include code that signs the requests. You might write custom code because:

- You are working with a programming language for which there is no AWS SDK.
- You need complete control over how requests are sent to AWS.

To protect the API Gateway endpoint with AWS_IAM, (1) add the authorizer property to the http event. After this change anyone who calls the GET /restaurants endpoint would need to sign the HTTP request using their IAM credentials.

```yml
  get-restaurants:
    handler: functions/get-restaurants.handler
    events:
      - http:
          path: /restaurants
          method: get
          cors: true
          # Protect the endpoint with AWS_IAM
          authorizer: aws_iam

    environment:
      restaurants_table: !Ref RestaurantsTable

```

(2) Add a shared IAM role (for now this is shared between the functions, to get-index function the ability to call the `GET /restaurants` endpoint).

```yml
provider:
  name: aws
  runtime: nodejs18.x
  iam:
    role:
      statements:
        - Effect: Allow
          Action: dynamodb:scan
          Resource: !GetAtt RestaurantsTable.Arn
        - Effect: Allow
          Action: execute-api:Invoke
          Resource: !Sub arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${ApiGatewayRestApi}/${sls:stage}/GET/restaurants

```

 Once again, we're using the **!Sub** function here. The resource ARN points to the GET /restaurants endpoint we added in the last exercise.  Notice that we're also referencing the **AWS::AccountId** pseudo parameter. It returns the id of the AWS account you're deploying the CloudFormation stack.

(3) To sign the HTTP request, we can use the **aws4** NPM package. This package lets us sign HTTP requests using our AWS credentials.

```bash
npm i -D aws4
```

```js

// Protect the API Gateway endpoint with AWS_IAM: use aws4.sign() to sign the http request
const getRestaurants = async () => {
  console.log(`loading restaurants from ${restaurantsApiRoot}...`)
  const url = URL.parse(restaurantsApiRoot)
  const opts = {
    host: url.hostname,
    path: url.pathname,
  }

  aws4.sign(opts)

  const httpReq = http.get(restaurantsApiRoot, {
    headers: opts.headers,
  })
  return (await httpReq).data
}
```

Deploy. Visit https://1h4wvq2hr3.execute-api.us-east-1.amazonaws.com/dev and it should work, but https://1h4wvq2hr3.execute-api.us-east-1.amazonaws.com/dev/restaurants will give `{"message":"Missing Authentication Token"}`  because your request is not signed by a valid AWS credential with the necessary IAM permissions, so the request has been rejected by API Gateway.

## Cognito

Amazon Cognito is an identity management service. It integrates with public
identity providers such as Google, Facebook, Twitter, and Amazon or with your
own system. Cognito supports user pools, which allow you to create your own user
directory. This lets you register and authenticate users without having to run a
separate user database and authentication service.

User Pools: Primarily we use it to provide Authentication for AWS services like Appsync & API gateway

It also supports user flows & user management)

* Registration
* Verify email/phone
* Secure sign-in
* Forgotten password
* Change password
* Sign out
* User groups
* Find user by username/email etc.
* Admin methods to create user etc.

Identity Pools: takes authorization tokens issued by identity providers and exchange them for temporary AWS credentials.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/okx4h89v8ls29wqzzykd.png)

Sync : allows to sync user profile data across multiple devices (not used so much)

## Create a Cognito User Pool

```yml
resources:
  Resources:
    RestaurantsTable:

    # Create a new Cognito User pool
      CognitoUserPool:
      Type: AWS::Cognito::UserPool
      Properties:
        # Allow users to log in with their email addresses.
        AliasAttributes:
          - email
        # Allow usernames to be case insensitive
        UsernameConfiguration:
          CaseSensitive: false
        # Verify that a user owns his/her email address 
        # (ie. by sending a verification code to the email)
        AutoVerifiedAttributes:
          - email
        Policies:
          PasswordPolicy:
            MinimumLength: 8
            RequireLowercase: true
            RequireNumbers: true
            RequireUppercase: true
            RequireSymbols: true
        Schema:
          - AttributeDataType: String
            Mutable: true
            Name: given_name
            Required: true
            StringAttributeConstraints:
              MinLength: '1'
          - AttributeDataType: String
            Mutable: true
            Name: family_name
            Required: true
            StringAttributeConstraints:
              MinLength: '1'
          - AttributeDataType: String
            Mutable: true
            Name: email
            Required: true
            StringAttributeConstraints:
              MinLength: '1'
```

**Add the web and server clients**

To interact with a Cognito User Pool, you need to create app clients. Each client can be configured with different authentication flows, token expiration, and which attributes it's allowed to read or write.

We are going to create two separate app clients for:

- web: used by the landing page frontend, this would be used to register new users, and support sign-in and sign-out.
- server: we will use this later to programmatically create new users using the admin flow.

1. In the **serverless.yml**, under **resources.Resources**, add another CloudFormation resource after CognitoUserPool.

```yml
WebCognitoUserPoolClient:
  Type: AWS::Cognito::UserPoolClient
  Properties:
    ClientName: web
    UserPoolId: !Ref CognitoUserPool
    ExplicitAuthFlows:
      - ALLOW_USER_SRP_AUTH
      - ALLOW_REFRESH_TOKEN_AUTH
    PreventUserExistenceErrors: ENABLED
```

2. Add the server client after the WebCognitoUserPoolClient:

```yml
ServerCognitoUserPoolClient:
  Type: AWS::Cognito::UserPoolClient
  Properties:
    ClientName: server
    UserPoolId: !Ref CognitoUserPool
    ExplicitAuthFlows:
      - ALLOW_ADMIN_USER_PASSWORD_AUTH
      - ALLOW_REFRESH_TOKEN_AUTH
    PreventUserExistenceErrors: ENABLED
```

It's a good practice to keep important resource information (like DynamoDB table names) in the CloudFormation output so they're easier to find.

```yml
Outputs:
  RestaurantsTableName:
    Value: !Ref RestaurantsTable

  CognitoUserPoolId:
    Value: !Ref CognitoUserPool

  CognitoUserPoolArn:
    Value: !GetAtt CognitoUserPool.Arn

  CognitoUserPoolWebClientId:
    Value: !Ref WebCognitoUserPoolClient

  CognitoUserPoolServerClientId:
    Value: !Ref ServerCognitoUserPoolClient

```

Deploy and verify that the user pool was created.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/bft3zmxwo6aeke16g38t.png)

## !Ref vs !GetAtt

- `!Ref` refers to the whole resource and gives you a commonly used identification for it (like a resource's name or ID).
- `!GetAtt` is for when you want to extract a specific attribute from a resource. Usually .Arn

While it might seem easier to have one function handle both, the separation actually provides clarity about whether we're referring to a whole resource or just an attribute of it. This distinction can be especially useful when reading or debugging a template.

Let's imagine a car:

- `!Ref` is like referring to the car itself. For example, when you say, "I have a car", you're referencing the entire car object. You don't care about its color, its model, or its license plate; you just care that it's a car. That's what `!Ref` does: it refers to the entire resource (like a DynamoDB table or a Lambda function) without specifying any particular attribute.
- `!GetAtt`, on the other hand, is like referring to a specific attribute of the car. For example, if you say "My car's color is red", you're interested in a specific attribute of the car, namely its color. In AWS, `!GetAtt` allows you to refer to specific attributes of a resource (like the ARN of a Lambda function or the DNS name of a load balancer).

## Secure API Gateway with User Pools

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/6t1zw2x4mvjm4h379qg3.png)

Modify **serverless.yml** to add a **search-restaurants** function under the **functions** section, set the **authorizer** for the **search-restaurants** function to the Cognito User Pools we created in the last exercise.

```yml
search-restaurants:
  handler: functions/search-restaurants.handler
  events:
    - http:
        path: /restaurants/search
        method: post
        authorizer:
          name: CognitoAuthorizer
          type: COGNITO_USER_POOLS
          arn: !GetAtt CognitoUserPool.Arn
  environment:
    restaurants_table: !Ref RestaurantsTable
```

Curl the function  and see the response:

```bash
curl -d '{"theme":"cartoon"}' -H "Content-Type: application/json" -X POST https://1h4wvq2hr3.execute-api.us-east-1.amazonaws.com/dev/restaurants/search
```

>  Between adding the authorizer property and deploying, it may take time for the changes to take effect. So keep curling.

```
{ 
  "message": "Unauthorized"
}
```

 This is because the POST /restaurants/search endpoint is now an **authenticated endpoint**. To call it, the user needs to first sign in to the Cognito User Pool we created earlier, obtain an authentication token and include the token in the HTTP request.

**Pass the Cognito User Pool id to the index.html**

Next, we need to enable the UI to register and sign in with the Cognito User Pool. To do that, we need to pass the Cognito user pool ID and the `web` client ID into the HTML template.

1. Modify **serverless.yml** and update the **get-index** function to add **cognito_user_pool_id** and **cognito_client_id** environment variables with the pool Id and the web app client Id from the last exercise.

```yml
get-index:
  handler: functions/get-index.handler
  events:
    - http:
        path: /
        method: get
  environment:
    restaurants_api: !Sub https://${ApiGatewayRestApi}.execute-api.${AWS::Region}.amazonaws.com/${sls:stage}/restaurants
    cognito_user_pool_id: !Ref CognitoUserPool
    cognito_client_id: !Ref WebCognitoUserPoolClient
```



2. Modify the **get-index** function to the following:

 Notice how the new environment variables are extracted and then passed along to the static HTML template as the variables **cognitoUserPoolId** and **cognitoClientId**. 

```js
const fs = require("fs")
const Mustache = require('mustache')
const http = require('axios')
const aws4 = require('aws4')
const URL = require('url')

const restaurantsApiRoot = process.env.restaurants_api
const cognitoUserPoolId = process.env.cognito_user_pool_id
const cognitoClientId = process.env.cognito_client_id
const awsRegion = process.env.AWS_REGION

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const template = fs.readFileSync('static/index.html', 'utf-8')

const getRestaurants = async () => {
  console.log(`loading restaurants from ${restaurantsApiRoot}...`)
  const url = URL.parse(restaurantsApiRoot)
  const opts = {
    host: url.hostname,
    path: url.pathname
  }

  aws4.sign(opts)

  const httpReq = http.get(restaurantsApiRoot, {
    headers: opts.headers
  })
  return (await httpReq).data
}

module.exports.handler = async (event, context) => {
  const restaurants = await getRestaurants()
  console.log(`found ${restaurants.length} restaurants`)  
  const dayOfWeek = days[new Date().getDay()]
  const view = {
    awsRegion,
    cognitoUserPoolId,
    cognitoClientId,
    dayOfWeek,
    restaurants,
    searchUrl: `${restaurantsApiRoot}/search`
  }
  const html = Mustache.render(template, view)
  const response = {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html; charset=UTF-8'
    },
    body: html
  }

  return response
}
```

Next, we need to update the HTML template to accept these variables and use them to interact with the Cognito User Pool. (Copy paste long file)

Deploy and verify by visiting the url https://1h4wvq2hr3.execute-api.us-east-1.amazonaws.com/dev/.

Go to the landing page in the browser, and you should see:

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/b3a/fdc/f72/mod09-001.png)

 Notice the new **Register** and **Sign in** links at the top.

6. Click **Register**

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/85e/d53/0b1/mod09-002.png)

7. Click **Create an account**. Because the user pool is configured to auto-verify user emails, this would trigger Cognito to send an email to you with a verification code.

8. Check your email, and note the verification code

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/9fb/92c/4d6/mod09-003.png)



9. Go back to the page and fill in your verification code



10. Click **Confirm registration**, and now you're registered!

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/0c8/e1c/b10/mod09-004.png)



11. Click **Sign in**

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/f8b/e8b/7fb/mod09-005.png)



12. Enter "cartoon" in the search box and click **Find Restaurants**, and see that the results are returned

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/1bb/d94/410/mod09-006.png)
