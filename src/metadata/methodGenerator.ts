import * as ts from 'typescript';
import { Method, ResponseData, ResponseType, Type } from './metadataGenerator';
import { resolveType } from './resolveType';
import { ParameterGenerator } from './parameterGenerator';
import { getJSDocDescription, getJSDocTag, isExistJSDocTag } from '../utils/jsDocUtils';
import { getDecorators } from '../utils/decoratorUtils';
import { normalizePath } from '../utils/pathUtils';
import * as _ from 'lodash';

export class MethodGenerator {
    private method: string;
    private path: string;

    constructor(private readonly node: ts.MethodDeclaration, private readonly genericTypeMap?: Map<String, ts.TypeNode>) {
        this.processMethodDecorators();
    }

    public isValid() {
        return !!this.method;
    }

    public getMethodName() {
        const identifier = this.node.name as ts.Identifier;
        return identifier.text;
    }

    public generate(): Method {
        if (!this.isValid()) { throw new Error('This isn\'t a valid a controller method.'); }

        const identifier = this.node.name as ts.Identifier;
        const type = resolveType(this.node.type, this.genericTypeMap);
        const responses = this.getMethodResponses();
        responses.push(this.getMethodSuccessResponse(type));

        return {
            consumes: this.getDecoratorValues('Accept'),
            deprecated: isExistJSDocTag(this.node, 'deprecated'),
            description: getJSDocDescription(this.node),
            method: this.method,
            name: identifier.text,
            parameters: this.buildParameters(),
            path: this.path,
            produces: this.getDecoratorValues('Produces'),
            responses,
            security: this.getMethodSecurity(),
            summary: getJSDocTag(this.node, 'summary'),
            tags: this.getDecoratorValues('Tags'),
            type
        };
    }

    private buildParameters() {
        const parameters = this.node.parameters.map(p => {
            try {
                return new ParameterGenerator(p, this.method, this.path, this.genericTypeMap).generate();
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
        this.method = methodDecorator.text.toLowerCase();

        const pathDecorators = getDecorators(this.node, decorator => decorator.text === 'Path');

        if (pathDecorators && pathDecorators.length > 1) {
            throw new Error(`Only one Path decorator in '${this.getCurrentLocation}' method is acceptable, Found: ${httpMethodDecorators.map(d => d.text).join(', ')}`);
        }
        if (pathDecorators) {
            const pathDecorator = pathDecorators[0]; // TODO PAthUtils.normalizePath (controlar as / e substituir :id pra {id})
            this.path = pathDecorator ? `/${normalizePath(pathDecorator.arguments[0])}` : '';
        } else {
            this.path = '';
        }
    }

    private getMethodResponses(): ResponseType[] {
        const decorators = getDecorators(this.node, decorator => decorator.text === 'Response');
        if (!decorators || !decorators.length) { return []; }

        return decorators.map(decorator => {
            let description = '';
            let status = '200';
            let examples = undefined;
            if (decorator.arguments.length > 0 && decorator.arguments[0]) {
                status = decorator.arguments[0];
            }
            if (decorator.arguments.length > 1 && decorator.arguments[1]) {
                description = decorator.arguments[1] as any;
            }
            if (decorator.arguments.length > 2 && decorator.arguments[2]) {
                const argument = decorator.arguments[2] as any;
                examples = this.getExamplesValue(argument);
            }

            return {
                description: description,
                examples: examples,
                schema: (decorator.typeArguments && decorator.typeArguments.length > 0)
                    ? resolveType(decorator.typeArguments[0], this.genericTypeMap)
                    : undefined,
                status: status
            };
        });
    }

    private getMethodSuccessResponse(type: Type): ResponseType {
        const responseData = this.getMethodSuccessResponseData(type);
        return {
            description: type.typeName === 'void' ? 'No content' : 'Ok',
            examples: this.getMethodSuccessExamples(),
            schema: responseData.type,
            status: responseData.status
        };
    }

    private getMethodSuccessResponseData(type: Type): ResponseData {
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
    }

    private getMethodSuccessExamples() {
        const exampleDecorators = getDecorators(this.node, decorator => decorator.text === 'Example');
        if (!exampleDecorators || !exampleDecorators.length) { return undefined; }
        if (exampleDecorators.length > 1) {
            throw new Error(`Only one Example decorator allowed in '${this.getCurrentLocation}' method.`);
        }

        const d = exampleDecorators[0];
        const argument = d.arguments[0];

        return this.getExamplesValue(argument);
    }

    private supportsPathMethod(method: string) {
        return ['GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'OPTIONS', 'HEAD'].some(m => m === method);
    }

    private getExamplesValue(argument: any) {
        let example: any = {};
        if (argument.properties) {
            argument.properties.forEach((p: any) => {
                example[p.name.text] = this.getInitializerValue(p.initializer);
            });
        } else {
            const obj = this.getInitializerValue(argument);
            example = _.merge(example, obj);
        }
        return example;
    }

    private getDecoratorValues(decoratorName: string) {
        const tagsDecorators = getDecorators(this.node, decorator => decorator.text === decoratorName);
        if (!tagsDecorators || !tagsDecorators.length) { return []; }
        if (tagsDecorators.length > 1) {
            throw new Error(`Only one ${decoratorName} decorator allowed in '${this.getCurrentLocation}' method.`);
        }

        const d = tagsDecorators[0];
        return d.arguments;
    }

    private getMethodSecurity() {
        const securityDecorators = getDecorators(this.node, decorator => decorator.text === 'Security');
        if (!securityDecorators || !securityDecorators.length) { return undefined; }
        if (securityDecorators.length > 1) {
            throw new Error(`Only one Security decorator allowed in '${this.getCurrentLocation}' method.`);
        }

        const d = securityDecorators[0];

        return {
            name: d.arguments[0],
            scopes: d.arguments[1] ? (d.arguments[1] as any).elements.map((e: any) => e.text) : undefined
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
