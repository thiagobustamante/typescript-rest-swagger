[![npm version](https://badge.fury.io/js/typescript-rest-swagger.svg)](https://badge.fury.io/js/typescript-rest-swagger)
![Master Workflow](https://github.com/thiagobustamante/typescript-rest-swagger/workflows/Master%20Workflow/badge.svg)
[![Coverage Status](https://coveralls.io/repos/github/thiagobustamante/typescript-rest-swagger/badge.svg?branch=master)](https://coveralls.io/github/thiagobustamante/typescript-rest-swagger?branch=master)
[![Known Vulnerabilities](https://snyk.io/test/github/thiagobustamante/typescript-rest-swagger/badge.svg?targetFile=package.json)](https://snyk.io/test/github/thiagobustamante/typescript-rest-swagger?targetFile=package.json)

# Swagger for Typescript-rest
This is a tool to generate swagger files from a [typescript-rest](https://github.com/thiagobustamante/typescript-rest) project.

**Table of Contents** 

- [Swagger for Typescript-rest](#swagger-for-typescript-rest)
  - [Installation](#installation)
  - [Usage](#usage)
    - [Swagger Decorators](#swagger-decorators)
      - [@Response](#response)
      - [@Example](#example)
      - [@Tags](#tags)
      - [@Consumes](#consumes)
      - [@Produces](#produces)
      - [@Hidden](#hidden)
      - [@IsInt, @IsLong, @IsFloat, @IsDouble](#isint-islong-isfloat-isdouble)
    - [SwaggerConfig.json](#swaggerconfigjson)

## Installation

```bash
npm install typescript-rest-swagger -g
```

## Usage

```bash
swaggerGen -c ./swaggerConfig.json
swaggerGen -c ./swaggerConfig.js #.js files are also allowed as config files
swaggerGen -c ./swaggerConfig.json -t # load {cwd}/tsconfig.json
swaggerGen -c ./swaggerConfig.json -p ./tsconfig.json # load custom tsconfig.json
```

Where the [swaggerConfig.json](#swaggerconfigjson) file, contains settings about the swagger generation. For example:

```json
{
    "swagger": {
        "outputDirectory": "./dist",
        "entryFile": "./tests/data/apis.ts"
    }
}
```

Where the [tsconfig.json](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html) file contains compilerOptions. For example:

```json
{
    "compilerOptions": {
        "baseUrl": ".",
        "paths": {
            "@/*": ["src/*"]
        }
    }
}
```

For example above options are required for `swaggerGen` to understand relative imports like `import something from '@/something'`.

### Swagger Decorators

The documentation will be generated consulting all [typescript-rest](https://github.com/thiagobustamante/typescript-rest) decorators present on your code.
However, there are some additional informations that can be provided, only with documentation purposes, through some other decorators present into this library.

Some examples:

```typescript
import {Path, Accept, GET} from 'typescript-rest';
import {Tags} from 'typescript-rest-swagger';

@Path('mypath')
export class MyService {
    @GET
    @Tags('adminMethod', 'otheTag')
    @Accept('text/html')
    test( ): string {
        return 'OK';
    }

    @GET
    @Path('secondpath')
    test2( @QueryParam('testParam')test?: string ): Person {
        return {name: 'OK'};
    }
}
```

It is also important to observe that all JsDoc provided on your methods, classes, and parameters is outputed into the generated swagger file:

```typescript
@Accept('text/plain')
@Path('mypath')
export class MyService {
    /**
     * This description will be used to describe the get operation of path '/mypath' on the generated swagger
     * @param test And this will describe the parameter test of this same operation
     */
    @GET
    @Path('secondpath')
    test2( @QueryParam('testParam')test?: string ): Person {
        return {name: 'OK'};
    }
}
```

These are the available swagger decorators, provided by typescript-rest-swagger:

#### @Response

A decorator to document the responses that a given service method can return. It is used to generate documentation for the REST service.

```typescript
interface MyError {
   message: string
}

@Path('people')
class PeopleService {
  @Response<string>(200, 'Retrieve a list of people.')
  @Response<MyError>(401, 'The user is unauthorized.', {message: 'The user is not authorized to access this operation.'})
  @GET
  getPeople(@Param('name') name: string) {
     // ...
  }
}
```

A Default response is already created in swagger documentation from the method return analisys. So any response declared
through this decorator is an additional response created.

#### @Example

Used to provide an example of method return to be added into the method response section of the generated documentation for this method.

```typescript
@Path('people')
class PeopleService {
  @Example<Array<Person>>([{
    name: 'Joe'
  }])
  @GET
  getPeople(@Param('name') name: string): Person[] {
     // ...
  }
}
```

#### @Tags

Add tags for a given method on generated swagger documentation.

```typescript
@Path('people')
class PeopleService {
  @Tags('adiministrative', 'department1')
  @GET
  getPeople(@Param('name') name: string) {
     // ...
  }
}
```


#### @Consumes 

Document the consumes property in generated swagger docs

```typescript
@Path('people')
@Consumes('text/html')
class PeopleService {
  @PUT
  createPeople(@Param('name') name: string, people: People) {
     // ...
  }
}
```

#### @Produces 

Document the produces property in generated swagger docs

```typescript
@Path('people')
@Produces('text/html')
class PeopleService {
  @GET
  getPeople(@Param('name') name: string) {
     // ...
  }
}
```

A Default produces is already created in swagger documentation from the method return analisys. 
You can use this decorator to override this default produces.

#### @Hidden 

Allow to hide some APIs from swagger docs (ex: test or dev APIs, etc ...).
This decorator can be applied for the whole class or only a single method

```typescript
@Path('people')
@Hidden()
class PeopleService {
  @GET
  getPeople(@Param('name') name: string) {
     // ...
  }
}
```

#### @IsInt, @IsLong, @IsFloat, @IsDouble

Document the type of a `number` property or parameter in generated swagger docs.
If no decorator is present, the `number` type defaults to `double` format.

```typescript
class Person {
    @IsInt id: number;
}

@Path('people')
class PeopleService {
    @Path(':id')
    @GET
    getById(@PathParam('id') @IsLong id: number) {
        // ...
    }
}
```

Because decorators don't work on type and interface properties, this can also be specified as a JSDoc tag.

```typescript
interface Person {
    /**
     * The person's id
     * @IsInt
     */
    id: number;
}
```


### SwaggerConfig.json 

The swagger config file supports the following properties: 

Property | Type | Description
-------- | ---- | -----------
basePath | string | Base API path; e.g. the 'v1' in https://myapi.com/v1
consumes | [string] | Default consumes property for the entire API
description | string | API description; defaults to npm package description
entryFile | string or string[] | The entry point to your API (it is possible to use glob patters)
outputFormat | 'Swagger_2' or 'OpenApi_3' | Inform if the generated spec will be in swagger 2.0 format or i open api 3.0
host | string | The hostname to be informed in the generated swagger file
license | string | API license number; defaults to npm package license
name | string | API name; defaults to npm package name
outputDirectory | string | Where to write the generated swagger file
produces | [string] | Default produces property for the entire API
version | string | API version number; defaults to npm package version
yaml | boolean | Generates the output also as an yaml file 
spec | any | Extend generated swagger spec with this object. Note that generated properties will always take precedence over what get specified here
securityDefinitions | *SecurityDefinition | Security Definitions Object. A declaration of the security schemes available to be used in the specification. This does not enforce the security schemes on the operations and only serves to provide the relevant details for each scheme.
collectionFormat | string | Default collectionFormat property for the entire API. Possible values are `csv`, `ssv`, `tsv`, `pipes`, `multi`. If not specified, Swagger defaults to `csv`.


Where the SecurityDefinition contract is defined as:
```typescript 
{
    [name: string]: {
        type: string;
        name?: string;
        authorizationUrl?: string;
        tokenUrl?: string;
        flow?: string;
        in?: string;
        scopes?: { [scopeName: string]: string; }
    }
}
```

See an example:
```json
{
    "swagger": {
        "outputDirectory": "./dist",
        "entryFile": "./controllers/*.ts",
        "outputFormat": "openapi_3",
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
        },
        "ignore": [
          "**/node_modules/**"
        ]
    }
}
```

or in yaml format:
See an example:

```yaml
swagger:
  outputDirectory: ./dist
  entryFile: 
    - ./controllers/*.ts
  outputFormat: openapi_3
  host: localhost:3000
  version: 1.0
  name: Typescript-rest Test API
  description: A description
  license: MIT
  basePath: /v1
  securityDefinitions:
    api_key:
      type: apiKey
      name: access_token
      in: query
  ignore:
    - /node_modules/**    
```
