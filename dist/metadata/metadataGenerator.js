"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetadataGenerator = void 0;
var debug = require("debug");
var glob = require("glob");
var _ = require("lodash");
var mm = require("minimatch");
var ts = require("typescript");
var decoratorUtils_1 = require("../utils/decoratorUtils");
var controllerGenerator_1 = require("./controllerGenerator");
var MetadataGenerator = /** @class */ (function () {
    function MetadataGenerator(entryFile, compilerOptions, ignorePaths) {
        this.ignorePaths = ignorePaths;
        this.nodes = new Array();
        this.referenceTypes = {};
        this.circularDependencyResolvers = new Array();
        this.debugger = debug('typescript-rest-swagger:metadata');
        var sourceFiles = this.getSourceFiles(entryFile);
        this.debugger('Starting Metadata Generator');
        this.debugger('Source files: %j ', sourceFiles);
        this.debugger('Compiler Options: %j ', compilerOptions);
        this.program = ts.createProgram(sourceFiles, compilerOptions);
        this.typeChecker = this.program.getTypeChecker();
        MetadataGenerator.current = this;
    }
    MetadataGenerator.prototype.generate = function () {
        var _this = this;
        this.program.getSourceFiles().forEach(function (sf) {
            if (_this.ignorePaths && _this.ignorePaths.length) {
                for (var _i = 0, _a = _this.ignorePaths; _i < _a.length; _i++) {
                    var path = _a[_i];
                    if (!sf.fileName.includes('node_modules/typescript-rest/') && mm(sf.fileName, path)) {
                        return;
                    }
                }
            }
            ts.forEachChild(sf, function (node) {
                _this.nodes.push(node);
            });
        });
        this.debugger('Building Metadata for controllers Generator');
        var controllers = this.buildControllers();
        this.debugger('Handling circular references');
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
    MetadataGenerator.prototype.getSourceFiles = function (sourceFiles) {
        var _this = this;
        this.debugger('Getting source files from expressions');
        this.debugger('Source file patterns: %j ', sourceFiles);
        var sourceFilesExpressions = _.castArray(sourceFiles);
        var result = new Set();
        var options = { cwd: process.cwd() };
        sourceFilesExpressions.forEach(function (pattern) {
            _this.debugger('Searching pattern: %s with options: %j', pattern, options);
            var matches = glob.sync(pattern, options);
            matches.forEach(function (file) { return result.add(file); });
        });
        return Array.from(result);
    };
    MetadataGenerator.prototype.buildControllers = function () {
        return this.nodes
            .filter(function (node) { return node.kind === ts.SyntaxKind.ClassDeclaration; })
            .filter(function (node) { return !decoratorUtils_1.isDecorator(node, function (decorator) { return 'Hidden' === decorator.text; }); })
            .map(function (classDeclaration) { return new controllerGenerator_1.ControllerGenerator(classDeclaration); })
            .filter(function (generator) { return generator.isValid(); })
            .map(function (generator) { return generator.generate(); });
    };
    return MetadataGenerator;
}());
exports.MetadataGenerator = MetadataGenerator;
//# sourceMappingURL=metadataGenerator.js.map