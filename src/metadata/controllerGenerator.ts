import * as ts from 'typescript';
import { Controller } from './metadataGenerator';
import { MetadataGenerator } from './metadataGenerator';
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
        let targetClass: any = this.node;
        while (targetClass) {
            result = _.union(result, this.buildMethodsForClass(targetClass));
            targetClass = this.getSuperClass(targetClass);
        }

        return result;
    }

    private buildMethodsForClass(node: ts.ClassDeclaration) {
        return node.members
            .filter(m => (m.kind === ts.SyntaxKind.MethodDeclaration))
            .map((m: ts.MethodDeclaration) => new MethodGenerator(m))
            .filter(generator => {
                if (generator.isValid() && !this.genMethods.has(generator.getMethodName())) {
                    this.genMethods.add(generator.getMethodName());
                    return true;
                }
                return false;
            })
            .map(generator => generator.generate());
    }

    private getSuperClass(node: ts.ClassDeclaration) {
        const clauses = node.heritageClauses;
        if (clauses) {
            const filteredClauses = clauses.filter(clause => clause.token === ts.SyntaxKind.ExtendsKeyword);
            if (filteredClauses.length > 0) {
                const clause: ts.HeritageClause = filteredClauses[0];
                if (clause.types && clause.types.length) {
                    return MetadataGenerator.current.getClassDeclaration(clause.types[0].expression.getText());
                }
            }
        }
        return undefined;
    }

    private getDecoratorValues(decoratorName: string) {
        if (!this.node.parent) { throw new Error('Controller node doesn\'t have a valid parent source file.'); }
        if (!this.node.name) { throw new Error('Controller node doesn\'t have a valid name.'); }

        const decorators = getDecorators(this.node, decorator => decorator.text === decoratorName);
        if (!decorators || !decorators.length) { return []; }
        if (decorators.length > 1) {
            throw new Error(`Only one ${decoratorName} decorator allowed in '${this.node.name.text}' controller.`);
        }

        const decorator = decorators[0];
        return decorator.arguments;
    }

    private getMethodSecurity() {
        if (!this.node.parent) { throw new Error('Controller node doesn\'t have a valid parent source file.'); }
        if (!this.node.name) { throw new Error('Controller node doesn\'t have a valid name.'); }

        const securityDecorators = getDecorators(this.node, decorator => decorator.text === 'Security');
        if (!securityDecorators || !securityDecorators.length) { return undefined; }
        if (securityDecorators.length > 1) {
            throw new Error(`Only one Security decorator allowed in '${this.node.name.text}' controller.`);
        }

        const decorator = securityDecorators[0];

        return {
            name: decorator.arguments[0],
            scopes: decorator.arguments[1] ? (decorator.arguments[1] as any).elements.map((e: any) => e.text) : undefined
        };
    }
}
