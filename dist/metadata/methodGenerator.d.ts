import * as ts from 'typescript';
import { EndpointGenerator } from './endpointGenerator';
import { Method } from './metadataGenerator';
export declare class MethodGenerator extends EndpointGenerator<ts.MethodDeclaration> {
    private readonly controllerPath;
    private readonly genericTypeMap?;
    private method;
    private path;
    constructor(node: ts.MethodDeclaration, controllerPath: string, genericTypeMap?: Map<String, ts.TypeNode>);
    isValid(): boolean;
    getMethodName(): string;
    generate(): Method;
    protected getCurrentLocation(): string;
    private buildParameters;
    private processMethodDecorators;
    private getMethodSuccessResponse;
    private getMethodSuccessResponseData;
    private getMethodSuccessExamples;
    private mergeResponses;
    private supportsPathMethod;
}
