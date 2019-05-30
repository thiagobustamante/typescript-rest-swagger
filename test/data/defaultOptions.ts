import {SwaggerConfig} from './../../src/config';

export function getDefaultOptions(): SwaggerConfig {
    return {
        basePath: '/',
        collectionFormat: 'multi',
        description: 'Description of a test API',
        entryFile: '',
        host: 'localhost:3000',
        license: 'MIT',
        name: 'Test API',
        outputDirectory: '',
        'securityDefinitions': {
            'access_token': {
                'in': 'header',
                'name': 'authorization',
                'type': 'apiKey'
            },
            'api_key': {
                'in': 'query',
                'name': 'access_token',
                'type': 'apiKey',
            },
            'user_email': {
                'in': 'header',
                'name': 'x-user-email',
                'type': 'apiKey'
            }
        },
        'spec': {
            'api_key': {
                'in': 'header',
                'name': 'api_key',
                'type': 'apiKey'
            }
        },
        version: '1.0.0',
        yaml: false,

    };
}
