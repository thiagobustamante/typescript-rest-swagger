[![npm version](https://badge.fury.io/js/typescript-rest-swagger.svg)](https://badge.fury.io/js/typescript-rest-swagger)
[![Build Status](https://travis-ci.org/thiagobustamante/typescript-rest-swagger.png?branch=master)](https://travis-ci.org/thiagobustamante/typescript-rest-swagger)

# Swagger for Typescript-rest
This is a tool to generate swagger files from a [typescript-rest](https://github.com/thiagobustamante/typescript-rest) project.

## Installation

```bash
npm install typescript-rest-swagger -g
```

## Usage

```bash
swaggerGen -c ./swaggerConfig.json
```

Where the swaggerConfig.json file, contains settings about the swagger generation. For example:

```json
{
    "swagger": {
        "outputDirectory": "./dist",
        "entryFile": "./tests/data/apis.ts",
        "host": "localhost:3000",
        "version": "1.0",
        "name": "Typescript-rest Test API",
        "description": "a description",
        "license": "MIT",
        "basePath": "/v1",
        "securityDefinitions": {
            "api_key": {
                "type": "apiKey",
                "name": "access_token",
                "in": "query"
            }
        }
    }
}
```
