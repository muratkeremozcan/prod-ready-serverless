## Optic notes

* Install Optic.

```bash
npm i -D @useoptic/optic
```

* Create the below script, which will be used to create an OpenApi file using AWS
  cli. This assumes you have environment variables `baseUrl` and `deployment` so
  that we know which api gateway we are concerned with on which deployment. You
  can use any var name as long as they match between the .env file and the script.

  > The initial openapi.yml that got created with `aws-cli` didn't pass checks at https://apitools.dev/swagger-parser/online/
  >
  > 1. **Added Responses to Each HTTP Method:** The OpenAPI specification requires each HTTP method (such as `get`, `post`, `options`, etc.) to have a `responses` object. This object defines the possible responses that the endpoint can return. In the initial file, the `responses` object was missing for some HTTP methods like `get` and `post`. We added a `responses` object for each of these methods with a '200' HTTP status code.
  > 2. **Added Responses to `options` HTTP Method:** The `options` HTTP method was also lacking a `responses` object. The OpenAPI specification requires this to be defined, just like for any other HTTP method. We added a `responses` object to `options` with a '200' HTTP status code.

```
# .env
baseUrl=https://myApiGwId.execute-api.us-east-1.amazonaws.com/dev
deployment=dev # this could be a temp branch, or stage
```

```shell
# create-openapi.sh

# Load .env variables
set -a
source .env
set +a

# Extract the REST API id from the baseUrl
rest_api_id=$(echo $baseUrl | cut -d '/' -f3 | cut -d '.' -f1)

echo "Rest API ID: $rest_api_id"

# Run the aws apigateway get-export command
aws apigateway get-export --rest-api-id $rest_api_id --stage-name $deployment --export-type oas30 --accepts application/yaml ./openapi.yml
```

* Create package.json scripts to create the `openapi.yml` file and capture traffic with Optic. The local version with `--update` will update the openapi specification. The ci version without `--update` will check whether the traffic captured in the e2e matches your current openapi specification.

```json
"create:openapi": "./create-openapi.sh",
"optic:verify": "dotenv -e .env optic capture openapi.yml --server-override $baseUrl interactive",
"optic:update": "dotenv -e .env optic capture openapi.yml --server-override $baseUrl --update interactive"
```

* One time setup to initialize the capture configuration. This creates an `optic.yml` file. You need to install @useoptic/optic globally for it.

```bash
optic capture init openapi.yml
```

Enter any placeholder for `server.url`. It has to exist with `https` prefix but does not have to be a valid url.

Remove `server.command` , our server is already deployed and running.

Replace `requests.run.command` wit the e2e test command.

`requests.run.proxy_variable` should be set to your baseUrl

```yml
capture:
  openapi.yml:
    server:
      # specified in package.json with --server-override
      url: https://api.example.com # need a placeholder

      ready_endpoint: /
      # The interval to check 'ready_endpoint', in ms.
      # Optional: default: 1000
      ready_interval: 1000
      # The length of time in ms to wait for a successful ready check to occur.
      # Optional: default: 10_000, 10 seconds
      ready_timeout: 10_000
    # At least one of 'requests.run' or 'requests.send' is required below.
    requests:
      # Run a command to generate traffic. Requests should be sent to the Optic proxy, the address of which is injected
      # into 'run.command's env as OPTIC_PROXY or the value of 'run.proxy_variable', if set.
      run:
        # The command that will generate traffic to the Optic proxy. Globbing with '*' is supported.
        # Required if specifying 'requests.run'.
        command: npm run cy:run
        # The name of the environment variable injected into the env of the command that contains the address of the Optic proxy.
        # Optional: default: OPTIC_PROXY
        proxy_variable: rest_api_url

```



* Create a token at Optic app. Save this as GitHub secret. As a best practice, save it in AWS System Manager > Parameter Store and add it to `serverless.yml` `environment` section, so that it gets generated in the `.env` file with the help of the `serverless-export-env` plugin. Having the token in the env vars will allow to run the capture script locally.

```yml
  environment:
    OPTIC_TOKEN: ${ssm:/OPTIC_TOKEN}
```

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/3h3xlzdsrxq72seuydwf.png)



* Execute the script `optic-capture`

```bash
npm run optic:capture
```
