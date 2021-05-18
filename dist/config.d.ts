export interface Config {
    /**
     * Swagger generation configuration object
     */
    swagger: SwaggerConfig;
}
export declare enum Specification {
    Swagger_2 = "Swagger_2",
    OpenApi_3 = "OpenApi_3"
}
export interface SwaggerConfig {
    /**
     * Support the output to be an yaml file
     */
    yaml: boolean;
    /**
     * Generated SwaggerConfig.json will output here
     */
    outputDirectory: string | Array<string>;
    /**
     * The entry point to your API
     */
    entryFile: string | Array<string>;
    /**
     * Inform if the generated spec will be in swagger 2.0 format or i open api 3.0
     */
    outputFormat?: Specification;
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
            scopes?: {
                [scopeName: string]: string;
            };
        };
    };
    /**
     * Default consumes property for the entire API
     */
    consumes?: [string];
    /**
     * Default produces property for the entire API
     */
    produces?: [string];
    /**
     * Default collectionFormat property for query parameters of array type.
     * Possible values are `csv`, `ssv`, `tsv`, `pipes`, `multi`. If not specified, Swagger defaults to `csv`.
     */
    collectionFormat?: string;
    /**
     * Directory to ignore during TypeScript metadata scan
     */
    ignore?: [string];
}
