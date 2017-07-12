import * as ts from 'typescript';
export declare function getJSDocDescription(node: ts.Node): string;
export declare function getJSDocTag(node: ts.Node, tagName: string): string | undefined;
export declare function isExistJSDocTag(node: ts.Node, tagName: string): boolean;
