"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
var metadataGenerator_1 = require("./metadataGenerator");
var decoratorUtils_1 = require("../utils/decoratorUtils");
var _ = require("lodash");
var syntaxKindMap = {};
syntaxKindMap[ts.SyntaxKind.NumberKeyword] = 'number';
syntaxKindMap[ts.SyntaxKind.StringKeyword] = 'string';
syntaxKindMap[ts.SyntaxKind.BooleanKeyword] = 'boolean';
syntaxKindMap[ts.SyntaxKind.VoidKeyword] = 'void';
var localReferenceTypeCache = {};
var inProgressTypes = {};
function resolveType(typeNode, genericTypeMap) {
    if (!typeNode) {
        return { typeName: 'void' };
    }
    var primitiveType = getPrimitiveType(typeNode);
    if (primitiveType) {
        return primitiveType;
    }
    if (typeNode.kind === ts.SyntaxKind.ArrayType) {
        var arrayType = typeNode;
        return {
            elementType: resolveType(arrayType.elementType, genericTypeMap),
            typeName: 'array'
        };
    }
    if ((typeNode.kind === ts.SyntaxKind.UnionType) || (typeNode.kind === ts.SyntaxKind.AnyKeyword)) {
        return { typeName: 'object' };
    }
    if (typeNode.kind !== ts.SyntaxKind.TypeReference) {
        throw new Error("Unknown type: " + ts.SyntaxKind[typeNode.kind]);
    }
    var typeReference = typeNode;
    var typeName = resolveSimpleTypeName(typeReference.typeName);
    if (typeName === 'Date') {
        return getDateType(typeNode);
    }
    if (typeName === 'Buffer') {
        return { typeName: 'buffer' };
    }
    if (typeName === 'DownloadBinaryData') {
        return { typeName: 'buffer' };
    }
    if (typeName === 'DownloadResource') {
        return { typeName: 'buffer' };
    }
    if (typeName === 'Promise') {
        typeReference = typeReference.typeArguments[0];
        return resolveType(typeReference, genericTypeMap);
    }
    if (typeName === 'Array') {
        typeReference = typeReference.typeArguments[0];
        return {
            elementType: resolveType(typeReference, genericTypeMap),
            typeName: 'array'
        };
    }
    var enumType = getEnumerateType(typeNode);
    if (enumType) {
        return enumType;
    }
    var literalType = getLiteralType(typeNode);
    if (literalType) {
        return literalType;
    }
    var referenceType;
    if (typeReference.typeArguments && typeReference.typeArguments.length === 1) {
        var typeT = typeReference.typeArguments;
        referenceType = getReferenceType(typeReference.typeName, genericTypeMap, typeT);
        typeName = resolveSimpleTypeName(typeReference.typeName);
        if (['NewResource', 'RequestAccepted', 'MovedPermanently', 'MovedTemporarily'].indexOf(typeName) >= 0) {
            referenceType.typeName = typeName;
            referenceType.typeArgument = resolveType(typeT[0], genericTypeMap);
        }
        else {
            metadataGenerator_1.MetadataGenerator.current.addReferenceType(referenceType);
        }
    }
    else {
        referenceType = getReferenceType(typeReference.typeName, genericTypeMap);
        metadataGenerator_1.MetadataGenerator.current.addReferenceType(referenceType);
    }
    return referenceType;
}
exports.resolveType = resolveType;
function getPrimitiveType(typeNode) {
    var primitiveType = syntaxKindMap[typeNode.kind];
    if (!primitiveType) {
        return;
    }
    if (primitiveType === 'number') {
        var parentNode = typeNode.parent;
        if (!parentNode) {
            return { typeName: 'double' };
        }
        var decoratorName = decoratorUtils_1.getDecoratorName(parentNode, function (identifier) {
            return ['IsInt', 'IsLong', 'IsFloat', 'isDouble'].some(function (m) { return m === identifier.text; });
        });
        switch (decoratorName) {
            case 'IsInt':
                return { typeName: 'integer' };
            case 'IsLong':
                return { typeName: 'long' };
            case 'IsFloat':
                return { typeName: 'float' };
            case 'IsDouble':
                return { typeName: 'double' };
            default:
                return { typeName: 'double' };
        }
    }
    return { typeName: primitiveType };
}
function getDateType(typeNode) {
    var parentNode = typeNode.parent;
    if (!parentNode) {
        return { typeName: 'datetime' };
    }
    var decoratorName = decoratorUtils_1.getDecoratorName(parentNode, function (identifier) {
        return ['IsDate', 'IsDateTime'].some(function (m) { return m === identifier.text; });
    });
    switch (decoratorName) {
        case 'IsDate':
            return { typeName: 'date' };
        case 'IsDateTime':
            return { typeName: 'datetime' };
        default:
            return { typeName: 'datetime' };
    }
}
function getEnumerateType(typeNode) {
    var enumName = typeNode.typeName.text;
    var enumTypes = metadataGenerator_1.MetadataGenerator.current.nodes
        .filter(function (node) { return node.kind === ts.SyntaxKind.EnumDeclaration; })
        .filter(function (node) { return node.name.text === enumName; });
    if (!enumTypes.length) {
        return;
    }
    if (enumTypes.length > 1) {
        throw new Error("Multiple matching enum found for enum " + enumName + "; please make enum names unique.");
    }
    var enumDeclaration = enumTypes[0];
    function getEnumValue(member) {
        var initializer = member.initializer;
        if (initializer) {
            if (initializer.expression) {
                return initializer.expression.text;
            }
            return initializer.text;
        }
        return;
    }
    return {
        enumMembers: enumDeclaration.members.map(function (member, index) {
            return getEnumValue(member) || index;
        }),
        typeName: 'enum',
    };
}
function getLiteralType(typeNode) {
    var literalName = typeNode.typeName.text;
    var literalTypes = metadataGenerator_1.MetadataGenerator.current.nodes
        .filter(function (node) { return node.kind === ts.SyntaxKind.TypeAliasDeclaration; })
        .filter(function (node) {
        var innerType = node.type;
        return innerType.kind === ts.SyntaxKind.UnionType && innerType.types;
    })
        .filter(function (node) { return node.name.text === literalName; });
    if (!literalTypes.length) {
        return;
    }
    if (literalTypes.length > 1) {
        throw new Error("Multiple matching enum found for enum " + literalName + "; please make enum names unique.");
    }
    var unionTypes = literalTypes[0].type.types;
    return {
        enumMembers: unionTypes.map(function (unionNode) { return unionNode.literal.text; }),
        typeName: 'enum',
    };
}
function getReferenceType(type, genericTypeMap, genericTypes) {
    var typeName = resolveFqTypeName(type);
    if (genericTypeMap && genericTypeMap.has(typeName)) {
        var refType = genericTypeMap.get(typeName);
        type = refType.typeName;
        typeName = resolveFqTypeName(type);
    }
    var typeNameWithGenerics = getTypeName(typeName, genericTypes);
    try {
        var existingType = localReferenceTypeCache[typeNameWithGenerics];
        if (existingType) {
            return existingType;
        }
        if (inProgressTypes[typeNameWithGenerics]) {
            return createCircularDependencyResolver(typeNameWithGenerics);
        }
        inProgressTypes[typeNameWithGenerics] = true;
        var modelTypeDeclaration = getModelTypeDeclaration(type);
        var properties = getModelTypeProperties(modelTypeDeclaration, genericTypes);
        var additionalProperties = getModelTypeAdditionalProperties(modelTypeDeclaration);
        var referenceType = {
            description: getModelDescription(modelTypeDeclaration),
            properties: properties,
            typeName: typeNameWithGenerics,
        };
        if (additionalProperties && additionalProperties.length) {
            referenceType.additionalProperties = additionalProperties;
        }
        var extendedProperties = getInheritedProperties(modelTypeDeclaration, genericTypes);
        referenceType.properties = referenceType.properties.concat(extendedProperties);
        localReferenceTypeCache[typeNameWithGenerics] = referenceType;
        return referenceType;
    }
    catch (err) {
        console.error("There was a problem resolving type of '" + getTypeName(typeName, genericTypes) + "'.");
        throw err;
    }
}
function resolveFqTypeName(type) {
    if (type.kind === ts.SyntaxKind.Identifier) {
        return type.text;
    }
    var qualifiedType = type;
    return resolveFqTypeName(qualifiedType.left) + '.' + qualifiedType.right.text;
}
function resolveSimpleTypeName(type) {
    if (type.kind === ts.SyntaxKind.Identifier) {
        return type.text;
    }
    var qualifiedType = type;
    return qualifiedType.right.text;
}
function getTypeName(typeName, genericTypes) {
    if (!genericTypes || !genericTypes.length) {
        return typeName;
    }
    return typeName + genericTypes.map(function (t) { return getAnyTypeName(t); }).join('');
}
function getAnyTypeName(typeNode) {
    var primitiveType = syntaxKindMap[typeNode.kind];
    if (primitiveType) {
        return primitiveType;
    }
    if (typeNode.kind === ts.SyntaxKind.ArrayType) {
        var arrayType = typeNode;
        return getAnyTypeName(arrayType.elementType) + '[]';
    }
    if ((typeNode.kind === ts.SyntaxKind.UnionType) || (typeNode.kind === ts.SyntaxKind.AnyKeyword)) {
        return 'object';
    }
    if (typeNode.kind !== ts.SyntaxKind.TypeReference) {
        throw new Error("Unknown type: " + ts.SyntaxKind[typeNode.kind]);
    }
    var typeReference = typeNode;
    try {
        return typeReference.typeName.text;
    }
    catch (e) {
        // idk what would hit this? probably needs more testing
        console.error(e);
        return typeNode.toString();
    }
}
function createCircularDependencyResolver(typeName) {
    var referenceType = {
        description: '',
        properties: new Array(),
        typeName: typeName,
    };
    metadataGenerator_1.MetadataGenerator.current.onFinish(function (referenceTypes) {
        var realReferenceType = referenceTypes[typeName];
        if (!realReferenceType) {
            return;
        }
        referenceType.description = realReferenceType.description;
        referenceType.properties = realReferenceType.properties;
        referenceType.typeName = realReferenceType.typeName;
    });
    return referenceType;
}
function nodeIsUsable(node) {
    switch (node.kind) {
        case ts.SyntaxKind.InterfaceDeclaration:
        case ts.SyntaxKind.ClassDeclaration:
        case ts.SyntaxKind.TypeAliasDeclaration:
            return true;
        default: return false;
    }
}
function resolveLeftmostIdentifier(type) {
    while (type.kind !== ts.SyntaxKind.Identifier) {
        type = type.left;
    }
    return type;
}
function resolveModelTypeScope(leftmost, statements) {
    // while (leftmost.parent && leftmost.parent.kind === ts.SyntaxKind.QualifiedName) {
    //     const leftmostName = leftmost.kind === ts.SyntaxKind.Identifier
    //         ? (leftmost as ts.Identifier).text
    //         : (leftmost as ts.QualifiedName).right.text;
    //     const moduleDeclarations = statements
    //         .filter(node => {
    //             if (node.kind === ts.SyntaxKind.ModuleDeclaration) {
    //                 const moduleDeclaration = node as ts.ModuleDeclaration;
    //                 return (moduleDeclaration.name as ts.Identifier).text.toLowerCase() === leftmostName.toLowerCase();
    //             }
    //             return false;
    //         }) as Array<ts.ModuleDeclaration>;
    //     if (!moduleDeclarations.length) { throw new Error(`No matching module declarations found for ${leftmostName}`); }
    //     if (moduleDeclarations.length > 1) { throw new Error(`Multiple matching module declarations found for ${leftmostName}; please make module declarations unique`); }
    //     const moduleBlock = moduleDeclarations[0].body as ts.ModuleBlock;
    //     if (moduleBlock === null || moduleBlock.kind !== ts.SyntaxKind.ModuleBlock) { throw new Error(`Module declaration found for ${leftmostName} has no body`); }
    //     statements = moduleBlock.statements;
    //     leftmost = leftmost.parent as ts.EntityName;
    // }
    return statements;
}
function getModelTypeDeclaration(type) {
    var leftmostIdentifier = resolveLeftmostIdentifier(type);
    var statements = resolveModelTypeScope(leftmostIdentifier, metadataGenerator_1.MetadataGenerator.current.nodes);
    var typeName = type.kind === ts.SyntaxKind.Identifier
        ? type.text
        : type.right.text;
    var modelTypes = statements
        .filter(function (node) {
        if (!nodeIsUsable(node)) {
            return false;
        }
        var modelTypeDeclaration = node;
        return modelTypeDeclaration.name.text === typeName;
    });
    if (!modelTypes.length) {
        throw new Error("No matching model found for referenced type " + typeName);
    }
    // if (modelTypes.length > 1) {
    //     const conflicts = modelTypes.map(modelType => modelType.getSourceFile().fileName).join('"; "');
    //     throw new Error(`Multiple matching models found for referenced type ${typeName}; please make model names unique. Conflicts found: "${conflicts}"`);
    // }
    return modelTypes[0];
}
function getModelTypeProperties(node, genericTypes) {
    if (node.kind === ts.SyntaxKind.InterfaceDeclaration) {
        var interfaceDeclaration = node;
        return interfaceDeclaration.members
            .filter(function (member) { return member.kind === ts.SyntaxKind.PropertySignature; })
            .map(function (member) {
            var propertyDeclaration = member;
            var identifier = propertyDeclaration.name;
            if (!propertyDeclaration.type) {
                throw new Error('No valid type found for property declaration.');
            }
            // Declare a variable that can be overridden if needed
            var aType = propertyDeclaration.type;
            // aType.kind will always be a TypeReference when the property of Interface<T> is of type T
            if (aType.kind === ts.SyntaxKind.TypeReference && genericTypes && genericTypes.length && node.typeParameters) {
                // The type definitions are conviently located on the object which allow us to map -> to the genericTypes
                var typeParams = _.map(node.typeParameters, function (typeParam) {
                    return typeParam.name.text;
                });
                // I am not sure in what cases
                var typeIdentifier = aType.typeName;
                var typeIdentifierName = void 0;
                // typeIdentifier can either be a Identifier or a QualifiedName
                if (typeIdentifier.text) {
                    typeIdentifierName = typeIdentifier.text;
                }
                else {
                    typeIdentifierName = typeIdentifier.right.text;
                }
                // I could not produce a situation where this did not find it so its possible this check is irrelevant
                var indexOfType = _.indexOf(typeParams, typeIdentifierName);
                if (indexOfType >= 0) {
                    aType = genericTypes[indexOfType];
                }
            }
            return {
                description: getNodeDescription(propertyDeclaration),
                name: identifier.text,
                required: !propertyDeclaration.questionToken,
                type: resolveType(aType)
            };
        });
    }
    if (node.kind === ts.SyntaxKind.TypeAliasDeclaration) {
        /**
         * TOOD
         *
         * Flesh this out so that we can properly support Type Alii instead of just assuming
         * string literal enums
        */
        return [];
    }
    var classDeclaration = node;
    var properties = classDeclaration.members.filter(function (member) {
        if (member.kind !== ts.SyntaxKind.PropertyDeclaration) {
            return false;
        }
        var propertySignature = member;
        return propertySignature && hasPublicMemberModifier(propertySignature);
    });
    var classConstructor = classDeclaration.members.find(function (member) { return member.kind === ts.SyntaxKind.Constructor; });
    if (classConstructor && classConstructor.parameters) {
        properties = properties.concat(classConstructor.parameters.filter(function (parameter) { return hasPublicConstructorModifier(parameter); }));
    }
    return properties
        .map(function (declaration) {
        var identifier = declaration.name;
        if (!declaration.type) {
            throw new Error('No valid type found for property declaration.');
        }
        return {
            description: getNodeDescription(declaration),
            name: identifier.text,
            required: !declaration.questionToken,
            type: resolveType(resolveTypeParameter(declaration.type, classDeclaration, genericTypes))
        };
    });
}
function resolveTypeParameter(type, classDeclaration, genericTypes) {
    if (genericTypes && classDeclaration.typeParameters && classDeclaration.typeParameters.length) {
        for (var i = 0; i < classDeclaration.typeParameters.length; i++) {
            if (type.typeName && classDeclaration.typeParameters[i].name.text === type.typeName.text) {
                return genericTypes[i];
            }
        }
    }
    return type;
}
function getModelTypeAdditionalProperties(node) {
    if (node.kind === ts.SyntaxKind.InterfaceDeclaration) {
        var interfaceDeclaration = node;
        return interfaceDeclaration.members
            .filter(function (member) { return member.kind === ts.SyntaxKind.IndexSignature; })
            .map(function (member) {
            var indexSignatureDeclaration = member;
            var indexType = resolveType(indexSignatureDeclaration.parameters[0].type);
            if (indexType.typeName !== 'string') {
                throw new Error("Only string indexers are supported. Found " + indexType.typeName + ".");
            }
            return {
                description: '',
                name: '',
                required: true,
                type: resolveType(indexSignatureDeclaration.type)
            };
        });
    }
    return undefined;
}
function hasPublicMemberModifier(node) {
    return !node.modifiers || node.modifiers.every(function (modifier) {
        return modifier.kind !== ts.SyntaxKind.ProtectedKeyword && modifier.kind !== ts.SyntaxKind.PrivateKeyword;
    });
}
function hasPublicConstructorModifier(node) {
    return node.modifiers && node.modifiers.some(function (modifier) {
        return modifier.kind === ts.SyntaxKind.PublicKeyword;
    });
}
function getInheritedProperties(modelTypeDeclaration, genericTypes) {
    var properties = new Array();
    if (modelTypeDeclaration.kind === ts.SyntaxKind.TypeAliasDeclaration) {
        return [];
    }
    var heritageClauses = modelTypeDeclaration.heritageClauses;
    if (!heritageClauses) {
        return properties;
    }
    heritageClauses.forEach(function (clause) {
        if (!clause.types) {
            return;
        }
        clause.types.forEach(function (t) {
            var type = metadataGenerator_1.MetadataGenerator.current.getClassDeclaration(t.expression.getText());
            if (!type) {
                type = metadataGenerator_1.MetadataGenerator.current.getInterfaceDeclaration(t.expression.getText());
            }
            var baseEntityName = t.expression;
            var parentGenerictypes = resolveTypeArguments(modelTypeDeclaration, genericTypes);
            var genericTypeMap = resolveTypeArguments(type, t.typeArguments, parentGenerictypes);
            var subClassGenericTypes = getSubClassGenericTypes(genericTypeMap, t.typeArguments);
            getReferenceType(baseEntityName, genericTypeMap, subClassGenericTypes).properties
                .forEach(function (property) { return properties.push(property); });
        });
    });
    return properties;
}
function getModelDescription(modelTypeDeclaration) {
    return getNodeDescription(modelTypeDeclaration);
}
function getNodeDescription(node) {
    var symbol = metadataGenerator_1.MetadataGenerator.current.typeChecker.getSymbolAtLocation(node.name);
    /**
    * TODO: Workaround for what seems like a bug in the compiler
    * Warrants more investigation and possibly a PR against typescript
    */
    //
    if (node.kind === ts.SyntaxKind.Parameter) {
        // TypeScript won't parse jsdoc if the flag is 4, i.e. 'Property'
        symbol.flags = 0;
    }
    var comments = symbol.getDocumentationComment();
    if (comments.length) {
        return ts.displayPartsToString(comments);
    }
    return '';
}
function getSubClassGenericTypes(genericTypeMap, typeArguments) {
    if (genericTypeMap && typeArguments) {
        var result_1 = [];
        typeArguments.forEach(function (t) {
            var typeName = getAnyTypeName(t);
            if (genericTypeMap.has(typeName)) {
                result_1.push(genericTypeMap.get(typeName));
            }
            else {
                result_1.push(t);
            }
        });
        return result_1;
    }
    return null;
}
function getSuperClass(node, typeArguments) {
    var clauses = node.heritageClauses;
    if (clauses) {
        var filteredClauses = clauses.filter(function (clause) { return clause.token === ts.SyntaxKind.ExtendsKeyword; });
        if (filteredClauses.length > 0) {
            var clause = filteredClauses[0];
            if (clause.types && clause.types.length) {
                var type = metadataGenerator_1.MetadataGenerator.current.getClassDeclaration(clause.types[0].expression.getText());
                return {
                    type: type,
                    typeArguments: resolveTypeArguments(type, clause.types[0].typeArguments, typeArguments)
                };
            }
        }
    }
    return undefined;
}
exports.getSuperClass = getSuperClass;
function buildGenericTypeMap(node, typeArguments) {
    var result = new Map();
    if (node.typeParameters && typeArguments) {
        node.typeParameters.forEach(function (typeParam, index) {
            var paramName = typeParam.name.text;
            result.set(paramName, typeArguments[index]);
        });
    }
    return result;
}
function resolveTypeArguments(node, typeArguments, parentTypeArguments) {
    var result = buildGenericTypeMap(node, typeArguments);
    if (parentTypeArguments) {
        result.forEach(function (value, key) {
            var typeName = getAnyTypeName(value);
            if (parentTypeArguments.has(typeName)) {
                result.set(key, parentTypeArguments.get(typeName));
            }
        });
    }
    return result;
}
//# sourceMappingURL=resolveType.js.map