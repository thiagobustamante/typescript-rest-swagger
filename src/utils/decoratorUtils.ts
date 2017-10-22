import * as ts from 'typescript';

export function getDecorators(node: ts.Node, isMatching: (identifier: DecoratorData) => boolean): DecoratorData[] {
    const decorators = node.decorators;
    if (!decorators || !decorators.length) { return []; }

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

export function getDecoratorName(node: ts.Node, isMatching: (identifier: DecoratorData) => boolean) {
    const decorators = getDecorators(node, isMatching);
    if (!decorators || !decorators.length) { return; }

    return decorators[0].text;
}

export function getDecoratorTextValue(node: ts.Node, isMatching: (identifier: DecoratorData) => boolean) {
    const decorators = getDecorators(node, isMatching);
    if (!decorators || !decorators.length) { return; }

    return decorators[0].arguments[0];
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
    arguments: Array<string>;
    typeArguments: Array<any>;
}
