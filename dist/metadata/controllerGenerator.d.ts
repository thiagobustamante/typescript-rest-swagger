import * as ts from 'typescript';
import { Controller } from './metadataGenerator';
export declare class ControllerGenerator {
    private readonly node;
    private readonly pathValue;
    private genMethods;
    constructor(node: ts.ClassDeclaration);
    isValid(): boolean;
    generate(): Controller;
    private buildMethods();
    private buildMethodsForClass(node, genericTypeMap?);
    private getDecoratorValues(decoratorName);
    private getMethodSecurity();
}
