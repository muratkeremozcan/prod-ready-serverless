## Optic notes

Install Optic and dotenv.

```bash
npm i -D @useoptic/optic dotenv dotenv-cli
```

Create the below script, which will be used to create an OpenApi file using AWS
cli. This assumes you have environment variables `baseUrl` and stage so that we
know which api gateway we are concerned with on which deployment. You can use
any var name as long as they match between the .env file and the script.

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

Create package.json scripts to create the `openapi.yml` file and capture traffic
with Optic.

```json
"create:openapi": "./create-openapi.sh",
"optic:capture": "dotenv -e .env optic capture openapi.yml --server-override $baseUrl --update interactive"
```

Initialize the capture configuration. This creates an `optic.yml` file

```bash
optic capture init openapi.yml
```

Replace the `server.url` and `requests.run.proxy_variable` properties with the
baseUrl from you .env file

Replace `requests.run.command` wit the e2e test command.

Execute the script `optic-capture`

```bash
npm run optic:capture
```
