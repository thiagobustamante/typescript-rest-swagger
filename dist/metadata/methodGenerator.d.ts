import * as ts from 'typescript';
import { Method } from './metadataGenerator';
export declare class MethodGenerator {
    private readonly node;
    private readonly genericTypeMap;
    private method;
    private path;
    constructor(node: ts.MethodDeclaration, genericTypeMap?: Map<String, ts.TypeNode> | undefined);
    isValid(): boolean;
    getMethodName(): string;
    generate(): Method;
    private buildParameters();
    private getCurrentLocation();
    private processMethodDecorators();
    private getMethodResponses();
    private getMethodSuccessResponse(type);
    private getMethodSuccessResponseData(type);
    private getMethodSuccessExamples();
    private supportsPathMethod(method);
    private getExamplesValue(argument);
    private getDecoratorValues(decoratorName);
    private getMethodSecurity();
    private getInitializerValue(initializer);
}
