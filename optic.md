## Optic notes

Install Optic.

```bash
npm i -D @useoptic/optic
```

Create the below script, which will be used to create an OpenApi file using AWS
cli. This assumes you have environment variables `baseUrl` and `deployment` so
that we know which api gateway we are concerned with on which deployment. You
can use any var name as long as they match between the .env file and the script.

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

Initialize the capture configuration. This creates an `optic.yml` file. You need to install @useoptic/optic globally for this, and it is a one time operation.

```bash
optic capture init openapi.yml
```

Replace the `server.url` and `requests.run.proxy_variable` properties with the baseUrl from you .env file.

Replace `requests.run.command` wit the e2e test command.

Comment out `server.command` , our server is already deployed and running.

Execute the script `optic-capture`

```bash
npm run optic:capture
```
