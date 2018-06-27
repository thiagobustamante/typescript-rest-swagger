import * as ts from 'typescript';
import { Controller } from './metadataGenerator';
import { getSuperClass } from './resolveType';
import { MethodGenerator } from './methodGenerator';
import { getDecorators, getDecoratorTextValue } from '../utils/decoratorUtils';
import {normalizePath} from '../utils/pathUtils';
import * as _ from 'lodash';

export class ControllerGenerator {
    private readonly pathValue: string | undefined;
    private genMethods: Set<string> = new Set<string>();

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
    }

    private buildMethods() {
        let result: any[] = [];
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
            name: d.arguments[0],
            scopes: d.arguments[1] ? (d.arguments[1] as any).elements.map((e: any) => e.text) : undefined
        }));
    }
}
