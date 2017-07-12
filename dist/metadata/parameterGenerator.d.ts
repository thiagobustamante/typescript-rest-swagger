import { Parameter } from './metadataGenerator';
import * as ts from 'typescript';
export declare class ParameterGenerator {
    private readonly parameter;
    private readonly method;
    private readonly path;
    private readonly genericTypeMap;
    constructor(parameter: ts.ParameterDeclaration, method: string, path: string, genericTypeMap?: Map<String, ts.TypeNode>);
    generate(): Parameter;
    private getCurrentLocation();
    private getRequestParameter(parameter);
    private getContextParameter(parameter);
    private getFileParameter(parameter);
    private getFilesParameter(parameter);
    private getFormParameter(parameter);
    private getCookieParameter(parameter);
    private getBodyParameter(parameter);
    private getHeaderParameter(parameter);
    private getQueryParameter(parameter);
    private getPathParameter(parameter);
    private getParameterDescription(node);
    private supportsBodyParameters(method);
    private supportParameterDecorator(decoratorName);
    private supportPathDataType(parameterType);
    private getValidatedType(parameter);
}
