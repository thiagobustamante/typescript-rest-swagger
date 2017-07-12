"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var mkdirp = require("mkdirp");
var YAML = require("yamljs");
var pathUtil = require("path");
var _ = require("lodash");
var SpecGenerator = (function () {
    function SpecGenerator(metadata, config) {
        this.metadata = metadata;
        this.config = config;
    }
    SpecGenerator.prototype.generate = function (swaggerDirs, yaml) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (!_.isArray(swaggerDirs)) {
                swaggerDirs = [swaggerDirs];
            }
            var spec = _this.getSpec();
            swaggerDirs.forEach(function (swaggerDir) {
                mkdirp(swaggerDir, function (dirErr) {
                    if (dirErr) {
                        throw dirErr;
                    }
                    fs.writeFile(swaggerDir + "/swagger.json", JSON.stringify(spec, null, '\t'), function (err) {
                        if (err) {
                            reject(err);
                        }
                        if (yaml) {
                            fs.writeFile(swaggerDir + "/swagger.yaml", YAML.stringify(spec, 1000), function (errYaml) {
                                if (errYaml) {
                                    reject(errYaml);
                                }
                                resolve();
                            });
                        }
                        else {
                            resolve();
                        }
                    });
                });
            });
        });
    };
    SpecGenerator.prototype.getSpec = function () {
        var spec = {
            basePath: this.config.basePath,
            definitions: this.buildDefinitions(),
            info: {},
            paths: this.buildPaths(),
            swagger: '2.0'
        };
        spec.securityDefinitions = this.config.securityDefinitions
            ? this.config.securityDefinitions
            : {};
        if (this.config.consumes) {
            spec.consumes = this.config.consumes;
        }
        if (this.config.produces) {
            spec.produces = this.config.produces;
        }
        if (this.config.description) {
            spec.info.description = this.config.description;
        }
        if (this.config.license) {
            spec.info.license = { name: this.config.license };
        }
        if (this.config.name) {
            spec.info.title = this.config.name;
        }
        if (this.config.version) {
            spec.info.version = this.config.version;
        }
        if (this.config.host) {
            spec.host = this.config.host;
        }
        if (this.config.spec) {
            spec = require('merge').recursive(spec, this.config.spec);
        }
        return spec;
    };
    SpecGenerator.prototype.buildDefinitions = function () {
        var _this = this;
        var definitions = {};
        Object.keys(this.metadata.referenceTypes).map(function (typeName) {
            var referenceType = _this.metadata.referenceTypes[typeName];
            definitions[referenceType.typeName] = {
                description: referenceType.description,
                properties: _this.buildProperties(referenceType.properties),
                type: 'object'
            };
            var requiredFields = referenceType.properties.filter(function (p) { return p.required; }).map(function (p) { return p.name; });
            if (requiredFields && requiredFields.length) {
                definitions[referenceType.typeName].required = requiredFields;
            }
            if (referenceType.additionalProperties) {
                definitions[referenceType.typeName].additionalProperties = _this.buildAdditionalProperties(referenceType.additionalProperties);
            }
        });
        return definitions;
    };
    SpecGenerator.prototype.buildPaths = function () {
        var _this = this;
        var paths = {};
        this.metadata.controllers.forEach(function (controller) {
            controller.methods.forEach(function (method) {
                var path = pathUtil.posix.join('/', (controller.path ? controller.path : ''), method.path);
                paths[path] = paths[path] || {};
                method.consumes = _.union(controller.consumes, method.consumes);
                method.produces = _.union(controller.produces, method.produces);
                method.tags = _.union(controller.tags, method.tags);
                method.security = method.security || controller.security;
                _this.buildPathMethod(controller.name, method, paths[path]);
            });
        });
        return paths;
    };
    SpecGenerator.prototype.buildPathMethod = function (controllerName, method, pathObject) {
        var _this = this;
        var pathMethod = pathObject[method.method] = this.buildOperation(controllerName, method);
        pathMethod.description = method.description;
        if (method.deprecated) {
            pathMethod.deprecated = method.deprecated;
        }
        if (method.tags.length) {
            pathMethod.tags = method.tags;
        }
        if (method.security) {
            var security = {};
            security[method.security.name] = method.security.scopes ? method.security.scopes : [];
            pathMethod.security = [security];
        }
        this.handleMethodConsumes(method, pathMethod);
        pathMethod.parameters = method.parameters
            .filter(function (p) { return (p.in !== 'param'); })
            .map(function (p) { return _this.buildParameter(p); });
        method.parameters
            .filter(function (p) { return (p.in === 'param'); })
            .forEach(function (p) {
            pathMethod.parameters.push(_this.buildParameter({
                description: p.description,
                in: 'query',
                name: p.name,
                parameterName: p.parameterName,
                required: false,
                type: p.type
            }));
            pathMethod.parameters.push(_this.buildParameter({
                description: p.description,
                in: 'formData',
                name: p.name,
                parameterName: p.parameterName,
                required: false,
                type: p.type
            }));
        });
        if (pathMethod.parameters.filter(function (p) { return p.in === 'body'; }).length > 1) {
            throw new Error('Only one body parameter allowed per controller method.');
        }
    };
    SpecGenerator.prototype.handleMethodConsumes = function (method, pathMethod) {
        if (method.consumes.length) {
            pathMethod.consumes = method.consumes;
        }
        if ((!pathMethod.consumes || !pathMethod.consumes.length)) {
            if (method.parameters.some(function (p) { return (p.in === 'formData' && p.type.typeName === 'file'); })) {
                pathMethod.consumes = pathMethod.consumes || [];
                pathMethod.consumes.push('multipart/form-data');
            }
            else if (this.hasFormParams(method)) {
                pathMethod.consumes = pathMethod.consumes || [];
                pathMethod.consumes.push('application/x-www-form-urlencoded');
            }
            else if (this.supportsBodyParameters(method.method)) {
                pathMethod.consumes = pathMethod.consumes || [];
                pathMethod.consumes.push('application/json');
            }
        }
    };
    SpecGenerator.prototype.hasFormParams = function (method) {
        return method.parameters.find(function (p) { return (p.in === 'formData'); });
    };
    SpecGenerator.prototype.supportsBodyParameters = function (method) {
        return ['post', 'put', 'patch'].some(function (m) { return m === method; });
    };
    SpecGenerator.prototype.buildParameter = function (parameter) {
        var swaggerParameter = {
            description: parameter.description,
            in: parameter.in,
            name: parameter.name,
            required: parameter.required
        };
        var parameterType = this.getSwaggerType(parameter.type);
        if (parameterType.$ref) {
            swaggerParameter.schema = parameterType;
        }
        else {
            swaggerParameter.type = parameterType.type;
        }
        if (parameterType.format) {
            swaggerParameter.format = parameterType.format;
        }
        return swaggerParameter;
    };
    SpecGenerator.prototype.buildProperties = function (properties) {
        var _this = this;
        var swaggerProperties = {};
        properties.forEach(function (property) {
            var swaggerType = _this.getSwaggerType(property.type);
            if (!swaggerType.$ref) {
                swaggerType.description = property.description;
            }
            swaggerProperties[property.name] = swaggerType;
        });
        return swaggerProperties;
    };
    SpecGenerator.prototype.buildAdditionalProperties = function (properties) {
        var _this = this;
        var swaggerAdditionalProperties = {};
        properties.forEach(function (property) {
            var swaggerType = _this.getSwaggerType(property.type);
            if (swaggerType.$ref) {
                swaggerAdditionalProperties['$ref'] = swaggerType.$ref;
            }
        });
        return swaggerAdditionalProperties;
    };
    SpecGenerator.prototype.buildOperation = function (controllerName, method) {
        var _this = this;
        var operation = {
            operationId: this.getOperationId(controllerName, method.name),
            produces: [],
            responses: {}
        };
        var methodReturnTypes = new Set();
        method.responses.forEach(function (res) {
            operation.responses[res.status] = {
                description: res.description
            };
            if (res.schema) {
                var swaggerType = _this.getSwaggerType(res.schema);
                if (swaggerType.type !== 'void') {
                    operation.responses[res.status]['schema'] = swaggerType;
                }
                methodReturnTypes.add(_this.getMimeType(swaggerType));
            }
            if (res.examples) {
                operation.responses[res.status]['examples'] = { 'application/json': res.examples };
            }
        });
        this.handleMethodProduces(method, operation, methodReturnTypes);
        return operation;
    };
    SpecGenerator.prototype.getMimeType = function (swaggerType) {
        if (swaggerType.$ref || swaggerType.type === 'array' || swaggerType.type === 'object') {
            return 'application/json';
        }
        else if (swaggerType.type === 'string' && swaggerType.format === 'binary') {
            return 'application/octet-stream';
        }
        else {
            return 'text/html';
        }
    };
    SpecGenerator.prototype.handleMethodProduces = function (method, operation, methodReturnTypes) {
        if (method.produces.length) {
            operation.produces = method.produces;
        }
        else if (methodReturnTypes && methodReturnTypes.size > 0) {
            operation.produces = Array.from(methodReturnTypes);
        }
    };
    SpecGenerator.prototype.getOperationId = function (controllerName, methodName) {
        var controllerNameWithoutSuffix = controllerName.replace(new RegExp('Controller$'), '');
        return "" + controllerNameWithoutSuffix + (methodName.charAt(0).toUpperCase() + methodName.substr(1));
    };
    SpecGenerator.prototype.getSwaggerType = function (type) {
        var swaggerType = this.getSwaggerTypeForPrimitiveType(type);
        if (swaggerType) {
            return swaggerType;
        }
        var arrayType = type;
        if (arrayType.elementType) {
            return this.getSwaggerTypeForArrayType(arrayType);
        }
        var enumType = type;
        if (enumType.enumMembers) {
            return this.getSwaggerTypeForEnumType(enumType);
        }
        var refType = this.getSwaggerTypeForReferenceType(type);
        return refType;
    };
    SpecGenerator.prototype.getSwaggerTypeForPrimitiveType = function (type) {
        var typeMap = {
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
    };
    SpecGenerator.prototype.getSwaggerTypeForArrayType = function (arrayType) {
        return { type: 'array', items: this.getSwaggerType(arrayType.elementType) };
    };
    SpecGenerator.prototype.getSwaggerTypeForEnumType = function (enumType) {
        return { type: 'string', enum: enumType.enumMembers.map(function (member) { return member; }) };
    };
    SpecGenerator.prototype.getSwaggerTypeForReferenceType = function (referenceType) {
        return { $ref: "#/definitions/" + referenceType.typeName };
    };
    return SpecGenerator;
}());
exports.SpecGenerator = SpecGenerator;
//# sourceMappingURL=generator.js.map