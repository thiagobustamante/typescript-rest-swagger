import * as ts from 'typescript';
import { EndpointGenerator } from './endpointGenerator';
import { Controller } from './metadataGenerator';
export declare class ControllerGenerator extends EndpointGenerator<ts.ClassDeclaration> {
    private readonly pathValue;
    private genMethods;
    constructor(node: ts.ClassDeclaration);
    isValid(): boolean;
    generate(): Controller;
    protected getCurrentLocation(): string;
    private buildMethods;
    private buildMethodsForClass;
}
