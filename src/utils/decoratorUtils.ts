import * as ts from 'typescript';
import {Security} from '../metadata/metadataGenerator';
import {SyntaxKind} from 'typescript';

export function parseSecurityDecoratorArguments(decoratorData: DecoratorData): Security {
    if (decoratorData.arguments.length === 1) {
        // according to typescript-rest @Security decorator definition, when only one argument has been provided,
        // scopes must be the only parameter
        return {name: undefined, scopes: parseScopesArgument(decoratorData.arguments[0])};
    } else if (decoratorData.arguments.length === 2) {
        // in all other cases, maintain previous functionality - assume two parameters: name, scopes

        // nameArgument might be metadata which would result in a confusing error message
        const nameArgument = decoratorData.arguments[0];
        if (typeof nameArgument !== 'string') {
            throw new Error('name argument to @Security decorator must always be a string');
        }

        return {name: nameArgument, scopes: parseScopesArgument(decoratorData.arguments[1])};
    } else {
        return {name: undefined, scopes: undefined};
    }

    function parseScopesArgument(arg: any): Array<string> | undefined {
        // typescript-rest @Security allows scopes to be a string or an array, so we need to support both
        if (typeof arg === 'string') {
            // wrap in an array for compatibility with upstream generator logic
            return [arg];
        } else if (arg && arg.kind === SyntaxKind.UndefinedKeyword || arg.kind === SyntaxKind.NullKeyword) {
            return undefined;
        } else {
            // array from metadata needs to be extracted and converted to normal string array
            return arg ? (arg as any).elements.map((e: any) => e.text) : undefined;
        }
    }
}

export function getDecorators(node: ts.Node, isMatching: (identifier: DecoratorData) => boolean): DecoratorData[] {
    const decorators = node.decorators;
    if (!decorators || !decorators.length) {
        return [];
    }

    return decorators
        .map(d => {
            const result: any = {
                arguments: [],
                typeArguments: []
            };
            let x: any = d.expression;
            if (ts.isCallExpression(x)) {
                if (x.arguments) {
                    result.arguments = x.arguments.map((argument) => {
                        if (ts.isStringLiteral(argument)) {
                            return argument.text;
                        } else if (ts.isNumericLiteral(argument)) {
                            return argument.text;
                        } else {
                            return argument;
                        }
                    });
                }
                if (x.typeArguments) {
                    result.typeArguments = x.typeArguments;
                }
                x = x.expression;
            }
            result.text = x.text || x.name.text;
            return result as DecoratorData;
        })
        .filter(isMatching);
}

function getDecorator(node: ts.Node, isMatching: (identifier: DecoratorData) => boolean) {
    const decorators = getDecorators(node, isMatching);
    if (!decorators || !decorators.length) {
        return;
    }

    return decorators[0];
}

export function getDecoratorName(node: ts.Node, isMatching: (identifier: DecoratorData) => boolean) {
    const decorator = getDecorator(node, isMatching);
    return decorator ? decorator.text : undefined;
}

export function getDecoratorTextValue(node: ts.Node, isMatching: (identifier: DecoratorData) => boolean) {
    const decorator = getDecorator(node, isMatching);
    return decorator && typeof decorator.arguments[0] === 'string' ? decorator.arguments[0] as string : undefined;
}

export function getDecoratorOptions(node: ts.Node, isMatching: (identifier: DecoratorData) => boolean) {
    const decorator = getDecorator(node, isMatching);
    return decorator && typeof decorator.arguments[1] === 'object' ? decorator.arguments[1] as { [key: string]: any } : undefined;
}

export function isDecorator(node: ts.Node, isMatching: (identifier: DecoratorData) => boolean) {
    const decorators = getDecorators(node, isMatching);
    if (!decorators || !decorators.length) {
        return false;
    }
    return true;
}

export interface DecoratorData {
    text: string;
    arguments: Array<any>;
    typeArguments: Array<any>;
}
