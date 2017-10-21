import { SwaggerConfig } from '../config';
import {
    Metadata, Type, ArrayType, ObjectType, ReferenceType, EnumerateType,
    Property, Method, Parameter, ResponseType
} from '../metadata/metadataGenerator';
import { Swagger } from './swagger';
import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import * as YAML from 'yamljs';
import * as pathUtil from 'path';
import * as _ from 'lodash';

export class SpecGenerator {
    constructor(private readonly metadata: Metadata, private readonly config: SwaggerConfig) { }

    public generate(swaggerDirs: string | string[], yaml: boolean): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (!_.isArray(swaggerDirs)) {
                swaggerDirs = [swaggerDirs];
            }
            const spec = this.getSpec();
            swaggerDirs.forEach(swaggerDir => {
                mkdirp(swaggerDir, (dirErr: any) => {
                    if (dirErr) {
                        throw dirErr;
                    }
                    fs.writeFile(`${swaggerDir}/swagger.json`, JSON.stringify(spec, null, '\t'), (err: any) => {
                        if (err) {
                            reject(err);
                        }
                        if (yaml) {
                            fs.writeFile(`${swaggerDir}/swagger.yaml`, YAML.stringify(spec ,1000), (errYaml: any) => {
                                if (errYaml) {
                                    reject(errYaml);
                                }
                                resolve();
                            });
                        } else {
                            resolve();
                        }
                    });
                });
            });
        });
    }

    public getSpec() {
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

        return spec;
    }

    private buildDefinitions() {
        const definitions: { [definitionsName: string]: Swagger.Schema } = {};
        Object.keys(this.metadata.referenceTypes).map(typeName => {
            const referenceType = this.metadata.referenceTypes[typeName];
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
        });

        return definitions;
    }

    private buildPaths() {
        const paths: { [pathName: string]: Swagger.Path } = {};

        this.metadata.controllers.forEach(controller => {
            controller.methods.forEach(method => {
                const path = pathUtil.posix.join('/', (controller.path ? controller.path : ''), method.path);
                paths[path] = paths[path] || {};
                method.consumes = _.union(controller.consumes, method.consumes);
                method.produces = _.union(controller.produces, method.produces);
                method.tags = _.union(controller.tags, method.tags);
                method.security = method.security || controller.security;

                this.buildPathMethod(controller.name, method, paths[path]);
            });
        });

        return paths;
    }

    private buildPathMethod(controllerName: string, method: Method, pathObject: any) {
        const pathMethod: any = pathObject[method.method] = this.buildOperation(controllerName, method);
        pathMethod.description = method.description;

        if (method.deprecated) { pathMethod.deprecated = method.deprecated; }
        if (method.tags.length) { pathMethod.tags = method.tags; }
        if (method.security) {
            const security: any = {};
            security[method.security.name] = method.security.scopes ? method.security.scopes : [];
            pathMethod.security = [security];
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
        if (parameterType.$ref) {
            swaggerParameter.schema = parameterType;
        } else {
            swaggerParameter.type = parameterType.type;
        }

        if (parameterType.format) { swaggerParameter.format = parameterType.format; }

        return swaggerParameter;
    }

    private buildProperties(properties: Property[]) {
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

    private buildAdditionalProperties(properties: Property[]) {
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

        const objectType = type as ObjectType;
        if (objectType.properties) {
            return this.getSwaggerTypeForObjectType(objectType);
        }

        const arrayType = type as ArrayType;
        if (arrayType.elementType) {
            return this.getSwaggerTypeForArrayType(arrayType);
        }

        const enumType = type as EnumerateType;
        if (enumType.enumMembers) {
            return this.getSwaggerTypeForEnumType(enumType);
        }

        const refType = this.getSwaggerTypeForReferenceType(type as ReferenceType);
        return refType;
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
        return { type: 'string', enum: enumType.enumMembers.map(member => member as string) as [string] };
    }

    private getSwaggerTypeForReferenceType(referenceType: ReferenceType): Swagger.Schema {
        return { $ref: `#/definitions/${referenceType.typeName}` };
    }
}
