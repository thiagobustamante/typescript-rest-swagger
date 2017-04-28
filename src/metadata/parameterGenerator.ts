import { MetadataGenerator, Parameter, Type } from './metadataGenerator';
import { ResolveType } from './resolveType';
import { getDecoratorName, getDecoratorTextValue } from '../utils/decoratorUtils';
import * as ts from 'typescript';

export class ParameterGenerator {
    constructor(
        private readonly parameter: ts.ParameterDeclaration,
        private readonly method: string,
        private readonly path: string
    ) { }

    public Generate(): Parameter {
        const decoratorName = getDecoratorName(this.parameter, identifier => this.supportParameterDecorator(identifier.text));

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
    }

    private getCurrentLocation() {
        const methodId = (this.parameter.parent as ts.MethodDeclaration).name as ts.Identifier;
        const controllerId = ((this.parameter.parent as ts.MethodDeclaration).parent as ts.ClassDeclaration).name as ts.Identifier;
        return `${controllerId.text}.${methodId.text}`;
    }

    private getRequestParameter(parameter: ts.ParameterDeclaration): Parameter {
        const parameterName = (parameter.name as ts.Identifier).text;
        const type = this.getValidatedType(parameter);

        if (!this.supportsBodyParameters(this.method)) {
            throw new Error(`Param can't support '${this.getCurrentLocation()}' method.`);
        }
        return {
            description: this.getParameterDescription(parameter),
            in: 'param',
            name: getDecoratorTextValue(this.parameter, ident => ident.text === 'Param') || parameterName,
            required: !parameter.questionToken,
            type: type,
            parameterName
        };
    }

    private getContextParameter(parameter: ts.ParameterDeclaration): Parameter {
        const parameterName = (parameter.name as ts.Identifier).text;
        const type = this.getValidatedType(parameter);

        return {
            description: this.getParameterDescription(parameter),
            in: 'context',
            name: parameterName,
            required: !parameter.questionToken,
            type: type,
            parameterName
        };
    }

    private getFileParameter(parameter: ts.ParameterDeclaration): Parameter {
        const parameterName = (parameter.name as ts.Identifier).text;

        if (!this.supportsBodyParameters(this.method)) {
            throw new Error(`FileParam can't support '${this.getCurrentLocation()}' method.`);
        }

        return {
            description: this.getParameterDescription(parameter),
            in: 'formData',
            name: getDecoratorTextValue(this.parameter, ident => ident.text === 'FileParam') || parameterName,
            required: !parameter.questionToken,
            type: { typeName: 'file' },
            parameterName
        };
    }

    private getFilesParameter(parameter: ts.ParameterDeclaration): Parameter {
        const parameterName = (parameter.name as ts.Identifier).text;

        if (!this.supportsBodyParameters(this.method)) {
            throw new Error(`FilesParam can't support '${this.getCurrentLocation()}' method.`);
        }

        return {
            description: this.getParameterDescription(parameter),
            in: 'formData',
            name: getDecoratorTextValue(this.parameter, ident => ident.text === 'FilesParam') || parameterName,
            required: !parameter.questionToken,
            type: { typeName: 'file' },
            parameterName
        };
    }

    private getFormParameter(parameter: ts.ParameterDeclaration): Parameter {
        const parameterName = (parameter.name as ts.Identifier).text;
        const type = this.getValidatedType(parameter);

        if (!this.supportsBodyParameters(this.method)) {
            throw new Error(`Form can't support '${this.getCurrentLocation()}' method.`);
        }

        return {
            description: this.getParameterDescription(parameter),
            in: 'formData',
            name: getDecoratorTextValue(this.parameter, ident => ident.text === 'FormParam') || parameterName,
            required: !parameter.questionToken,
            type: type,
            parameterName
        };
    }

    private getCookieParameter(parameter: ts.ParameterDeclaration): Parameter {
        const parameterName = (parameter.name as ts.Identifier).text;
        const type = this.getValidatedType(parameter);

        if (!this.supportPathDataType(type)) {
            throw new Error(`Cookie can't support '${this.getCurrentLocation()}' method.`);
        }

        return {
            description: this.getParameterDescription(parameter),
            in: 'cookie',
            name: getDecoratorTextValue(this.parameter, ident => ident.text === 'CookieParam') || parameterName,
            required: !parameter.questionToken,
            type: type,
            parameterName
        };
    }

    private getBodyParameter(parameter: ts.ParameterDeclaration): Parameter {
        const parameterName = (parameter.name as ts.Identifier).text;
        const type = this.getValidatedType(parameter);

        if (!this.supportsBodyParameters(this.method)) {
            throw new Error(`Body can't support ${this.method} method`);
        }

        return {
            description: this.getParameterDescription(parameter),
            in: 'body',
            name: parameterName,
            required: !parameter.questionToken,
            type,
            parameterName
        };
    }

    private getHeaderParameter(parameter: ts.ParameterDeclaration): Parameter {
        const parameterName = (parameter.name as ts.Identifier).text;
        const type = this.getValidatedType(parameter);

        if (!this.supportPathDataType(type)) {
            throw new InvalidParameterException(`Parameter '${parameterName}' can't be passed as a header parameter in '${this.getCurrentLocation()}'.`);
        }

        return {
            description: this.getParameterDescription(parameter),
            in: 'header',
            name: getDecoratorTextValue(this.parameter, ident => ident.text === 'HeaderParam') || parameterName,
            required: !parameter.questionToken,
            type,
            parameterName
        };
    }

    private getQueryParameter(parameter: ts.ParameterDeclaration): Parameter {
        const parameterName = (parameter.name as ts.Identifier).text;
        const type = this.getValidatedType(parameter);

        if (!this.supportPathDataType(type)) {
            throw new InvalidParameterException(`Parameter '${parameterName}' can't be passed as a query parameter in '${this.getCurrentLocation()}'.`);
        }

        return {
            description: this.getParameterDescription(parameter),
            in: 'query',
            name: getDecoratorTextValue(this.parameter, ident => ident.text === 'QueryParam') || parameterName,
            required: !parameter.questionToken,
            type,
            parameterName
        };
    }

    private getPathParameter(parameter: ts.ParameterDeclaration): Parameter {
        const parameterName = (parameter.name as ts.Identifier).text;
        const type = this.getValidatedType(parameter);
        const pathName = getDecoratorTextValue(this.parameter, ident => ident.text === 'PathParam') || parameterName;

        if (!this.supportPathDataType(type)) {
            throw new InvalidParameterException(`Parameter '${parameterName}:${type}' can't be passed as a path parameter in '${this.getCurrentLocation()}'.`);
        }
        if (!this.path.includes(`{${pathName}}`)) {
            throw new Error(`Parameter '${parameterName}' can't macth in path: '${this.path}'`);
        }

        return {
            description: this.getParameterDescription(parameter),
            in: 'path',
            name: pathName,
            required: true,
            type,
            parameterName
        };
    }

    private getParameterDescription(node: ts.ParameterDeclaration) {
        const symbol = MetadataGenerator.current.typeChecker.getSymbolAtLocation(node.name);

        const comments = symbol.getDocumentationComment();
        if (comments.length) { return ts.displayPartsToString(comments); }

        return '';
    }

    private supportsBodyParameters(method: string) {
        return ['POST', 'PUT', 'PATCH'].some(m => m === method);
    }

    private supportParameterDecorator(decoratorName: string) {
        return ['HeaderParam', 'QueryParam', 'Param', 'FileParam', 'FilesParam', 'FormParam', 'CookieParam'].some(d => d === decoratorName);
    }

    private supportPathDataType(parameterType: Type) {
        return ['string', 'integer', 'long', 'float', 'double', 'date', 'datetime', 'buffer', 'boolean', 'enum'].find(t => t === parameterType.typeName);
    }

    private getValidatedType(parameter: ts.ParameterDeclaration) {
        if (!parameter.type) {
            throw new Error(`Parameter ${parameter.name} doesn't have a valid type assigned in '${this.getCurrentLocation()}'.`);
        }
        return ResolveType(parameter.type);
    }
}

class InvalidParameterException extends Error { }
