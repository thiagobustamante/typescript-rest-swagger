import * as ts from 'typescript';
import { Type } from './metadataGenerator';
export declare function resolveType(typeNode?: ts.TypeNode, genericTypeMap?: Map<String, ts.TypeNode>): Type;
export declare function getSuperClass(node: ts.ClassDeclaration, typeArguments?: Map<String, ts.TypeNode>): {
    type: any;
    typeArguments: Map<String, ts.TypeNode>;
};
