"use strict";

export interface Config {
    /**
    * Swagger generation configuration object
    */
    swagger: SwaggerConfig;
}

export interface SwaggerConfig {
    /**
    * Support the output to be an yaml file
    */
    yaml: boolean;

    /**
    * Generated SwaggerConfig.json will output here
    */
    outputDirectory: string;

    /**
    * The entry point to your API
    */
    entryFile: string;

    /**
    * API host, expressTemplate.g. localhost:3000 or https://myapi.com
    */
    host?: string;

    /**
    * API version number; defaults to npm package version
    */
    version?: string;

    /**
    * API name; defaults to npm package name
    */
    name?: string;

    /**
    * 'API description; defaults to npm package description
    */
    description?: string;

    /**
    * API license; defaults to npm package license
    */
    license?: string;

    /**
    * Base API path; e.g. the 'v1' in https://myapi.com/v1
    */
    basePath?: string;

    /**
    * Extend generated swagger spec with this object
    * Note that generated properties will always take precedence over what get specified here
    */
    spec?: any;

    /**
     * Alter how the spec is merged to generated swagger spec.
     * Possible values:
     *  - 'immediate' is overriding top level elements only thus you can not append a new path or alter an existing value without erasing same level elements.
     *  - 'recursive' proceed to a deep merge and will concat every branches or override or create new values if needed. @see https://www.npmjs.com/package/merge
     * The default is set to immediate so it is not breaking previous versions.
     * @default 'immediate'
     */
    specMerging?: 'immediate' | 'recursive';

    /**
     * Security Definitions Object
     * A declaration of the security schemes available to be used in the
     * specification. This does not enforce the security schemes on the operations
     * and only serves to provide the relevant details for each scheme.
     */
    securityDefinitions?: {
        [name: string]: {
            type: string;
            name?: string;
            authorizationUrl?: string;
            tokenUrl?: string;
            flow?: string;
            in?: string;
            scopes?: { [scopeName: string]: string; }
        }
    };

    /**
     * Default consumes property for the entire API
     */

    consumes?: [string];
    /**
     * Default produces property for the entire API
     */
    produces?: [string];
}
