"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
var resolveType_1 = require("./resolveType");
var methodGenerator_1 = require("./methodGenerator");
var decoratorUtils_1 = require("../utils/decoratorUtils");
var pathUtils_1 = require("../utils/pathUtils");
var _ = require("lodash");
var ControllerGenerator = (function () {
    function ControllerGenerator(node) {
        this.node = node;
        this.genMethods = new Set();
        this.pathValue = pathUtils_1.normalizePath(decoratorUtils_1.getDecoratorTextValue(node, function (decorator) { return decorator.text === 'Path'; }));
    }
    ControllerGenerator.prototype.isValid = function () {
        return !!this.pathValue || this.pathValue === '';
    };
    ControllerGenerator.prototype.generate = function () {
        if (!this.node.parent) {
            throw new Error('Controller node doesn\'t have a valid parent source file.');
        }
        if (!this.node.name) {
            throw new Error('Controller node doesn\'t have a valid name.');
        }
        var sourceFile = this.node.parent.getSourceFile();
        return {
            consumes: this.getDecoratorValues('Accept'),
            location: sourceFile.fileName,
            methods: this.buildMethods(),
            name: this.node.name.text,
            path: this.pathValue || '',
            produces: this.getDecoratorValues('Produces'),
            security: this.getMethodSecurity(),
            tags: this.getDecoratorValues('Tags')
        };
    };
    ControllerGenerator.prototype.buildMethods = function () {
        var result = [];
        var targetClass = {
            type: this.node,
            typeArguments: null
        };
        while (targetClass) {
            result = _.union(result, this.buildMethodsForClass(targetClass.type, targetClass.typeArguments));
            targetClass = resolveType_1.getSuperClass(targetClass.type, targetClass.typeArguments);
        }
        return result;
    };
    ControllerGenerator.prototype.buildMethodsForClass = function (node, genericTypeMap) {
        var _this = this;
        return node.members
            .filter(function (m) { return (m.kind === ts.SyntaxKind.MethodDeclaration); })
            .map(function (m) { return new methodGenerator_1.MethodGenerator(m, genericTypeMap); })
            .filter(function (generator) {
            if (generator.isValid() && !_this.genMethods.has(generator.getMethodName())) {
                _this.genMethods.add(generator.getMethodName());
                return true;
            }
            return false;
        })
            .map(function (generator) { return generator.generate(); });
    };
    ControllerGenerator.prototype.getDecoratorValues = function (decoratorName) {
        if (!this.node.parent) {
            throw new Error('Controller node doesn\'t have a valid parent source file.');
        }
        if (!this.node.name) {
            throw new Error('Controller node doesn\'t have a valid name.');
        }
        var decorators = decoratorUtils_1.getDecorators(this.node, function (decorator) { return decorator.text === decoratorName; });
        if (!decorators || !decorators.length) {
            return [];
        }
        if (decorators.length > 1) {
            throw new Error("Only one " + decoratorName + " decorator allowed in '" + this.node.name.text + "' controller.");
        }
        var decorator = decorators[0];
        return decorator.arguments;
    };
    ControllerGenerator.prototype.getMethodSecurity = function () {
        if (!this.node.parent) {
            throw new Error('Controller node doesn\'t have a valid parent source file.');
        }
        if (!this.node.name) {
            throw new Error('Controller node doesn\'t have a valid name.');
        }
        var securityDecorators = decoratorUtils_1.getDecorators(this.node, function (decorator) { return decorator.text === 'Security'; });
        if (!securityDecorators || !securityDecorators.length) {
            return undefined;
        }
        if (securityDecorators.length > 1) {
            throw new Error("Only one Security decorator allowed in '" + this.node.name.text + "' controller.");
        }
        var decorator = securityDecorators[0];
        return {
            name: decorator.arguments[0],
            scopes: decorator.arguments[1] ? decorator.arguments[1].elements.map(function (e) { return e.text; }) : undefined
        };
    };
    return ControllerGenerator;
}());
exports.ControllerGenerator = ControllerGenerator;
//# sourceMappingURL=controllerGenerator.js.map