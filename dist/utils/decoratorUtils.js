"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDecorator = exports.getDecoratorOptions = exports.getDecoratorTextValue = exports.getDecoratorName = exports.getDecorators = void 0;
var ts = require("typescript");
function getDecorators(node, isMatching) {
    var decorators = node.decorators;
    if (!decorators || !decorators.length) {
        return [];
    }
    return decorators
        .map(function (d) {
        var result = {
            arguments: [],
            typeArguments: []
        };
        var x = d.expression;
        if (ts.isCallExpression(x)) {
            if (x.arguments) {
                result.arguments = x.arguments.map(function (argument) {
                    if (ts.isStringLiteral(argument)) {
                        return argument.text;
                    }
                    else if (ts.isNumericLiteral(argument)) {
                        return argument.text;
                    }
                    else {
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
        return result;
    })
        .filter(isMatching);
}
exports.getDecorators = getDecorators;
function getDecorator(node, isMatching) {
    var decorators = getDecorators(node, isMatching);
    if (!decorators || !decorators.length) {
        return undefined;
    }
    return decorators[0];
}
function getDecoratorName(node, isMatching) {
    var decorator = getDecorator(node, isMatching);
    return decorator ? decorator.text : undefined;
}
exports.getDecoratorName = getDecoratorName;
function getDecoratorTextValue(node, isMatching) {
    var decorator = getDecorator(node, isMatching);
    return decorator && typeof decorator.arguments[0] === 'string' ? decorator.arguments[0] : undefined;
}
exports.getDecoratorTextValue = getDecoratorTextValue;
function getDecoratorOptions(node, isMatching) {
    var decorator = getDecorator(node, isMatching);
    return decorator && typeof decorator.arguments[1] === 'object' ? decorator.arguments[1] : undefined;
}
exports.getDecoratorOptions = getDecoratorOptions;
function isDecorator(node, isMatching) {
    var decorators = getDecorators(node, isMatching);
    if (!decorators || !decorators.length) {
        return false;
    }
    return true;
}
exports.isDecorator = isDecorator;
//# sourceMappingURL=decoratorUtils.js.map