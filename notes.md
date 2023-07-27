## Part 1 Building Rest APIs

### Lambda EFS integration

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

### Lambda extensions

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

### Provisioned Concurrency

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

### Lambda Destinations

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

### CloudFormation

IaC. Template -> Stack

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/dkdoz8ta1u1i1mm5ggag.png)

Parameters are like values.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/vkgrcsyofg9054ntc3l3.png)

Resources are where you define the AWS resources you want CloudFormation to
provision.

[CloudFormation Ref & GetAtt cheatsheet](https://theburningmonk.com/cloudformation-ref-and-getatt-cheatsheet/)

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/mqst1yqvpwbp7vzty57u.png)

### IAM

Identity and Access Management.

Who or What can access which AWS resources.

- Users:

- Groups: collections of Users

- Policies: where the permissions are defined, to access AWS resources via Allow
  or Deny statements

- Roles: collection of permissions, assumed by Users or AWS resources

### Exercise: create a serverless project

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

### DDB

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

### API Gateway

The Amazon API Gateway is a service that you can use to create an API layer
between the frontend and backend services (an http router).

Allows multiple versions of the API to be run at the same time, and it supports
multiple release stages such as development, staging, and production. Supports
Authentication, Request Validation, Rate Limiting, Web-sockets, Caching,
Monitoring, custom domain names, integrates with web application firewall (WAF).

The API is defined around resources and methods. A resource is a logical entity
such as a user or product. A method is a combination of an HTTP verb (such as
GET, POST, PUT, or DELETE) and the resource path.

### Create an API with API gateway and Lambda

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
      'content-type': 'text/html; charset=UTF-8',
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

### Creating the Restaurants API

In server-side rendering use cases, it's common for you to call other backend
APIs to collect the necessary data to render the intended HTML.

To simulate this behaviour, we're going to display a list of restaurants on the
landing page. We need to create a new Restaurants API and add an endpoint to
return a list of restaurants. The **get-index** function would call this
endpoint to fetch a page of restaurants and then render them into the HTML
output.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/4uf9idqwztxoeesr9uu1.png)

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

### Exercise: Displaying restaurants on the landing page

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

### Securing API Gateway

**Usage plans + API keys**

- Designed for rate limiting, not authentication & authorization
- Allow client to access selected APIs at agreed upon request rates and quotas
- Request rates & quotas apply to all APIs and stages covered by the usage plan

**AWS IAM**

Restrict access to endpoints using the role based permission model.

We are doing this for now:

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/za81iprsmqq8bw6z59cd.png)

#### [When to sign requests](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_aws-signing.html)

When you write custom code that sends API requests to AWS, you must include code
that signs the requests. You might write custom code because:

- You are working with a programming language for which there is no AWS SDK.
- You need complete control over how requests are sent to AWS.

To protect the API Gateway endpoint with AWS_IAM, (1) add the authorizer
property to the http event. After this change anyone who calls the GET
/restaurants endpoint would need to sign the HTTP request using their IAM
credentials.

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

(2) Add a shared IAM role (for now this is shared between the functions, to
get-index function the ability to call the `GET /restaurants` endpoint).

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

Once again, we're using the **!Sub** function here. The resource ARN points to
the GET /restaurants endpoint we added in the last exercise. Notice that we're
also referencing the **AWS::AccountId** pseudo parameter. It returns the id of
the AWS account you're deploying the CloudFormation stack.

(3) To sign the HTTP request, we can use the **aws4** NPM package. This package
lets us sign HTTP requests using our AWS credentials.

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

Deploy. Visit https://1h4wvq2hr3.execute-api.us-east-1.amazonaws.com/dev and it
should work, but
https://1h4wvq2hr3.execute-api.us-east-1.amazonaws.com/dev/restaurants will give
`{"message":"Missing Authentication Token"}` because your request is not signed
by a valid AWS credential with the necessary IAM permissions, so the request has
been rejected by API Gateway.

### Cognito

Amazon Cognito is an identity management service. It integrates with public
identity providers such as Google, Facebook, Twitter, and Amazon or with your
own system. Cognito supports user pools, which allow you to create your own user
directory. This lets you register and authenticate users without having to run a
separate user database and authentication service.

User Pools: Primarily we use it to provide Authentication for AWS services like
Appsync & API gateway

It also supports user flows & user management)

- Registration
- Verify email/phone
- Secure sign-in
- Forgotten password
- Change password
- Sign out
- User groups
- Find user by username/email etc.
- Admin methods to create user etc.

Identity Pools: takes authorization tokens issued by identity providers and
exchange them for temporary AWS credentials.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/okx4h89v8ls29wqzzykd.png)

Sync : allows to sync user profile data across multiple devices (not used so
much)

### Create a Cognito User Pool

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

To interact with a Cognito User Pool, you need to create app clients. Each
client can be configured with different authentication flows, token expiration,
and which attributes it's allowed to read or write.

We are going to create two separate app clients for:

- web: used by the landing page frontend, this would be used to register new
  users, and support sign-in and sign-out.
- server: we will use this later to programmatically create new users using the
  admin flow.

1. In the **serverless.yml**, under **resources.Resources**, add another
   CloudFormation resource after CognitoUserPool.

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

It's a good practice to keep important resource information (like DynamoDB table
names) in the CloudFormation output so they're easier to find.

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

### !Ref vs !GetAtt

- `!Ref` refers to the whole resource and gives you a commonly used
  identification for it (like a resource's name or ID).
- `!GetAtt` is for when you want to extract a specific attribute from a
  resource. Usually .Arn

While it might seem easier to have one function handle both, the separation
actually provides clarity about whether we're referring to a whole resource or
just an attribute of it. This distinction can be especially useful when reading
or debugging a template.

Let's imagine a car:

- `!Ref` is like referring to the car itself. For example, when you say, "I have
  a car", you're referencing the entire car object. You don't care about its
  color, its model, or its license plate; you just care that it's a car. That's
  what `!Ref` does: it refers to the entire resource (like a DynamoDB table or a
  Lambda function) without specifying any particular attribute.
- `!GetAtt`, on the other hand, is like referring to a specific attribute of the
  car. For example, if you say "My car's color is red", you're interested in a
  specific attribute of the car, namely its color. In AWS, `!GetAtt` allows you
  to refer to specific attributes of a resource (like the ARN of a Lambda
  function or the DNS name of a load balancer).

### Secure API Gateway with User Pools

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/6t1zw2x4mvjm4h379qg3.png)

Modify **serverless.yml** to add a **search-restaurants** function under the
**functions** section, set the **authorizer** for the **search-restaurants**
function to the Cognito User Pools we created in the last exercise.

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

Curl the function and see the response:

```bash
curl -d '{"theme":"cartoon"}' -H "content-type: application/json" -X POST https://1h4wvq2hr3.execute-api.us-east-1.amazonaws.com/dev/restaurants/search
```

> Between adding the authorizer property and deploying, it may take time for the
> changes to take effect. So keep curling.

```
{
  "message": "Unauthorized"
}
```

This is because the POST /restaurants/search endpoint is now an **authenticated
endpoint**. To call it, the user needs to first sign in to the Cognito User Pool
we created earlier, obtain an authentication token and include the token in the
HTTP request.

**Pass the Cognito User Pool id to the index.html**

Next, we need to enable the UI to register and sign in with the Cognito User
Pool. To do that, we need to pass the Cognito user pool ID and the `web` client
ID into the HTML template.

1. Modify **serverless.yml** and update the **get-index** function to add
   **cognito_user_pool_id** and **cognito_client_id** environment variables with
   the pool Id and the web app client Id from the last exercise.

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

Notice how the new environment variables are extracted and then passed along to
the static HTML template as the variables **cognitoUserPoolId** and
**cognitoClientId**.

```js
const fs = require('fs')
const Mustache = require('mustache')
const http = require('axios')
const aws4 = require('aws4')
const URL = require('url')

const restaurantsApiRoot = process.env.restaurants_api
const cognitoUserPoolId = process.env.cognito_user_pool_id
const cognitoClientId = process.env.cognito_client_id
const awsRegion = process.env.AWS_REGION

const days = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

const template = fs.readFileSync('static/index.html', 'utf-8')

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
    searchUrl: `${restaurantsApiRoot}/search`,
  }
  const html = Mustache.render(template, view)
  const response = {
    statusCode: 200,
    headers: {
      'content-type': 'text/html; charset=UTF-8',
    },
    body: html,
  }

  return response
}
```

Next, we need to update the HTML template to accept these variables and use them
to interact with the Cognito User Pool. (Copy paste long file)

Deploy and verify by visiting the url
https://1h4wvq2hr3.execute-api.us-east-1.amazonaws.com/dev/.

Go to the landing page in the browser, and you should see:

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/b3a/fdc/f72/mod09-001.png)

Notice the new **Register** and **Sign in** links at the top.

6. Click **Register**

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/85e/d53/0b1/mod09-002.png)

7. Click **Create an account**. Because the user pool is configured to
   auto-verify user emails, this would trigger Cognito to send an email to you
   with a verification code.

8. Check your email, and note the verification code

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/9fb/92c/4d6/mod09-003.png)

9. Go back to the page and fill in your verification code

10. Click **Confirm registration**, and now you're registered!

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/0c8/e1c/b10/mod09-004.png)

11. Click **Sign in**

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/f8b/e8b/7fb/mod09-005.png)

12. Enter "cartoon" in the search box and click **Find Restaurants**, and see
    that the results are returned

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/1bb/d94/410/mod09-006.png)

### API Gateway best practices

#### Cache as much as you can

Save $ and improve response time. The closer to the user, the better bang for
the buck.

Caching data on the client side is great, but we still end up processing at
least 1 request per client, which is very inefficient. Therefore we should be
caching responses on the API side as well.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/nbonemc7fwq13t94hd3s.png)

The best place to cache on the API side is CloudFront (supports query strings,
cookies & request headers), because this ends up with one round-trip per edge
location (many clients, one edge). Saves on API Gateway costs too. Lambda cost
is small part of the whole. API gateway is expensive. Caching at the edge is
very cost-efficient as it cuts out most of the calls to API Gateway and Lambda.
Skipping these calls also improve the end-to-end latency and ultimately the user
experience. Also, by caching at the edge, you don’t need to modify your
application code to enable caching.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/h31ukjdu354hwp40dz4o.png)

99% of the time caching at CloudFront does the job, but there are other caching
options too. Read more at
[All you need to know about caching for serverless applications](https://theburningmonk.com/2019/10/all-you-need-to-know-about-caching-for-serverless-applications/).

1. **Client-side caching**: Useful for data that rarely changes, it can be
   implemented using techniques like memoization, significantly improving
   performance.
2. **Caching at CloudFront**: CloudFront provides built-in caching capabilities
   which are very cost-efficient and can improve latency and user experience.
   CloudFront supports caching by query strings, cookies, and request headers,
   and it doesn't require any changes to application code.
3. **Caching at API Gateway**: Unlike CloudFront, which only caches responses to
   GET, HEAD, and OPTIONS requests, API Gateway caching allows for caching
   responses to any request. It gives greater control over the cache key. One
   downside is that it switches from pay-per-use pricing to paying for uptime.
4. **Caching in the Lambda function**: Data declared outside the handler
   function is reused between invocations. However, cache misses can be high,
   and there’s no way to share cached data across all concurrent executions of a
   function. For sharing cached data, Elasticache can be used but this involves
   added costs and requires the functions to be inside a VPC.
5. **DAX**: If using DynamoDB, DAX should be used for application-level caching
   as it allows the benefits of Elasticache without having to manage it.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/nrfk38df0wjpl6bchm77.png)

#### Review the default throttling limits of the API Gateway

The 10k is also the default regional limit; shared by all the APIs in the same
region. An attacker hitting 1 API can exhaust all the requests in the region
(for example the index page in our app)

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/b66nxxy4rop815etlrau.png)

We can use AWS WAF to limit the amount of requests coming from a single source.
But this doesn't protect us from distributed DDOS, or low & slow DDOS attacks,
which means we still have to throttle at API level. We can use the sls plugin
`serverless-api-gateway-throttling`.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/8hbzl3zlbv8ccmfapx64.png)

#### Enable request model validation at the API Gateway (vs our code)

That way if we receive an invalid request, it does not cost us.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/llyhluqjj884b51mam1k.png)

#### Implement response validation

Use middy
![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/pj3leqskkjv5ts6py751.png)

#### Enable detailed CloudWatch metrics

Use alarms to alert you that something is wrong, not necessarily what is wrong.

**ConcurrentExecutions**: set to 80% of the regional limit.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/bpz9fowelkbfzev7aq3g.png)

**IteratorAge**: for lambda functions that process against Kinesis streams, you
need an alarm for IteratorAge. Should be in milliseconds usually, but can fall
behind.

**DeadLetterErrors**: for functions that are triggered by an async event source
(SNS, EventBridge) you should have dead letter queues setup, and have an alarm
against DeadLetterErrors, which indicates that lambda has trouble sending error
events to DLQ.

**Throttles**: for business critical functions you need an alarm that will fire
as soon as the fn gets throttled. Maybe there's a rouge fn that's consuming the
concurrency in the region, and causing business critical fns to get throttled.

**Error count & success rate %**: according to your SLA

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/i5jbkjmxgvzhb0atmjsp.png)

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/0vkj8by1thojr440r27t.png)

#### Record custom application metrics

Ex: number of api calls to 3rd party services, and the latency to those api
calls.

Ex: business KPIs (orders placed, orders rejected)

#### API Gateway: REST API vs HTTP API vs ALB (application load balancer)

Click
[here](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-vs-rest.html)
for a comparison of API Gateway REST APIs vs HTTP APIs

HTTP API is 70% cheaper and less powerful than REST API.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/ccbwtsc7l1fkbf4yswk6.png)

As we scale up the throughput, the cost of ALB is significantly cheaper.

Services that pay by uptime are cheaper at scale.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/pzh9q6zua2uym7wvmkw9.png)

#### When to use lambda function urls

In 2022 AWS has launched the Lambda Function URLs feature, which allows users to
build REST APIs backed by Lambda functions without the need for API Gateway.
This can significantly reduce costs for users who do not require the advanced
features provided by API Gateway.

To create a function URL, users should enable the function URL box under
Advanced settings when creating a new function. Function URLs have the structure
https://{url-id}.lambda-url.{region}.on.aws, where the url-id is a randomly
assigned ID.

The new feature uses the same schema format as API Gateway payload format 2.0,
which means code does not need to be altered when switching from API Gateway to
function URL. Function URLs can handle different HTTP verbs and URL paths.

Other features include basic request throttling, achievable via Lambda reserve
concurrency, and custom domains through creating a CloudFront distribution and
pointing it at the function URL.

However, for APIs that require advanced features like user authentication with
Cognito User Pool, usage plans, or WebSockets API, users should still consider
API Gateway. But for simpler APIs, the Lambda Function URLs feature can be a
cost-saving option.

Use when:

- API Gateway is getting expensive and we are not using any of its features
- "I need more than 29s to complete the request"
- "I am migrating an existing API from EC2, and I do not want to rearchitect the
  whole thing right away."

### Implement caching at the CloudFront level

With an `Edge` API (which is also the default in API Gateway), you can create a
**Custom Domain Name** in API Gateway, which lets you use friendly domain names
such as _bigmouth.com_ for your API. When you do that, it also creates a
CloudFront distribution for you behind the scenes.

**HOWEVER, caching is disabled on this distribution!**

And since this CloudFront distribution is managed by AWS, you cannot change its
configuration to enable caching.

So, the best thing for you to do is to:

1. change your API to be **Regional**.
2. **create a CloudFront** **distribution** yourself.
3. assign the URL of the API stage (e.g.
   https://1h4wvq2hr3.execute-api.us-east-1.amazonaws.com) as an **Origin Domain
   Name** (without the stage name) in the CloudFront distribution.

Details
[here](https://repost.aws/knowledge-center/api-gateway-cloudfront-distribution).

In AWS API Gateway, an API can be either edge-optimized (default), regional, or
private.

**Edge-Optimized API Gateway**: An edge-optimized API is hosted in the region
where your services reside, but it also deploys a CloudFront distribution to
edge locations around the world. This can provide lower latency responses to end
users of your API that are spread across different geographical locations. The
API requests are routed to the nearest CloudFront Point of Presence (POP), which
is typically located in or near major cities around the world. From there, the
requests are routed to the API Gateway in the origin region through Amazon's
optimized network paths.

**Regional API Gateway**: A regional API Gateway is deployed in the region where
your AWS services reside. It's a good fit for clients making requests from the
same region because it allows for lower latencies. It also allows you to take
advantage of traffic management provided by services like AWS Route53 or any
third-party DNS service to manage routing based on various policies such as
geolocation or latency.

What to do:

The instructions provided are quite comprehensive but can be overwhelming
because they are quite nested. To help you better understand the process, I've
simplified it into more manageable steps.

Here's the high-level process:

1. **Create a Regional API in API Gateway:**

   You can set your API Gateway to be regional by using the `endpointType`
   property under `provider` in your `serverless.yml`. Your provider section
   should look something like this:

   ```yml
   provider:
     name: aws
     runtime: nodejs18.x
     region: us-east-1
     endpointType: REGIONAL
     ...

   ```

2. **Create a CloudFront web distribution:**

   This is done through the AWS Management Console in the CloudFront service.
   Here's a step-by-step guide:

   1. Sign into the AWS Management Console and open the CloudFront console at
      [https://console.aws.amazon.com/cloudfront/](https://console.aws.amazon.com/cloudfront/).
   2. Choose **Create Distribution**.
   3. Here you'll enter the settings for your new distribution.

      - **Origin Settings**

        - **Origin Domain Name**: Enter the invoke URL of the API Gateway you
          created, without the stage name. When you start typing, AWS will
          suggest some services. Be careful not to select those, instead
          manually type in your API Gateway URL.
          https://1h4wvq2hr3.execute-api.us-east-1.amazonaws.com
        - **Origin Path**: leave it empty. You're telling CloudFront to fetch
          content from the root of your API Gateway domain
          (`1h4wvq2hr3.execute-api.us-east-1.amazonaws.com`) and then you will
          append the stage name manually when invoking the URL. So for the `foo`
          stage, you would access your API via CloudFront using a URL similar to
          `<your-cloudfront-url>/foo`.

      - **Origin SSL Protocols**: Choose TLSv1.2.

      - **Origin Protocol Policy**: Select HTTPS only.

      - **Allowed HTTP methods**: select them all and Cache HTTP methods

      - **Enable WAF**: it's a best practice (but costly so don't do it in this
        course)

   4. Continue setting up the distribution as per your needs. You can mostly
      leave the default settings, but you may want to tweak caching or other
      settings according to your application needs.
   5. After entering all the details, click on **Create Distribution**.

   This will start the creation of your new CloudFront web distribution. It
   might take a while for the distribution to be fully deployed. Once it's done,
   you'll see your distribution in the list and the status will show as
   "Deployed". You can use the Distribution Domain Name to access your API
   Gateway, and requests will be routed through CloudFront.

   Please note that the settings might need to be adjusted according to your
   specific use case and this guide provides a general direction.

We have created the CloudFront distribution, and it has an origin, which is most
likely our dev deployment at this time.

Distribution: https://d27lew3mfrizo7.cloudfront.net/dev Origin (dev):
https://1h4wvq2hr3.execute-api.us-east-1.amazonaws.com -> our dev API gateway

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/g0e4zgdk1m9a987bn0j0.png)

If we have another deployment, like stage, we can add it now, like so:

Origin (stage): https://o9p7mhn196.execute-api.us-east-1.amazonaws.com -> our
stage API gateway

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/zlyq883sganvmw27mjh0.png)

Now, under Behaviors, we can customize things so that distribution/dev gets
routed to API dev gateway, distribution/stage gets routed to API stage gateway.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/6o699cy4wtjh7grtkuzu.png)

### Configure throttling for each endpoint

Install the
[**serverless-api-gateway-throttling**](https://www.npmjs.com/package/serverless-api-gateway-throttling)
plugin and configure:

1. a default throttling setting for the project
2. an override throttling setting for each endpoint

Use your best judgement for what values to use for these.

```yml
custom:
  name: murat
  export-env:
    overwrite: true
  # Configures throttling settings for the API Gateway stage
  # They apply to all http endpoints, unless specifically overridden
  apiGatewayThrottling:
    maxRequestsPerSecond: 1000
    maxConcurrentRequests: 500

functions:
  get-index:
    handler: functions/get-index.handler
    # Configure custom throttling for the function
    throttling:
      maxRequestsPerSecond: 2000
      maxConcurrentRequests: 1000
```

### **Configure WAF rules**

> I did not do this because of the cost involved

Associate the deployed API Gateway stage with a Web ACL, and add a **Rate-based
rule** that limits the no. of requests from a single IP to 100 per 5 minutes.

If you need help with setting this up, please refer to the official
documentation
[**here**](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-control-access-aws-waf.html).

After you're done, see what happens after you exceed this limit.

**IMPORTANT**: there is a cost involved with using WAF, and it doesn't have a
free tier. So check the [pricing page](https://aws.amazon.com/waf/pricing/)
before you do this task. And **don't forget to delete** the Web ACL after you're
done.

## Part 2 Testing & CI/CD

### Serverless requires a different approach to testing

**Observations**

1. We use more managed services when working with AWS lambda.

2. Most lambda functions are simple and have a single purpose.

   Conclusion 1: The risk of shipping broken software has largely shifted to how
   your lambda functions integrate with external services.

3. Smaller units of deployment means finer grained control of access, and more
   things to secure.

4. Smaller units of deployment also means more application configuration in
   general (ex: configuring API gateway).

   Conclusion 2: The risk of misconfiguration (both application & IAM) as
   exploded.

Consequently, our approach to testing also has to change.

#### Unit vs Integration vs E2e

Unit: test your code at the object/module level, I generally think unit tests
don’t have a great return on investment and I only write these if I have
genuinely complex business logic.

Integration: test your code against things you don't control (ex: external
services), run tests locally against deployed AWS resources. Do not bother with
simulating AWS locally, it takes too much effort to set up and I find the result
is too brittle (breaks easily) and hard to maintain.

E2e: test your whole system and the process by which it’s built and deployed

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/g767gk1dgmn9jjpwttev.png)

Unit test covers the business logic. They do not give enough confidence for the
cost. Same cost & little value vs integration
tests.![unit-test](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/ckgcm75wpg1ezpk5cqpr.png)

Integration is the same cost, and more value than unit. Covers the business
logic + DynamoDB interaction. Feed an event into the handler, validate the
consequences.![integration-described](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/irn19obybd4dfs9bni74.png)

There are things integration tests cannot cover, such as **IAM Permissions, our**
**IaC/configuration, how the service is built and deployed.**![integration](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/gtkxvl1yh7fqwahptxfa.png)

E2e can cover everything, highest confidence but also costly. We need some.
Instead of events being fed to handlers, we use API calls.![e2e-described](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/1vtufpqa62fdgprlqt6c.png)

![e2e](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/qjra5fzp7yr31r06dfzd.png)

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/ymclm13w0eqylzurfrfc.png)

E2e still works for function-less approach.![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/tl0ocelqynxfhwx6lsx9.png)

#### API Gateway test strategy

The Request validation, Request transform, and Response transform refer to features of the API Gateway.

While it's possible to implement request validation in your own code using middy middleware and verify it with integration testing, **it's generally more efficient to delegate this responsibility to the API Gateway. This approach ensures that invalid requests are rejected before they trigger your function, saving costs associated with the API Gateway request and Lambda invocation**. Since you're using the API Gateway for **Request validation**, it's necessary to use end-to-end (e2e) tests for verification. The same applies for **Request transform**, which is another feature managed by the API Gateway, best verified with e2e testing.

It's important to note that the API Gateway does not perform response validation. This is a task you need to handle yourself. In Part 2, we cover Request and Response validation, demonstrating how to perform them using middy. As such, you'll use middy for response validation and e2e testing to verify request validation.

The API Gateway serves as an intermediary between the client (the requester) and the integration target (the service or application being accessed). Part of the e2e testing is to cover **Response transform**, which entails instructing the API Gateway to modify the response from the integration target before it's returned to the client.

To clarify, the 'Request transform' in the API Gateway happens before the request is forwarded to Lambda, whereas the 'Response transform' occurs after the response is received from Lambda but before it's sent back to the client. These transformations play a critical role in shaping the interaction between the client and your service."

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/2wiqwf49hbl5ojbbubh8.png)

[Optic](https://www.useoptic.com/docs) is an API version control and testing tool that works by tracking and managing changes to your API's specifications. It utilizes your OpenAPI specifications to monitor changes, test these changes, and keep your API documentation up-to-date.

1. **Request validation** (yes): Optic can help with request validation indirectly. It doesn't validate requests itself, but it can help you ensure that changes to your API don't accidentally remove validation or change expected request formats. It does this by tracking and managing changes to your API's specifications. If you use OpenAPI specifications to define valid requests, Optic can help you keep track of these and ensure they're not changed accidentally. However, actual validation of incoming requests, ensuring they match the defined format, would be the responsibility of your API Gateway or your application code.

2. **Request transform** (nope): Optic is not involved in request transformations. Request transformation is a process that occurs at runtime, converting requests from one format to another before they reach your backend services. This process is generally managed by the API Gateway. Optic operates at the API specification level, rather than at runtime.

3. **Response transform** (nope): Similar to request transformations, response transformations are also not handled by Optic. This involves modifying the response from your backend services before it's returned to the client, a process that is typically performed by your API Gateway.

In summary, Optic is a tool for managing your API as a product, ensuring that changes to the API are controlled and monitored, that the API's documentation is kept up-to-date, and that breaking changes are not introduced. It operates at the design and planning level of your API lifecycle, rather than at runtime. It's complementary to other tools that perform runtime tasks like request validation, request transformation, and response transformation.

### Writing integration tests

Integration tests exercise the system's integration with its external
dependencies, making sure our code works against code we cannot change.

> Question: In all integration testing, we have to deploy the branch and export env vars.
> This requirement is exactly the same for e2e.
> So, how does integration testing even improve local testing, pre-PR push experience. Is it just the test execution speed?
>
> Answer: They improve local testing because you don’t always have to re-deploy latest code changes before you can test them. You only need to deploy if and when you change, say, dynamodb tables, or added a SNS topic that you code would need to publish message to.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/lhjkp2vwsnme5uh8q3pg.png)

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/3edjdszre3rtdxarx9x6.png)

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/opibztxwihlcng4jcuqi.png)

We should **avoid mocking the remote AWS services** in these tests because we
need to validate our assumptions about how the remote service works. For
example, when we make a DynamoDB query request, we make assumptions about how
its query syntax works and what the API response looks like. If we mock the
DynamoDB request then our tests only reinforce those assumptions but don't
validate them.

I will also **caution against simulating AWS locally**, it takes too much effort
to set up and I find the result is too brittle (breaks easily) and hard to
maintain. Anecdotally, I have seen many teams spend weeks trying to get
_localstack_ running and then waste even more time whenever it breaks in
mysterious ways. From time to time, you get weird errors in your tests because
of subtle behaviour differences between _localstack_ and the real AWS service.
You can easily lose hours or days of development time when these happen.

Instead, it’s much better to **use temporary environments** (e.g. for each
feature, or even each commit).

---

Install dependencies

`npm i -D cheerio awscred cross-env`

[Cheerio](https://cheerio.js.org/) lets us parse the HTML content returned by
the _GET / endpoint_ so we can inspect its content.

[awscred](https://github.com/mhart/awscred) lets us resolve the AWS credentials
and region so that we can initialize our test environment properly - e.g. to
allow the _get-index_ function to sign its HTTP requests with its IAM role.

We require `init` it at the top of every test file, and use it before the test
starts.

```js
// ./__tests__/steps/init.js

const {promisify} = require('util')
const awscred = require('awscred')
require('dotenv').config()

let initialized = false

/**
 * Loads the environment variables from the .env file,
 * resolves the AWS credentials using the `awscred` module
 * and puts the access key and secret into the environment variables.
 */
const init = async () => {
  if (initialized) {
    return
  }

  const {credentials, region} = await promisify(awscred.load)()

  process.env.AWS_ACCESS_KEY_ID = credentials.accessKeyId
  process.env.AWS_SECRET_ACCESS_KEY = credentials.secretAccessKey
  process.env.AWS_REGION = region

  if (credentials.sessionToken) {
    process.env.AWS_SESSION_TOKEN = credentials.sessionToken
  }

  console.log('AWS credential loaded')

  initialized = true
}

module.exports = {
  init,
}
```

The magic is in the `when` module. In an integration test we feed an event into the handler

```js
// ./__tests__/steps/when.js
const APP_ROOT = '../../'
const {get} = require('lodash')

/** Feeds an event into a lambda function handler and processes the response.
 * If the content-type of the response is 'application/json' and a body is present,
 * the body of the response is parsed from JSON into an object.
 * @async
 * @param {Object} event - The event object to pass to the handler.
 * @param {string} functionName - The name of the handler to execute.
 * @param {Object} [context={}] - The context object to pass to the handler.
 * @returns {Promise<Object>} - The response from the handler, potentially with a parsed body. */
const viaHandler = async (event, functionName, context = {}) => {
  const handler = require(`${APP_ROOT}/functions/${functionName}`).handler

  const response = await handler(event, context)
  // obj, path, defaultValue
  const contentType = get(response, 'headers.content-type', 'application/json')

  return response.body && contentType === 'application/json'
    ? {...response, body: JSON.parse(response.body)}
    : response
}

// feed an event object into the handler
const we_invoke_get_index = () => viaHandler({}, 'get-index')

module.exports = {
  we_invoke_get_index,
}
```

```js
// ./__tests__/test_cases/get-index.test.js
const cheerio = require('cheerio')
const when = require('../__tests__/steps/when')
const seedRestaurants = require('../seed-restaurants')

describe(`When we invoke the GET / endpoint`, () => {
  beforeAll(seedRestaurants)
  it(`Should return the index page with 8 restaurants`, async () => {
    const res = await when.we_invoke_get_index()

    expect(res.statusCode).toEqual(200)
    expect(res.headers['content-type']).toEqual('text/html; charset=UTF-8')
    expect(res.body).toBeDefined()

    const $ = cheerio.load(res.body)
    const restaurants = $('.restaurant', '#restaurantsUl')
    expect(restaurants.length).toEqual(8)
  })
})
```

```js
// ./__tests__/test_cases/get-restaurants.test.js
const when = require('../__tests__/steps/when')
const seedRestaurants = require('../seed-restaurants')

describe(`When we invoke the GET /restaurants endpoint`, () => {
  beforeAll(seedRestaurants)
  it(`Should return an array of 8 restaurants`, async () => {
    const res = await when.we_invoke_get_restaurants()

    expect(res.statusCode).toEqual(200)
    expect(res.body).toHaveLength(8)

    for (let restaurant of res.body) {
      expect(restaurant).toHaveProperty('name')
      expect(restaurant).toHaveProperty('image')
    }
  })
})
```

```js
// ./__tests__/test_cases/search-restaurants.test.js
const when = require('../__tests__/steps/when')
const seedRestaurants = require('../seed-restaurants')

describe(`When we invoke the POST /restaurants/search endpoint with theme 'cartoon'`, () => {
  beforeAll(seedRestaurants)
  it(`Should return an array of 4 restaurants`, async () => {
    const res = await when.we_invoke_search_restaurants('cartoon')

    expect(res.statusCode).toEqual(200)
    expect(res.body).toHaveLength(4)

    for (let restaurant of res.body) {
      expect(restaurant).toHaveProperty('name')
      expect(restaurant).toHaveProperty('image')
    }
  })
})
```

### Writing acceptance/e2e tests

The difference is about how the lambda functions are invoked; locally through
code vs with http through api gateway.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/udxdp9f74d9akwlp794l.png)

First, we need to add a couple of dependencies, let's add them to the top of the
`when.js` file.

```js
const aws4 = require('aws4')
const URL = require('url')
const http = require('axios')
```

These are necessary because we'll need to make HTTP requests to the deploy API
endpoints. Where applicable we might need to sign the requests with our IAM
credentials (e.g. with the _GET /restaurants_ endpoint), which is why we need
the **aws4**.

To allow the **when** module to toggle between "invoke function locally" and
"call the deployed API", we can use an environment variable that is set when we
run the test.

Let's call this environment variable **TEST_MODE** and let's add this line to
the top of the **when.js** module:

`const mode = process.env.TEST_MODE`

With that in mind, let's modify the **when.we_invoke_get_index** function to
toggle between invoking function locally and calling the deploy API endpoint.

```js
const we_invoke_get_index = async () =>
  mode === 'http' ? await viaHttp('', 'GET') : await viaHandler({}, 'get-index')
```

At `serverless.yml` add the following to the **provider** section:

```yml
environment:
  rest_api_url: !Sub https://${ApiGatewayRestApi}.execute-api.${AWS::Region}.amazonaws.com/${sls:stage}
```

Add the `viaHttp` helper:

This **viaHttp** method makes an HTTP request to the relative path on the
**rest_api_url** environment variable.

You can pass in an **opts** object to pass in additional arguments:

- **body**: useful for _POST_ and _PUT_ requests.
- **iam_auth**: we should sign the HTTP request using our IAM credentials (which
  is what the **signHttpRequest** function is for)
- **auth**: include this as the **Authorization** header, used for
  authenticating against Cognito-protected endpoints (i.e. _search-restaurants_)

Since **axios** has a different response structure to our Lambda function, we
need the **respondFrom** function to convert the axios response to what we need
for the tests.

```js
/** Feeds an event into a lambda function handler and processes the response.
 * If the content-type of the response is 'application/json' and a body is present,
 * the body of the response is parsed from JSON into an object.
 * @async
 * @param {Object} event - The event object to pass to the handler.
 * @param {string} functionName - The name of the handler to execute.
 * @param {Object} [context={}] - The context object to pass to the handler.
 * @returns {Promise<Object>} - The response from the handler, potentially with a parsed body. */
const viaHandler = async (event, functionName, context = {}) => {
  const handler = require(`${APP_ROOT}/functions/${functionName}`).handler

  const response = await handler(event, context)
  // obj, path, defaultValue
  const contentType = get(response, 'headers.content-type', 'application/json')

  return response.body && contentType === 'application/json'
    ? {...response, body: JSON.parse(response.body)}
    : response
}

/** Function to convert HTTP response into the required structure.
 * @param {object} httpRes - The original HTTP response.
 * @returns {object} The response in the required structure. */
const respondFrom = httpRes => ({
  statusCode: httpRes.status,
  body: httpRes.data,
  headers: httpRes.headers,
})

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

/** Function to make an HTTP request.
 * Pass in an 'opts' object for additional arguments:
 *  - 'body': for POST and PUT requests.
 *  - 'iam_auth': sign the HTTP request with IAM credentials.
 *  - 'auth': for the Authorization header, used for authentication against Cognito-protected endpoints.
 * @async
 * @param {string} relPath - The relative path for the HTTP request.
 * @param {string} method - The HTTP method.
 * @param {object} opts - Optional settings.
 * @returns {object} The response from the HTTP request.
 * @throws Will throw an error if the request fails.
 */
const viaHttp = async (relPath, method, opts) => {
  const url = `${process.env.rest_api_url}/${relPath}`
  console.info(`invoking via HTTP ${method} ${url}`)

  try {
    const headers = createHeaders(url, opts)
    const data = get(opts, 'body')

    const httpReq = http.request({
      method,
      url,
      headers,
      data,
    })

    const res = await httpReq
    return respondFrom(res)
  } catch (err) {
    if (err.status) {
      return {
        statusCode: err.status,
        headers: err.response.headers,
      }
    } else {
      throw err
    }
  }
}

const we_invoke_get_index = async () =>
  mode === 'http' ? await viaHttp('', 'GET') : await viaHandler({}, 'get-index')

const we_invoke_get_restaurants = async () =>
  mode === 'http'
    ? await viaHttp('restaurants', 'GET', {iam_auth: true})
    : await viaHandler({}, 'get-restaurants')

const we_invoke_search_restaurants = (theme, user) => {
  const body = JSON.stringify({theme})
  const event = {body}
  const auth = user ? user.idToken : null

  return mode === 'http'
    ? viaHttp('restaurants/search', 'POST', {body, auth})
    : viaHandler(event, 'search-restaurants')
}
```

At `packate.json` change and add the scripts:

```json
    "test": "cross-env TEST_MODE=handler jest",
    "test:e2e": "cross-env TEST_MODE=http jest",
```

**Implement acceptance test for search-restaurants**

This is a bit trickier because the **search-restaurant** endpoint is protected
by a Cognito custom authorizer. It means our test code would need to
authenticate itself against Cognito first.

Remember that "server" client we created when setting up the Cognito user pool?
If not, look in your **serverless.yml** you'll find it.

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

The **ALLOW_ADMIN_USER_PASSWORD_AUTH** auth flow allows us to call the Cognito
admin endpoints to register users and sign in as them.

To avoid having an implicit dependency on some user having been created
in Cognito, each test should create its own user, and delete it afterwards.

And to avoid clashing on usernames, let's use randomized usernames.

Install the aws-sdk client for Cognito User Pool. We will use it to create users
in our Cognito User Pool for the test.

```bash
npm install --save-dev @aws-sdk/client-cognito-identity-provider
```

```js
// ./__tests__/steps/given.js
const {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminInitiateAuthCommand,
  AdminRespondToAuthChallengeCommand,
} = require('@aws-sdk/client-cognito-identity-provider')
const chance = require('chance').Chance()

// needs number, special char, upper and lower case
const random_password = () => `${chance.string({length: 8})}B!gM0uth`

/**
 * Creates an authenticated user.
 *
 * @async
 * @returns {Promise<Object>} A promise that resolves to an object containing user details:
 *    - username: a string containing the username of the newly created user.
 *    - firstName: a string containing the first name of the newly created user.
 *    - lastName: a string containing the last name of the newly created user.
 *    - idToken: a string containing the ID token for the newly authenticated user.
 * @throws {Error} Throws an error if there is a problem creating the user or authenticating.
 */
const an_authenticated_user = async () => {
  const cognito = new CognitoIdentityProviderClient()

  const userpoolId = process.env.cognito_user_pool_id
  const clientId = process.env.cognito_server_client_id

  const firstName = chance.first({nationality: 'en'})
  const lastName = chance.last({nationality: 'en'})
  const suffix = chance.string({length: 8, pool: 'abcdefghijklmnopqrstuvwxyz'})
  const username = `test-${firstName}-${lastName}-${suffix}`
  const password = random_password()
  const email = `${firstName}-${lastName}@big-mouth.com`

  const createReq = new AdminCreateUserCommand({
    UserPoolId: userpoolId,
    Username: username,
    MessageAction: 'SUPPRESS',
    TemporaryPassword: password,
    UserAttributes: [
      {Name: 'given_name', Value: firstName},
      {Name: 'family_name', Value: lastName},
      {Name: 'email', Value: email},
    ],
  })
  await cognito.send(createReq)

  console.log(`[${username}] - user is created`)

  const req = new AdminInitiateAuthCommand({
    AuthFlow: 'ADMIN_NO_SRP_AUTH',
    UserPoolId: userpoolId,
    ClientId: clientId,
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
    },
  })
  const resp = await cognito.send(req)

  console.log(`[${username}] - initialised auth flow`)

  const challengeReq = new AdminRespondToAuthChallengeCommand({
    UserPoolId: userpoolId,
    ClientId: clientId,
    ChallengeName: resp.ChallengeName,
    Session: resp.Session,
    ChallengeResponses: {
      USERNAME: username,
      NEW_PASSWORD: random_password(),
    },
  })
  const challengeResp = await cognito.send(challengeReq)

  console.log(`[${username}] - responded to auth challenge`)

  return {
    username,
    firstName,
    lastName,
    idToken: challengeResp.AuthenticationResult.IdToken,
  }
}

module.exports = {
  an_authenticated_user,
}
```

### CI/CD with GitHub Actions using an IAM role provided through an OIDC Provider

Securing the CICD pipeline. Yan prefers to use identity federation for Github
through GitHub Actions on AWS.
https://scalesec.com/blog/oidc-for-github-actions-on-aws/

Since GitHub added OpenID Connect (OIDC) support for GitHub Actions (as
documented [here](https://github.com/github/roadmap/issues/249) on the GitHub
Roadmap), we can securely deploy to any cloud provider that supports OIDC
(including AWS) using short-lived keys that are automatically rotated for each
deployment.

The primary benefits are:

- No need to store long-term credentials and plan for their rotation
- Use your cloud provider’s native IAM tools to configure least-privilege access
  for your build jobs
- Even easier to automate with Infrastructure as Code (IaC)

![The new way - OIDC Identity Federation](https://scalesec.com/assets/img/blog/identity-federation-for-github-actions-on-aws/the-new-way-oidc-identity-federation.png)The new way - OIDC Identity Federation

Now, your GitHub Actions job can acquire a JWT from the GitHub OIDC provider,
which is a signed token including various details about the job (including what
repo the action is running in).

If you’ve configured AWS IAM to trust the GitHub OICD provider, your job can
exchange this JWT for short-lived AWS credentials that let it assume an IAM
Role. With those credentials, your build job can use the AWS CLI or APIs
directly to publish artifacts, deploy services, etc.

**Configure AWS IAM to trust the GitHub OICD provider**

1. Go to the **AWS IAM** console

2. Go to **Identity providers** and click on **Add provider**

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/230/a19/89c/mod14-001.png)

3. Select **OpenID Connect** as **Provider type**

4. Use **https://token.actions.githubusercontent.com** as the **Provider URL**
   and click **Get thumbprint**

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/7c5/f68/318/mod14-002.png)

Looks like we don't need the thumbprint anymore

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/u6qb6mmnmooczlywlqt5.png)

6. Enter **sts.amazonaws.com** as the **Audience**

7. Click **Add provider**

Next, we will need to create a CI role and associate the role with this identity
provider.

---

**Add IAM role for GitHub Actions**

1. Go to the **AWS IAM** console

2. Go to **Roles** and click **Create role**

3. Select **Web identity** as the **Trusted entity type**

4. Select the **token.actions.githubusercontent.com** provider we have added in
   the previous step

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/76a/325/1a8/mod14-004.png)

5. Select **sts.amazonaws.com** as the **Audience**, hit **Next**

6. For simplicity's sake, let's use the **AdministratorAccess** policy so our
   pipeline has no problems with creating resources, hit **Next**

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/d93/2d8/2e1/mod14-005.png)

7. Choose a name for this IAM role, e.g. **GitHubActionsRole**

8. Click **Create role**

This creates a new IAM role that can be assumed by GitHub Actions (via the OIDC
provider we created in the previous step). However, we still need to tighten it
so that only our repo(s) is able to assume this role. It's not possible to edit
the generated assume role policy in the console during the role creation
process. So we'd have to first create the role and then update it.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/hfeq9dk6yqoo1b2m32h0.png)

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/b24gwlsmb7hp14sf205y.png)

9. Find the newly created IAM role in the **AWS IAM** console

10. Go to the **Trust relationships** tab, click **Edit trust policy**

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/dbc/62b/39d/mod14-006.png)

11. Replace the **Condition** section with this (replace **<GitHubOrg>** and
    **<GitHubRepo>** with your org and repo names):
    `muratkeremozcan/prod-ready-serverless`

```
"Condition": {
  "StringLike": {
    "token.actions.githubusercontent.com:sub": "repo:<GitHubOrg>/<GitHubRepo>:*"
  }
}
```

NOTE: the condition should be changed to **StringLike**, not **StringEquals**.

This restricts the use of this role to a specific GitHub repo. **Otherwise, any
GitHub repo would have been able to assume this role!** If you have multiple
repos, you would configure this as an array of strings:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::721520867440:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringLike": {
          "token.actions.githubusercontent.com:sub": [
            "repo:muratkeremozcan/prod-ready-serverless:*",
            "repo:muratkeremozcan/another-repo:*",
            "repo:muratkeremozcan/yet-another-repo:*"
          ]
        }
      }
    }
  ]
}
```

12. Click **Update policy** to save your changes

13. Note the ARN of the IAM role, you need it for the next step
    (arn:aws:iam::721520867440:role/GitHubActionsRole)

---

**Add GitHub Actions config**

1. Add a folder called **.github** at the project root

2. Add a folder called **workflows** under the **.github** folder

3. Add a file **dev.yml** in the **workflows** folder

4. Paste the following into **dev.yml** (don't forget to replace the
   **<IAM ROLE ARN>** placeholder with the ARN of the IAM role you noted from
   the last step):

```yml
name: deploy dev

on:
  push:
    branches: [main]

jobs:
  deploy:
    # this prevents concurrent builds
    concurrency: dev-environment

    # The type of runner that the job will run on
    runs-on: ubuntu-latest

    # this is required for authenticating to AWS via the OIDC Provider we set up
    permissions:
      id-token: write
      contents: write

    steps:
      # Checks-out your repository under $GITHUB_WORKSPACE, so your job can access it
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-region: us-east-1
          role-to-assume: <IAM ROLE ARN>
          role-session-name: GithubActionsSession

      - name: npm ci
        run: npm ci

      - name: run integration test
        run: npm run test

      - name: deploy to dev
        run: npx sls deploy

      - name: run acceptance tests
        run: npm run acceptance
```

5. Commit and push your changes to GitHub

6. Go to the GitHub repo and go to the **Actions** tab, you should see the
   **deploy dev** workflow and click on it to see what happened during the
   workflow

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/9d6/974/441/mod14-007.png)

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/a59/991/55d/mod14-008.png)

### The problems with environment variables

So far all the configurations for our functions have been passed along via
environment variables.

While environment variables are easy to configure and access from our code, and
the Serverless framework makes it possible to share environment variables across
all the functions in a project, they do have a number of limitations:

- **Hard to share across projects**. For example, services might want to
  publicize their URLs, and API constraints (e.g. max batch size for updates,
  etc., like the ones you see in the AWS Service Quota console) so that other
  services can discover them easily without each having to hardcode in their own
  environment variables.
- **Cannot update an environment variable without deployment**. This is
  especially painful for those shared configs, which require all dependent
  services to go through their own deployment.
- **Not a safe place for secrets**. It's the first place an attacker would look
  if they ever compromise your function (maybe through a malicious/compromised
  dependency). There have been numerous attacks against NPM ecosystem that
  steals env variables.

My rule of thumb on environment variables is to use them for **static
configuration** and **references to intra-service resources**. That is,
resources that are part of this service.

**References to intra-service resources**

For example, DynamoDB tables that are owned and only used by this service. If
they were to change, you will have to do a deployment anyway, and doing so will
update the environment variables too. We have a lot of examples of this in our
demo app - DynamoDB table names, Cognito user pool ID, etc.

**Static configurations**

For example, the default max no. of restaurants to show on the homepage, etc.
You know, the kinda thing that you'll consider hardcoding into your app.

**Configurations that are not suitable for environment variables**

**Dynamic configurations**

This includes any app configurations that you may wish to change on the fly, or
allow a product/business owner to tweak and experiment with.

Depending on your requirements here, you can use SSM Parameter Store or external
tools such as [LaunchDarkly](https://launchdarkly.com/) or
[Split](https://www.split.io/). If you want to do A/B testing on different
configurations or implement a canary deployment for rolling out config changes,
then consider using an external service such as LaunchDarkly or Split.

For configurations that you want to change on the fly without having to redeploy
the service(s), you should use SSM Parameter Store.

**Secrets**

For application secrets, you _absolutely_ _should not_ store them in environment
variables in plain text.

Instead, you should load them from either SSM Parameter Store or Secrets Manager
during a cold start, decrypt, and save the decrypted secrets in the application
**context**. Again, **DON'T put the decrypted secrets into the environment
variable**.

You should also cache them and invalidate the cache every X minutes so as to
allow rotation of these secrets where applicable.

In the following exercises, we're going to see how this can be done.

If you want to learn the difference between SSM Parameter Store and Secrets
Manager, then check out [this video](https://www.youtube.com/watch?v=4I_ZrgjAdQw).

### Load app configurations from SSM Parameter Store with cache and cache invalidation

In the **get-restaurants** and **search-restaurants** functions, we have
hardcoded a default number of restaurants to return.

```
const defaultResults = process.env.defaultResults || 8
```

This is a reasonable example of something that you might wanna tweak on the fly.

Fortunately, for Node.js functions, there is a
[middy](https://github.com/middyjs) middleware engine. It comes with an
[SSM middleware](https://github.com/middyjs/middy/tree/master/packages/ssm) that
can implement the flow for us:

- load app configure at cold start
- cache it
- invalidate the cache at a specified frequency

#### **Add configurations to SSM Parameter Store**

1. Go to **Systems Manager** console in AWS

2. Go to **Parameter Store**

3. Click **Create Parameter**

4. Use the name **/<service-name>/dev/get-restaurants/config** where
   <service-name> is the **service** name in your **serverless.yml**.
   `/workshop-murat/dev/get-restaurants/config/`

For the value of the parameter, to allow us to add other configurations in the
future, let's enter a JSON string:

```
{
  "defaultResults": 8
}
```

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/13f/d71/f30/mod15-001.png)

5. Click **Create Parameter**

6. Repeat step 3-5 to create another
   **/<service-name>/dev/search-restaurants/config** parameter, also set its
   value to:

```
{
  "defaultResults": 8
}
```

Here only dev params are stored, but in a real project you want mirroring ones
for stage and prod. In this course, we can treat stage like a temp branch and
get the parameter from dev.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/yd95hpox132m6sbpzt0i.png)

---

#### **Load SSM parameters at runtime**

1. First install **middy** as a **production dependency** and also install
   Middy's SSM middleware as a **production dependency**. With v4.x of the SSM
   middleware, you also need to install the AWS SDK v3 SSM client separately. At
   the time of writing, the middleware doc says you should install this as a dev
   dependency, but that's incorrect. The Serverless framework automatically
   removes dev dependencies during packaging, so at runtime, the SSM middleware
   would err because it can't find the AWS SDK's SSM client. So, instead, we
   would need to install the SSM client as a production dependency.

`npm install --save @middy/core @middy/ssm @aws-sdk/client-ssm`

To load the parameters we created in the last step, we need to know the
**service** and **stage** names at runtime. These are perfect examples of static
values that can be passed in via environment variables. So let's do that.

2. Open **serverless.yml**, under **provider**, let's add two environment
   variables for **serviceName** and **stage**.

(**NOTE**: environment variables that are configured under
**provider.environment** would be copied to all functions by default).

```yaml
serviceName: ${self:service}
stage: ${sls:stage}
```

After this change, your **provider** section should look like this:

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
  environment:
    rest_api_url: !Sub https://${ApiGatewayRestApi}.execute-api.${AWS::Region}.amazonaws.com/${sls:stage}
    serviceName: ${self:service}
    stage: ${sls:stage}
```

3. Open the **functions/get-restaurants.js** module, and add these two lines to
   the top to require both **middy** and its **ssm** middleware.

```js
const middy = require('@middy/core')
const ssm = require('@middy/ssm')
```

4. On line 7

```
const defaultResults = process.env.defaultResults || 8
```

We no longer need this, because **defaultResults** would come from the
configuration we have in SSM.

But, we need to know the **service** name and **stage** name so we can fetch the
parameter we created earlier.

So, replace this line with the following.

```js
const {serviceName, stage} = process.env
```

5. Replace the whole **module.exports.handler = ...** block with the following:

```js
module.exports.handler = middy(async (event, context) => {
  const restaurants = await getRestaurants(context.config.defaultResults)
  const response = {
    statusCode: 200,
    body: JSON.stringify(restaurants),
  }

  return response
}).use(
  ssm({
    cache: true,
    cacheExpiry: 1 * 60 * 1000, // 1 mins
    setToContext: true,
    fetchData: {
      config: `/${serviceName}/${stage}/get-restaurants/config`,
    },
  }),
)
```

Let's take a moment to talk through what we've just done here.

[Middy](https://github.com/middyjs/middy) is a middleware engine that lets you
run middlewares (basically, bits of logic before and after your handler code
runs). To use it you have to wrap the handler code, i.e.

```js
middy(async (event, context) => {
  ... // function handler logic goes here
})
```

This returns a wrapped function, which exposes a **.use** function, that lets
you chain middlewares that you want to apply. You can read about how it works
[here](https://middy.js.org/docs/intro/how-it-works).

So, to add the **ssm** middleware, we have:

```js
middy(async (event, context) => {
  ... // function handler logic goes here
}).use(ssm({
  ... // configuration of the SSM middleware goes here
}))
```

- **cache: true** tells the middleware to cache the SSM parameter value, so we
  don't hammer SSM Parameter Store with requests.
- **cacheExpiry: 1 \* 60 \* 1000** tells the cached value to expire after 1
  minute. So if we change the configuration in SSM Parameter Store, then the
  concurrent executions would load the new value when their cache expires,
  without needing a deployment.
- **fetchData: { config: ... }** fetches individual parameters and stores them
  in either the invocation **context** object or the environment variables. By
  default, they are stored in the environment variables, but we can use the
  optional config **setToContext** to tell the middleware to store them in the
  **context** object instead.
- notice on line22, where we call the **getRestaurants** function? Now, we're
  passing **context.config.defaultResults** that we set above.

Do the same thing to `search-restaurants.js`.

> Make sure the fetchData.config looks the same as your SSM param, stating with `/`

---

#### **Configure IAM permissions**

There's one last thing we need to do for this to work once we deploy the app -
IAM permissions.

1. Open **serverless.yml**, and find the **statements** block under
   **provider.iam.role**, add the following permission statements:

```yml
- Effect: Allow
  Action: ssm:GetParameters*
  Resource:
    - !Sub arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter/${self:service}/${sls:stage}/get-restaurants/config
    - !Sub arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter/${self:service}/${sls:stage}/search-restaurants/config
```

After the change, the **provider.iam** block should look like this.

```yml
iam:
  role:
    statements:
      - Effect: Allow
        Action: dynamodb:scan
        Resource: !GetAtt RestaurantsTable.Arn
      - Effect: Allow
        Action: execute-api:Invoke
        Resource: !Sub arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${ApiGatewayRestApi}/${sls:stage}/GET/restaurants
      - Effect: Allow
        Action: ssm:GetParameters*
        Resource:
          - !Sub arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter/${self:service}/${sls:stage}/get-restaurants/config
          - !Sub arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter/${self:service}/${sls:stage}/search-restaurants/config
```

2. Deploy the project

3. Run the acceptance tests to make sure everything is still working

#### **Fixing the connection closing issue with Middy**

After this round of changes, you might have noticed that the integration tests
now give you this warning message at the end.

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/fdf/951/866/Screenshot_2023-04-02_at_13.06.47.png)

This is caused by a known issue with Middy 4.x when you use the cache expiry
feature. See the GitHub issue
[here](https://github.com/middyjs/middy/issues/990). This issue can block CI
runners from finishing your tests, so we must address it here.

So what we can do is to disable the caching behaviour in our tests, but leave
them on in the real thing.

To do that, we can:

Step 1. move the configuration into a shared environment variable (as in, shared
across all the functions in this project)

Step 2. create an override .env file for our tests

1. Open the **serverless.yml**, and under **provider.environment** add the
   following:

```yml
middy_cache_enabled: true
middy_cache_expiry_milliseconds: 60000 # 1 mins
```

After this change, your **provider.environment** section should look like this:

```yml
environment:
  rest_api_url: !Sub https://${ApiGatewayRestApi}.execute-api.${AWS::Region}.amazonaws.com/${sls:stage}
  serviceName: ${self:service}
  stage: ${sls:stage}
  middy_cache_enabled: true
  middy_cache_expiry_milliseconds: 60000 # 1 mins
```

2. Add a file called **.test.env** at the project root with the following
   content:

```
middy_cache_enabled=false
middy_cache_expiry_milliseconds=0
```

3. Open **tests/steps/init.js** and replace line 3

```js
require('dotenv').config()
```

with the following:

```js
const dotenv = require('dotenv')
dotenv.config({path: './.test.env'})
dotenv.config()
```

This loads both the **.env** file generated by the **serverless-export-env**
plugin, and the **.test.env** file we created by hand just now.

> **NOTE**: the order these files are loaded is important. Because we want the
> **.test.env** to override whatever is in **.env**, so we have to load it first.
> This is how the **dotenv** module handles overlapping env variables - the first
> one wins.

4. Open the **get-restaurants.js** module, and add these two lines somewhere
   around the top:

```js
const middyCacheEnabled = JSON.parse(process.env.middy_cache_enabled)
const middyCacheExpiry = parseInt(process.env.middy_cache_expiry_milliseconds)
```

We need to parse the two new environment variables because all environment
variables would come in as strings. And at the bottom of the function where we
configure the **ssm middleware**:

```js
}).use(ssm({
  cache: true,
  cacheExpiry: 1 * 60 * 1000, // 1 mins
  setToContext: true,
  fetchData: {
    config: `/${serviceName}/${stage}/get-restaurants/config`
  }
}))
```

replace this block with the following:

```js
}).use(ssm({
  cache: middyCacheEnabled,
  cacheExpiry: middyCacheExpiry,
  setToContext: true,
  fetchData: {
    config: `/${serviceName}/${stage}/get-restaurants/config`
  }
}))
```

so the **cache** and **cacheExpiry** configurations are now controlled by our
new environment variables.

5. Repeat step 4 for the **search-restaurants.js** module.

6. Rerun the integration tests.

```
npm t
```

and the warning message should be gone.

#### Share SSM parameters across these temporary environments

We will introduce a new **ssmStage** parameter to tell our functions which
environment's SSM parameters we should use. That way, when we create a new
stage, we can still use the same SSM parameters from the **dev** stage (assuming
that's the one we want to use).

Luckily for us, the Serverless framework supports custom parameters:

1. Open **serverless.yml** and add the following to **provider.environment**:

```yml
ssmStage: ${param:ssmStage, sls:stage}
```

This adds a new **ssmStage** environment variable for all of our functions in
this project. And it'll look for a **ssmStage** parameter from the CLI, and if
not found, it'll fall back to the built-in **sls:stage** variable and use the
stage name instead.

2. Under **provider.iam.role.statement**, we also need to change the ARNs for
   the SSM parameters to use this new parameter.

Change this IAM statement:

```yml
- Effect: Allow
  Action: ssm:GetParameters*
  Resource:
    - !Sub arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter/${self:service}/${sls:stage}/get-restaurants/config
    - !Sub arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter/${self:service}/${sls:stage}/search-restaurants/config
```

to the following:

```yml
- Effect: Allow
  Action: ssm:GetParameters*
  Resource:
    - !Sub arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter/${self:service}/${param:ssmStage,
      sls:stage}/get-restaurants/config
    - !Sub arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter/${self:service}/${param:ssmStage,
      sls:stage}/search-restaurants/config
```

3. Open the **get-restaurants.js** module, and replace this line:

```js
const {serviceName, stage} = process.env
```

with

```js
const {serviceName, ssmStage} = process.env
```

And replace the path of the SSM parameter in this block

```js
}).use(ssm({
  cache: middyCacheEnabled,
  cacheExpiry: middyCacheExpiry,
  setToContext: true,
  fetchData: {
    config: `/${serviceName}/${stage}/get-restaurants/config`
  }
}))
```

to use the new **ssmStage** environment variable instead, ie.

```js
}).use(ssm({
  cache: middyCacheEnabled,
  cacheExpiry: middyCacheExpiry,
  setToContext: true,
  fetchData: {
    config: `/${serviceName}/${ssmStage}/get-restaurants/config`
  }
}))
```

4. Repeat step 3 for **search-restaurants.js** module.

5. To test this out with a temporary environment, run with
   `--param="ssmStage=dev"` added.

```bash
npm run sls -- deploy -s ${{ steps.branch-name.outputs.current_branch }} --param="ssmStage=dev"
```

This would use the SSM parameters from the main **dev** environment that we had
configured by hand earlier.

To generate a new **.env** file for this environment, run with
`--param="ssmStage=dev"` added.

```bash
npm run sls export-env -- -s ${{ steps.branch-name.outputs.current_branch }} --all --param="ssmStage=dev"
```

Inspect the new **.env** file, and you should see the stage name in the URL
paths as well as the DynamoDB table name.

**--param="ssmStage=dev"** flag is only needed when you work on the temporary
environment (and other fixed environments only if you have not added SSM parameters there too). Because of the fallback we used when referencing this parameter in
the **serverless.yml** (i.e. **${param:ssmStage, sls:stage}**), you don't need
to set this parameter when working with the main stages such as dev and stage.

---

#### **Increase SSM Parameter Store's throughput limit**

> Didn't do this, not a large project, I don't want additional costs.

By default, SSM Parameter Store doesn't charge you for usage. On the flip side,
it restricts you to a measly **40 ops/second**. This is often not enough in a
production environment, especially if functions need to load, and periodically
refresh their configs from SSM Parameter Store.

Fortunately, you can significantly raise this throughput limit by, going to the
**SSM Parameter Store** console, go to the **Settings** tab, and click **Set
Limit**.

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/0db/87a/125/mod15-009.png)

And accept that from now on, you'll incur costs for using SSM Parameter Store.

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/470/95a/dbd/mod15-010.png)

Don't worry, the cost of SSM Parameter Store is very reasonable and shouldn't be
a huge burden on your AWS bill.

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/746/7dc/7d2/mod15-011.png)

And you might notice that you can also have **Advanced Parameters**. This helps
you alleviate the limit of 10,000 parameters per region, and 4KB per parameter.

If you have large configurations (up to 8KB) then you should consider using
advanced parameters. However, since SSM now supports an intelligent tier, it's
best to use that.

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/8e9/b6d/972/mod15-012.png)

---

**Publicize service information to Parameter Store**

AWS publishes a number of public parameters inside the SSM Parameter Store,
things like AMI ARNs, etc.

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/35f/4e3/6d8/Screenshot_2022-06-27_at_00.36.32.png)

This is a useful way to communicate relevant data to the consumers of your
service. And while we cannot publish public parameters to SSM Parameter Store,
we can still take inspiration from this approach and share relevant information
about our service with others (that reside in the same AWS account) - e.g. the
service's root URL and operational constraints such as the max no. of
restaurants that can be returned in a search result, etc.

---

#### **Output the operation constraints as SSM parameters**

In the **get-restaurants** and **search-restaurants** functions, we can
potentially accept a query string parameter, say, **count**, to let the caller
decide how many results we should return.

But when we do that, we're gonna want to make sure we have some validation in
place so that **count** has to be within some reasonable range.

We can communicate operation constraints like this (i.e. **maxCount**) to other
services by publishing them as SSM parameters. e.g.

**/<service-name>/<stage>/get-restaurants/constraints/maxCount**

**/<service-name>/<stage>/search-restaurants/constraints/maxCount**

Or maybe we can bundle everything into a single JSON file, and publish a single
parameter.

**/<service-name>/<stage>/serviceQuotas**

(following AWS's naming)

We're not going to implement it here, but please feel free to take a crack at
this yourself if you fancy exploring this idea further ;-)

### Securely handle secrets

Secrets should not be in plain text in environment variables.

Loading app configurations from SSM Parameter store is great. However, during
deployment, if the SSM parameters are referenced by `serverless.yml`, they are
fetched, decrypted and stored as environment variables for lambda functions.
This makes the environment variables an easy target for attackers.

If people do not know better, they might map SSM parameters to env vars, this
would be the mistake we are talking about.

```yml
provider:
  name: aws
  endpointType: REGIONAL
  runtime: nodejs18.x
  region: us-east-
  iam:
    role:
      statements:
        - Effect: Allow
          Action: ssm:GetParameters*
          Resource:
            - !Sub arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter/${self:service}/${param:ssmStage,
              sls:stage}/get-restaurants/config
            - !Sub arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter/${self:service}/${param:ssmStage,
              sls:stage}/search-restaurants/config
  environment:
    rest_api_url: !Sub https://${ApiGatewayRestApi}.execute-api.${AWS::Region}.amazonaws.com/${sls:stage}
    # suppose they take the SSM parameter and map it to an environment variable
    someSecret:
      !Sub arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter/${self:service}/${param:ssmStage,
      sls:stage}/search-restaurants/someSecret

functions:
  hello:
    handler: ...
    environment:
      # or at lamdba function level
      secret: ${ssm:/path-to-param}
```

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/4lxkim0rvoa8wlq511pn.png)

Yan's preferred approach is instead have the lambda function fetch and decrypt
parameters at runtime during cold start. The lambda function only needs to know
the name of the parameter, and then to avoid making calls to SSM parameter store
on every single invocation, the function would cache the decrypted parameter
values, and invalidate the cache after a few minutes. That way we can also
rotate the secret behind the scenes, without having to redeploy the lambda
functions that depend on the secrets.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/9uew9wn6huotlrxd7jwe.png)

`middy` to rescue; it has middleware for both SSM Parameter store and Secrets
Manager, including the ability to cache the values and invalidate after an
amount of time.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/mcqjpg1qprq3uh0utbbk.png)

SSM Parameter Store is free by default, but limited t o 40 ops / s. Switch to
paid tier in prod at 5 cents / 10k ops.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/e8l26p6en8f9fohl3v44.png)

### Load secrets from SSM Parameter Store with cache and cache invalidation

At **Load app configurations from SSM Parameter Store with cache and cache
invalidation** we implemented mechanisms to load application configs at cold
start and then cache and refresh every few minutes. However, we still ended up
storing the application configs in the environment variables.

That's OK for application configs because they're not sensitive data. Attackers
are probably not interested to know the default no. of restaurants you return on
your homepage.

But when it comes to application secrets, we **absolutely SHOULD NOT store them
in the environment variables in plain text**.

Instead, after we fetch (and decrypt) them during cold start, we want to set
them on the invocation **context** object. Sure, it's not foolproof, and
attackers can still find them if they know where to look. But they'll need to
know an awful lot more about your application in order to do it. And in most
cases, the attackers are not targetting us specifically, but we are caught in
the net because we left low-hanging fruit for the attackers to pick. So, let's
at least make them work for it!

#### Add a secure string to SSM Parameter Store

In our demo app, we don't actually have any secrets. But nonetheless, let's see
how we _could_ store and load these secrets from SSM Parameter Store and make
sure that they're securely handled.

1. Go to the **Systems Manager** console in AWS

2. Go to **Parameter Store**

3. Click **Create Parameter**

4. Use the name **/workshop-murat/dev/search-restaurants/secretString** where
   <service-name> is the **service** name in your **serverless.yml**

5. Choose **SecureString** as Type, and use the default KMS key
   (**alias/aws/ssm**).

6. For the value, put literally anything you want.

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/55b/706/86e/mod16-001.png)

7. Click **Create Parameter**

And now, we have a secret that is encrypted at rest, and whose access can be
controlled via IAM. That's a pretty good start.

But we need to make sure when we distribute the secret to our application, we do
so securely too.

#### Load secrets at runtime

1. Open the **functions/search-restaurants.js** module.

2. At the very end of the file, replace the **.use(...)** block with the
   following:

```js
}).use(ssm({
  cache: middyCacheEnabled,
  cacheExpiry: middyCacheExpiry,
  setToContext: true,
  fetchData: {
    config: `/${serviceName}/${ssmStage}/search-restaurants/config`,
    secretString: `/${serviceName}/${ssmStage}/search-restaurants/secretString`
  }
}))
```

After this change, the whole **module.exports.handler = ...** block of your
function should look like this:

```js
module.exports.handler = middy(async (event, context) => {
  const req = JSON.parse(event.body)
  const theme = req.theme
  const restaurants = await findRestaurantsByTheme(
    theme,
    context.config.defaultResults,
  )
  const response = {
    statusCode: 200,
    body: JSON.stringify(restaurants),
  }

  return response
}).use(
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
```

So, let's talk about what's going on here.

Firstly, you can chain Middy middlewares by adding them one after another.

Secondly, we again asked the middleware to put the **secretString** in the
**context** object instead of the environment variable with the line:

```js
setToContext: true
```

#### Configure IAM permissions

There's one last thing we need to do for this to work once we deploy the app -
IAM permissions.

1. Open **serverless.yml**, and find the **iam.role.statements** block under
   **provider**, add the new SSM parameter to the relevant IAM permission
   statement.

```yml
- Effect: Allow
  Action: ssm:GetParameters*
  Resource:
    - !Sub arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter/${self:service}/${param:ssmStage,
      sls:stage}/get-restaurants/config
    - !Sub arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter/${self:service}/${param:ssmStage,
      sls:stage}/search-restaurants/config
    - !Sub arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter/${self:service}/${param:ssmStage,
      sls:stage}/search-restaurants/secretString
```

After the change, the **iam** block should look like this.

```yml
iam:
  role:
    statements:
      - Effect: Allow
        Action: dynamodb:scan
        Resource: !GetAtt RestaurantsTable.Arn
      - Effect: Allow
        Action: execute-api:Invoke
        Resource: !Sub arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${ApiGatewayRestApi}/${sls:stage}/GET/restaurants
      - Effect: Allow
        Action: ssm:GetParameters*
        Resource:
          - !Sub arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter/${self:service}/${param:ssmStage,
            sls:stage}/get-restaurants/config
          - !Sub arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter/${self:service}/${param:ssmStage,
            sls:stage}/search-restaurants/config
          - !Sub arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter/${self:service}/${param:ssmStage,
            sls:stage}/search-restaurants/secretString
```

Deploy & test.

Notice that we didn't need to give our function **kms** permission to decrypt
the **SecureString** parameter. This is because it was encrypted with an
AWS-managed key - **alias/aws/ssm** - which the SSM service has access to. So
when we ask SSM for the parameter, it was able to decrypt it on our behalf.

This is a security concern. And if you want to tighten up the security of these
secrets then you need to use a Customer Managed Key (CMK) - these are KMS keys
that you create yourself and can control who has access to them.

### Customer Managed Key for even tighter security

4. Go to the **KMS** (Key Management Service) console in AWS, and click **Create
   Key**.

5. Follow through with the instructions, and use the **service** name in your
   **serverless.yml** as the alias for the key.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/8xf8vupzodg4c4xrvb1g.png)

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/6v6vfd5xqwzxg1hwbxvt.png)Choose who can administer the key, for simplicity's sake, choose the **Administrator**
role and your current IAM user.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/rgx36muck0xbueur5rn1.png)

7. Choose who can use the key, in this case, add your IAM user. (Only after
   adding Administrator Role it appeared in Parameter details in the next section)

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/958s994n97xglr1gsl1e.png)

8. Click **Finish** to create the key.

9. Go back to the **Systems Manager** console, and go to **Parameter Store**.

10. Find the **search-restaurants/secretString** parameter we created earlier,
    and click **Edit**.

11. Change the KMS key to the one we just created

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/p6slwfz9dhb7m14c2wf7.png)

12. Click **Save Changes**

13. Redeploy the project to force the code to reload the secret. Add the
    **--force** flag, otherwise, the Serverless framework might skip the
    deployment since we haven't changed anything.

_npx sls deploy --force_

14. Run the acceptance test again.

_npm run acceptance_

and see that the **search-restaurants** test is now **failing**.

That's good. Now, only those who have access to the KMS key would be able to
access the secret. It adds another layer of protection.

#### Configure IAM permissions for KMS

To give our function permission to decrypt the secret value using KMS, we need
the ARN for the key. Although the AWS documentation seems to suggest that you
can grant IAM permissions to CMK keys using an alias, they have never worked for
me.

So, as a result, the approach I normally take is for the process that provisions
these keys (in practice, we wouldn't be doing it by hand!) to also provision an
SSM parameter with the key's ARN.

Since we don't have another project that manages these shared resources in the
region (often, they're part of an organization's landing zone configuration),
let's add this SSM parameter by hand.

1. Go to the **Parameter Store** console

2. Create a new **String** parameter called **/{service-name}/{stage}/kmsArn**
   (replace {service-name} and {stage} with the same values you used for the
   other parameters), and put the ARN of the KMS key (you can find this in the
   **KMS** console if you navigate to the key you created earlier) as its value.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/o4iysax4yg14yo5wwcd7.png)

3. Open **serverless.yml**

4. In the **provider.iam.role.statements** block, add the following permissions

```yml
custom:
 ssmStage: ${param:ssmStage, sls:stage}


provider:
  iam:
    role:
      statements:
        - Effect: Allow
          Action: kms:Decrypt
          # Resource: ${ssm:/${self:service}/${sls:stage}/kmsArn}
          # so that it works on temp branches...
          Resource: ${ssm:/${self:service}/${self:custom.ssmStage}/kmsArn}
```

This special syntax **${ssm:...}** is how we can reference parameters in SSM
directly in our **serverless.yml**. It's useful for referencing things like
this, but again, since the SSM parameter values are fetched at deployment time
and baked into the generated CloudFormation template, you shouldn't load any secrets this way.

Deploy & test.

#### Wrapping the wrapper

Looking at the **search-restaurants** function, it's getting a bit unsightly. I
mean, half of it is to do with middleware!

In that case, you can encapsulate some of these into your own wrapper so it's
all tucked away.

e.g. if there are a number of middlewares that you always want to apply, you
might create a wrapper like this.

```js
module.exports = f => {
  return middy(f)
    .use(middleware1({ ... }))
    .use(middleware2({ ... }))
    .use(middleware3({ ... }))
}
```

and then apply them to your function handlers like this:

```js
const wrap = require('../lib/wrapper')
...
module.exports.handler = wrap(async (event, context) => {
  ...
})
```

And if you have conventions regarding application configs or secrets, you can
also encode those into your wrappers.

However, a word of caution here, I have seen many teams go overboard with this
and create wrappers that are far too rigid and make too many assumptions (e.g.
every function must have an application config in SSM). 

Another thing I'd advise against is putting business logic into middlewares,
almost like if you take any similar code (e.g. read X from DDB) and put them
into middlewares and then configure your handler as a sequence of middlewares
Again, I've seen far too many teams go trigger-happy with middlewares and start
putting everything in them. Middlewares are powerful tools but they're just
tools nonetheless. Master your tools, and don't let them master you.

Be warned against abstracting the wrong things, and loosing sight of separation of concerns

```js
// ./lib/middleware.js

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
  ).use(validator({responseSchema: transpileSchema(responseSchema)}))
}

module.exports = {commonMiddleware}
*/
```

That allows to reduce some redundant code in our files:

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/cxr68p0clxkrz82cqqxr.png)

### Request & Response validation:



Reference response schema for search-restaurants & get-restaurants (it is the same array of objects):

```json
{
  "$schema": "http://json-schema.org/schema#",
  "type": "object",
  "properties": {
    "statusCode": {
      "type": "integer"
    },
    "body": {
      "type": "string",
      "contentMediaType": "application/json",
      "contentSchema": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "name": {
              "type": "string"
            },
            "image": {
              "type": "string",
              "format": "uri"
            },
            "themes": {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          },
          "required": ["name", "image", "themes"]
        }
      }
    }
  },
  "required": ["statusCode", "body"]
}
```



We can also have the schema in the file, or next to the file. Here's the request schema for search-restaurants.js

```js
// ...
// schema validator challenge
const validator = require('@middy/validator')
const {transpileSchema} = require('@middy/validator/transpile')
const schema = {
  type: 'object',
  properties: {
    body: {
      type: 'string',
      contentMediaType: 'application/json',
      contentSchema: {
        type: 'object',
        properties: {
          theme: {
            type: 'string',
          },
        },
        required: ['theme'],
      },
    },
  },
  required: ['body'],
}

const findRestaurantsByTheme = async (theme, count) => {
  // ...
}


module.exports.handler = commonMiddleware(async (event, context) => {
  const {theme} = JSON.parse(event.body)
  const restaurants = await findRestaurantsByTheme(
    theme,
    context.config.defaultResults,
  )
  const response = {
    statusCode: 200,
    body: JSON.stringify(restaurants),
  }

  return response
}).use(validator({eventSchema: transpileSchema(schema)}))

```

Here's how the common response schema is used at get-restaurants:
```js

const validator = require('@middy/validator')
const {transpileSchema} = require('@middy/validator/transpile')
const responseSchema = require('../lib/response-schema.json')

const getRestaurants = async count => {
  // ...
}


const handler = middy(async (event, context) => {
  console.log('context.config is: ', context.config)
  const restaurants = await getRestaurants(context.config.defaultResults)

  return {
    statusCode: 200,
    body: JSON.stringify(restaurants),
  }
})
  .use(
    ssm({
      cache: middyCacheEnabled,
      cacheExpiry: middyCacheExpiry,
      setToContext: true,
      fetchData: {
        config: `/${serviceName}/${ssmStage}/get-restaurants/config`,
      },
    }),
  )
  .use(validator({responseSchema: transpileSchema(responseSchema)}))
  // if we also had a request schema, we could add it here 
  // .use(validator({
  //   {eventSchema: transpileSchema(requestSchema)}
  //   responseSchema: transpileSchema(responseSchema)
  // }))


module.exports = {
  handler,
}
```



### SSM Parameter store vs Secrets Manager

Storing secrets: SSM Parameter Store vs Secrets Manager

1. Cost-effectiveness: While the Secrets Manager charges usage costs and an uptime cost per secret, the SSM Parameter Store offers Standard parameters free of charge. The costs only arise for Higher Throughput mode and are comparable to Secrets Manager. However, it's crucial to manage these costs correctly to avoid unexpected charges.
2. Simplicity: The Secrets Manager offers built-in secret rotation, but it requires additional work from the developer to manage the process. With the SSM Parameter Store, it's easier to implement a custom rotation Lambda function and manage it with a custom EventBridge schedule.
3. Flexibility: Not all application configurations are sensitive and need encryption. The SSM Parameter Store can handle both plain text parameters and encrypted strings, making it more versatile.

However, there are specific cases where Secrets Manager is the better choice, such as:

- For multi-region applications that require cross-region replication of secrets.
- When working with large (> 8kb) secrets due to the SSM Parameter Store's limit of 8kb.
- In situations where secrets need to be shared cross-account.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/fvnwa5fnh8vjrw99tad6.png)

## Part 3 Processing events in real time

### Project organization - how do I organize my system in to repositories?

**Monorepo**: each service in a folder of its own, shared libs in another folder. Good for startups.

Pros: easier to share code through symlinks + webpack. No need to push the libs seperately. One CI/CD pipeline to deploy.

Cons: at scale, you need lots of tooling and/or a dedicated team to keep it going.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/sovm34yqonhfyb82k6vi.png)

**Microrepo/Polyrepo**: each service in its own repo. Once CI/CD pipeline per service. Shared code through shared libs, in their own repos. Shared infra in a separate repo, resources shared via SSM params, etc.

Shared lib or service?

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/t6674kwy8u2ouwc4acwy.png)

### EventBridge

**Amazon EventBridge is a serverless event bus that can connect different
AWS** **(and non-AWS) services**. It has a few great features that services
like SQS, SNS, and Kinesis do not possess. Chief among them is the ability to
use more than 90 AWS services as event sources and 17 services as targets,
automated scaling, content-based filtering, schema discovery, and input
transformation. But like any other technology, **it has certain deficiencies
like no guarantee** **on ordering of events or buffering.** 

Event publisher: anything with the permission to make a put request to the event bus. They publish events to the Event Bus.

Consumers are interested in the events that come in. They filter them by Rules. With a Rule, we can define event patterns to identify the events we are interested in (and configure up to 5 targets). We can transform the captured event for each target (customize the payload).

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/1f4kb1kc2unejbivhivt.png)

When sending events to the bus, the event publisher has to include some data in json for the put event.

Even pattern is used to pattern-match for the consumer(s) to receive the event. 

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/u21u089y70ghywhyptc6.png)

Some pattern matching examples:

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/07t8v1grs9imrjz0vwpn.png)

### Processing events with EventBridge and Lambda

Benefits of event-driven architecture:

* Loose coupling

* Scalability

  

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/ur6nqxeci9xprvbzam3f.png)

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/6zlrvmq18xj515bvpoje.png)

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/3i7tvd2ow1ou9nqe689g.png)

### Processing events with EventBridge and Lambda

#### Add EventBridge bus

1. Open **serverless.yml**

2. Add an  EventBridge bus as a new resource under the **resources.Resources** section

```yml
EventBus:
  Type: AWS::Events::EventBus
  Properties:
    Name: order_events_${sls:stage}_${self:custom.name}
```

**IMPORTANT**: make sure that this **EventBus** resource is aligned with **ServiceUrlParameter**, **CognitoUserPool** and other CloudFormation resources.

3. While we're here, let's also add the EventBus name as output. Add the following to the **resources.Outputs** section of the **serverless.yml**.

```yml
EventBusName:
  Value: !Ref EventBus
```

4. Deploy the project.

 This will provision an EventBridge bus called **order_events_dev_** followed by your name.

------

#### Add place-order function

1. Add a new **place-order** function (in the **functions** section)

```yml
place-order:
  handler: functions/place-order.handler
  events:
    - http:
        path: /orders
        method: post
        authorizer:
          name: CognitoAuthorizer
          type: COGNITO_USER_POOLS
          arn: !GetAtt CognitoUserPool.Arn
  environment:
    bus_name: !Ref EventBus
```

 Notice that this new function references the newly created **EventBridge** bus, whose name will be passed in via the **bus_name** environment variable.

 This function also uses the same Cognito User Pool for authorization, as it'll be called directly by the client app.

2. Add the **permission** to publish events to EventBridge by adding the following to the list of permissions under **provider.iam.role.statements**:

```yaml
- Effect: Allow
  Action: events:PutEvents
  Resource: !GetAtt EventBus.Arn
```

3. Add a **place-order.js** module to the **functions** folder

4. We will need to talk to EventBridge in this new module, so let's install the AWS SDK EventBridge client as a **dev dependency**.

```bash
npm i --save-dev @aws-sdk/client-eventbridge
```

5. Paste the following into the new **place-order.js** module:

```js
const { EventBridgeClient, PutEventsCommand } = require('@aws-sdk/client-eventbridge')
const eventBridge = new EventBridgeClient()
const chance = require('chance').Chance()

const busName = process.env.bus_name

module.exports.handler = async (event) => {
  const restaurantName = JSON.parse(event.body).restaurantName

  const orderId = chance.guid()
  console.log(`placing order ID [${orderId}] to [${restaurantName}]`)

  const putEvent = new PutEventsCommand({
    Entries: [{
      Source: 'big-mouth',
      DetailType: 'order_placed',
      Detail: JSON.stringify({
        orderId,
        restaurantName,
      }),
      EventBusName: busName
    }]
  })
  await eventBridge.send(putEvent)

  console.log(`published 'order_placed' event into EventBridge`)

  const response = {
    statusCode: 200,
    body: JSON.stringify({ orderId })
  }

  return response
}
```

 This **place-order** function handles requests to create an order (via the **POST /orders** endpoint we configured just now). As part of the POST body in the request, it expects the **restaurantName** to be passed in. Upon receiving a request, all it's doing is publishing an event to the EventBridge bus.

 In the real world, you will probably save the order in a DynamoDB table somewhere, but we'll skip that in this demo app to focus on the event processing side of things.

#### Add integration test for place-order function

1. Add a file **place-order.tests.js** to the **test_cases** folder

2. Paste the following into the new **test_cases/place-order.tests.js** module:

```js
const when = require('../steps/when')
const given = require('../steps/given')
const teardown = require('../steps/teardown')
const { init } = require('../steps/init')
const { EventBridgeClient } = require('@aws-sdk/client-eventbridge')

const mockSend = jest.fn()
EventBridgeClient.prototype.send = mockSend

describe('Given an authenticated user', () => {
  let user

  beforeAll(async () => {
    await init()
    user = await given.an_authenticated_user()
  })

  afterAll(async () => {
    await teardown.an_authenticated_user(user)
  })

  describe(`When we invoke the POST /orders endpoint`, () => {
    let resp

    beforeAll(async () => {
      mockSend.mockClear()
      mockSend.mockReturnValue({})

      resp = await when.we_invoke_place_order(user, 'Fangtasia')
    })

    it(`Should return 200`, async () => {
      expect(resp.statusCode).toEqual(200)
    })

    it(`Should publish a message to EventBridge bus`, async () => {
      expect(mockSend).toHaveBeenCalledTimes(1)
      const [ putEventsCmd ] = mockSend.mock.calls[0]
      expect(putEventsCmd.input).toEqual({
        Entries: [
          expect.objectContaining({
            Source: 'big-mouth',
            DetailType: 'order_placed',
            Detail: expect.stringContaining(`"restaurantName":"Fangtasia"`),
            EventBusName: process.env.bus_name
          })
        ]
      })
    })
  })
})
```



 Wait a minute, we're mocking the AWS operations! Didn't you say not to do it?

 The problem is that, to validate the events that are sent to EventBridge it'll take a bit of extra infrastructure set up. Because you can't just call EventBridge and ask what events it had just received on a bus recently. You need to subscribe to the bus and capture events in real-time as they happen.

 We'll explore how to do this in the next couple of lessons. For now, let's just mock these tests.

3. Modify **steps/when.js** to add a new **we_invoke_place_order** function

```js
const we_invoke_place_order = async (user, restaurantName) => {
  const body = JSON.stringify({ restaurantName })

  switch (mode) {
    case 'handler':
      return await viaHandler({ body }, 'place-order')
    case 'http':
      const auth = user.idToken
      return await viaHttp('orders', 'POST', { body, auth })
    default:
      throw new Error(`unsupported mode: ${mode}`)
  }
}

module.exports = {
  we_invoke_get_index,
  we_invoke_get_restaurants,
  we_invoke_search_restaurants,
  we_invoke_place_order
}
```

4. Run integration tests

#### Update web client to support placing order

1. Now that we have a new (Cognito-protected) API endpoint to place orders, we need to update the frontend so that when a user clicks on a restaurant, it'll place an order against the restaurant. (Copy paste html)

 This new UI code would call the **POST /orders** endpoint when you click on one of the restaurants. But to do that, the **get-index** function needs to know the URL endpoint for it, and then pass it into the HTML template. In the real world, it will likely be a separate microservice and therefore a different root URL. For simplicity's sake, we have included this orders endpoint in the same API so we have everything in one place.

2. Add the environment variable orders_api for get-index function:

```yml
functions:
  get-index:
		environment:
      restaurants_api: !Sub https://${ApiGatewayRestApi}.execute-api.${AWS::Region}.amazonaws.com/${sls:stage}/restaurants
      orders_api: !Sub https://${ApiGatewayRestApi}.execute-api.${AWS::Region}.amazonaws.com/${sls:stage}/orders
```

3. Modify **functions/get-index.js** to fetch the URL endpoint to place orders (from the new **orders_api** environment variable). On line8 where you have:

```js
const restaurantsApiRoot = process.env.restaurants_api
```

 Somewhere near there, add the following:

```js
const ordersApiRoot = process.env.orders_api
```

4. Modify **functions/get-index.js** to pass the **ordersApiRoot** url to the updated **index.html** template. On line38, replace the **view** object so we add a **placeOrderUrl** field.

```js
const view = {
  awsRegion,
  cognitoUserPoolId,
  cognitoClientId,
  dayOfWeek,
  restaurants,
  searchUrl: `${restaurantsApiRoot}/search`,
  placeOrderUrl: ordersApiRoot
}
```

#### Add notify-restaurant function

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/dp9y7p4jte98get7gsks.png)

1. Modify **serverless.yml** to add a new SNS topic for notifying restaurants, under the **resources.Resources** section

```yml
RestaurantNotificationTopic:
  Type: AWS::SNS::Topic
```

2. Also, add the SNS topic's name and ARN to our stack output. Add the following to the **resources.Outputs** section of the **serverless.yml**

```yaml
RestaurantNotificationTopicName:
  Value: !GetAtt RestaurantNotificationTopic.TopicName

RestaurantNotificationTopicArn:
  Value: !Ref RestaurantNotificationTopic
```

3. Deploy the project to provision the SNS topic.

4. Add a **notify-restaurant.js** module in the **functions** folder

5. We will need to install the AWS SDK's SNS client so we can publish notifications to the SNS topic. Again, we're gonna install the client as a **dev dependency**.

```js
npm i --save-dev @aws-sdk/client-sns
```

6. Paste the following into the new **functions/notify-restaurant.js** module:

```js
const { EventBridgeClient, PutEventsCommand } = require('@aws-sdk/client-eventbridge')
const eventBridge = new EventBridgeClient()
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns')
const sns = new SNSClient()

const busName = process.env.bus_name
const topicArn = process.env.restaurant_notification_topic

module.exports.handler = async (event) => {
  const order = event.detail
  const publishCmd = new PublishCommand({
    Message: JSON.stringify(order),
    TopicArn: topicArn
  })
  await sns.send(publishCmd)

  const { restaurantName, orderId } = order
  console.log(`notified restaurant [${restaurantName}] of order [${orderId}]`)

  const putEventsCmd = new PutEventsCommand({
    Entries: [{
      Source: 'big-mouth',
      DetailType: 'restaurant_notified',
      Detail: JSON.stringify(order),
      EventBusName: busName
    }]
  })
  await eventBridge.send(putEventsCmd)

  console.log(`published 'restaurant_notified' event to EventBridge`)
}
```

 This **notify-restaurant** function would be triggered by EventBridge, by the **place_order** event that we publish from the **place-order** function.

 Remember that in the **place-order** function we published **Detail** as a JSON string:

```js
const putEvent = new PutEventsCommand({
  Entries: [{
    Source: 'big-mouth',
    DetailType: 'order_placed',
    Detail: JSON.stringify({
      orderId,
      restaurantName,
    }),
    EventBusName: busName
  }]
})
```

 However, when EventBridge invokes our function, **event.detail** is going to be an object, and it's called **detail** **not Detail** (one of many inconsistencies that you just have to live with...)

 Our function here would publish a message to the **RestaurantNotificationTopic** SNS topic to notify the restaurant of a new order. And then it will publish a **restaurant_notified** event.

 But we still need to configure this function in the **serverless.yml**.

6. Modify **serverless.yml** to add a new **notify-restaurant** function

```yml
notify-restaurant:
  handler: functions/notify-restaurant.handler
  events:
    - eventBridge:
        eventBus: !Ref EventBus
        pattern:
          source:
            - big-mouth
          detail-type:
            - order_placed
  environment:
    bus_name: !Ref EventBus
    restaurant_notification_topic: !Ref RestaurantNotificationTopic
```

 If you have read the Serverless framework [docs on EventBridge](https://serverless.com/framework/docs/providers/aws/events/event-bridge#using-a-different-event-bus), then you might also be wondering why I didn't just let the Serverless framework create the bus for us.

 That is a very good question!

 The reason is that you generally wouldn't have a separate event bus per microservice. The power of EventBridge is that it gives you very fine-grained filtering capabilities and you can subscribe to events based on their content such as the type of the event (usually in the **detail-type** attribute).

 Therefore you typically would have a centralized event bus for the whole organization, and different services would be publishing and subscribing to the same event bus. This event bus would be provisioned by other projects that manage these shared resources (as discussed before). This is why it's far more likely that your EventBridge functions would need to subscribe to an existing event bus by ARN.

 As for the subscription pattern itself, well, in this case, we're listening for only the **order_placed** events published by the **place-order** function.

 To learn more about content-based filtering with EventBridge, have a read of [**this post**](https://www.tbray.org/ongoing/When/201x/2019/12/18/Content-based-filtering) by Tim Bray.

7. Modify **serverless.yml** to add the permission to perform **sns:Publish** against the SNS topic, under **provider.iam.role.statements**

```yaml
- Effect: Allow
  Action: sns:Publish
  Resource: !Ref RestaurantNotificationTopic
```

#### Acceptance test for notify-restaurant function

We can publish an **order_placed** event to the EventBridge event via the AWS SDK to execute the deployed **notify-restaurant** function. Because this function publishes to both SNS and EventBridge, we have the same challenge in verifying that it's producing the expected side-effects as the **place-order** function.

For now, we'll take a shortcut and skip the test altogether. Notice that the test cases you added earlier are all wrapped inside an **if** statement already

```js
if (process.env.TEST_MODE === 'handler') {
  ...
} else {
  it('no acceptance test', () => {})
}
```

so they're only executed when you run the integration tests.

The **"****no acceptance test"** test is a dummy test, it's only there because Jest errors if it doesn't find a test in a module. So without it, the acceptance tests would fail because the **notify-restaurant.tests.js** module doesn't contain a test.

In the next couple of exercises, we'll come back and address this properly.

#### Peeking into SNS and EventBridge messages

While working on these changes, we don't have a way to check what our functions are writing to SNS or EventBridge. This is a common problem for teams that leverage these services heavily. To address this, check out the [**lumigo-cli**](https://www.npmjs.com/package/lumigo-cli). It has commands to [tail-sns](https://www.npmjs.com/package/lumigo-cli#lumigo-cli-tail-sns) and [tail-eventbridge-bus](https://www.npmjs.com/package/lumigo-cli#lumigo-cli-tail-eventbridge-bus) which lets you see what events are published to these services in real time.

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/2d4/799/a14/mod18-002.png)

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/4f1/3c2/4c1/mod18-003.png)



1. Install the lumigo-cli as a **dev dependency**

*npm i --save-dev lumigo-cli*

2. Use the **lumigo-cli** to peek at both the SNS topic and the EventBridge bus using the **tail-sns** and **tail-eventbridge-bus** commands. For example,

```bash
npx lumigo-cli tail-sns -r us-east-1 -n [TOPIC NAME]
```

(**replace** **[TOPIC NAME]** with the name of your SNS topic)

3. Load the index page in the browser and place a few orders. You should see those events show up in the **lumigo-cli** terminals.

So far this is how place-order an notify-restaurant look

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/dp9y7p4jte98get7gsks.png)

### SNS & EventBridge in e2e tests

In the tests so far, we are mocking the interactions with EventBridge and SNS; we have confidence that our lambdas are sending out the messages but not that some message is being published.

We need a way to listen in on what's published to EventBridge and SNS, so that we can validate that the lambdas have published the right events to EventBridge & SNS.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/r0ee2n6a238snjoy9ydk.png)

EventBridge & SNS can both forward the messages to SQS. Then, e2e tests can perform polling to wait for the messages to arrive to SQS. The caveat is that we do not want to deploy the SQS to production since it is only for testing. CloudFormation supports conditions, which we can use to conditionally deploy resources only in PRs.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/glb62ql4zwp1g7urqct9.png)

Another concern is that the tests may be triggering downstream functions and littering the event bus with test events. For this, just use a temporary stack. That means we will cover this test only in PRs and not in dev or stage.

#### Include SNS in the e2e tests, so we can validate the message we publish to SNS

#### Add conditionally deployed SQS queue

1. Open **serverless.yml**.

2. Add the following **Conditions** block under the **resources** section

```yml
Conditions:
  IsE2eTest:
    Fn::Equals:
      - ${sls:stage}
      - dev
```

 **IMPORTANT**: make sure that this section is aligned with **resources.Resources** and **resources.Outputs**. i.e.

```yml
resources:
  Conditions:
    ...

  Resources:
    ...

  Outputs:
    ...
```

 We will use this **IsE2eTest** condition to conditionally deploy infrastructure resources for environments where we'll need to run end-to-end tests (which for now, is just the **dev** stage).

3. Add an SQS queue under **resources.Resources**

```yml
E2eTestQueue:
  Type: AWS::SQS::Queue
  Condition: IsE2eTest
  Properties:
    MessageRetentionPeriod: 60
    VisibilityTimeout: 1
```

 Because this SQS queue is marked with the aforementioned **IsE2eTest** condition, it'll only be deployed (for now) when the **${sls:stage}** equals "**dev**".

 Notice that the **MessageRetentionPeriod** is set to **60s**. This is because this queue is there only to facilitate end-to-end testing and doesn't need to retain messages beyond the duration of these tests. 1 minute is plenty of time for this use case.

 Another thing to note is that **VisibilityTimeout** is set to a measly 1 second. This means messages are available again after 1 second. This is partly necessary because Jest runs each test module in a separate environment, so messages that are picked up by one test would be temporarily hidden from another. Having a short visibility timeout should help with this as we increase the chance that each test would see each message at least once during the test.

4. To allow SNS to send messages to an SQS queue, we need to add an SQS queue policy and give **SQS:SendMessage** permission to the SNS topic. Add the following to the **resources.Resources** section.

```yml
E2eTestQueuePolicy:
  Type: AWS::SQS::QueuePolicy
  Condition: IsE2eTest
  Properties:
    Queues:
      - !Ref E2eTestQueue
    PolicyDocument:
      Version: "2012-10-17"
      Statement:
        Effect: Allow
        Principal: "*"
        Action: SQS:SendMessage
        Resource: !GetAtt E2eTestQueue.Arn
        Condition:
          ArnEquals:
            aws:SourceArn: !Ref RestaurantNotificationTopic
```

 Here you can see that, the **SQS:SendMessage** permission has been granted to the **RestaurantNotificationTopic** SNS topic, and it's able to send messages to just the **E2eTestQueue** queue we configured in the previous step. So we're following security best practices and applying the principle of least privilege.

5. The last step is to subscribe an SQS queue to receive messages from the SNS topic by adding an SNS subscription. Add the following to the **resources.Resources** section.

```yml
E2eTestSnsSubscription:
  Type: AWS::SNS::Subscription
  Condition: IsE2eTest
  Properties:
    Protocol: sqs
    Endpoint: !GetAtt E2eTestQueue.Arn
    RawMessageDelivery: false
    Region: !Ref AWS::Region
    TopicArn: !Ref RestaurantNotificationTopic
```

 One thing that's worth pointing out here, is that **RawMessageDelivery** is set to **false**. This is an important detail.

 If **RawMessageDelivery** is **true**, you will get just the message body that you publish to SNS as the SQS message body. For example:

```json
{
  "orderId": "4c67cf1d-9ac0-5dcb-9221-45726b7cbcc7",
  "restaurantName":"Pizza Planet"
}
```

 Which is great when you just want to process the message. But it doesn't give us information about where the message came from, which is something that we need for our e2e tests, where we want to verify the right message was published to the right place.

 With **RawMessageDelivery** set to **false**, this is what you receive in SQS instead:

```json
{
  "Type": "Notification",
  "MessageId": "8f14c0c1-6956-5fb7-a045-976ede2fe40b",
  "TopicArn": "arn:aws:sns:us-east-1:374852340823:workshop-yancui-dev-RestaurantNotificationTopic-1JUE46554XL3P",
  "Message": "{\"orderId\":\"4c67cf1d-9ac0-5dcb-9221-45726b7cbcc7\",\"restaurantName\":\"Pizza Planet\"}",
  "Timestamp": "2020-08-13T21:48:41.156Z",
  "SignatureVersion": "1",
  "Signature": "...",
  "SigningCertURL": "https://sns.us-east-1.amazonaws.com/...",
  "UnsubscribeURL": "https://sns.us-east-1.amazonaws.com/?Action=Unsubscribe&SubscriptionArn=..."
}
```

 From which we're able to identify where the message was sent from.

6. As good housekeeping, let's add the SQS queue's name to the stack outputs so we can capture it somehow.

Add the following to the **resources.Outputs** section.

```yml
E2eTestQueueUrl:
  Condition: IsE2eTest
  Value: !Ref E2eTestQueue
```

 Notice that the **IsE2eTest** condition can be used on stack outputs too. If it's omitted here then the stack deployment **would fail when the IsE2etest condition is false** - because the resource *E2eTestQueue* wouldn't exist outside of the **dev** stack, and so this output would reference a non-existent resource.

Deploy the project.

 This will provision an SQS queue and subscribe it to the SNS topic.

#### Capture CloudFormation outputs in .env file

Earlier on, we had a few cases where there are CloudFormation outputs that we'd like to capture in the .env file and we had to introduce them as environment variables to our functions just to facilitate this. We can't even do that here. These SNS topics and SQS queues are created conditionally but we can't add environment variables conditionally.

Instead, what we could do is to bring in another plugin **serverless-export-outputs** and use it to capture the CloudFormation outputs into a **separate .env file**, let's call it **.cfnoutputs.env** and we'll have the **dotenv** module load both during the **init** step.

1. Run **npm i --save-dev serverless-export-outputs** to install the plugin

2. Open **serverless.yml** and add the following to the **plugins** list

```yml
- serverless-export-outputs
```

 After this change, the **plugins** section should look like this:

```yml
plugins:
  - serverless-export-env
  - serverless-export-outputs
```

3. To configure the plugin, we can add the following to the **custom** section in the **serverless.yml**

```yml
  exportOutputs:
    include:
      - E2eTestQueueUrl
      - CognitoUserPoolServerClientId
    output:
      file: ./.cfnoutputs.env
```

 This tells the plugin to capture the **E2eTestQueueUrl** and **CognitoUserPoolServerClientId** outputs in a file called **.cfnoutputs.env**.

 This plugin runs every time you deploy your app, so, to create the file, let's deploy one more time.

4. Deploy the project 

npx sls deploy

 After the deployment finishes you should have a **.cfnoutputs.env** file at the project root. Open it and have a look, it should look something like this:

```
E2eTestQueueUrl = "https://sqs.us-east-1.amazonaws.com/374852340823/workshop-yancui-dev-E2eTestQueue-1OCUTTAYJP5M2"
CognitoUserPoolServerClientId = "54jpfqr40v1gkpsivb9530g2gq"
```

5. Add **.cfnoutputs.env** to the **.gitignore** file. This is environment specific and should be regenerated every time we deploy. We don't want it to be source controlled.

6. Open **tests/steps/init.js** and at the top of the file, where we're using **dotenv** to load the two .env files

```js
const dotenv = require('dotenv')
dotenv.config({ path: './.test.env' })
dotenv.config()
```

 let's add this new file as well

```js
const dotenv = require('dotenv')
dotenv.config({ path: './.test.env' })
dotenv.config()
dotenv.config({ path: '.cfnoutputs.env' })
```

7. Open **tests/steps/given.js**, on line 16, where you have:

```js
const clientId = process.env.cognito_server_client_id
```

 replace it with

```js
const clientId = process.env.CognitoUserPoolServerClientId
```

 now that we're able to load the **CognitoUserPoolServerClientId** CloudFormation output into environment variables.

8. As a final step to clean things up, open **serverless.yml** and under **functions.get-index.environment**, delete the **cognito_server_client_id** environment variable.

 This was the environment variable we added for the **get-index** function earlier, even though it doesn't actually need it.

 **IMPORTANT**: the **get-index** function has both **cognito_client_id** and **cognito_server_client_id** environment variables. You need to **keep the** **cognito_client_id** because that's still needed by the front end. Make sure you deleted the right one!

#### Check SNS messages in the acceptance tests

Now that we have added an SQS queue to catch all the messages that are published to SNS, let's integrate it into our acceptance test for the **notify-restaurant** function.

First, we need a way to trigger the **notify-restaurant** function in the end-to-end test. We can do this by publishing an event into the EventBridge bus.

1. Open **tests/steps/when.js**, and add this line to the top of the file

```js
const { EventBridgeClient, PutEventsCommand } = require('@aws-sdk/client-eventbridge')
```

 and then add this method, right above the **viaHandler** method:

```js
const viaEventBridge = async (busName, source, detailType, detail) => {
  const eventBridge = new EventBridgeClient()
  const putEventsCmd = new PutEventsCommand({
    Entries: [{
      Source: source,
      DetailType: detailType,
      Detail: JSON.stringify(detail),
      EventBusName: busName
    }]
  })
  await eventBridge.send(putEventsCmd)
}
```

2. Staying in **when.js**, replace **we_invoke_notify_restaurant** method with the following:

```js
const we_invoke_notify_restaurant = async (event) => {
  if (mode === 'handler') {
    await viaHandler(event, 'notify-restaurant')
  } else {
    const busName = process.env.bus_name
    await viaEventBridge(busName, event.source, event['detail-type'], event.detail)
  }
}
```

 Here, we're using the new **viaEventBridge** method to trigger the deployed **notify-restaurant** function.

 Next, we need a way to listen in on the messages that are captured in SQS.

3. Add a new module called **messages.js** under the **tests** folder.

4. Run **npm i --save-dev rxjs** to install RxJs, which has some really nice constructs for doing reactive programming in JavaScript.

5. Run **npm i --save-dev @aws-sdk/client-sqs** to install the AWS SDK's SQS client, we'll use it to do long-polling against the SQS queue we created earlier.

6. Paste the following into the new **tests/messages.js** module you just added:

```js
const { SQSClient, ReceiveMessageCommand } = require("@aws-sdk/client-sqs")
const { ReplaySubject, firstValueFrom } = require("rxjs")
const { filter } = require("rxjs/operators")

const startListening = () => {
  const messages = new ReplaySubject(100)
  const messageIds = new Set()
  let stopIt = false

  const sqs = new SQSClient()
  const queueUrl = process.env.E2eTestQueueUrl

  const loop = async () => {
    while (!stopIt) {
      const receiveCmd = new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 10,
        // shorter long polling frequency so we don't have to wait as long when we ask it to stop
        WaitTimeSeconds: 5
      })
      const resp = await sqs.send(receiveCmd)

      if (resp.Messages) {
        resp.Messages.forEach(msg => {
          if (messageIds.has(msg.MessageId)) {
            // seen this message already, ignore
            return
          }
    
          messageIds.add(msg.MessageId)
    
          const body = JSON.parse(msg.Body)
          if (body.TopicArn) {
            messages.next({
              sourceType: 'sns',
              source: body.TopicArn,
              message: body.Message
            })
          }
        })
      }
    }
  }

  const loopStopped = loop()

  const stop = async () => {
    console.log('stop polling SQS...')
    stopIt = true

    await loopStopped
    console.log('long polling stopped')
  }

  const waitForMessage = (predicate) => {
    const data = messages.pipe(filter(x => predicate(x)))
    return firstValueFrom(data)
  }

  return {
    stop,
    waitForMessage,
  }
}

module.exports = {
  startListening,
}
```

 RxJs's [**ReplaySubject**](https://rxjs-dev.firebaseapp.com/api/index/class/ReplaySubject) lets you capture events and then replay them for every new subscriber. We will use it as a message buffer to capture all the messages that are in SQS, and when a test wants to wait for a specific message to arrive, we will replay through all the buffered messages.

 When the test calls **startListening** we will use long-polling against SQS to pull in any messages it has:

```js
const receiveCmd = new ReceiveMessageCommand({
  QueueUrl: queueUrl,
  MaxNumberOfMessages: 10,
  WaitTimeSeconds: 5
})
const resp = await sqs.send(receiveCmd)
```

 Because we disabled **RawMessageDelivery** in the SNS subscription, we have the necessary information to work out if a message has come from the SNS topic. As you can see below, for each SQS message, we capture the SNS topic ARN as well as the actual message body.

```js
resp.Messages.forEach(msg => {
  // ...
  const body = JSON.parse(msg.Body)
  if (body.TopicArn) {
    messages.next({
      sourceType: 'sns',
      source: body.TopicArn,
      message: body.Message
    })
  }
})
```

 We do this in a **while** loop, and it can be stopped by calling the **stop** function that is returned. Because at the start of each iteration, the **while** loop would check if **stopIt** has been set to **true**. 

 We capture the result of this **loop** function (which is a **Promise<void>**) without waiting for it, so the polling loop is kicked off right away.

 And only in the **stop** function do we **wait** for the while loop to finish and wait for its result (the aforementioned **Promise<void>**) to resolve. This way, we don't leave any **unfinished Promise** running, which would upset the jest runner.

```js
const stop = async () => {
  console.log('stop polling SQS...')
  stopIt = true

  await loopStopped // here we wait for the while loop to finish
  console.log('long polling stopped')
}
```

 The **waitForMessage** function finds the first message in the **ReplaySubject** that satisfies the caller's predicate function. While Rxjs operators normally return an **Observable**, the **firstValueFrom** function lets us return the first value returned by the Observable as a **Promise**. So the caller can use **async** **await** syntax to wait for their message to arrive.

 We can use this helper module in both **place-order.tests.js** and **notify-restaurant.tests.js** modules, in place of the mocks!

 But first, let's make sure it works in our end-to-end tests.

7. Open **tests/test_cases/notify-restaurant.tests.js** and replace it with the following

```js
const { init } = require('../steps/init')
const when = require('../steps/when')
const chance = require('chance').Chance()
const { EventBridgeClient } = require('@aws-sdk/client-eventbridge')
const { SNSClient } = require('@aws-sdk/client-sns')
const messages = require('../messages')

const mockEvbSend = jest.fn()
const mockSnsSend = jest.fn()

describe(`When we invoke the notify-restaurant function`, () => {
  const event = {
    source: 'big-mouth',
    'detail-type': 'order_placed',
    detail: {
      orderId: chance.guid(),
      restaurantName: 'Fangtasia'
    }
  }

  let listener

  beforeAll(async () => {
    await init()

    if (process.env.TEST_MODE === 'handler') {
      EventBridgeClient.prototype.send = mockEvbSend
      SNSClient.prototype.send = mockSnsSend

      mockEvbSend.mockReturnValue({})
      mockSnsSend.mockReturnValue({})
    } else {
      listener = messages.startListening()      
    }

    await when.we_invoke_notify_restaurant(event)
  })

  afterAll(async () => {
    if (process.env.TEST_MODE === 'handler') {
      mockEvbSend.mockClear()
      mockSnsSend.mockClear()
    } else {
      await listener.stop()
    }
  })

  if (process.env.TEST_MODE === 'handler') {
    it(`Should publish message to SNS`, async () => {
      expect(mockSnsSend).toHaveBeenCalledTimes(1)
      const [ publishCmd ] = mockSnsSend.mock.calls[0]

      expect(publishCmd.input).toEqual({
        Message: expect.stringMatching(`"restaurantName":"Fangtasia"`),
        TopicArn: expect.stringMatching(process.env.restaurant_notification_topic)
      })
    })

    it(`Should publish event to EventBridge`, async () => {
      expect(mockEvbSend).toHaveBeenCalledTimes(1)
      const [ putEventsCmd ] = mockEvbSend.mock.calls[0]
      expect(putEventsCmd.input).toEqual({
        Entries: [
          expect.objectContaining({
            Source: 'big-mouth',
            DetailType: 'restaurant_notified',
            Detail: expect.stringContaining(`"restaurantName":"Fangtasia"`),
            EventBusName: process.env.bus_name
          })
        ]
      })
    })
  } else {
    it(`Should publish message to SNS`, async () => {
      const expectedMsg = JSON.stringify(event.detail)
      await listener.waitForMessage(x => 
        x.sourceType === 'sns' &&
        x.source === process.env.restaurant_notification_topic &&
        x.message === expectedMsg
      )
    }, 10000)
  }
})
```

 Ok, a lot has changed in this file, let's walk through some of these changes.

 In the **beforeAll**, the mocks are only configured **when the TEST_MODE is "handler"** - i.e. when we're running our integration tests by running the Lambda functions locally. Otherwise, it asks the aforementioned `messages` module to start listening for messages in the SQS queue

```js
beforeAll(async () => {
  await init()

  if (process.env.TEST_MODE === 'handler') {
    EventBridgeClient.prototype.send = mockEvbSend
    SNSClient.prototype.send = mockSnsSend

    mockEvbSend.mockReturnValue({})
    mockSnsSend.mockReturnValue({})
  } else {
    listener = messages.startListening()      
  }

  await when.we_invoke_notify_restaurant(event)
})
```

 And since we don't have a way to capture EventBridge events yet, we are going to add a single test for now, to check that a message is published to SNS and that it's published to the right SNS topic and has the right payload.

```js
} else {
  it(`Should publish message to SNS`, async () => {
    const expectedMsg = JSON.stringify(event.detail)
    await listener.waitForMessage(x => 
      x.sourceType === 'sns' &&
      x.source === process.env.restaurant_notification_topic &&
      x.message === expectedMsg
    )
  }, 10000)
}
```

 Because the messages have to go from: 

1. our test to the EventBridge bus
2. forwarded to the notify-restaurant function, which sends a message to SNS
3. forwarded to the SQS queue we configured earlier
4. received by our test via long-polling

 so we're giving it a bit longer to run than the other tests and asked Jest to run it for 10s instead of the usual 5s timeout.

#### Add conditionally deployed EventBridge rule

To listen in on events going into an EventBridge bus, we need to first create a rule.

Similar to before, let's first add an EventBridge rule that's conditionally deployed when the stage is dev.

1. Add the following to **resources.Resources**:

```yml
E2eTestEventBridgeRule:
  Type: AWS::Events::Rule
  Condition: IsE2eTest
  Properties:
    EventBusName: !Ref EventBus
    EventPattern:
      source: ["big-mouth"]
    State: ENABLED
    Targets:
      - Arn: !GetAtt E2eTestQueue.Arn
        Id: e2eTestQueue
        InputTransformer:
          InputPathsMap:
            source: "$.source"
            detailType: "$.detail-type"
            detail: "$.detail"
          InputTemplate: !Sub >
            {
              "event": {
                "source": <source>,
                "detail-type": <detailType>,
                "detail": <detail>
              },
              "eventBusName": "${EventBus}"
            }
```



 As you can see, our rule would match any event where the **source** is "big-mouth", and it sends the matched events to the **E2eTestQueue** SQS queue we set up previously. 

 But what's this **InputTransformer**?

 By Default, EventBridge would forward the matched events as they are. For example, a **restaurant_notified** event would normally look like this:

```json
{
  "version": "0",
  "id": "8520ecf2-f017-aec3-170d-6421916a5cf2",
  "detail-type": "restaurant_notified",
  "source": "big-mouth",
  "account": "374852340823",
  "time": "2020-08-14T01:38:27Z",
  "region": "us-east-1",
  "resources": [],
  "detail": {
    "orderId": "e249e6b2-cabe-5c4f-a5e9-5153cea847fe",
    "restaurantName": "Fangtasia"
  }
}
```

 But as discussed previously, this doesn't allow us to capture information about the event bus. Luckily, EventBridge lets you transform the matched event before sending them on to the target.

 It does this in two steps:

 **Step 1** - use **InputPathsMap** to turn the event above into a property bag of key-value pairs. You can use the **$** symbol to navigate to the attributes you want - e.g. **$.detail** or **$.detail.orderId**.

 In our case, we want to capture the **source**, **detail-type** and **detail**, which are the information that we sent from our code. And so our configuration below would map the matched event to 3 properties - source, detailType and detail.

```yml
InputPathsMap:
  source: "$.source"
  detailType: "$.detail-type"
  detail: "$.detail"
```

 **Step 2** - use **InputTemplate** to generate a string (doesn't have to be JSON). This template can reference properties we captured in Step 1 using the syntax **<PROPERTY_NAME>**.

 In our case, I want to forward a JSON structure like this to SQS:

```json
{
  "event": {
    "source": "...",
    "detail-type": "...",
    "detail": {
      //...
    }
  },
  "eventBusName": "..."
}
```

 Hence why I use the following template:

```yml
InputTemplate: !Sub >
  {
    "event": {
      "source": <source>,
      "detail-type": <detailType>,
      "detail": <detail>
    },
    "eventBusName": "${EventBus}"
  }
```

 ps. if you're not familiar with YML, the **>** symbol lets you insert a multi-line string. Read more about YML multi-line strings [here](https://yaml-multiline.info/).

 ps. if you recall, the **"${EventBus}"** syntax is for the **Fn::Sub** (or in this case, the **!Sub** shorthand) CloudFormation pseudo function, and references the **EventBus** resource - in this case, it's equivalent to **!Ref EventBus** but **Fn::Sub** allows you to do it inline. Have a look at **Fn::Sub**'s documentation page [here](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-sub.html) for more details.

 Anyhow, with this **InputTransformer** configuration, this is how the events would look like in SQS:

```json
{
  "event": {
    "source": "big-mouth",
    "detail-type": "restaurant_notified",
    "detail": {
      "orderId": "e249e6b2-cabe-5c4f-a5e9-5153cea847fe",
      "restaurantName": "Fangtasia"
    }
  },
  "eventBusName": "order_events_dev_yancui"
}
```

2. We also need to give the EventBridge rule the necessary permission to push messages to **E2eTestQueue**. Luckily, we already have a **QueuePolicy** resource already, let's just update that.

 **Replace** the **E2eTestQueuePolicy** resource in **resources.Resources** with the following:

```yml
E2eTestQueuePolicy:
  Type: AWS::SQS::QueuePolicy
  Condition: IsE2eTest
  Properties:
    Queues:
      - !Ref E2eTestQueue
    PolicyDocument:
      Version: "2012-10-17"
      Statement:
        - Effect: Allow
          Principal: "*"
          Action: SQS:SendMessage
          Resource: !GetAtt E2eTestQueue.Arn
          Condition:
            ArnEquals:
              aws:SourceArn: !Ref RestaurantNotificationTopic
        - Effect: Allow
          Principal: "*"
          Action: SQS:SendMessage
          Resource: !GetAtt E2eTestQueue.Arn
          Condition:
            ArnEquals:
              aws:SourceArn: !GetAtt E2eTestEventBridgeRule.Arn
```

 Note that **Statement** can take a single item or an array. So what we did here is to turn it into an array of statements, one to grant **SQS:SendMessage** permission to the **RestaurantNotificationTopic** SNS topic and one for the **E2eTestEventBridgeRule** EventBridge rule.

3. Redeploy the project

*npx sls deploy*

4. Go to the site, and place a few orders.

5. Go to the SQS console and find your queue. You can see what messages are in the queue right here in the console. Click **Send and receive messages**

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/39b/110/f79/mod19-001.png)

 In the following screen, click **Poll for messages**

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/980/cb1/7d5/mod19-002.png)

 You should see some messages come in. The smaller ones (~390 bytes) are EventBridge messages and the bigger ones (~1.07 kb) are SNS messages.

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/9bd/9a4/972/mod19-003.png)

 Click on them to see more details.

 The SNS messages should look like this:

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/bfa/3e7/56f/mod19-004.png)

 Whereas the EventBridge messages should look like this:

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/e9a/c90/bee/mod19-005.png)

Ok, great, the EventBridge messages are captured in SQS, now we can add them to our tests.

#### Check EventBridge messages in the acceptance tests

We need to update the **tests/messages.js** module to capture messages from EventBridge too.

1. In **tests/messages.js**, on line34, replace this block of code

```js
if (resp.Messages) {
  resp.Messages.forEach(msg => {
    if (messageIds.has(msg.MessageId)) {
      // seen this message already, ignore
      return
    }

    messageIds.add(msg.MessageId)

    const body = JSON.parse(msg.Body)
    if (body.TopicArn) {
      messages.next({
        sourceType: 'sns',
        source: body.TopicArn,
        message: body.Message
      })
    }
  })
}
```

with the following:

```js
if (resp.Messages) {
  resp.Messages.forEach(msg => {
    if (messageIds.has(msg.MessageId)) {
      // seen this message already, ignore
      return
    }

    messageIds.add(msg.MessageId)

    const body = JSON.parse(msg.Body)
    if (body.TopicArn) {
      messages.next({
        sourceType: 'sns',
        source: body.TopicArn,
        message: body.Message
      })
    } else if (body.eventBusName) {
      messages.next({
        sourceType: 'eventbridge',
        source: body.eventBusName,
        message: JSON.stringify(body.event)
      })
    }
  })
}
```

2. Go to **tests/test_cases/notify-restaurant.tests.js** and replace the whole file with the following:

```js
const { init } = require('../steps/init')
const when = require('../steps/when')
const chance = require('chance').Chance()
const messages = require('../messages')

describe(`When we invoke the notify-restaurant function`, () => {
  const event = {
    source: 'big-mouth',
    'detail-type': 'order_placed',
    detail: {
      orderId: chance.guid(),
      restaurantName: 'Fangtasia'
    }
  }

  let listener

  beforeAll(async () => {
    await init()
    listener = messages.startListening()      
    await when.we_invoke_notify_restaurant(event)
  })

  afterAll(async () => {
    await listener.stop()
  })

  it(`Should publish message to SNS`, async () => {
    const expectedMsg = JSON.stringify(event.detail)
    await listener.waitForMessage(x => 
      x.sourceType === 'sns' &&
      x.source === process.env.restaurant_notification_topic &&
      x.message === expectedMsg
    )
  }, 10000)

  it(`Should publish "restaurant_notified" event to EventBridge`, async () => {
    const expectedMsg = JSON.stringify({
      ...event,
      'detail-type': 'restaurant_notified'
    })
    await listener.waitForMessage(x => 
      x.sourceType === 'eventbridge' &&
      x.source === process.env.bus_name &&
      x.message === expectedMsg
    )
  }, 10000)
})
```

 Notice that we've done away with mocks altogether, and now our tests are **simpler** **and more realistic**.

3. Run the integration tests

4. Run the acceptance tests as well.

Now let's do the same for the *place-order* function's test as well.

5. Open **tests/test_cases/place-order.tests.js** and replace the file with the following:

```js
const when = require('../steps/when')
const given = require('../steps/given')
const teardown = require('../steps/teardown')
const { init } = require('../steps/init')
const messages = require('../messages')

describe('Given an authenticated user', () => {
  let user, listener

  beforeAll(async () => {
    await init()
    user = await given.an_authenticated_user()
    listener = messages.startListening()
  })

  afterAll(async () => {
    await teardown.an_authenticated_user(user)
    await listener.stop()
  })

  describe(`When we invoke the POST /orders endpoint`, () => {
    let resp

    beforeAll(async () => {
      resp = await when.we_invoke_place_order(user, 'Fangtasia')
    })

    it(`Should return 200`, async () => {
      expect(resp.statusCode).toEqual(200)
    })

    it(`Should publish a message to EventBridge bus`, async () => {
      const { orderId } = resp.body
      const expectedMsg = JSON.stringify({
        source: 'big-mouth',
        'detail-type': 'order_placed',
        detail: {
          orderId,
          restaurantName: 'Fangtasia'
        }
      })

      await listener.waitForMessage(x => 
        x.sourceType === 'eventbridge' &&
        x.source === process.env.bus_name &&
        x.message === expectedMsg
      )
    }, 10000)
  })
})
```



 Again, no more mocks, we let our function talk to the real EventBridge bus and validate that the message was published correctly.

### Dealing with failures

EventBridge with lambda gives you up to 2 retries on failed events , and DLQ on subsequent failures (SQS). 
We can also use lambda destinations for DLQ:

* supports stream invocations (Kinesis, DDB streams) in addition to async invocation (which is the the only option  in DLQ). 
* It can also work for successful invocations (vs only failure in DLQs).
* Destination types SNS, SQS, Lambda, EventBridge (vs just SNS & SQS).

**Prefer Lambda Destinations over DLQs.**

**Kinesis Streams is a service for real-time processing of streaming big data.** It is ideal for large data, and the order of events is important. At scale, Kinesis is much more cost effective than EventBridge at ingesting large volumes of data.

With EventBridge, your lambda function receives 1 event at a time. With Kinesis, your lambda receives a batch of events.

We need to consider partial failures and idempotency when processing Kinesis and DDB streams with lambda, because the entire batch of events (not just the function) retries upon failure. Failed events should be retried, but the retries should not violate the realtime constraint.

To ensure idempotency (that messages are not needlessly retried multiple times because they are in batches) we need to identify the id/sequence number of the events that have been processed. Where can we save the message ids?

* Most efficient but less reliable: cache message ids in the function (outside of the handler so it is persisted outside the invocations).
* Most reliable: save processed message ids in a DDB table, but this adds additional cost & latency.

### Per function IAM roles

#### Install serverless-iam-roles-per-function plugin

1. Install **serverless-iam-roles-per-function** as dev dependency

`npm install --save-dev serverless-iam-roles-per-function`

2. Modify **serverless.yml** and add it as a plugin

```yml
plugins:
  - serverless-export-env
  - serverless-export-outputs
  - serverless-plugin-extrinsic-functions
  - serverless-iam-roles-per-function
```

#### Issue individual function permissions

1. Open **serverless.yml** and delete the entire **provider.iam** block

2. Give the **get-index** function its own IAM role statements by adding the following to its definition

```yml
iamRoleStatements:
  - Effect: Allow
    Action: execute-api:Invoke
    Resource: !Sub arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${ApiGatewayRestApi}/${sls:stage}/GET/restaurants
```

**IMPORTANT:** this new block should be aligned with **environment** and **events**, e.g.

```yml
get-index:
  handler: functions/get-index.handler
  events: ...
  environment:
    restaurants_api: ...
    orders_api: ...
    cognito_user_pool_id: ...
    cognito_client_id: ...
  iamRoleStatements:
    - Effect: Allow
      Action: execute-api:Invoke
      Resource: !Sub arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${ApiGatewayRestApi}/${sls:stage}/GET/restaurants
```

3. Similarly, give the **get-restaurants** function its own IAM role statements

```yml
iamRoleStatements:
  - Effect: Allow
    Action: dynamodb:scan
    Resource: !GetAtt RestaurantsTable.Arn
  - Effect: Allow
    Action: ssm:GetParameters*
    Resource:
      - !Sub arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter/${self:service}/${param:ssmStage, sls:stage}/get-restaurants/config
```

4. Give the **search-restaurants** function its own IAM role statements

```yml
iamRoleStatements:
  - Effect: Allow
    Action: dynamodb:scan
    Resource: !GetAtt RestaurantsTable.Arn
  - Effect: Allow
    Action: ssm:GetParameters*
    Resource:
      - !Sub arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter/${self:service}/${param:ssmStage, sls:stage}/search-restaurants/config
      - !Sub arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter/${self:service}/${param:ssmStage, sls:stage}/search-restaurants/secretString
  - Effect: Allow
    Action: kms:Decrypt
    Resource: ${ssm:/${self:service}/${param:ssmStage, sls:stage}/kmsArn}
```

5. Give the **place-order** function its own IAM role statements

```yml
iamRoleStatements:
  - Effect: Allow
    Action: events:PutEvents
    Resource: !GetAtt EventBus.Arn
```

6. Finally, give the **notify-restaurant** function its own IAM role statements

```yml
iamRoleStatements:
  - Effect: Allow
    Action: events:PutEvents
    Resource: !GetAtt EventBus.Arn
  - Effect: Allow
    Action: sns:Publish
    Resource: !Ref RestaurantNotificationTopic
```

### SNS vs SQS vs Kinesis vs EventBridge

#### Fan-out pattern

Used to improve the throughput of our system. The goal is to keep pace with the number of messages coming in, by increasing the concurrency. In this pattern, we have a ventilator that splits a large task into smaller tasks and distributes them across a pool of workers.

Lambda auto scales the number of executions for the workers. But for the ventilator, we have to decide what do we use as the queue between the function that splits up the large task and the individual workers (ingest & distribute). We have many choices for that.

Always factor in scale into the equation, because as a rule of thumb services that pay by uptime are much cheaper when running at scale.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/f5yq9mjyqi6vaweba7xh.png)

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/6juj6pdnk5w4oitlnuet.png)

Compared to SNS and EventBridge, with SQS the concurrency of the worker lambda function will go up more gradually.

With Kinesis, we have 1 execution for every shard, so the concurrency goes up in discrete steps.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/dmavd52cuzcfljb08wix.png)

#### Controlling concurrency

Suppose we have a downstream system that just can't keep up with the scaling.
![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/1gioxd5lwdjyui8s494f.png)

With fan-out, there are cases where we want to control the concurrency, and instead of scaling we want to push to work into a backlog.

Plausible case: the spike errors are retried.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/w36d1785bcmyij4qs076.png)

If the spike persists, and the retries are also fail. When the retries are exhausted, we rely on the dead letter queue to capture the failed messages so we don't lose them.  
![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/63op93m1fds1oc7p0udl.png)

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/vvtljqv82l7qjh7um9o8.png)

With Kinesis any spikes in traffic is amortized and will be processed later.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/jcoml8pu13lik0imxksh.png)

With SNS and Eventbridge, If there is an outage, all the failed messages require human intervention with dead letter queue.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/zw5c9iu17xj6n2ft2x23.png)

With Kinesis the workers pick up where they left off once the outage is over.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/s86jk2vg8x7bmp52wm9q.png)

### Choreography vs Orchestration (communication between microservices)

Every component makes its own decisions based on a contract vs a controller process that orchestrates everything.

Choreography approach with events:

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/2zgihnk15c598rtuaaim.png)

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/iplvfii270qwp4cb7hby.png)

Orchestration approach with step functions:

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/ufv0gk6d8fdmkaq2ekb3.png)

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/4y05w3dk697ujxw20sm5.png)

**Rule of thumb: choreography between bounded-contexts, orchestration within a bounded-context.**

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/kvo6ubaza9zzmzue8fzd.png)

We often see workflows within a bounded context being choreographed through messages in SQS/SNS/EventBridge. Example of when step functions is a better fit (don't do this, prefer step function instead):

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/ew49wa8pa8v24ujbq3es.png)



## Part 4 Observability

### Log aggregation

`console.log` at lambda level is good, but does not tell us the whole picture when multiple lambdas are working together.

CloudWatch Logs have seen some improvement with Insights, which lets you view logs from multiple functions at once. CloudWatch Logs Insights auto-discovers the fields if you are using structured json logs.

Cons: query syntax is complicated, and can only query 20 log groups at a time which makes it hard when there are so many lambdas. It is also a regional service and cannot support multi-region logs.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/c144ny2afngkkgio7ss0.png)

The way to work around the cons of CloudWatch is to ship to logs to a centralized logging platform / 3rd party service. Usually people stream the logs to a lambda and forward them somewhere else. The other choice is streaming the logs to Amazon ElasticSearch Service.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/c790t53p22p9kmxp3emr.png)

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/tv0tdagmjy8nnkmjke7f.png)

Serverless Framework automatically creates log groups for the lambdas it creates.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/3frs23kbqsj5pi42apd8.png)

To automatically subscribe the log group to our log shipping function, we can create an event pattern in EventBridge. To enable that we also need to [enable Cloud Trail](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-create-a-trail-using-the-console-first-time.html).

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/ycss4uhjrxcjf8u2igm9.png)

The CreateLogGroup api calls will be recorded in CloudTrail.
Through the event pattern that we created in EventBridge, we can capture those events and use a lambda function to  subscribe the log group to our log shipping function.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/1rnkvgfbg3uq4wa56gun.png)

Another thing to keep in mind is that CloudWatch logs never expire, and there is a cost involved. If you are shipping the logs somewhere else, there is no reason to keep the logs at CloudWatch.

The above solution does not work great at scale, because the log shipping lambda eats up concurrency. At scale, a better solution is instead to stream the logs to a Kinesis Data Stream and process the logs from there. With Kinesis we get batching, so we can reduce the concurrency on the log shipping lambda.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/ny3j79cnbuvg1gcyqos9.png)

[`serverless-plugin-log-subscription`](https://www.serverless.com/plugins/serverless-plugin-log-subscription) can be used to to deliver CloudWatch Logs to Kinesis stream.

[`serverless-plugin-log-retention`](https://github.com/serverless/serverless-plugin-log-retention) can be used to reduce CloudWatch log retention time.

From a platform perspective these apps are better because they work per region, per account, instead of individual projects

[`auto-subscribe-log-group-to-arn`](https://serverlessrepo.aws.amazon.com/applications/arn:aws:serverlessrepo:us-east-1:374852340823:applications~auto-subscribe-log-group-to-arn) 

[`auto-set-log-group-retention`](https://serverlessrepo.aws.amazon.com/applications/arn:aws:serverlessrepo:us-east-1:374852340823:applications~auto-set-log-group-retention) 

### Structured Logging with JSON

Don't leave debug logging ON during production, CloudWatch is expensive.

Replace console.log with a JSON logger.
Allow log level to be configurable by environment.

#### Using a simple logger

The [AWS Lambda Powertools](https://awslabs.github.io/aws-lambda-powertools-typescript/latest/) has a number of utilities to make it easier to build production-ready serverless applications. One of the tools available is a very simple logger that supports structured logging (amongst other things).

1. Install the logger

`npm install --save @aws-lambda-powertools/logger`

Now we need to change all the places where we're using **console.log**.

2. Open **functions/get-index.js** and add the following to the top of the file

```js
const { Logger } = require('@aws-lambda-powertools/logger')
const logger = new Logger({ serviceName: process.env.serviceName })
```

 on line 20, replace

```js
console.log(`loading restaurants from ${restaurantsApiRoot}...`)
```

 with

```js
logger.debug('getting restaurants...', { url: restaurantsApiRoot })
```

 Notice that the **restaurantsApiRoot** is captured as a separate **url** attribute in the log message. Capturing variables as attributes (instead of baking them into the message) makes them easier to search and filter.

 Similarly, on line 37, replace

```js
console.log(`found ${restaurants.length} restaurants`)
```

 with

```js
logger.debug('got restaurants', { count: restaurants.length })
```

 Again, notice how **count** is captured as an attribute instead of included as part of the log message.

3. Open **functions/get-restaurants.js** and add the following to the top of the file

```js
const { Logger } = require('@aws-lambda-powertools/logger')
const logger = new Logger({ serviceName: process.env.serviceName })
```

 On line 15, replace

```js
console.log(`fetching ${count} restaurants from ${tableName}...`)
```

 with

```js
logger.debug('getting restaurants from DynamoDB...', {
  count,
  tableName
})
```

 And then on line 25, replace

```js
console.log(`found ${resp.Items.length} restaurants`)
```

 with

```js
logger.debug('found restaurants', {
  count: resp.Items.length
})
```

4. Open **functions/place-order.js** and add the following to the top of the file

```js
const { Logger } = require('@aws-lambda-powertools/logger')
const logger = new Logger({ serviceName: process.env.serviceName })
```

 On line 13, replace

```js
console.log(`placing order ID [${orderId}] to [${restaurantName}]`)
```

 with

```js
logger.debug('placing order...', { orderId, restaurantName })
```

 Similarly, on line 28, replace

```js
console.log(`published 'order_placed' event into EventBridge`)
```

 with

```js
logger.debug(`published event into EventBridge`, {
  eventType: 'order_placed',
  busName
})
```

5. Repeat the same process for **functions/notify-restaurant** and **functions/search-restaurants**, using your best judgement on what information you should log in each case.

6. So far, we have added a number of debug log messages. By default, the log level is set to info so we won't see these log messages. We can control the behaviour of the logger through a number of settings. These settings can be configured at the constructor level (for each logger) or using environment variables:

> The log levels are a hierarchy: TRACE < DEBUG < INFO < ERROR < FATAL
>
> If LOG_LEVEL is INFO then any INFO, ERROR and FATAL logs would be recorded, but TRACE & DEBUG logs are omitted
>
>  We set the log level per environment like so:
>
> ```yml
> custom:
>   logLevel:
>     prod: INFO
>     stage: INFO
>     default: DEBUG
> ```

- Service name
- Logging level
- Log incoming event (applicable when used with `injectLambdaContext` middleware, more on this later)
- Debug log sampling (more on this later)

For now, let's set the log level to `debug`. Go back to the `serverless.yml`, and add this to `provider.environment`:

```yml
LOG_LEVEL: debug
# and later...
# if it's one of the custom, use it, otherwise use default
LOG_LEVEL: ${self:custom.logLevel.${sls:stage}, self:custom.logLevel.default} 
```

------

#### Disable debug logging in production

This logger allows you to control the default log level via a **LOG_LEVEL** environment variable. Let's configure the **LOG_LEVEL** environment such that we'll be logging at **INFO** level in production, but logging at **DEBUG** level everywhere else.

1. Open **serverless.yml**. Under the **custom** section at the top, add **logLevel** as below:

```yml
logLevel:
  prod: INFO
  default: DEBUG
```

 Here, we're specifying some custom variables that we'll reference below as the default log level and the override for the **prod** stage.

2. Still in the **serverless.yml**, under **provider.environment** section, add an environment variable:

```yml
LOG_LEVEL: ${self:custom.logLevel.${sls:stage}, self:custom.logLevel.default}
```

 This uses the **${xxx, yyy}** syntax to provide a fallback. Here we're saying "if there is an environment-specific override available for the current stage, e.g. **custom.logLevel.dev**, then use it. Otherwise, fall back to **custom.logLevel.default**"

 This is a nice trick to specify a stage-specific override but then fall back to some default value otherwise.

 After this change, the **provider** section should look like this:

```yml
provider:
  name: aws
  runtime: nodejs18.x
  eventBridge:
    useCloudFormation: true
  environment:
    rest_api_url: !Sub https://${ApiGatewayRestApi}.execute-api.${AWS::Region}.amazonaws.com/${sls:stage}
    serviceName: ${self:service}
    stage: ${sls:stage}
    ssmStage: ${param:ssmStage, sls:stage}
    middy_cache_enabled: true
    middy_cache_expiry_milliseconds: 60000 # 1 mins
    LOG_LEVEL: ${self:custom.logLevel.${sls:stage}, self:custom.logLevel.default}
```

 This applies the **LOG_LEVEL** environment variable (used to decide what level the logger should log at) to all the functions in the project (since it's specified under **provider**).

### Sample debug logs in production

Don't leave debug logging on during production, because they are costly, instead sample them. Because, not having any logs costs time in Mean Time to Resolution (MTTR).

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/toc57b0fjcypaz5xd0af.png)

We are going to use a middleware to help sample debug logs. With some probability, the middleware enables log level to debug before handler invocation, and changes back afterwards.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/ai5qm4t35dr8kiaz4bmj.png)

#### Configure the sampling rate

1. In the `**serverless.yml**`, add a `**POWERTOOLS_LOGGER_SAMPLE_RATE**` environment variable to `**provider.environment**`, i.e.

```yml
POWERTOOLS_LOGGER_SAMPLE_RATE: 0.1
```

This tells the logger we installed in the last module to print all the log items regardless the current log level at a given percentage. Here, `0.1` means 10%.

However, the decision to sample all logs or not happens in the constructor of the `Logger` type. So if we want to sample logs for a percentage of invocations, we have two choices:

A) initialize the logger inside the handler body or B) call `**logger.refreshSampleRateCalculation()**` at the start or end of every invocation to force the logger to re-evaluate (based on our configured sample rate) whether it should include all log items.

Option A makes using the logger more difficult because you'd need to pass the logger instance around to every method you call. E.g. when the `**get-index**` module's `handler` function calls the `**getRestaurants**` function, which needs to write some logs.

There are ways to get around this. But I think option B is simpler and offers less resistance, so let's go with that!

2. Open `**get-index.js**` and add this as the 1st line in the `**handler**` function:

```js
logger.refreshSampleRateCalculation()
```

So after the change, the `**handler**` function should look like this:

```js
module.exports.handler = async (event, context) => {
  logger.refreshSampleRateCalculation()
  
  const restaurants = await getRestaurants()
  logger.debug('got restaurants', { count: restaurants.length })
  const dayOfWeek = days[new Date().getDay()]
  const view = {
    awsRegion,
    cognitoUserPoolId,
    cognitoClientId,
    dayOfWeek,
    restaurants,
    searchUrl: `${restaurantsApiRoot}/search`,
    placeOrderUrl: `${ordersApiRoot}`
  }
  const html = Mustache.render(template, view)
  const response = {
    statusCode: 200,
    headers: {
      'content-type': 'text/html; charset=UTF-8'
    },
    body: html
  }

  return response
}
```

3. Repeat step 2 for `**get-restaurants.js**`, `**notify-restaurant.js**`, `**place-order.js**` and `**search-restaurants.js**.`

#### Log the incoming event

1. In the `**serverless.yml**`, add a `**POWERTOOLS_LOGGER_LOG_EVENT**` environment variable to `**provider.environment**`, i.e

```
POWERTOOLS_LOGGER_LOG_EVENT: true
```

This tells the logger we installed in the last module to log the Lambda invocation event. It's very helpful for troubleshooting problems, but keep in mind that there is no built-in data scrubbing. So any sensitive information (such as PII data) in the invocation event would be included in your logs.

For this to work, however, we need to add the `**injectLambdaContext**` middleware, which also enriches the log messages with these additional fields:

- cold_start
- function_name
- function_memory_size
- function_arn
- function_request_id

2. In the **get-index.js**, towards the top of the file, where we had:

```js
const { Logger } = require('@aws-lambda-powertools/logger')
```

change it to:

```js
const { Logger, injectLambdaContext } = require('@aws-lambda-powertools/logger')
```

3. Staying in the **get-index.js**, bring in middy. At the top of the file, add:

```js
const middy = require('@middy/core')
```

4. Wrap the **handler** function with **middy** and apply the **injectLambdaContext** middleware from step 2. Such that this:

```js
module.exports.handler = async (event, context) => {
  ...
}
```

 becomes this:

```
module.exports.handler = middy(async (event, context) => {
  ...
}).use(injectLambdaContext(logger))
```

5. In the **get-restaurants.js**, change the line

```js
const { Logger } = require('@aws-lambda-powertools/logger')
```

 to

```js
const { Logger, injectLambdaContext } = require('@aws-lambda-powertools/logger')
```

6. The **get-restaurants** function already uses **middy** to load SSM parameters, so we don't need to wrap its handler. Instead, add the **injectLambdaContext** middleware to the list.

 The handler goes from this:

```js
module.exports.handler = middy(async (event, context) => {
  ...
}).use(ssm({
  ...
})
```

 to this:

```js
module.exports.handler = middy(async (event, context) => {
  ...
}).use(ssm({
  ...
}).use(injectLambdaContext(logger))
```

7. Repeat the same process for **search-restaurants.js**, **place-order.js** and **notify-restaurant.js**. Some of these use **middy** already, some don't. Follow the same steps as above to add middy as necessary.


 And notice in the console output that new fields are added to the log messages, such as **cold_start** and **function_memory_size**.



#### Optimize sampling

1. in temp branches and dev, don’t touch my sampling rate. I want 100% , and. I want  debug.

2. in stage or prod, you can give me sampling rate, so there is less cost

```yml
custom:
  logLevel:
    prod: INFO
    stage: INFO
    default: DEBUG
  sampleRate:
    prod: 0.1
    stage: 0.1
    default: 1

environment:
  LOG_LEVEL: ${self:custom.logLevel.${sls:stage}, self:custom.logLevel.default}
  POWERTOOLS_LOGGER_SAMPLE_RATE:
      ${self:custom.sampleRate.${sls:stage}, self:custom.sampleRate.default}
  POWERTOOLS_LOGGER_LOG_EVENT: true 
```



### Distributed tracing with X-ray

> I did not do this because X-ray is costly, and inferior to Lumigo

**Integrating with X-Ray**

1. In the **serverless.yml** under the **provider** section, add the following:

```yml
tracing:
  apiGateway: true
  lambda: true
```

2. Add the following IAM statements back to the **provider** section:

```yml
iam:
  role:
    statements:
      - Effect: Allow
        Action:
          - "xray:PutTraceSegments"
          - "xray:PutTelemetryRecords"
        Resource: "*"
```

```yml
provider:
  name: aws
  runtime: nodejs18.x
  stage: dev
  environment:
    ...
  tracing:
    apiGateway: true
    lambda: true
  iam:
    role:
      statements:
        - Effect: Allow
          Action:
            - "xray:PutTraceSegments"
            - "xray:PutTelemetryRecords"
          Resource: "*"
```



 This enables X-Ray tracing for all the functions in this project. Normally, when you enable X-Ray tracing in the **provider.tracing** the Serverless framework would add these permissions for you automatically. However, since we're using the **serverless-iam-roles-per-function** plugin, these additional permissions are not passed along...

 So far, the best workaround I have found, short of fixing the plugin to do it automatically, is to add this blob back to the **provider** section and tell the plugin to inherit these shared permissions in each function's IAM role.

 To do that, we need the functions to inherit the permissions from this default IAM role.

3. Modify **serverless.yml** to add the following to the **custom** section:

```yml
serverless-iam-roles-per-function:
  defaultInherit: true
```

 This is courtesy of the **serverless-iam-roles-per-function** plugin and tells the per-function roles to inherit these common permissions.

4. Deploy the project

5. Load up the landing page, and place an order. Then head to the X-Ray console and see what you get.

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/c27/50f/b84/mod23-001.png)

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/b07/d2e/89b/mod23-002.png)

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/46d/434/d80/mod23-003.png)

 As you can see, you get some useful bits of information. However, if I were to debug performance issues of, say, the **get-restaurants** function, I need to see how long the call to DynamoDB took, that's completely missing right now.

 To make our traces more useful, we need to capture more information about what our functions are doing. To do that, we need more instrumentation.

#### Enhancing the X-Ray traces

At the moment we're not getting a lot of value out of X-Ray. We can get much more information about what's happening in our code if we instrument the various steps.

The AWS Lambda Powertools have some built-in facilities to help enhance the tracing. Such as tracing the AWS SDK and HTTP requests.

1. Install **@aws-lambda-powertools/tracer** as a **production dependency**

`npm install --save @aws-lambda-powertools/tracer`

2. Modify **functions/get-index.js**, add the following to the list of dependencies at the top of the file

```js
const { Tracer, captureLambdaHandler } = require('@aws-lambda-powertools/tracer')
const tracer = new Tracer({ serviceName: process.env.serviceName })
```

 Creating a **Tracer** would automatically capture outgoing HTTP requests (such as the request to the **GET /restaurants** endpoint). So if this is all we do, and we deploy now, then in the X-Ray traces for the **get-index** function we will see the calls to the **GET /restaurants** endpoint as well as basic information from the **get-restaurants** function.

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/e91/a80/cd3/mod23-004.png)

But we can do more.

3. Staying in the **get-index.js** module, at the bottom of the file, add the **captureLambdaHandler** middleware:

```js
.use(captureLambdaHandler(tracer))
```

 After this change, the **handler** function should look like this:

```
module.exports.handler = middy(async (event, context) => {
  logger.refreshSampleRateCalculation()

  ...
}).use(injectLambdaContext(logger))
.use(captureLambdaHandler(tracer))
```

 The **captureLambdaHandler** middleware adds a **functions/get-index.handler** segment to the X-Ray trace, and captures additional information about the invocation:

- if it's a cold start
- the name of the service
- the response of the invocation

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/8f0/3b8/a98/mod23-005.png)

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/508/fd7/a11/mod23-006.png)

4. Still in the **get-index.js** module, we can also add the HTTP response from the **GET /restaurants** endpoint as metadata. 

 On line 35, where we have:

```js
return (await httpReq).data
```

 replace it with:

```js
const data = (await httpReq).data
tracer.addResponseAsMetadata(data, 'GET /restaurants')

return data
```

 Doing this would add the HTTP response to metadata for the **## functions/get-index.handler** segment mentioned above:

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/7f8/1ca/a47/mod23-007.png)

5. Open **get-restaurants.js** and add the following to list of dependencies at the top of the file:

```js
const { Tracer, captureLambdaHandler } = require('@aws-lambda-powertools/tracer')
const tracer = new Tracer({ serviceName: process.env.serviceName })
tracer.captureAWSv3Client(dynamodb)
```

**IMPORTANT**: this block needs to come **AFTER** where you have declared the dynamodb client instance.

6. Staying in the **get-restaurants.js** module, at the bottom of the file, add the **captureLambdaHandler** middleware:

```js
.use(captureLambdaHandler(tracer))
```

After this change, the **handler** function should look like this:

```js
module.exports.handler = middy(async (event, context) => {
  logger.refreshSampleRateCalculation()

  ...
}).use(injectLambdaContext(logger))
.use(captureLambdaHandler(tracer))
```

 Doing these two steps would enrich the trace for the **get-restaurants** function. You will now be able to see the DynamoDB Scan call:

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/369/1c5/3e2/mod23-008.png)

7. Repeat steps 5-6 for **functions/search-restaurants.js**.

8. Repeat steps 5-6 for **functions/place-order.js**, **EXCEPT** you want to use the tracer to capture the **eventBridge** client instead of the DynamoDB client.

9. Repeat steps 5-6 for **functions/notify-restaurant.js**, **EXCEPT** you want to use the tracer to capture both the **eventBridge** client AND the **sns** client.  

10. Deploy the project

*npx sls deploy*

11. Load up the landing page, and place an order. Then head to the X-Ray console and see what you get now.

#### X-ray limitations

Cost-effective solution for distributed tracing, if you do the manual instrumentation (add all that code we commented out).

Limited to HTTP (no TCP). 

No alerting/integration with alerting systems.

Doesn't capture request & response payload.

### Lumigo

So far, we saw how to trace transactions with X-Ray, however, we also saw how it requires a bit of manual intervention to set things up.

#### Sign up to Lumigo and get a token

1. Head over to [**lumigo.io**](https://lumigo.io/) and click **Get Started** on the top right corner.

2. Follow the instructions to create an account and connect your AWS account. As part of the setup, you will be asked to deploy a CloudFormation stack in your AWS account, this will create a **read-only** IAM role for Lumigo so they can fetch telemetry data from Lambda and CloudWatch.

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/f0e/526/11e/mod28-001.png)

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/966/790/4a8/mod28-002.png)

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/7f0/c66/4a6/mod28-003.png)

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/b62/a54/82a/mod28-004.png)

Once the CloudFormation stack has been deployed, Lumigo would collect information about the Lambda functions in your account. This might take a few minutes.

3. Once the process is finished, you will be asked to select functions (or containers) that you want to trace. Let's skip this step, we'll set this up in our serverless.yml instead. Click **Explore Lumigo now** to go to the Lumigo dashboard.

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/36a/8bc/b0f/mod28-005.png)

But, we need to capture the Lumigo token, so we can use it in the next step.



4. In the Lumigo dashboard, go to **Settings**, and then **TRACING**. And copy the token for manual tracing.

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/0e2/51e/1b6/mod28-006.png)

#### Auto-instrumenting with the serverless-lumigo plugin

Instead of manually instrumenting our code, we're going to use the [**serverless-lumigo**](https://github.com/lumigo-io/serverless-lumigo-plugin) plugin to automate it.

1. Install **serverless-lumigo** as a dev dependency.

*npm i --save-dev serverless-lumigo*

2. Open the **serverless.yml** and add **serverless-lumigo** to the list of plugins. Afterwards, your **plugins** section should look like this

```yml
plugins:
  - serverless-export-env
  - serverless-export-outputs
  - serverless-iam-roles-per-function
  - serverless-lumigo
```

3. Add the following to the **custom** section of your **serverless.yml** (mind the indentation) and replace **<YOUR TOKEN GOES HERE>** with the token from the previous step.

   > Add the Lumigo token to SSM parameter store

```yml
custom:
  lumigo:
    token: ${ssm:/LUMIGO_TOKEN}
    nodePackageManager: npm
```

4. Deploy the project

5. Load up the landing page, and place an order. Then head back to the Lumigo dashboard.

 Go to the **Transactions** page (click on the button on the left)

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/983/2b4/790/mod28-007.png)

 This is where you can see the individual transactions. Straight away, you're getting some valuable information, such as:

- end-to-end latency for the transaction
- what services were involved as part of the transaction
- how many (if any) Lambda cold starts were involved
- any errors that were caught as part of the transaction
- estimated cost for the transaction

6. Click on the trace for the **get-index** function you will see something like this.

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/579/93c/f23/mod28-008.png)

 Here you can see the components that are involved in the transaction, with the relevant Lambda logs (from both the **get-index** and **get-restaurants** functions) side-by-side.

 This is easily my favourite view of the whole platform, it lets me see everything in one place, rather than jumping between my logs and my tracing system for different pieces of clues.

7. If you click on the icons on the left, you can see more information. For example, try clicking on the **get-index** function, and you should see something like this.

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/1f7/ecf/105/mod28-009.png)

 Here you can see the invocation event, the return value, as well as the environment variables and the logs for that particular Lambda invocation.

8. Now try clicking on the **DynamoDB** icon.

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/42f/7ee/4b5/mod28-010.png)

 And now you can see both the request and response body and headers from the DynamoDB **Scan** operation.

 This makes it easy to gain deep insight into what's happening in your function, without having to spray your code with lots of debug log statements. 

 Also, the Lumigo tracer automatically **scrubs any sensitive data** so they're not sent to Lumigo at all. You can customize this behaviour by providing a custom regex in the configuration. See the [official Lumigo documentation](https://docs.lumigo.io/docs/secret-masking) for more details.

9. Finally, click on the **Timeline** tab, and you see a familiar trace view like what you see in X-Ray.

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/483/fc3/134/mod28-011.png)

 Ok, let's explore the Lumigo console some more.



10. Go to the **Functions** view (the button on the left). 

 Here you can see an overview of the functions in the account (across all the regions).

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/fb9/26d/286/mod28-012.png)

 If you click on any one of them, you can see more information about this function, including:

- function settings - memory, timeout, CPU architecture, etc.
- invocation count & error count
- when was the function last deployed
- deployment markers in the invocations and failures chart
- how often do you see cold starts on this function (a good indicator for when you should consider using Provisioned Concurrency on this function)
- which invocations were cold starts

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/d61/db3/0a1/mod28-013.png)

11. Next, go to the **System Map** page and see an overview of the system, based on the information the Lumigo has collected through the traces.

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/a36/4d8/58a/mod28-014.png)

 This is a pretty accurate representation of our architecture and covers the three user transactions that we have implemented:

- loading the index page, which involves API-to-API calls
- searching restaurants
- placing orders, which involves asynchronous event processing through EventBridge

12. Finally, I'd like you to spend a moment in the Lumigo dashboard, which has some really useful insights about your AWS account too (with a focus on your Lambda functions).

 At the top, you have an overview of the number of invocations and errors across all your functions (in all regions). Followed by the functions with the most number of errors (you need to pay attention to these!), and the most invoked functions (these are good candidates for optimization, see the "Powertuning Lambda functions" lesson for more info on that).

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/10f/229/3f9/mod28-015.png)

 Where it gets more interesting, is where you have the functions with the most cold starts and "cloud services latency" (ie. latency for services that you call out to from your Lambda functions).

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/3ff/cb6/533/mod28-016.png)

 Generally speaking, you should see a small percentage of cold starts in production because the user traffic would keep existing Lambda workers "warm". But if you see functions with a high percentage of cold starts as well as a high number of cold starts, then they deserve further investigation.

- Are they user-facing functions? e.g. are they part of an API and so a user would experience the cold start time? If not, they are safe to ignore since the extra latencies do not affect the user experience, e.g. no one would notice a few extra seconds to run a background cron job.
- How long are the cold starts? Clicking on one of the functions in the list would take you to the function's metrics page where you can see the cold start init duration. If the cold start durations are acceptable and fall within your SLA (e.g. 99% of user requests completed within 1.5s) then you probably don't need to do anything either.

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/a7b/cbc/46f/mod28-017.png)

 Personally, I find the "Cloud Services Latency" widget very useful. Because the majority of the performance issues I've had to deal with in my serverless applications are caused by the slow response from other services. This widget highlights those poor-performing dependencies (identified by high p95 or p99 latencies) or critical dependencies (identified by high no. of calls).

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/676/c56/56e/mod28-018.png)

> Q: What do we have to do for distributed tracing? How do we get distributed tracing out of the box with Lumigo?
>
> Yan: *Usually it involves a system of passing a trace-id around, and that’s what X-Ray does, and Lumigo as well, the main difference in the DX comes from the fact that the **Lumigo tracer instruments the low level system networking modules and records every HTTP request you make and reports that back to their backend** (with data scrubbing, etc. for security purposes).The tracer usually need to be wrapped (like the middy middlewares) around your handler function so it’s able to intercept your invocations, and they need to take some extra care to make sure if their code blow up it doesn’t terminate your handler code, etc.**The SLS plugin and CDK constructs applies the wrapping so you don’t have to do it yourself, for every function**. You put all these together, plus a lot of thought about what information you’d want to see and how you’d access them, is how you get that great DX out of the box. There are a lot of backend stuff that connects fragments of traces by trace id and that’s how you get those transactions when it spans over multiple functions.*

### Alerts

The goal here is to reduce the mean time to discovery.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/wga69pw26q752daybjkt.png)

#### Alerts you can't do without (blog [What alerts should you have for Serverless applications?](https://lumigo.io/blog/what-alerts-should-you-have-for-serverless-applications/))

Use alarms to alert you that something is wrong, not necessarily what is wrong.

**ConcurrentExecutions**: set to 80% of the regional limit.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/bpz9fowelkbfzev7aq3g.png)

**IteratorAge**: for lambda functions that process against Kinesis streams, you need an alarm for IteratorAge. Should be in milliseconds usually, but can fall behind.

**DeadLetterErrors**: for functions that are triggered by an async event source (SNS, EventBridge) you should have dead letter queues setup, and have an alarm against DeadLetterErrors, which indicates that lambda has trouble sending error events to DLQ.

**Throttles**: for business critical functions you need an alarm that will fire as soon as the fn gets throttled. Maybe there's a rouge fn that's consuming the concurrency in the region, and causing business critical fns to get throttled.

**Error count & success rate %**: according to your SLA

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/i5jbkjmxgvzhb0atmjsp.png)

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/0vkj8by1thojr440r27t.png)

### Powertuning lambda functions

So far, we have stuck with the default memory settings (1024MB) for all of our functions.

And since the amount of memory you allocate to the function proportionally affects its CPU power, network bandwidth, and cost per ms of invocations (see [here](https://aws.amazon.com/lambda/pricing/) for more details on Lambda pricing). One of the simplest cost optimizations you can do on Lambda is right-sizing its memory allocation!

If all your function is doing is making a request to DynamoDB and waiting for its response then more CPU is not gonna improve its performance since its CPUs are just sitting idle.

If I was to guess, I'd say all of our functions can run comfortably on a much lower memory setting than the default 1024MB. But, luckily for you, I don't rely on guesses, I use data to drive technical decisions!

Alex Casalboni's [aws-lambda-power-tuning](https://github.com/alexcasalboni/aws-lambda-power-tuning) tool lets us collect performance information to find the best memory allocation for our workload. However, to use it, you need to first deploy a Step Functions state machine.

The state machine would execute your function under different memory settings and find the best memory setting based on:

- performance
- cost
- a balanced combination of the two

#### Deploy the Lambda power tuning state machine

I find the easiest way to deploy the aws-lambda-power-tuning state machine is via the Serverless Application Repository (SAR). Which you can think of as a public repository of CloudFormation templates. AWS partners and open source authors have published many reusable applications there.

1. Go to [this link](https://serverlessrepo.aws.amazon.com/applications/arn:aws:serverlessrepo:us-east-1:451282441545:applications~aws-lambda-power-tuning)

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/2c0/f1e/721/mod30-001.png)



2. Click the **Deploy** button, this should open a new window.

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/c75/687/988/mod30-002.png)

3. This template needs to provision Lambda functions and IAM roles, so you need to tick the **I acknowledge that this app creates custom IAM roles.** box at the bottom.

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/77d/2c5/61a/mod30-003.png)

4. Click **Deploy** and wait for the deployment to finish.

#### Tune the get-restaurants functions

1. Go to the Step Functions console. You should see a state machine called something like **powerTuningStateMachine-XYZ**:

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/bcc/94d/a9b/mod30-004.png)

2. Click into the state machine, and click the **Start execution** button. It'll ask you for a JSON payload as the input for the state machine.

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/222/c40/32b/mod30-005.png)

3. Use the following payload, and replace **<YOUR ARN HERE>** with the ARN of your **get-restaurants** function, which should look like this: 

arn:aws:lambda:us-east-1:721520867440:function:workshop-murat-dev-get-restaurants

```json
{
 "lambdaARN": "arn:aws:lambda:us-east-1:721520867440:function:workshop-murat-dev-get-restaurants",
 "powerValues": [128, 256, 512, 1024, 2048, 3008],
 "num": 100,
 "payload": "{}",
 "parallelInvocation": true,
 "strategy": "balanced"
}
```

 This tells the state machine to execute the function for these memory settings (in MB):

   [128, 256, 512, 1024, 2048, 3008]

 and execute the function **100** times for each setting, using the payload "{}".

4. Click **Start execution** and wait for the execution to complete.

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/a26/a6e/a7c/mod30-006.png)

5. Click the **Execution output** tab, and you should see something like this:

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/ed6/117/628/mod30-007.png)

 The **power** field tells you the memory setting you should use for this function.



6. Put the **stateMachine.visualization** URL into a new tab, and you should something like this:

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/521/ea1/55e/mod30-008.png)

 This graph shows you how the performance and cost changes with the different memory settings. 

 In this instance, it shows that we received a significant performance boost when we increased the memory size from 128MB to 256MB. But adding more memory beyond that yields diminishing returns while the cost per invocation goes up significantly. Hence why the state machine recommends that we should use 256MB for our function.

 Intuitively, this also makes sense because the get-restaurants function is IO-heavy. It does a DynamoDB scan and returns the restaurants, that is. The extra CPU cycles and network bandwidth that come with higher memory settings would help, but the bulk of the execution time would be determined by how quickly DynamoDB responds. And while it's waiting for a response, all that extra CPU cycles (that we're paying for by the ms!) are simply wasted.

#### When should you tune Lambda functions?

While this is a really powerful tool to have in your locker and when it's used in the right places it can give you significant cost savings.

But I would argue that **you shouldn't do this by default** because there are no meaningful cost savings to be made in most Lambda functions, and this cost saving is not free. You do have to work for it, including:

- capturing and maintaining a suitable payload to invoke the function with
- plan and execute the state machines for each function
- there is a cost associated with running the state machine
- your time (and therefore money) for doing all the above
- and you have to repeat this process every time a function is changed

If you use Lumigo, then a good way to identify worthwhile targets for power tuning is to go to the **Functions** tab and sort by cost in descending order.

![img](https://files.cdn.thinkific.com/file_uploads/179095/images/53a/0a6/a92/mod30-009.png)

**Find functions that have a meaningful cost and are allocated with more memory than it's using** (see the **Avg. Memory** in the Lumigo screenshot above). These are the only functions you should consider power tuning.

The exception to this rule is functions that use provisioned concurrency. Because the cost for those provisioned concurrencies is proportional to the amount of allocated memory. So you should **always power tune functions with provisioned concurrency**.
