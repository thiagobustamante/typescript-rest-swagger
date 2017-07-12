import { SwaggerConfig } from '../config';
import { Metadata } from '../metadata/metadataGenerator';
import { Swagger } from './swagger';
export declare class SpecGenerator {
    private readonly metadata;
    private readonly config;
    constructor(metadata: Metadata, config: SwaggerConfig);
    generate(swaggerDirs: string | string[], yaml: boolean): Promise<void>;
    getSpec(): Swagger.Spec;
    private buildDefinitions();
    private buildPaths();
    private buildPathMethod(controllerName, method, pathObject);
    private handleMethodConsumes(method, pathMethod);
    private hasFormParams(method);
    private supportsBodyParameters(method);
    private buildParameter(parameter);
    private buildProperties(properties);
    private buildAdditionalProperties(properties);
    private buildOperation(controllerName, method);
    private getMimeType(swaggerType);
    private handleMethodProduces(method, operation, methodReturnTypes);
    private getOperationId(controllerName, methodName);
    private getSwaggerType(type);
    private getSwaggerTypeForPrimitiveType(type);
    private getSwaggerTypeForArrayType(arrayType);
    private getSwaggerTypeForEnumType(enumType);
    private getSwaggerTypeForReferenceType(referenceType);
}
