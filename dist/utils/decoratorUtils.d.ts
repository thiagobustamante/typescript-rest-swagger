import * as ts from 'typescript';
export declare function getDecorators(node: ts.Node, isMatching: (identifier: DecoratorData) => boolean): Array<DecoratorData>;
export declare function getDecoratorName(node: ts.Node, isMatching: (identifier: DecoratorData) => boolean): string;
export declare function getDecoratorTextValue(node: ts.Node, isMatching: (identifier: DecoratorData) => boolean): string;
export declare function getDecoratorOptions(node: ts.Node, isMatching: (identifier: DecoratorData) => boolean): {
    [key: string]: any;
};
export declare function isDecorator(node: ts.Node, isMatching: (identifier: DecoratorData) => boolean): boolean;
export interface DecoratorData {
    text: string;
    arguments: Array<any>;
    typeArguments: Array<any>;
}
