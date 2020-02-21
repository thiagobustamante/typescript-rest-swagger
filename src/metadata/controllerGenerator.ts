import * as _ from 'lodash';
import * as ts from 'typescript';
import { getDecoratorTextValue, isDecorator } from '../utils/decoratorUtils';
import { normalizePath } from '../utils/pathUtils';
import { EndpointGenerator } from './endpointGenerator';
import { Controller } from './metadataGenerator';
import { MethodGenerator } from './methodGenerator';
import { getSuperClass } from './resolveType';

export class ControllerGenerator extends EndpointGenerator<ts.ClassDeclaration> {
    private readonly pathValue: string | undefined;
    private genMethods: Set<string> = new Set<string>();

    constructor(node: ts.ClassDeclaration) {
        super(node, 'controllers');
        this.pathValue = normalizePath(getDecoratorTextValue(node, decorator => decorator.text === 'Path'));
    }

    public isValid() {
        return !!this.pathValue || this.pathValue === '';
    }

    public generate(): Controller {
        if (!this.node.parent) { throw new Error('Controller node doesn\'t have a valid parent source file.'); }
        if (!this.node.name) { throw new Error('Controller node doesn\'t have a valid name.'); }

        const sourceFile = this.node.parent.getSourceFile();
        this.debugger('Generating Metadata for controller %s', this.getCurrentLocation());
        this.debugger('Controller path: %s', this.pathValue);

        const controllerMetadata = {
            consumes: this.getDecoratorValues('Consumes'),
            location: sourceFile.fileName,
            methods: this.buildMethods(),
            name: this.getCurrentLocation(),
            path: this.pathValue || '',
            produces: (this.getDecoratorValues('Produces') ? this.getDecoratorValues('Produces') : this.getDecoratorValues('Accept')),
            responses: this.getResponses(),
            security: this.getSecurity(),
            tags: this.getDecoratorValues('Tags'),
        };
        this.debugger('Generated Metadata for controller %s: %j', this.getCurrentLocation(), controllerMetadata);
        return controllerMetadata;
    }

    protected getCurrentLocation(): string {
        return (this.node as ts.ClassDeclaration).name.text;
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
            .filter(m => !isDecorator(m, decorator => 'Hidden' === decorator.text))
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
}
