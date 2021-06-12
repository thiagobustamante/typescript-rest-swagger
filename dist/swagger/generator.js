"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpecGenerator = void 0;
var debug = require("debug");
var fs = require("fs");
var _ = require("lodash");
var mkdirp = require("mkdirp");
var pathUtil = require("path");
var YAML = require("yamljs");
var config_1 = require("../config");
var SpecGenerator = /** @class */ (function () {
    function SpecGenerator(metadata, config) {
        this.metadata = metadata;
        this.config = config;
        this.debugger = debug('typescript-rest-swagger:spec-generator');
    }
    SpecGenerator.prototype.generate = function () {
        return __awaiter(this, void 0, void 0, function () {
            var spec;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.debugger('Generating swagger files.');
                        this.debugger('Swagger Config: %j', this.config);
                        this.debugger('Services Metadata: %j', this.metadata);
                        spec = this.getSwaggerSpec();
                        if (!(this.config.outputFormat === config_1.Specification.OpenApi_3)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.convertToOpenApiSpec(spec)];
                    case 1:
                        spec = _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/, new Promise(function (resolve, reject) {
                            var swaggerDirs = _.castArray(_this.config.outputDirectory);
                            _this.debugger('Saving specs to folders: %j', swaggerDirs);
                            swaggerDirs.forEach(function (swaggerDir) {
                                mkdirp(swaggerDir).then(function () {
                                    _this.debugger('Saving specs json file to folder: %j', swaggerDir);
                                    fs.writeFile(swaggerDir + "/swagger.json", JSON.stringify(spec, null, '\t'), function (err) {
                                        if (err) {
                                            return reject(err);
                                        }
                                        if (_this.config.yaml) {
                                            _this.debugger('Saving specs yaml file to folder: %j', swaggerDir);
                                            fs.writeFile(swaggerDir + "/swagger.yaml", YAML.stringify(spec, 1000), function (errYaml) {
                                                if (errYaml) {
                                                    return reject(errYaml);
                                                }
                                                _this.debugger('Generated files saved to folder: %j', swaggerDir);
                                                resolve();
                                            });
                                        }
                                        else {
                                            _this.debugger('Generated files saved to folder: %j', swaggerDir);
                                            resolve();
                                        }
                                    });
                                }).catch(reject);
                            });
                        })];
                }
            });
        });
    };
    SpecGenerator.prototype.getSwaggerSpec = function () {
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
        this.debugger('Generated specs: %j', spec);
        return spec;
    };
    SpecGenerator.prototype.getOpenApiSpec = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.convertToOpenApiSpec(this.getSwaggerSpec())];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    SpecGenerator.prototype.convertToOpenApiSpec = function (spec) {
        return __awaiter(this, void 0, void 0, function () {
            var converter, options, openapi;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.debugger('Converting specs to openapi 3.0');
                        converter = require('swagger2openapi');
                        options = {
                            patch: true,
                            warnOnly: true
                        };
                        return [4 /*yield*/, converter.convertObj(spec, options)];
                    case 1:
                        openapi = _a.sent();
                        this.debugger('Converted to openapi 3.0: %j', openapi);
                        return [2 /*return*/, openapi.openapi];
                }
            });
        });
    };
    SpecGenerator.prototype.buildDefinitions = function () {
        var _this = this;
        var definitions = {};
        Object.keys(this.metadata.referenceTypes).map(function (typeName) {
            _this.debugger('Generating definition for type: %s', typeName);
            var referenceType = _this.metadata.referenceTypes[typeName];
            _this.debugger('Metadata for referenced Type: %j', referenceType);
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
            _this.debugger('Generated Definition for type %s: %j', typeName, definitions[referenceType.typeName]);
        });
        return definitions;
    };
    SpecGenerator.prototype.buildPaths = function () {
        var _this = this;
        var paths = {};
        this.debugger('Generating paths declarations');
        this.metadata.controllers.forEach(function (controller) {
            _this.debugger('Generating paths for controller: %s', controller.name);
            controller.methods.forEach(function (method) {
                _this.debugger('Generating paths for method: %s', method.name);
                var path = pathUtil.posix.join('/', (controller.path ? controller.path : ''), method.path);
                paths[path] = paths[path] || {};
                method.consumes = _.union(controller.consumes, method.consumes);
                method.produces = _.union(controller.produces, method.produces);
                method.tags = _.union(controller.tags, method.tags);
                method.security = method.security || controller.security;
                method.responses = _.union(controller.responses, method.responses);
                var pathObject = paths[path];
                pathObject[method.method] = _this.buildPathMethod(controller.name, method);
                _this.debugger('Generated path for method %s: %j', method.name, pathObject[method.method]);
            });
        });
        return paths;
    };
    SpecGenerator.prototype.buildPathMethod = function (controllerName, method) {
        var _this = this;
        var pathMethod = this.buildOperation(controllerName, method);
        pathMethod.description = method.description;
        if (method.summary) {
            pathMethod.summary = method.summary;
        }
        if (method.deprecated) {
            pathMethod.deprecated = method.deprecated;
        }
        if (method.tags.length) {
            pathMethod.tags = method.tags;
        }
        if (method.security) {
            pathMethod.security = method.security.map(function (s) {
                var _a;
                return (_a = {},
                    _a[s.name] = s.scopes || [],
                    _a);
            });
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
        return pathMethod;
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
        if (parameterType.$ref || parameter.in === 'body') {
            swaggerParameter.schema = parameterType;
        }
        else {
            swaggerParameter.type = parameterType.type;
            if (parameterType.items) {
                swaggerParameter.items = parameterType.items;
                if (parameter.collectionFormat || this.config.collectionFormat) {
                    swaggerParameter.collectionFormat = parameter.collectionFormat || this.config.collectionFormat;
                }
            }
        }
        if (parameterType.format) {
            swaggerParameter.format = parameterType.format;
        }
        if (parameter.default !== undefined) {
            swaggerParameter.default = parameter.default;
        }
        if (parameterType.enum) {
            swaggerParameter.enum = parameterType.enum;
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
        var refType = type;
        if (refType.properties && refType.description !== undefined) {
            return this.getSwaggerTypeForReferenceType(type);
        }
        var objectType = type;
        return this.getSwaggerTypeForObjectType(objectType);
    };
    SpecGenerator.prototype.getSwaggerTypeForPrimitiveType = function (type) {
        var typeMap = {
            binary: { type: 'string', format: 'binary' },
            boolean: { type: 'boolean' },
            buffer: { type: 'string', format: 'binary' },
            //            buffer: { type: 'string', format: 'base64' },
            byte: { type: 'string', format: 'byte' },
            date: { type: 'string', format: 'date' },
            datetime: { type: 'string', format: 'date-time' },
            double: { type: 'number', format: 'double' },
            file: { type: 'string', format: 'binary' },
            float: { type: 'number', format: 'float' },
            integer: { type: 'integer', format: 'int32' },
            long: { type: 'integer', format: 'int64' },
            object: { type: 'object' },
            string: { type: 'string' },
            void: { type: 'void' },
        };
        return typeMap[type.typeName];
    };
    SpecGenerator.prototype.getSwaggerTypeForObjectType = function (objectType) {
        return { type: 'object', properties: this.buildProperties(objectType.properties) };
    };
    SpecGenerator.prototype.getSwaggerTypeForArrayType = function (arrayType) {
        return { type: 'array', items: this.getSwaggerType(arrayType.elementType) };
    };
    SpecGenerator.prototype.getSwaggerTypeForEnumType = function (enumType) {
        function getDerivedTypeFromValues(values) {
            return values.reduce(function (derivedType, item) {
                var currentType = typeof item;
                derivedType = derivedType && derivedType !== currentType ? 'string' : currentType;
                return derivedType;
            }, null);
        }
        var enumValues = enumType.enumMembers.map(function (member) { return member; });
        return {
            enum: enumType.enumMembers.map(function (member) { return member; }),
            type: getDerivedTypeFromValues(enumValues),
        };
    };
    SpecGenerator.prototype.getSwaggerTypeForReferenceType = function (referenceType) {
        return { $ref: "#/definitions/" + referenceType.typeName };
    };
    return SpecGenerator;
}());
exports.SpecGenerator = SpecGenerator;
//# sourceMappingURL=generator.js.map