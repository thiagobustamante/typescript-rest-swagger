import * as debug from 'debug';
import * as fs from 'fs';
import * as _ from 'lodash';
import * as mkdirp from 'mkdirp';
import * as pathUtil from 'path';
import * as YAML from 'yamljs';
import { Specification, SwaggerConfig } from '../config';
import {
    ArrayType, EnumerateType, Metadata, Method, ObjectType, Parameter,
    Property, ReferenceType, ResponseType, Type
} from '../metadata/metadataGenerator';
import { Swagger } from './swagger';

export class SpecGenerator {
    private debugger = debug('typescript-rest-swagger:spec-generator');

    constructor(private readonly metadata: Metadata, private readonly config: SwaggerConfig) { }

    public async generate(): Promise<void> {
        this.debugger('Generating swagger files.');
        this.debugger('Swagger Config: %j', this.config);
        this.debugger('Services Metadata: %j', this.metadata);
        let spec: any = this.getSwaggerSpec();
        if (this.config.outputFormat === Specification.OpenApi_3) {
            spec = await this.convertToOpenApiSpec(spec);
        }
        return new Promise<void>((resolve, reject) => {
            const swaggerDirs = _.castArray(this.config.outputDirectory);
            this.debugger('Saving specs to folders: %j', swaggerDirs);
            swaggerDirs.forEach(swaggerDir => {
                mkdirp(swaggerDir).then(() => {
                    this.debugger('Saving specs json file to folder: %j', swaggerDir);
                    fs.writeFile(`${swaggerDir}/swagger.json`, JSON.stringify(spec, null, '\t'), (err: any) => {
                        if (err) {
                            return reject(err);
                        }
                        if (this.config.yaml) {
                            this.debugger('Saving specs yaml file to folder: %j', swaggerDir);
                            fs.writeFile(`${swaggerDir}/swagger.yaml`, YAML.stringify(spec, 1000), (errYaml: any) => {
                                if (errYaml) {
                                    return reject(errYaml);
                                }
                                this.debugger('Generated files saved to folder: %j', swaggerDir);
                                resolve();
                            });
                        } else {
                            this.debugger('Generated files saved to folder: %j', swaggerDir);
                            resolve();
                        }
                    });
                }).catch(reject);
            });
        });
    }

    public getSwaggerSpec() {
        let spec: Swagger.Spec = {
            basePath: this.config.basePath,
            definitions: this.buildDefinitions(),
            info: {},
            paths: this.buildPaths(),
            swagger: '2.0'
        };

        spec.securityDefinitions = this.config.securityDefinitions
            ? this.config.securityDefinitions
            : {};

        if (this.config.consumes) { spec.consumes = this.config.consumes; }
        if (this.config.produces) { spec.produces = this.config.produces; }
        if (this.config.description) { spec.info.description = this.config.description; }
        if (this.config.license) { spec.info.license = { name: this.config.license }; }
        if (this.config.name) { spec.info.title = this.config.name; }
        if (this.config.version) { spec.info.version = this.config.version; }
        if (this.config.host) { spec.host = this.config.host; }

        if (this.config.spec) {
            spec = require('merge').recursive(spec, this.config.spec);
        }

        this.debugger('Generated specs: %j', spec);
        return spec;
    }

    public async getOpenApiSpec() {
        return await this.convertToOpenApiSpec(this.getSwaggerSpec());
    }

    private async convertToOpenApiSpec(spec: Swagger.Spec) {
        this.debugger('Converting specs to openapi 3.0');
        const converter = require('swagger2openapi');
        const options = {
            patch: true,
            warnOnly: true
        };
        const openapi = await converter.convertObj(spec, options);
        this.debugger('Converted to openapi 3.0: %j', openapi);
        return openapi.openapi;
    }


    private buildDefinitions() {
        const definitions: { [definitionsName: string]: Swagger.Schema } = {};
        Object.keys(this.metadata.referenceTypes).map(typeName => {
            this.debugger('Generating definition for type: %s', typeName);
            const referenceType = this.metadata.referenceTypes[typeName];
            this.debugger('Metadata for referenced Type: %j', referenceType);
            definitions[referenceType.typeName] = {
                description: referenceType.description,
                properties: this.buildProperties(referenceType.properties),
                type: 'object'
            };
            const requiredFields = referenceType.properties.filter(p => p.required).map(p => p.name);
            if (requiredFields && requiredFields.length) {
                definitions[referenceType.typeName].required = requiredFields;
            }
            if (referenceType.additionalProperties) {
                definitions[referenceType.typeName].additionalProperties = this.buildAdditionalProperties(referenceType.additionalProperties);
            }
            this.debugger('Generated Definition for type %s: %j', typeName, definitions[referenceType.typeName]);
        });

        return definitions;
    }

    private buildPaths() {
        const paths: { [pathName: string]: Swagger.Path } = {};

        this.debugger('Generating paths declarations');
        this.metadata.controllers.forEach(controller => {
            this.debugger('Generating paths for controller: %s', controller.name);
            controller.methods.forEach(method => {
                this.debugger('Generating paths for method: %s', method.name);
                const path = pathUtil.posix.join('/', (controller.path ? controller.path : ''), method.path);
                paths[path] = paths[path] || {};
                method.consumes = _.union(controller.consumes, method.consumes);
                method.produces = _.union(controller.produces, method.produces);
                method.tags = _.union(controller.tags, method.tags);
                method.security = method.security || controller.security;
                method.responses = _.union(controller.responses, method.responses);
                const pathObject: any = paths[path];
                pathObject[method.method] = this.buildPathMethod(controller.name, method);
                this.debugger('Generated path for method %s: %j', method.name, pathObject[method.method]);
            });
        });

        return paths;
    }

    private buildPathMethod(controllerName: string, method: Method) {
        const pathMethod: any = this.buildOperation(controllerName, method);
        pathMethod.description = method.description;
        if (method.summary) {
            pathMethod.summary = method.summary;
        }

        if (method.deprecated) { pathMethod.deprecated = method.deprecated; }
        if (method.tags.length) { pathMethod.tags = method.tags; }
        if (method.security) {
            pathMethod.security = method.security.map(s => ({
                [s.name]: s.scopes || []
            }));
        }
        this.handleMethodConsumes(method, pathMethod);

        pathMethod.parameters = method.parameters
            .filter(p => (p.in !== 'param'))
            .map(p => this.buildParameter(p));

        method.parameters
            .filter(p => (p.in === 'param'))
            .forEach(p => {
                pathMethod.parameters.push(this.buildParameter({
                    description: p.description,
                    in: 'query',
                    name: p.name,
                    parameterName: p.parameterName,
                    required: false,
                    type: p.type
                }));
                pathMethod.parameters.push(this.buildParameter({
                    description: p.description,
                    in: 'formData',
                    name: p.name,
                    parameterName: p.parameterName,
                    required: false,
                    type: p.type
                }));
            });
        if (pathMethod.parameters.filter((p: Swagger.BaseParameter) => p.in === 'body').length > 1) {
            throw new Error('Only one body parameter allowed per controller method.');
        }
        return pathMethod;
    }

    private handleMethodConsumes(method: Method, pathMethod: any) {
        if (method.consumes.length) { pathMethod.consumes = method.consumes; }

        if ((!pathMethod.consumes || !pathMethod.consumes.length)) {
            if (method.parameters.some(p => (p.in === 'formData' && p.type.typeName === 'file'))) {
                pathMethod.consumes = pathMethod.consumes || [];
                pathMethod.consumes.push('multipart/form-data');
            } else if (this.hasFormParams(method)) {
                pathMethod.consumes = pathMethod.consumes || [];
                pathMethod.consumes.push('application/x-www-form-urlencoded');
            } else if (this.supportsBodyParameters(method.method)) {
                pathMethod.consumes = pathMethod.consumes || [];
                pathMethod.consumes.push('application/json');
            }
        }
    }

    private hasFormParams(method: Method) {
        return method.parameters.find(p => (p.in === 'formData'));
    }

    private supportsBodyParameters(method: string) {
        return ['post', 'put', 'patch'].some(m => m === method);
    }

    private buildParameter(parameter: Parameter): Swagger.Parameter {
        const swaggerParameter: any = {
            description: parameter.description,
            in: parameter.in,
            name: parameter.name,
            required: parameter.required
        };

        const parameterType = this.getSwaggerType(parameter.type);
        if (parameterType.$ref || parameter.in === 'body') {
            swaggerParameter.schema = parameterType;
        } else {
            swaggerParameter.type = parameterType.type;

            if (parameterType.items) {
                swaggerParameter.items = parameterType.items;

                if (parameter.collectionFormat || this.config.collectionFormat) {
                    swaggerParameter.collectionFormat = parameter.collectionFormat || this.config.collectionFormat;
                }
            }
        }

        if (parameterType.format) { swaggerParameter.format = parameterType.format; }

        if (parameter.default !== undefined) { swaggerParameter.default = parameter.default; }

        if (parameterType.enum) { swaggerParameter.enum = parameterType.enum; }

        return swaggerParameter;
    }

    private buildProperties(properties: Array<Property>) {
        const swaggerProperties: { [propertyName: string]: Swagger.Schema } = {};

        properties.forEach(property => {
            const swaggerType = this.getSwaggerType(property.type);
            if (!swaggerType.$ref) {
                swaggerType.description = property.description;
            }
            swaggerProperties[property.name] = swaggerType;
        });

        return swaggerProperties;
    }

    private buildAdditionalProperties(properties: Array<Property>) {
        const swaggerAdditionalProperties: { [ref: string]: string } = {};

        properties.forEach(property => {
            const swaggerType = this.getSwaggerType(property.type);
            if (swaggerType.$ref) {
                swaggerAdditionalProperties['$ref'] = swaggerType.$ref;
            }
        });

        return swaggerAdditionalProperties;
    }

    private buildOperation(controllerName: string, method: Method) {
        const operation: any = {
            operationId: this.getOperationId(controllerName, method.name),
            produces: [],
            responses: {}
        };
        const methodReturnTypes = new Set<string>();

        method.responses.forEach((res: ResponseType) => {
            operation.responses[res.status] = {
                description: res.description
            };

            if (res.schema) {
                const swaggerType = this.getSwaggerType(res.schema);
                if (swaggerType.type !== 'void') {
                    operation.responses[res.status]['schema'] = swaggerType;
                }
                methodReturnTypes.add(this.getMimeType(swaggerType));
            }
            if (res.examples) {
                operation.responses[res.status]['examples'] = { 'application/json': res.examples };
            }
        });
        this.handleMethodProduces(method, operation, methodReturnTypes);
        return operation;
    }

    private getMimeType(swaggerType: Swagger.Schema) {
        if (swaggerType.$ref || swaggerType.type === 'array' || swaggerType.type === 'object') {
            return 'application/json';
        } else if (swaggerType.type === 'string' && swaggerType.format === 'binary') {
            return 'application/octet-stream';
        } else {
            return 'text/html';
        }
    }

    private handleMethodProduces(method: Method, operation: any, methodReturnTypes: Set<string>) {
        if (method.produces.length) {
            operation.produces = method.produces;
        } else if (methodReturnTypes && methodReturnTypes.size > 0) {
            operation.produces = Array.from(methodReturnTypes);
        }
    }

    private getOperationId(controllerName: string, methodName: string) {
        const controllerNameWithoutSuffix = controllerName.replace(new RegExp('Controller$'), '');
        return `${controllerNameWithoutSuffix}${methodName.charAt(0).toUpperCase() + methodName.substr(1)}`;
    }

    private getSwaggerType(type: Type) {
        const swaggerType = this.getSwaggerTypeForPrimitiveType(type);
        if (swaggerType) {
            return swaggerType;
        }

        const arrayType = type as ArrayType;
        if (arrayType.elementType) {
            return this.getSwaggerTypeForArrayType(arrayType);
        }

        const enumType = type as EnumerateType;
        if (enumType.enumMembers) {
            return this.getSwaggerTypeForEnumType(enumType);
        }

        const refType = type as ReferenceType;
        if (refType.properties && refType.description !== undefined) {
            return this.getSwaggerTypeForReferenceType(type as ReferenceType);
        }

        const objectType = type as ObjectType;
        return this.getSwaggerTypeForObjectType(objectType);
    }

    private getSwaggerTypeForPrimitiveType(type: Type) {
        const typeMap: { [name: string]: Swagger.Schema } = {
            binary: { type: 'string', format: 'binary' },
            boolean: { type: 'boolean' },
            buffer: { type: 'file' },
            //            buffer: { type: 'string', format: 'base64' },
            byte: { type: 'string', format: 'byte' },
            date: { type: 'string', format: 'date' },
            datetime: { type: 'string', format: 'date-time' },
            double: { type: 'number', format: 'double' },
            file: { type: 'file' },
            float: { type: 'number', format: 'float' },
            integer: { type: 'integer', format: 'int32' },
            long: { type: 'integer', format: 'int64' },
            object: { type: 'object' },
            string: { type: 'string' },
            void: { type: 'void' },
        };

        return typeMap[type.typeName];
    }

    private getSwaggerTypeForObjectType(objectType: ObjectType): Swagger.Schema {
        return { type: 'object', properties: this.buildProperties(objectType.properties) };
    }

    private getSwaggerTypeForArrayType(arrayType: ArrayType): Swagger.Schema {
        return { type: 'array', items: this.getSwaggerType(arrayType.elementType) };
    }

    private getSwaggerTypeForEnumType(enumType: EnumerateType): Swagger.Schema {
        function getDerivedTypeFromValues(values: Array<any>): string {
            return values.reduce((derivedType: string, item: any) => {
                const currentType = typeof item;
                derivedType = derivedType && derivedType !== currentType ? 'string' : currentType;
                return derivedType;
            }, null);
        }

        const enumValues = enumType.enumMembers.map(member => member as string) as [string];
        return {
            enum: enumType.enumMembers.map(member => member as string) as [string],
            type: getDerivedTypeFromValues(enumValues),
        };
    }

    private getSwaggerTypeForReferenceType(referenceType: ReferenceType): Swagger.Schema {
        return { $ref: `#/definitions/${referenceType.typeName}` };
    }
}
