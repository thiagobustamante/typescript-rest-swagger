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
exports.ControllerGenerator = void 0;
var _ = require("lodash");
var ts = require("typescript");
var decoratorUtils_1 = require("../utils/decoratorUtils");
var pathUtils_1 = require("../utils/pathUtils");
var endpointGenerator_1 = require("./endpointGenerator");
var methodGenerator_1 = require("./methodGenerator");
var resolveType_1 = require("./resolveType");
var ControllerGenerator = /** @class */ (function (_super) {
    __extends(ControllerGenerator, _super);
    function ControllerGenerator(node) {
        var _this = _super.call(this, node, 'controllers') || this;
        _this.genMethods = new Set();
        _this.pathValue = pathUtils_1.normalizePath(decoratorUtils_1.getDecoratorTextValue(node, function (decorator) { return decorator.text === 'Path'; }));
        return _this;
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
        this.debugger('Generating Metadata for controller %s', this.getCurrentLocation());
        this.debugger('Controller path: %s', this.pathValue);
        var controllerMetadata = {
            consumes: this.getDecoratorValues('Consumes'),
            location: sourceFile.fileName,
            methods: this.buildMethods(),
            name: this.getCurrentLocation(),
            path: this.pathValue || '',
            produces: (this.getDecoratorValues('Produces') ? this.getDecoratorValues('Produces') : this.getDecoratorValues('Accept')),
            responses: this.getResponses(),
            security: this.getSecurity(),
            tags: this.getDecoratorValues('Tags'),
        };
        this.debugger('Generated Metadata for controller %s: %j', this.getCurrentLocation(), controllerMetadata);
        return controllerMetadata;
    };
    ControllerGenerator.prototype.getCurrentLocation = function () {
        return this.node.name.text;
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
            .filter(function (m) { return !decoratorUtils_1.isDecorator(m, function (decorator) { return 'Hidden' === decorator.text; }); })
            .map(function (m) { return new methodGenerator_1.MethodGenerator(m, _this.pathValue || '', genericTypeMap); })
            .filter(function (generator) {
            if (generator.isValid() && !_this.genMethods.has(generator.getMethodName())) {
                _this.genMethods.add(generator.getMethodName());
                return true;
            }
            return false;
        })
            .map(function (generator) { return generator.generate(); });
    };
    return ControllerGenerator;
}(endpointGenerator_1.EndpointGenerator));
exports.ControllerGenerator = ControllerGenerator;
//# sourceMappingURL=controllerGenerator.js.map