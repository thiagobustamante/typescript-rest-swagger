import * as ts from 'typescript';
import { Method, ResponseType, Type } from './metadataGenerator';
import { ResolveType } from './resolveType';
import { ParameterGenerator } from './parameterGenerator';
import { getJSDocDescription, getJSDocTag, isExistJSDocTag } from '../utils/jsDocUtils';
import { getDecorators } from '../utils/decoratorUtils';

export class MethodGenerator {
    private method: string;
    private path: string;

    constructor(private readonly node: ts.MethodDeclaration) {
        this.processMethodDecorators();
    }

    public IsValid() {
        return !!this.method;
    }

    public Generate(): Method {
        if (!this.IsValid()) { throw new Error('This isn\'t a valid a controller method.'); }
        if (!this.node.type) { throw new Error('Controller methods must have a return type.'); }

        const identifier = this.node.name as ts.Identifier;
        const type = ResolveType(this.node.type);
        const responses = this.getMethodResponses();
        responses.push(this.getMethodSuccessResponse(type));

        return {
            deprecated: isExistJSDocTag(this.node, 'deprecated'),
            description: getJSDocDescription(this.node),
            method: this.method,
            name: identifier.text,
            parameters: this.buildParameters(),
            path: this.path,
            responses,
            security: this.getMethodSecurity(),
            summary: getJSDocTag(this.node, 'summary'),
            tags: this.getMethodTags(),
            type
        };
    }

    private buildParameters() {
        const parameters = this.node.parameters.map(p => {
            try {
                return new ParameterGenerator(p, this.method, this.path).Generate();
            } catch (e) {
                const methodId = this.node.name as ts.Identifier;
                const controllerId = (this.node.parent as ts.ClassDeclaration).name as ts.Identifier;
                const parameterId = p.name as ts.Identifier;
                throw new Error(`Error generate parameter method: '${controllerId.text}.${methodId.text}' argument: ${parameterId.text} ${e}`);
            }
        }).filter(p => (p.in !== 'context') && (p.in !== 'cookie'));

        const bodyParameters = parameters.filter(p => p.in === 'body');
        const formParameters = parameters.filter(p => p.in === 'formData');

        if (bodyParameters.length > 1) {
            throw new Error(`Only one body parameter allowed in '${this.getCurrentLocation()}' method.`);
        }
        if (bodyParameters.length > 0 && formParameters.length > 0) {
            throw new Error(`Choose either during @FormParam and @FileParam or body parameter  in '${this.getCurrentLocation()}' method.`);
        }
        return parameters;
    }

    private getCurrentLocation() {
        const methodId = this.node.name as ts.Identifier;
        const controllerId = (this.node.parent as ts.ClassDeclaration).name as ts.Identifier;
        return `${controllerId.text}.${methodId.text}`;
    }

    private processMethodDecorators() {
        const httpMethodDecorators = getDecorators(this.node, decorator => this.supportsPathMethod(decorator.text));

        if (!httpMethodDecorators || !httpMethodDecorators.length) { return; }
        if (httpMethodDecorators.length > 1) {
            throw new Error(`Only one HTTP Method decorator in '${this.getCurrentLocation}' method is acceptable, Found: ${httpMethodDecorators.map(d => d.text).join(', ')}`);
        }

        const methodDecorator = httpMethodDecorators[0];
        this.method = methodDecorator.text;

        const pathDecorators = getDecorators(this.node, decorator => decorator.text === 'Path');

        if (pathDecorators && pathDecorators.length > 1) {
            throw new Error(`Only one Path decorator in '${this.getCurrentLocation}' method is acceptable, Found: ${httpMethodDecorators.map(d => d.text).join(', ')}`);
        }
        if (pathDecorators) {
            const pathDecorator = pathDecorators[0]; // TODO PAthUtils.normalizePath (controlar as / e substituir :id pra {id})
            this.path = pathDecorator ? `/${pathDecorator.arguments[0]}` : '';
        } else {
            this.path = '';
        }
    }

    private getMethodResponses(): ResponseType[] {
        const decorators = getDecorators(this.node, decorator => decorator.text === 'Response');
        if (!decorators || !decorators.length) { return []; }

        return decorators.map(decorator => {
            let description = '';
            let name = '200';
            let examples = undefined;
            if (decorator.arguments.length > 0 && decorator.arguments[0]) {
                name = decorator.arguments[0];
            }
            if (decorator.arguments.length > 1 && decorator.arguments[1]) {
                description = (decorator.arguments[1] as any).text;
            }
            if (decorator.arguments.length > 2 && decorator.arguments[2]) {
                const argument = decorator.arguments[2] as any;
                examples = this.getExamplesValue(argument);
            }

            return {
                description: description,
                examples: examples,
                name: name,
                schema: (decorator.typeArguments && decorator.typeArguments.length > 0)
                    ? ResolveType(decorator.typeArguments[0])
                    : undefined
            };
        });
    }

    private getMethodSuccessResponse(type: Type): ResponseType {
        const decorators = getDecorators(this.node, decorator => decorator.text === 'SuccessResponse');
        if (!decorators || !decorators.length) {
            return {
                description: type.typeName === 'void' ? 'No content' : 'Ok',
                examples: this.getMethodSuccessExamples(),
                name: type.typeName === 'void' ? '204' : '200',
                schema: type
            };
        }
        if (decorators.length > 1) {
            throw new Error(`Only one SuccessResponse decorator allowed in '${this.getCurrentLocation}' method.`);
        }

        const decorator = decorators[0];

        let description = '';
        let name = '200';
        const examples = undefined;

        if (decorator.arguments.length > 0 && decorator.arguments[0]) {
            name = decorator.arguments[0];
        }
        if (decorator.arguments.length > 1 && decorator.arguments[1]) {
            description = decorator.arguments[1];
        }

        return {
            description,
            examples,
            name,
            schema: type
        };
    }

    private getMethodSuccessExamples() {
        const exampleDecorators = getDecorators(this.node, decorator => decorator.text === 'Example');
        if (!exampleDecorators || !exampleDecorators.length) { return undefined; }
        if (exampleDecorators.length > 1) {
            throw new Error(`Only one Example decorator allowed in '${this.getCurrentLocation}' method.`);
        }

        const decorator = exampleDecorators[0];
        const argument = decorator.arguments[0];

        return this.getExamplesValue(argument);
    }

    private supportsPathMethod(method: string) {
        return ['GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'OPTIONS', 'HEAD'].some(m => m === method);
    }

    private getExamplesValue(argument: any) {
        const example: any = {};
        argument.properties.forEach((p: any) => {
            example[p.name.text] = this.getInitializerValue(p.initializer);
        });
        return example;
    }

    private getMethodTags() {
        const tagsDecorators = getDecorators(this.node, decorator => decorator.text === 'Tags');
        if (!tagsDecorators || !tagsDecorators.length) { return []; }
        if (tagsDecorators.length > 1) {
            throw new Error(`Only one Tags decorator allowed in '${this.getCurrentLocation}' method.`);
        }

        const decorator = tagsDecorators[0];
        return decorator.arguments;
    }

    private getMethodSecurity() {
        const securityDecorators = getDecorators(this.node, decorator => decorator.text === 'Security');
        if (!securityDecorators || !securityDecorators.length) { return undefined; }
        if (securityDecorators.length > 1) {
            throw new Error(`Only one Security decorator allowed in '${this.getCurrentLocation}' method.`);
        }

        const decorator = securityDecorators[0];

        return {
            name: decorator.arguments[0],
            scopes: decorator.arguments[1] ? (decorator.arguments[1] as any).elements.map((e: any) => e.text) : undefined
        };
    }

    private getInitializerValue(initializer: any) {
        switch (initializer.kind as ts.SyntaxKind) {
            case ts.SyntaxKind.ArrayLiteralExpression:
                return initializer.elements.map((e: any) => this.getInitializerValue(e));
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
                const nestedObject: any = {};

                initializer.properties.forEach((p: any) => {
                    nestedObject[p.name.text] = this.getInitializerValue(p.initializer);
                });

                return nestedObject;
            default:
                return undefined;
        }
    }
}
