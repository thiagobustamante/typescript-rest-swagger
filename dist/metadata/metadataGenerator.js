"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
var controllerGenerator_1 = require("./controllerGenerator");
var MetadataGenerator = (function () {
    function MetadataGenerator(entryFile) {
        this.nodes = new Array();
        this.referenceTypes = {};
        this.circularDependencyResolvers = new Array();
        this.program = ts.createProgram([entryFile], {});
        this.typeChecker = this.program.getTypeChecker();
        MetadataGenerator.current = this;
    }
    MetadataGenerator.prototype.generate = function () {
        var _this = this;
        this.program.getSourceFiles().forEach(function (sf) {
            ts.forEachChild(sf, function (node) {
                _this.nodes.push(node);
            });
        });
        var controllers = this.buildControllers();
        this.circularDependencyResolvers.forEach(function (c) { return c(_this.referenceTypes); });
        return {
            controllers: controllers,
            referenceTypes: this.referenceTypes
        };
    };
    MetadataGenerator.prototype.TypeChecker = function () {
        return this.typeChecker;
    };
    MetadataGenerator.prototype.addReferenceType = function (referenceType) {
        this.referenceTypes[referenceType.typeName] = referenceType;
    };
    MetadataGenerator.prototype.getReferenceType = function (typeName) {
        return this.referenceTypes[typeName];
    };
    MetadataGenerator.prototype.onFinish = function (callback) {
        this.circularDependencyResolvers.push(callback);
    };
    MetadataGenerator.prototype.getClassDeclaration = function (className) {
        var found = this.nodes
            .filter(function (node) {
            var classDeclaration = node;
            return (node.kind === ts.SyntaxKind.ClassDeclaration && classDeclaration.name && classDeclaration.name.text === className);
        });
        if (found && found.length) {
            return found[0];
        }
        return undefined;
    };
    MetadataGenerator.prototype.getInterfaceDeclaration = function (className) {
        var found = this.nodes
            .filter(function (node) {
            var interfaceDeclaration = node;
            return (node.kind === ts.SyntaxKind.InterfaceDeclaration && interfaceDeclaration.name && interfaceDeclaration.name.text === className);
        });
        if (found && found.length) {
            return found[0];
        }
        return undefined;
    };
    MetadataGenerator.prototype.buildControllers = function () {
        return this.nodes
            .filter(function (node) { return node.kind === ts.SyntaxKind.ClassDeclaration; })
            .map(function (classDeclaration) { return new controllerGenerator_1.ControllerGenerator(classDeclaration); })
            .filter(function (generator) { return generator.isValid(); })
            .map(function (generator) { return generator.generate(); });
    };
    return MetadataGenerator;
}());
exports.MetadataGenerator = MetadataGenerator;
//# sourceMappingURL=metadataGenerator.js.map