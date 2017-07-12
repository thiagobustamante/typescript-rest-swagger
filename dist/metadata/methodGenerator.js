"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
var resolveType_1 = require("./resolveType");
var parameterGenerator_1 = require("./parameterGenerator");
var jsDocUtils_1 = require("../utils/jsDocUtils");
var decoratorUtils_1 = require("../utils/decoratorUtils");
var pathUtils_1 = require("../utils/pathUtils");
var _ = require("lodash");
var MethodGenerator = (function () {
    function MethodGenerator(node, genericTypeMap) {
        this.node = node;
        this.genericTypeMap = genericTypeMap;
        this.processMethodDecorators();
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
            throw new Error('This isn\'t a valid a controller method.');
        }
        var identifier = this.node.name;
        var type = resolveType_1.resolveType(this.node.type, this.genericTypeMap);
        var responses = this.getMethodResponses();
        responses.push(this.getMethodSuccessResponse(type));
        return {
            consumes: this.getDecoratorValues('Accept'),
            deprecated: jsDocUtils_1.isExistJSDocTag(this.node, 'deprecated'),
            description: jsDocUtils_1.getJSDocDescription(this.node),
            method: this.method,
            name: identifier.text,
            parameters: this.buildParameters(),
            path: this.path,
            produces: this.getDecoratorValues('Produces'),
            responses: responses,
            security: this.getMethodSecurity(),
            summary: jsDocUtils_1.getJSDocTag(this.node, 'summary'),
            tags: this.getDecoratorValues('Tags'),
            type: type
        };
    };
    MethodGenerator.prototype.buildParameters = function () {
        var _this = this;
        var parameters = this.node.parameters.map(function (p) {
            try {
                return new parameterGenerator_1.ParameterGenerator(p, _this.method, _this.path, _this.genericTypeMap).generate();
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
        return parameters;
    };
    MethodGenerator.prototype.getCurrentLocation = function () {
        var methodId = this.node.name;
        var controllerId = this.node.parent.name;
        return controllerId.text + "." + methodId.text;
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
        var pathDecorators = decoratorUtils_1.getDecorators(this.node, function (decorator) { return decorator.text === 'Path'; });
        if (pathDecorators && pathDecorators.length > 1) {
            throw new Error("Only one Path decorator in '" + this.getCurrentLocation + "' method is acceptable, Found: " + httpMethodDecorators.map(function (d) { return d.text; }).join(', '));
        }
        if (pathDecorators) {
            var pathDecorator = pathDecorators[0]; // TODO PAthUtils.normalizePath (controlar as / e substituir :id pra {id})
            this.path = pathDecorator ? "/" + pathUtils_1.normalizePath(pathDecorator.arguments[0]) : '';
        }
        else {
            this.path = '';
        }
    };
    MethodGenerator.prototype.getMethodResponses = function () {
        var _this = this;
        var decorators = decoratorUtils_1.getDecorators(this.node, function (decorator) { return decorator.text === 'Response'; });
        if (!decorators || !decorators.length) {
            return [];
        }
        return decorators.map(function (decorator) {
            var description = '';
            var status = '200';
            var examples = undefined;
            if (decorator.arguments.length > 0 && decorator.arguments[0]) {
                status = decorator.arguments[0];
            }
            if (decorator.arguments.length > 1 && decorator.arguments[1]) {
                description = decorator.arguments[1];
            }
            if (decorator.arguments.length > 2 && decorator.arguments[2]) {
                var argument = decorator.arguments[2];
                examples = _this.getExamplesValue(argument);
            }
            return {
                description: description,
                examples: examples,
                schema: (decorator.typeArguments && decorator.typeArguments.length > 0)
                    ? resolveType_1.resolveType(decorator.typeArguments[0], _this.genericTypeMap)
                    : undefined,
                status: status
            };
        });
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
        var decorator = exampleDecorators[0];
        var argument = decorator.arguments[0];
        return this.getExamplesValue(argument);
    };
    MethodGenerator.prototype.supportsPathMethod = function (method) {
        return ['GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'OPTIONS', 'HEAD'].some(function (m) { return m === method; });
    };
    MethodGenerator.prototype.getExamplesValue = function (argument) {
        var _this = this;
        var example = {};
        if (argument.properties) {
            argument.properties.forEach(function (p) {
                example[p.name.text] = _this.getInitializerValue(p.initializer);
            });
        }
        else {
            // tslint:disable-next-line:no-eval
            var obj = eval(argument);
            example = _.merge(example, obj);
        }
        return example;
    };
    MethodGenerator.prototype.getDecoratorValues = function (decoratorName) {
        var tagsDecorators = decoratorUtils_1.getDecorators(this.node, function (decorator) { return decorator.text === decoratorName; });
        if (!tagsDecorators || !tagsDecorators.length) {
            return [];
        }
        if (tagsDecorators.length > 1) {
            throw new Error("Only one " + decoratorName + " decorator allowed in '" + this.getCurrentLocation + "' method.");
        }
        var decorator = tagsDecorators[0];
        return decorator.arguments;
    };
    MethodGenerator.prototype.getMethodSecurity = function () {
        var securityDecorators = decoratorUtils_1.getDecorators(this.node, function (decorator) { return decorator.text === 'Security'; });
        if (!securityDecorators || !securityDecorators.length) {
            return undefined;
        }
        if (securityDecorators.length > 1) {
            throw new Error("Only one Security decorator allowed in '" + this.getCurrentLocation + "' method.");
        }
        var decorator = securityDecorators[0];
        return {
            name: decorator.arguments[0],
            scopes: decorator.arguments[1] ? decorator.arguments[1].elements.map(function (e) { return e.text; }) : undefined
        };
    };
    MethodGenerator.prototype.getInitializerValue = function (initializer) {
        var _this = this;
        switch (initializer.kind) {
            case ts.SyntaxKind.ArrayLiteralExpression:
                return initializer.elements.map(function (e) { return _this.getInitializerValue(e); });
            case ts.SyntaxKind.StringLiteral:
                return initializer.text;
            case ts.SyntaxKind.TrueKeyword:
                return true;
            case ts.SyntaxKind.FalseKeyword:
                return false;
            case ts.SyntaxKind.NumberKeyword:
            case ts.SyntaxKind.FirstLiteralToken:
                return parseInt(initializer.text, 10);
            case ts.SyntaxKind.ObjectLiteralExpression:
                var nestedObject_1 = {};
                initializer.properties.forEach(function (p) {
                    nestedObject_1[p.name.text] = _this.getInitializerValue(p.initializer);
                });
                return nestedObject_1;
            default:
                return undefined;
        }
    };
    return MethodGenerator;
}());
exports.MethodGenerator = MethodGenerator;
//# sourceMappingURL=methodGenerator.js.map