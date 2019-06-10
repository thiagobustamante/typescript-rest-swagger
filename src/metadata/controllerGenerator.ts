import * as debug from 'debug';
import * as _ from 'lodash';
import * as ts from 'typescript';
import { getDecorators, getDecoratorTextValue } from '../utils/decoratorUtils';
import { normalizePath } from '../utils/pathUtils';
import { getExamplesValue } from '../utils/valueUtils';
import { Controller, ResponseType } from './metadataGenerator';
import { MethodGenerator } from './methodGenerator';
import { getSuperClass, resolveType } from './resolveType';

export class ControllerGenerator {
    private readonly pathValue: string | undefined;
    private genMethods: Set<string> = new Set<string>();
    private debugger = debug('typescript-rest-swagger:metadata:controller-generator');

    constructor(private readonly node: ts.ClassDeclaration) {
        this.pathValue = normalizePath(getDecoratorTextValue(node, decorator => decorator.text === 'Path'));
    }

    public isValid() {
        return !!this.pathValue || this.pathValue === '';
    }

    public generate(): Controller {
        if (!this.node.parent) { throw new Error('Controller node doesn\'t have a valid parent source file.'); }
        if (!this.node.name) { throw new Error('Controller node doesn\'t have a valid name.'); }

        const sourceFile = this.node.parent.getSourceFile();
        this.debugger('Generating Metadata for controller %s', this.node.name.text);
        this.debugger('Controller path: %s', this.pathValue);

        const controllerMetadata = {
            consumes: this.getDecoratorValues('Accept'),
            location: sourceFile.fileName,
            methods: this.buildMethods(),
            name: this.node.name.text,
            path: this.pathValue || '',
            produces: this.getDecoratorValues('Produces'),
            responses: this.getControllerResponses(),
            security: this.getMethodSecurity(),
            tags: this.getDecoratorValues('Tags'),
        };
        this.debugger('Generated Metadata for controller %s: %j', this.node.name.text, controllerMetadata);
        return controllerMetadata;
    }

    private buildMethods() {
        let result: Array<any> = [];
        let targetClass: any = {
            type: this.node,
            typeArguments: null
        };
        while (targetClass) {
            result = _.union(result, this.buildMethodsForClass(targetClass.type, targetClass.typeArguments));
            targetClass = getSuperClass(targetClass.type, targetClass.typeArguments);
        }

        return result;
    }

    private buildMethodsForClass(node: ts.ClassDeclaration, genericTypeMap?: Map<String, ts.TypeNode>) {
        return node.members
            .filter(m => (m.kind === ts.SyntaxKind.MethodDeclaration))
            .map((m: ts.MethodDeclaration) => new MethodGenerator(m, this.pathValue || '', genericTypeMap))
            .filter(generator => {
                if (generator.isValid() && !this.genMethods.has(generator.getMethodName())) {
                    this.genMethods.add(generator.getMethodName());
                    return true;
                }
                return false;
            })
            .map(generator => generator.generate());
    }

    private getControllerResponses(): Array<ResponseType> {
        const decorators = getDecorators(this.node, decorator => decorator.text === 'Response');
        if (!decorators || !decorators.length) { return []; }

        return decorators.map(decorator => {
            let description = '';
            let status = '200';
            let examples;
            if (decorator.arguments.length > 0 && decorator.arguments[0]) {
                status = decorator.arguments[0];
            }
            if (decorator.arguments.length > 1 && decorator.arguments[1]) {
                description = decorator.arguments[1] as any;
            }
            if (decorator.arguments.length > 2 && decorator.arguments[2]) {
                const argument = decorator.arguments[2] as any;
                examples = getExamplesValue(argument);
            }

            return {
                description: description,
                examples: examples,
                schema: (decorator.typeArguments && decorator.typeArguments.length > 0)
                    ? resolveType(decorator.typeArguments[0])
                    : undefined,
                status: status
            };
        });
    }

    private getDecoratorValues(decoratorName: string) {
        if (!this.node.parent) { throw new Error('Controller node doesn\'t have a valid parent source file.'); }
        if (!this.node.name) { throw new Error('Controller node doesn\'t have a valid name.'); }

        const decorators = getDecorators(this.node, decorator => decorator.text === decoratorName);
        if (!decorators || !decorators.length) { return []; }
        if (decorators.length > 1) {
            throw new Error(`Only one ${decoratorName} decorator allowed in '${this.node.name.text}' controller.`);
        }

        const d = decorators[0];
        return d.arguments;
    }

    private getMethodSecurity() {
        if (!this.node.parent) { throw new Error('Controller node doesn\'t have a valid parent source file.'); }
        if (!this.node.name) { throw new Error('Controller node doesn\'t have a valid name.'); }

        const securityDecorators = getDecorators(this.node, decorator => decorator.text === 'Security');
        if (!securityDecorators || !securityDecorators.length) { return undefined; }

        return securityDecorators.map(d => ({
            name: d.arguments[1] ? d.arguments[1] : 'default',
            scopes: d.arguments[0] ? (d.arguments[0] as any).elements.map((e: any) => e.text) : undefined
        }));
    }
}
