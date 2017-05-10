import * as ts from 'typescript';
import { Controller } from './metadataGenerator';
import { MethodGenerator } from './methodGenerator';
import { getDecorators, getDecoratorTextValue } from '../utils/decoratorUtils';
import {normalizePath} from '../utils/pathUtils';

export class ControllerGenerator {
    private readonly pathValue: string | undefined;

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
            tags: this.getDecoratorValues('Tags')
        };
    }

    private buildMethods() {
        return this.node.members
            .filter(m => m.kind === ts.SyntaxKind.MethodDeclaration)
            .map((m: ts.MethodDeclaration) => new MethodGenerator(m))
            .filter(generator => generator.isValid())
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

        const decorator = decorators[0];
        return decorator.arguments;
    }
}
