'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.EndpointGenerator = void 0;
var debug = require("debug");
var _ = require("lodash");
var ts = require("typescript");
var decoratorUtils_1 = require("../utils/decoratorUtils");
var resolveType_1 = require("./resolveType");
var EndpointGenerator = /** @class */ (function () {
    function EndpointGenerator(node, name) {
        this.node = node;
        this.debugger = debug("typescript-rest-swagger:metadata:" + name);
    }
    EndpointGenerator.prototype.getDecoratorValues = function (decoratorName, acceptMultiple) {
        if (acceptMultiple === void 0) { acceptMultiple = false; }
        var decorators = decoratorUtils_1.getDecorators(this.node, function (decorator) { return decorator.text === decoratorName; });
        if (!decorators || !decorators.length) {
            return [];
        }
        if (!acceptMultiple && decorators.length > 1) {
            throw new Error("Only one " + decoratorName + " decorator allowed in " + this.getCurrentLocation() + ".");
        }
        var result;
        if (acceptMultiple) {
            result = decorators.map(function (d) { return d.arguments; });
        }
        else {
            var d = decorators[0];
            result = d.arguments;
        }
        this.debugger('Arguments of decorator %s: %j', decoratorName, result);
        return result;
    };
    EndpointGenerator.prototype.getSecurity = function () {
        var _this = this;
        var securities = this.getDecoratorValues('Security', true);
        if (!securities || !securities.length) {
            return undefined;
        }
        return securities.map(function (security) { return ({
            name: security[1] ? security[1] : 'default',
            scopes: security[0] ? _.castArray(_this.handleRolesArray(security[0])) : []
        }); });
    };
    EndpointGenerator.prototype.handleRolesArray = function (argument) {
        if (ts.isArrayLiteralExpression(argument)) {
            return argument.elements.map(function (value) { return value.getText(); })
                .map(function (val) { return (val && val.startsWith('\'') && val.endsWith('\'')) ? val.slice(1, -1) : val; });
        }
        else {
            return argument;
        }
    };
    EndpointGenerator.prototype.getExamplesValue = function (argument) {
        var _this = this;
        var example = {};
        this.debugger(argument);
        if (argument.properties) {
            argument.properties.forEach(function (p) {
                example[p.name.text] = _this.getInitializerValue(p.initializer);
            });
        }
        else {
            example = this.getInitializerValue(argument);
        }
        this.debugger('Example extracted for %s: %j', this.getCurrentLocation(), example);
        return example;
    };
    EndpointGenerator.prototype.getInitializerValue = function (initializer) {
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
    EndpointGenerator.prototype.getResponses = function (genericTypeMap) {
        var _this = this;
        var decorators = decoratorUtils_1.getDecorators(this.node, function (decorator) { return decorator.text === 'Response'; });
        if (!decorators || !decorators.length) {
            return [];
        }
        this.debugger('Generating Responses for %s', this.getCurrentLocation());
        return decorators.map(function (decorator) {
            var description = '';
            var status = '200';
            var examples;
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
            var responses = {
                description: description,
                examples: examples,
                schema: (decorator.typeArguments && decorator.typeArguments.length > 0)
                    ? resolveType_1.resolveType(decorator.typeArguments[0], genericTypeMap)
                    : undefined,
                status: status
            };
            _this.debugger('Generated Responses for %s: %j', _this.getCurrentLocation(), responses);
            return responses;
        });
    };
    return EndpointGenerator;
}());
exports.EndpointGenerator = EndpointGenerator;
//# sourceMappingURL=endpointGenerator.js.map