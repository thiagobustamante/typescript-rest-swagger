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
exports.ParameterGenerator = void 0;
var ts = require("typescript");
var decoratorUtils_1 = require("../utils/decoratorUtils");
var metadataGenerator_1 = require("./metadataGenerator");
var resolveType_1 = require("./resolveType");
var ParameterGenerator = /** @class */ (function () {
    function ParameterGenerator(parameter, method, path, genericTypeMap) {
        this.parameter = parameter;
        this.method = method;
        this.path = path;
        this.genericTypeMap = genericTypeMap;
    }
    ParameterGenerator.prototype.generate = function () {
        var _this = this;
        var decoratorName = decoratorUtils_1.getDecoratorName(this.parameter, function (identifier) { return _this.supportParameterDecorator(identifier.text); });
        switch (decoratorName) {
            case 'Param':
                return this.getRequestParameter(this.parameter);
            case 'CookieParam':
                return this.getCookieParameter(this.parameter);
            case 'FormParam':
                return this.getFormParameter(this.parameter);
            case 'HeaderParam':
                return this.getHeaderParameter(this.parameter);
            case 'QueryParam':
                return this.getQueryParameter(this.parameter);
            case 'PathParam':
                return this.getPathParameter(this.parameter);
            case 'FileParam':
                return this.getFileParameter(this.parameter);
            case 'FilesParam':
                return this.getFilesParameter(this.parameter);
            case 'Context':
            case 'ContextRequest':
            case 'ContextResponse':
            case 'ContextNext':
            case 'ContextLanguage':
            case 'ContextAccept':
                return this.getContextParameter(this.parameter);
            default:
                return this.getBodyParameter(this.parameter);
        }
    };
    ParameterGenerator.prototype.getCurrentLocation = function () {
        var methodId = this.parameter.parent.name;
        var controllerId = this.parameter.parent.parent.name;
        return controllerId.text + "." + methodId.text;
    };
    ParameterGenerator.prototype.getRequestParameter = function (parameter) {
        var parameterName = parameter.name.text;
        var type = this.getValidatedType(parameter);
        if (!this.supportsBodyParameters(this.method)) {
            throw new Error("Param can't support '" + this.getCurrentLocation() + "' method.");
        }
        return {
            description: this.getParameterDescription(parameter),
            in: 'param',
            name: decoratorUtils_1.getDecoratorTextValue(this.parameter, function (ident) { return ident.text === 'Param'; }) || parameterName,
            parameterName: parameterName,
            required: !parameter.questionToken,
            type: type
        };
    };
    ParameterGenerator.prototype.getContextParameter = function (parameter) {
        var parameterName = parameter.name.text;
        return {
            description: this.getParameterDescription(parameter),
            in: 'context',
            name: parameterName,
            parameterName: parameterName,
            required: !parameter.questionToken,
            type: { typeName: '' }
        };
    };
    ParameterGenerator.prototype.getFileParameter = function (parameter) {
        var parameterName = parameter.name.text;
        if (!this.supportsBodyParameters(this.method)) {
            throw new Error("FileParam can't support '" + this.getCurrentLocation() + "' method.");
        }
        return {
            description: this.getParameterDescription(parameter),
            in: 'formData',
            name: decoratorUtils_1.getDecoratorTextValue(this.parameter, function (ident) { return ident.text === 'FileParam'; }) || parameterName,
            parameterName: parameterName,
            required: !parameter.questionToken,
            type: { typeName: 'file' }
        };
    };
    ParameterGenerator.prototype.getFilesParameter = function (parameter) {
        var parameterName = parameter.name.text;
        if (!this.supportsBodyParameters(this.method)) {
            throw new Error("FilesParam can't support '" + this.getCurrentLocation() + "' method.");
        }
        return {
            description: this.getParameterDescription(parameter),
            in: 'formData',
            name: decoratorUtils_1.getDecoratorTextValue(this.parameter, function (ident) { return ident.text === 'FilesParam'; }) || parameterName,
            parameterName: parameterName,
            required: !parameter.questionToken,
            type: { typeName: 'file' }
        };
    };
    ParameterGenerator.prototype.getFormParameter = function (parameter) {
        var parameterName = parameter.name.text;
        var type = this.getValidatedType(parameter);
        if (!this.supportsBodyParameters(this.method)) {
            throw new Error("Form can't support '" + this.getCurrentLocation() + "' method.");
        }
        return {
            description: this.getParameterDescription(parameter),
            in: 'formData',
            name: decoratorUtils_1.getDecoratorTextValue(this.parameter, function (ident) { return ident.text === 'FormParam'; }) || parameterName,
            parameterName: parameterName,
            required: !parameter.questionToken && !parameter.initializer,
            type: type
        };
    };
    ParameterGenerator.prototype.getCookieParameter = function (parameter) {
        var parameterName = parameter.name.text;
        //        const type = this.getValidatedType(parameter);
        // if (!this.supportPathDataType(type)) {
        //     throw new Error(`Cookie can't support '${this.getCurrentLocation()}' method.`);
        // }
        return {
            description: this.getParameterDescription(parameter),
            in: 'cookie',
            name: decoratorUtils_1.getDecoratorTextValue(this.parameter, function (ident) { return ident.text === 'CookieParam'; }) || parameterName,
            parameterName: parameterName,
            required: !parameter.questionToken && !parameter.initializer,
            type: { typeName: '' }
        };
    };
    ParameterGenerator.prototype.getBodyParameter = function (parameter) {
        var parameterName = parameter.name.text;
        var type = this.getValidatedType(parameter);
        if (!this.supportsBodyParameters(this.method)) {
            throw new Error("Body can't support " + this.method + " method");
        }
        return {
            description: this.getParameterDescription(parameter),
            in: 'body',
            name: parameterName,
            parameterName: parameterName,
            required: !parameter.questionToken && !parameter.initializer,
            type: type
        };
    };
    ParameterGenerator.prototype.getHeaderParameter = function (parameter) {
        var parameterName = parameter.name.text;
        var type = this.getValidatedType(parameter);
        if (!this.supportPathDataType(type)) {
            throw new InvalidParameterException("Parameter '" + parameterName + "' can't be passed as a header parameter in '" + this.getCurrentLocation() + "'.");
        }
        return {
            description: this.getParameterDescription(parameter),
            in: 'header',
            name: decoratorUtils_1.getDecoratorTextValue(this.parameter, function (ident) { return ident.text === 'HeaderParam'; }) || parameterName,
            parameterName: parameterName,
            required: !parameter.questionToken && !parameter.initializer,
            type: type
        };
    };
    ParameterGenerator.prototype.getQueryParameter = function (parameter) {
        var parameterName = parameter.name.text;
        var parameterOptions = decoratorUtils_1.getDecoratorOptions(this.parameter, function (ident) { return ident.text === 'QueryParam'; }) || {};
        var type = this.getValidatedType(parameter);
        if (!this.supportQueryDataType(type)) {
            var arrayType = resolveType_1.getCommonPrimitiveAndArrayUnionType(parameter.type);
            if (arrayType && this.supportQueryDataType(arrayType)) {
                type = arrayType;
            }
            else {
                throw new InvalidParameterException("Parameter '" + parameterName + "' can't be passed as a query parameter in '" + this.getCurrentLocation() + "'.");
            }
        }
        return {
            // allowEmptyValue: parameterOptions.allowEmptyValue,
            collectionFormat: parameterOptions.collectionFormat,
            default: this.getDefaultValue(parameter.initializer),
            description: this.getParameterDescription(parameter),
            in: 'query',
            // maxItems: parameterOptions.maxItems,
            // minItems: parameterOptions.minItems,
            name: decoratorUtils_1.getDecoratorTextValue(this.parameter, function (ident) { return ident.text === 'QueryParam'; }) || parameterName,
            parameterName: parameterName,
            required: !parameter.questionToken && !parameter.initializer,
            type: type
        };
    };
    ParameterGenerator.prototype.getPathParameter = function (parameter) {
        var parameterName = parameter.name.text;
        var type = this.getValidatedType(parameter);
        var pathName = decoratorUtils_1.getDecoratorTextValue(this.parameter, function (ident) { return ident.text === 'PathParam'; }) || parameterName;
        if (!this.supportPathDataType(type)) {
            throw new InvalidParameterException("Parameter '" + parameterName + ":" + type + "' can't be passed as a path parameter in '" + this.getCurrentLocation() + "'.");
        }
        if ((!this.path.includes("{" + pathName + "}")) && (!this.path.includes(":" + pathName))) {
            throw new Error("Parameter '" + parameterName + "' can't match in path: '" + this.path + "'");
        }
        return {
            description: this.getParameterDescription(parameter),
            in: 'path',
            name: pathName,
            parameterName: parameterName,
            required: true,
            type: type
        };
    };
    ParameterGenerator.prototype.getParameterDescription = function (node) {
        var symbol = metadataGenerator_1.MetadataGenerator.current.typeChecker.getSymbolAtLocation(node.name);
        if (symbol) {
            var comments = symbol.getDocumentationComment(metadataGenerator_1.MetadataGenerator.current.typeChecker);
            if (comments.length) {
                return ts.displayPartsToString(comments);
            }
        }
        return '';
    };
    ParameterGenerator.prototype.supportsBodyParameters = function (method) {
        return ['delete', 'post', 'put', 'patch'].some(function (m) { return m === method; });
    };
    ParameterGenerator.prototype.supportParameterDecorator = function (decoratorName) {
        return ['HeaderParam', 'QueryParam', 'Param', 'FileParam',
            'PathParam', 'FilesParam', 'FormParam', 'CookieParam',
            'Context', 'ContextRequest', 'ContextResponse', 'ContextNext',
            'ContextLanguage', 'ContextAccept'].some(function (d) { return d === decoratorName; });
    };
    ParameterGenerator.prototype.supportPathDataType = function (parameterType) {
        return ['string', 'integer', 'long', 'float', 'double', 'date', 'datetime', 'buffer', 'boolean', 'enum'].find(function (t) { return t === parameterType.typeName; });
    };
    ParameterGenerator.prototype.supportQueryDataType = function (parameterType) {
        // Copied from supportPathDataType and added 'array'. Not sure if all options apply to queries, but kept to avoid breaking change.
        return ['string', 'integer', 'long', 'float', 'double', 'date',
            'datetime', 'buffer', 'boolean', 'enum', 'array'].find(function (t) { return t === parameterType.typeName; });
    };
    ParameterGenerator.prototype.getValidatedType = function (parameter) {
        if (!parameter.type) {
            throw new Error("Parameter " + parameter.name + " doesn't have a valid type assigned in '" + this.getCurrentLocation() + "'.");
        }
        return resolveType_1.resolveType(parameter.type, this.genericTypeMap);
    };
    ParameterGenerator.prototype.getDefaultValue = function (initializer) {
        if (!initializer) {
            return;
        }
        return resolveType_1.getLiteralValue(initializer);
    };
    return ParameterGenerator;
}());
exports.ParameterGenerator = ParameterGenerator;
var InvalidParameterException = /** @class */ (function (_super) {
    __extends(InvalidParameterException, _super);
    function InvalidParameterException() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return InvalidParameterException;
}(Error));
//# sourceMappingURL=parameterGenerator.js.map