module.exports = {
    "swagger": {
        "yaml": true,
        "outputDirectory": "./test/dist",
        "entryFile": "./test/data/apis.ts",
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
            },
            "access_token": {
                "type": "apiKey",
                "name": "authorization",
                "in": "header"
            },
            "user_email": {
                "type": "apiKey",
                "name": "x-user-email",
                "in": "header"
            }
        },
        "spec": {
            "api_key": {
                "type": "apiKey",
                "name": "api_key",
                "in": "header"
            }
        }
    }
}
