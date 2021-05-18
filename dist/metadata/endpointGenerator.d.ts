import * as debug from 'debug';
import * as ts from 'typescript';
import { ResponseType } from './metadataGenerator';
export declare abstract class EndpointGenerator<T extends ts.Node> {
    protected node: T;
    protected debugger: debug.Debugger;
    constructor(node: T, name: string);
    protected getDecoratorValues(decoratorName: string, acceptMultiple?: boolean): any[];
    protected getSecurity(): {
        name: any;
        scopes: string[];
    }[];
    protected handleRolesArray(argument: ts.ArrayLiteralExpression): Array<string>;
    protected getExamplesValue(argument: any): any;
    protected getInitializerValue(initializer: any): any;
    protected getResponses(genericTypeMap?: Map<String, ts.TypeNode>): Array<ResponseType>;
    protected abstract getCurrentLocation(): string;
}
