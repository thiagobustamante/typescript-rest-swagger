import * as ts from 'typescript';

export function getExamplesValue(argument: any) {
    let example: any = {};
    if (argument.properties) {
        argument.properties.forEach((p: any) => {
            example[p.name.text] = getInitializerValue(p.initializer);
        });
    } else {
        example = getInitializerValue(argument);
    }
    return example;
}

export function getInitializerValue(initializer: any) {
    switch (initializer.kind as ts.SyntaxKind) {
        case ts.SyntaxKind.ArrayLiteralExpression:
            return initializer.elements.map((e: any) => getInitializerValue(e));
        case ts.SyntaxKind.StringLiteral:
            return initializer.text;
        case ts.SyntaxKind.TrueKeyword:
            return true;
        case ts.SyntaxKind.FalseKeyword:
            return false;
        case ts.SyntaxKind.NumberKeyword:
        case ts.SyntaxKind.FirstLiteralToken:
            return parseInt(initializer.text, 10);
        case ts.SyntaxKind.ObjectLiteralExpression:
            const nestedObject: any = {};

            initializer.properties.forEach((p: any) => {
                nestedObject[p.name.text] = getInitializerValue(p.initializer);
            });

            return nestedObject;
        default:
            return undefined;
    }
}
