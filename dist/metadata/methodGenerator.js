"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MethodGenerator = void 0;
var pathUtil = require("path");
var decoratorUtils_1 = require("../utils/decoratorUtils");
var jsDocUtils_1 = require("../utils/jsDocUtils");
var pathUtils_1 = require("../utils/pathUtils");
var endpointGenerator_1 = require("./endpointGenerator");
var parameterGenerator_1 = require("./parameterGenerator");
var resolveType_1 = require("./resolveType");
var MethodGenerator = /** @class */ (function (_super) {
    __extends(MethodGenerator, _super);
    function MethodGenerator(node, controllerPath, genericTypeMap) {
        var _this = _super.call(this, node, 'methods') || this;
        _this.controllerPath = controllerPath;
        _this.genericTypeMap = genericTypeMap;
        _this.processMethodDecorators();
        return _this;
    }
    MethodGenerator.prototype.isValid = function () {
        return !!this.method;
    };
    MethodGenerator.prototype.getMethodName = function () {
        var identifier = this.node.name;
        return identifier.text;
    };
    MethodGenerator.prototype.generate = function () {
        if (!this.isValid()) {
            throw new Error('This isn\'t a valid controller method.');
        }
        this.debugger('Generating Metadata for method %s', this.getCurrentLocation());
        var identifier = this.node.name;
        var type = resolveType_1.resolveType(this.node.type, this.genericTypeMap);
        var responses = this.mergeResponses(this.getResponses(this.genericTypeMap), this.getMethodSuccessResponse(type));
        var methodMetadata = {
            consumes: this.getDecoratorValues('Consumes'),
            deprecated: jsDocUtils_1.isExistJSDocTag(this.node, 'deprecated'),
            description: jsDocUtils_1.getJSDocDescription(this.node),
            method: this.method,
            name: identifier.text,
            parameters: this.buildParameters(),
            path: this.path,
            produces: (this.getDecoratorValues('Produces') ? this.getDecoratorValues('Produces') : this.getDecoratorValues('Accept')),
            responses: responses,
            security: this.getSecurity(),
            summary: jsDocUtils_1.getJSDocTag(this.node, 'summary'),
            tags: this.getDecoratorValues('Tags'),
            type: type
        };
        this.debugger('Generated Metadata for method %s: %j', this.getCurrentLocation(), methodMetadata);
        return methodMetadata;
    };
    MethodGenerator.prototype.getCurrentLocation = function () {
        var methodId = this.node.name;
        var controllerId = this.node.parent.name;
        return controllerId.text + "." + methodId.text;
    };
    MethodGenerator.prototype.buildParameters = function () {
        var _this = this;
        this.debugger('Processing method %s parameters.', this.getCurrentLocation());
        var parameters = this.node.parameters.map(function (p) {
            try {
                var path = pathUtil.posix.join('/', (_this.controllerPath ? _this.controllerPath : ''), _this.path);
                return new parameterGenerator_1.ParameterGenerator(p, _this.method, path, _this.genericTypeMap).generate();
            }
            catch (e) {
                var methodId = _this.node.name;
                var controllerId = _this.node.parent.name;
                var parameterId = p.name;
                throw new Error("Error generate parameter method: '" + controllerId.text + "." + methodId.text + "' argument: " + parameterId.text + " " + e);
            }
        }).filter(function (p) { return (p.in !== 'context') && (p.in !== 'cookie'); });
        var bodyParameters = parameters.filter(function (p) { return p.in === 'body'; });
        var formParameters = parameters.filter(function (p) { return p.in === 'formData'; });
        if (bodyParameters.length > 1) {
            throw new Error("Only one body parameter allowed in '" + this.getCurrentLocation() + "' method.");
        }
        if (bodyParameters.length > 0 && formParameters.length > 0) {
            throw new Error("Choose either during @FormParam and @FileParam or body parameter  in '" + this.getCurrentLocation() + "' method.");
        }
        this.debugger('Parameters list for method %s: %j.', this.getCurrentLocation(), parameters);
        return parameters;
    };
    MethodGenerator.prototype.processMethodDecorators = function () {
        var _this = this;
        var httpMethodDecorators = decoratorUtils_1.getDecorators(this.node, function (decorator) { return _this.supportsPathMethod(decorator.text); });
        if (!httpMethodDecorators || !httpMethodDecorators.length) {
            return;
        }
        if (httpMethodDecorators.length > 1) {
            throw new Error("Only one HTTP Method decorator in '" + this.getCurrentLocation + "' method is acceptable, Found: " + httpMethodDecorators.map(function (d) { return d.text; }).join(', '));
        }
        var methodDecorator = httpMethodDecorators[0];
        this.method = methodDecorator.text.toLowerCase();
        this.debugger('Processing method %s decorators.', this.getCurrentLocation());
        var pathDecorators = decoratorUtils_1.getDecorators(this.node, function (decorator) { return decorator.text === 'Path'; });
        if (pathDecorators && pathDecorators.length > 1) {
            throw new Error("Only one Path decorator in '" + this.getCurrentLocation + "' method is acceptable, Found: " + httpMethodDecorators.map(function (d) { return d.text; }).join(', '));
        }
        if (pathDecorators) {
            var pathDecorator = pathDecorators[0];
            this.path = pathDecorator ? "/" + pathUtils_1.normalizePath(pathDecorator.arguments[0]) : '';
        }
        else {
            this.path = '';
        }
        this.debugger('Mapping endpoint %s %s', this.method, this.path);
    };
    MethodGenerator.prototype.getMethodSuccessResponse = function (type) {
        var responseData = this.getMethodSuccessResponseData(type);
        return {
            description: type.typeName === 'void' ? 'No content' : 'Ok',
            examples: this.getMethodSuccessExamples(),
            schema: responseData.type,
            status: responseData.status
        };
    };
    MethodGenerator.prototype.getMethodSuccessResponseData = function (type) {
        switch (type.typeName) {
            case 'void': return { status: '204', type: type };
            case 'NewResource': return { status: '201', type: type.typeArgument || type };
            case 'RequestAccepted': return { status: '202', type: type.typeArgument || type };
            case 'MovedPermanently': return { status: '301', type: type.typeArgument || type };
            case 'MovedTemporarily': return { status: '302', type: type.typeArgument || type };
            case 'DownloadResource':
            case 'DownloadBinaryData': return { status: '200', type: { typeName: 'buffer' } };
            default: return { status: '200', type: type };
        }
    };
    MethodGenerator.prototype.getMethodSuccessExamples = function () {
        var exampleDecorators = decoratorUtils_1.getDecorators(this.node, function (decorator) { return decorator.text === 'Example'; });
        if (!exampleDecorators || !exampleDecorators.length) {
            return undefined;
        }
        if (exampleDecorators.length > 1) {
            throw new Error("Only one Example decorator allowed in '" + this.getCurrentLocation + "' method.");
        }
        var d = exampleDecorators[0];
        var argument = d.arguments[0];
        return this.getExamplesValue(argument);
    };
    MethodGenerator.prototype.mergeResponses = function (responses, defaultResponse) {
        if (!responses || !responses.length) {
            return [defaultResponse];
        }
        var index = responses.findIndex(function (resp) { return resp.status === defaultResponse.status; });
        if (index >= 0) {
            if (defaultResponse.examples && !responses[index].examples) {
                responses[index].examples = defaultResponse.examples;
            }
        }
        else {
            responses.push(defaultResponse);
        }
        return responses;
    };
    MethodGenerator.prototype.supportsPathMethod = function (method) {
        return ['GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'OPTIONS', 'HEAD'].some(function (m) { return m === method; });
    };
    return MethodGenerator;
}(endpointGenerator_1.EndpointGenerator));
exports.MethodGenerator = MethodGenerator;
//# sourceMappingURL=methodGenerator.js.map