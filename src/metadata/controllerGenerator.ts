import * as ts from 'typescript';
import { Controller } from './metadataGenerator';
import { MethodGenerator } from './methodGenerator';
import { getDecoratorTextValue } from '../utils/decoratorUtils';

export class ControllerGenerator {
    private readonly pathValue: string | undefined;

    constructor(private readonly node: ts.ClassDeclaration) {
        this.pathValue = getDecoratorTextValue(node, decorator => decorator.text === 'Path');
    }

    public isValid() {
        return !!this.pathValue || this.pathValue === '';
    }

    public generate(): Controller {
        if (!this.node.parent) { throw new Error('Controller node doesn\'t have a valid parent source file.'); }
        if (!this.node.name) { throw new Error('Controller node doesn\'t have a valid name.'); }

        const sourceFile = this.node.parent.getSourceFile();

        return {
            location: sourceFile.fileName,
            methods: this.buildMethods(),
            name: this.node.name.text,
            path: this.pathValue || ''
        };
    }

    private buildMethods() {
        return this.node.members
            .filter(m => m.kind === ts.SyntaxKind.MethodDeclaration)
            .map((m: ts.MethodDeclaration) => new MethodGenerator(m))
            .filter(generator => generator.IsValid())
            .map(generator => generator.Generate());
    }
}
