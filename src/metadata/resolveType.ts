import * as _ from 'lodash';
import * as ts from 'typescript';
import { getDecoratorName } from '../utils/decoratorUtils';
import { getFirstMatchingJSDocTagName } from '../utils/jsDocUtils';
import { keywords } from './keywordKinds';
import { ArrayType, EnumerateType, MetadataGenerator, ObjectType, Property, ReferenceType, Type } from './metadataGenerator';

const syntaxKindMap: { [kind: number]: string } = {};
syntaxKindMap[ts.SyntaxKind.NumberKeyword] = 'number';
syntaxKindMap[ts.SyntaxKind.StringKeyword] = 'string';
syntaxKindMap[ts.SyntaxKind.BooleanKeyword] = 'boolean';
syntaxKindMap[ts.SyntaxKind.VoidKeyword] = 'void';

const localReferenceTypeCache: { [typeName: string]: ReferenceType } = {};
const inProgressTypes: { [typeName: string]: boolean } = {};

type UsableDeclaration = ts.InterfaceDeclaration | ts.ClassDeclaration | ts.TypeAliasDeclaration;
export function resolveType(typeNode?: ts.TypeNode, genericTypeMap?: Map<String, ts.TypeNode>): Type {
    if (!typeNode) {
        return { typeName: 'void' };
    }
    const primitiveType = getPrimitiveType(typeNode);
    if (primitiveType) {
        return primitiveType;
    }

    if (typeNode.kind === ts.SyntaxKind.ArrayType) {
        const arrayType = typeNode as ts.ArrayTypeNode;
        return {
            elementType: resolveType(arrayType.elementType, genericTypeMap),
            typeName: 'array'
        } as ArrayType;
    }

    if ((typeNode.kind === ts.SyntaxKind.AnyKeyword) || (typeNode.kind === ts.SyntaxKind.ObjectKeyword)) {
        return { typeName: 'object' };
    }

    if (typeNode.kind === ts.SyntaxKind.TypeLiteral) {
        return getInlineObjectType(typeNode);
    }

    if (typeNode.kind === ts.SyntaxKind.UnionType) {
        return getUnionType(typeNode);
    }

    if (typeNode.kind !== ts.SyntaxKind.TypeReference) {
        throw new Error(`Unknown type: ${ts.SyntaxKind[typeNode.kind]}`);
    }
    let typeReference: any = typeNode;
    let typeName = resolveSimpleTypeName(typeReference.typeName as ts.EntityName);

    if (typeName === 'Date') { return getDateType(typeNode); }
    if (typeName === 'Buffer') { return { typeName: 'buffer' }; }
    if (typeName === 'DownloadBinaryData') { return { typeName: 'buffer' }; }
    if (typeName === 'DownloadResource') { return { typeName: 'buffer' }; }

    if (typeName === 'Promise') {
        typeReference = typeReference.typeArguments[0];
        return resolveType(typeReference, genericTypeMap);
    }
    if (typeName === 'Array') {
        typeReference = typeReference.typeArguments[0];
        return {
            elementType: resolveType(typeReference, genericTypeMap),
            typeName: 'array'
        } as ArrayType;
    }

    const enumType = getEnumerateType(typeNode);
    if (enumType) {
        return enumType;
    }

    const literalType = getLiteralType(typeNode);
    if (literalType) {
        return literalType;
    }

    let referenceType: ReferenceType;

    if (typeReference.typeArguments && typeReference.typeArguments.length === 1) {
        const typeT: Array<ts.TypeNode> = typeReference.typeArguments as Array<ts.TypeNode>;
        referenceType = getReferenceType(typeReference.typeName as ts.EntityName, genericTypeMap, typeT);
        typeName = resolveSimpleTypeName(typeReference.typeName as ts.EntityName);
        if (['NewResource', 'RequestAccepted', 'MovedPermanently', 'MovedTemporarily'].indexOf(typeName) >= 0) {
            referenceType.typeName = typeName;
            referenceType.typeArgument = resolveType(typeT[0], genericTypeMap);
        } else {
            MetadataGenerator.current.addReferenceType(referenceType);
        }
    } else {
        referenceType = getReferenceType(typeReference.typeName as ts.EntityName, genericTypeMap);
        MetadataGenerator.current.addReferenceType(referenceType);
    }

    return referenceType;
}

function getPrimitiveType(typeNode: ts.TypeNode): Type | undefined {
    const primitiveType = syntaxKindMap[typeNode.kind];
    if (!primitiveType) { return undefined; }

    if (primitiveType === 'number') {
        const parentNode = typeNode.parent as ts.Node;
        if (!parentNode) {
            return { typeName: 'double' };
        }

        const validDecorators = ['IsInt', 'IsLong', 'IsFloat', 'IsDouble'];

        // Can't use decorators on interface/type properties, so support getting the type from jsdoc too.
        const jsdocTagName = getFirstMatchingJSDocTagName(parentNode, tag => {
            return validDecorators.some(t => t === tag.tagName.text);
        });

        const decoratorName = getDecoratorName(parentNode, identifier => {
            return validDecorators.some(m => m === identifier.text);
        });

        switch (decoratorName || jsdocTagName) {
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

function getDateType(typeNode: ts.TypeNode): Type {
    const parentNode = typeNode.parent as ts.Node;
    if (!parentNode) {
        return { typeName: 'datetime' };
    }
    const decoratorName = getDecoratorName(parentNode, identifier => {
        return ['IsDate', 'IsDateTime'].some(m => m === identifier.text);
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

function getEnumerateType(typeNode: ts.TypeNode): EnumerateType | undefined {
    const enumName = (typeNode as any).typeName.text;
    const enumTypes = MetadataGenerator.current.nodes
        .filter(node => node.kind === ts.SyntaxKind.EnumDeclaration)
        .filter(node => (node as any).name.text === enumName);

    if (!enumTypes.length) { return undefined; }
    if (enumTypes.length > 1) { throw new Error(`Multiple matching enum found for enum ${enumName}; please make enum names unique.`); }

    const enumDeclaration = enumTypes[0] as ts.EnumDeclaration;

    function getEnumValue(member: any) {
        const initializer = member.initializer;
        if (initializer) {
            if (initializer.expression) {
                return parseEnumValueByKind(initializer.expression.text, initializer.kind);
            }
            return parseEnumValueByKind(initializer.text, initializer.kind);
        }
        return;
    }
    return {
        enumMembers: enumDeclaration.members.map((member: any, index) => {
            return getEnumValue(member) || index;
        }),
        typeName: 'enum',
    } as EnumerateType;
}

function parseEnumValueByKind(value: string, kind: ts.SyntaxKind): any {
    return kind === ts.SyntaxKind.NumericLiteral ? parseFloat(value) : value;
}

function getUnionType(typeNode: ts.TypeNode) {
    const union = typeNode as ts.UnionTypeNode;
    let baseType: any = null;
    let isObject = false;
    union.types.forEach(type => {
        if (baseType === null) {
            baseType = type;
        }
        if (baseType.kind !== type.kind) {
            isObject = true;
        }
    });
    if (isObject) {
        return { typeName: 'object' };
    }
    return {
        enumMembers: union.types.map((type, index) => {
            return type.getText() ? removeQuotes(type.getText()) : index;
        }),
        typeName: 'enum',
    } as EnumerateType;
}

function removeQuotes(str: string) {
    return str.replace(/^["']|["']$/g, '');
}
function getLiteralType(typeNode: ts.TypeNode): EnumerateType | undefined {
    const literalName = (typeNode as any).typeName.text;
    const literalTypes = MetadataGenerator.current.nodes
        .filter(node => node.kind === ts.SyntaxKind.TypeAliasDeclaration)
        .filter(node => {
            const innerType = (node as any).type;
            return innerType.kind === ts.SyntaxKind.UnionType && (innerType as any).types;
        })
        .filter(node => (node as any).name.text === literalName);

    if (!literalTypes.length) { return undefined; }
    if (literalTypes.length > 1) { throw new Error(`Multiple matching enum found for enum ${literalName}; please make enum names unique.`); }

    const unionTypes = (literalTypes[0] as any).type.types;
    return {
        enumMembers: unionTypes.map((unionNode: any) => unionNode.literal.text as string),
        typeName: 'enum',
    } as EnumerateType;
}

function getInlineObjectType(typeNode: ts.TypeNode): ObjectType {
    const type: ObjectType = {
        properties: getModelTypeProperties(typeNode),
        typeName: ''
    };
    return type;
}

function getReferenceType(type: ts.EntityName, genericTypeMap?: Map<String, ts.TypeNode>, genericTypes?: Array<ts.TypeNode>): ReferenceType {
    let typeName = resolveFqTypeName(type);
    if (genericTypeMap && genericTypeMap.has(typeName)) {
        const refType: any = genericTypeMap.get(typeName);
        type = refType.typeName as ts.EntityName;
        typeName = resolveFqTypeName(type);
    }
    const typeNameWithGenerics = getTypeName(typeName, genericTypes);

    try {
        const existingType = localReferenceTypeCache[typeNameWithGenerics];
        if (existingType) { return existingType; }

        if (inProgressTypes[typeNameWithGenerics]) {
            return createCircularDependencyResolver(typeNameWithGenerics);
        }

        inProgressTypes[typeNameWithGenerics] = true;

        const modelTypeDeclaration = getModelTypeDeclaration(type);

        const properties = getModelTypeProperties(modelTypeDeclaration, genericTypes);
        const additionalProperties = getModelTypeAdditionalProperties(modelTypeDeclaration);

        const referenceType: ReferenceType = {
            description: getModelDescription(modelTypeDeclaration),
            properties: properties,
            typeName: typeNameWithGenerics,
        };
        if (additionalProperties && additionalProperties.length) {
            referenceType.additionalProperties = additionalProperties;
        }

        const extendedProperties = getInheritedProperties(modelTypeDeclaration, genericTypes);
        mergeReferenceTypeProperties(referenceType.properties, extendedProperties);

        localReferenceTypeCache[typeNameWithGenerics] = referenceType;

        return referenceType;
    } catch (err) {
        console.error(`There was a problem resolving type of '${getTypeName(typeName, genericTypes)}'.`);
        throw err;
    }
}

function mergeReferenceTypeProperties(properties: Array<Property>, extendedProperties: Array<Property>) {
    extendedProperties.forEach(prop => {
        const existingProp = properties.find(p => p.name === prop.name);
        if (existingProp) {
            existingProp.description = existingProp.description || prop.description;
        } else {
            properties.push(prop);
        }
    });
}

function resolveFqTypeName(type: ts.EntityName): string {
    if (type.kind === ts.SyntaxKind.Identifier) {
        return (type as ts.Identifier).text;
    }

    const qualifiedType = type as ts.QualifiedName;
    return resolveFqTypeName(qualifiedType.left) + '.' + (qualifiedType.right as ts.Identifier).text;
}

function resolveSimpleTypeName(type: ts.EntityName): string {
    if (type.kind === ts.SyntaxKind.Identifier) {
        return (type as ts.Identifier).text;
    }

    const qualifiedType = type as ts.QualifiedName;
    return (qualifiedType.right as ts.Identifier).text;
}

function getTypeName(typeName: string, genericTypes?: Array<ts.TypeNode>): string {
    if (!genericTypes || !genericTypes.length) { return typeName; }
    return typeName + genericTypes.map(t => getAnyTypeName(t)).join('');
}

function getAnyTypeName(typeNode: ts.TypeNode): string {
    const primitiveType = syntaxKindMap[typeNode.kind];
    if (primitiveType) {
        return primitiveType;
    }

    if (typeNode.kind === ts.SyntaxKind.ArrayType) {
        const arrayType = typeNode as ts.ArrayTypeNode;
        return getAnyTypeName(arrayType.elementType) + 'Array';
    }

    if (typeNode.kind === ts.SyntaxKind.UnionType ||
        typeNode.kind === ts.SyntaxKind.AnyKeyword) {
        return 'object';
    }

    if (typeNode.kind !== ts.SyntaxKind.TypeReference) {
        throw new Error(`Unknown type: ${ts.SyntaxKind[typeNode.kind]}`);
    }

    const typeReference = typeNode as ts.TypeReferenceNode;
    try {
        const typeName = (typeReference.typeName as ts.Identifier).text;
        if (typeName === 'Array') {
            return getAnyTypeName(typeReference.typeArguments[0]) + 'Array';
        }
        return typeName;
    } catch (e) {
        // idk what would hit this? probably needs more testing
        console.error(e);
        return typeNode.toString();
    }
}

function createCircularDependencyResolver(typeName: string) {
    const referenceType = {
        description: '',
        properties: new Array<Property>(),
        typeName: typeName,
    };

    MetadataGenerator.current.onFinish(referenceTypes => {
        const realReferenceType = referenceTypes[typeName];
        if (!realReferenceType) { return; }
        referenceType.description = realReferenceType.description;
        referenceType.properties = realReferenceType.properties;
        referenceType.typeName = realReferenceType.typeName;
    });

    return referenceType;
}

function nodeIsUsable(node: ts.Node) {
    switch (node.kind) {
        case ts.SyntaxKind.InterfaceDeclaration:
        case ts.SyntaxKind.ClassDeclaration:
        case ts.SyntaxKind.TypeAliasDeclaration:
            return true;
        default: return false;
    }
}

function resolveLeftmostIdentifier(type: ts.EntityName): ts.Identifier {
    while (type.kind !== ts.SyntaxKind.Identifier) {
        type = (type as ts.QualifiedName).left;
    }
    return type as ts.Identifier;
}

function resolveModelTypeScope(leftmost: ts.EntityName, statements: Array<any>): Array<any> {
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

function getModelTypeDeclaration(type: ts.EntityName) {
    const leftmostIdentifier = resolveLeftmostIdentifier(type);
    const statements: Array<any> = resolveModelTypeScope(leftmostIdentifier, MetadataGenerator.current.nodes);

    const typeName = type.kind === ts.SyntaxKind.Identifier
        ? (type as ts.Identifier).text
        : (type as ts.QualifiedName).right.text;
    const modelTypes = statements
        .filter(node => {
            if (!nodeIsUsable(node)) {
                return false;
            }

            const modelTypeDeclaration = node as UsableDeclaration;
            return (modelTypeDeclaration.name as ts.Identifier).text === typeName;
        }) as Array<UsableDeclaration>;

    if (!modelTypes.length) { throw new Error(`No matching model found for referenced type ${typeName}`); }
    // if (modelTypes.length > 1) {
    //     const conflicts = modelTypes.map(modelType => modelType.getSourceFile().fileName).join('"; "');
    //     throw new Error(`Multiple matching models found for referenced type ${typeName}; please make model names unique. Conflicts found: "${conflicts}"`);
    // }

    return modelTypes[0];
}

function getModelTypeProperties(node: any, genericTypes?: Array<ts.TypeNode>): Array<Property> {
    if (node.kind === ts.SyntaxKind.TypeLiteral || node.kind === ts.SyntaxKind.InterfaceDeclaration) {
        const interfaceDeclaration = node as ts.InterfaceDeclaration;
        return interfaceDeclaration.members
            .filter(member => {
                if ((member as any).type && (member as any).type.kind === ts.SyntaxKind.FunctionType) {
                    return false;
                }
                return member.kind === ts.SyntaxKind.PropertySignature;
            })
            .map((member: any) => {

                const propertyDeclaration = member as ts.PropertyDeclaration;
                const identifier = propertyDeclaration.name as ts.Identifier;

                if (!propertyDeclaration.type) { throw new Error('No valid type found for property declaration.'); }

                // Declare a variable that can be overridden if needed
                let aType = propertyDeclaration.type;

                // aType.kind will always be a TypeReference when the property of Interface<T> is of type T
                if (aType.kind === ts.SyntaxKind.TypeReference && genericTypes && genericTypes.length && node.typeParameters) {

                    // The type definitions are conviently located on the object which allow us to map -> to the genericTypes
                    const typeParams = _.map(node.typeParameters, (typeParam: ts.TypeParameterDeclaration) => {
                        return typeParam.name.text;
                    });

                    // I am not sure in what cases
                    const typeIdentifier = (aType as ts.TypeReferenceNode).typeName;
                    let typeIdentifierName: string;

                    // typeIdentifier can either be a Identifier or a QualifiedName
                    if ((typeIdentifier as ts.Identifier).text) {
                        typeIdentifierName = (typeIdentifier as ts.Identifier).text;
                    } else {
                        typeIdentifierName = (typeIdentifier as ts.QualifiedName).right.text;
                    }

                    // I could not produce a situation where this did not find it so its possible this check is irrelevant
                    const indexOfType = _.indexOf<string>(typeParams, typeIdentifierName);
                    if (indexOfType >= 0) {
                        aType = genericTypes[indexOfType] as ts.TypeNode;
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
        const typeAlias = node as ts.TypeAliasDeclaration;

        return !keywords.includes(typeAlias.type.kind)
            ? getModelTypeProperties(typeAlias.type, genericTypes)
            : [];
    }

    const classDeclaration = node as ts.ClassDeclaration;

    let properties = classDeclaration.members.filter((member: any) => {
        if (member.kind !== ts.SyntaxKind.PropertyDeclaration) { return false; }

        const propertySignature = member as ts.PropertySignature;
        return propertySignature && hasPublicMemberModifier(propertySignature);
    }) as Array<ts.PropertyDeclaration | ts.ParameterDeclaration>;

    const classConstructor = classDeclaration.members.find((member: any) => member.kind === ts.SyntaxKind.Constructor) as ts.ConstructorDeclaration;
    if (classConstructor && classConstructor.parameters) {
        properties = properties.concat(classConstructor.parameters.filter(parameter => hasPublicConstructorModifier(parameter)) as any);
    }

    return properties
        .map(declaration => {
            const identifier = declaration.name as ts.Identifier;

            if (!declaration.type) { throw new Error('No valid type found for property declaration.'); }

            return {
                description: getNodeDescription(declaration),
                name: identifier.text,
                required: !declaration.questionToken,
                type: resolveType(resolveTypeParameter(declaration.type, classDeclaration, genericTypes))
            };
        });
}

function resolveTypeParameter(type: any, classDeclaration: ts.ClassDeclaration, genericTypes?: Array<ts.TypeNode>) {
    if (genericTypes && classDeclaration.typeParameters && classDeclaration.typeParameters.length) {
        for (let i = 0; i < classDeclaration.typeParameters.length; i++) {
            if (type.typeName && classDeclaration.typeParameters[i].name.text === type.typeName.text) {
                return genericTypes[i];
            }
        }
    }
    return type;
}

function getModelTypeAdditionalProperties(node: UsableDeclaration) {
    if (node.kind === ts.SyntaxKind.InterfaceDeclaration) {
        const interfaceDeclaration = node as ts.InterfaceDeclaration;
        return interfaceDeclaration.members
            .filter(member => member.kind === ts.SyntaxKind.IndexSignature)
            .map((member: any) => {
                const indexSignatureDeclaration = member as ts.IndexSignatureDeclaration;

                const indexType = resolveType(indexSignatureDeclaration.parameters[0].type as ts.TypeNode);
                if (indexType.typeName !== 'string') {
                    throw new Error(`Only string indexers are supported. Found ${indexType.typeName}.`);
                }

                return {
                    description: '',
                    name: '',
                    required: true,
                    type: resolveType(indexSignatureDeclaration.type as ts.TypeNode)
                };
            });
    }

    return undefined;
}

function hasPublicMemberModifier(node: ts.Node) {
    return !node.modifiers || node.modifiers.every(modifier => {
        return modifier.kind !== ts.SyntaxKind.ProtectedKeyword && modifier.kind !== ts.SyntaxKind.PrivateKeyword;
    });
}

function hasPublicConstructorModifier(node: ts.Node) {
    return node.modifiers && node.modifiers.some(modifier => {
        return modifier.kind === ts.SyntaxKind.PublicKeyword;
    });
}

function getInheritedProperties(modelTypeDeclaration: UsableDeclaration, genericTypes?: Array<ts.TypeNode>): Array<Property> {
    const properties = new Array<Property>();
    if (modelTypeDeclaration.kind === ts.SyntaxKind.TypeAliasDeclaration) {
        return [];
    }
    const heritageClauses = modelTypeDeclaration.heritageClauses;
    if (!heritageClauses) { return properties; }

    heritageClauses.forEach(clause => {
        if (!clause.types) { return; }

        clause.types.forEach((t: any) => {
            let type: any = MetadataGenerator.current.getClassDeclaration(t.expression.getText());
            if (!type) {
                type = MetadataGenerator.current.getInterfaceDeclaration(t.expression.getText());
            }
            if (!type) {
                throw new Error(`No type found for ${t.expression.getText()}`);
            }
            const baseEntityName = t.expression as ts.EntityName;
            const parentGenerictypes = resolveTypeArguments(modelTypeDeclaration as ts.ClassDeclaration, genericTypes);
            const genericTypeMap = resolveTypeArguments(type, t.typeArguments, parentGenerictypes);
            const subClassGenericTypes: any = getSubClassGenericTypes(genericTypeMap, t.typeArguments);
            getReferenceType(baseEntityName, genericTypeMap, subClassGenericTypes).properties
                .forEach(property => properties.push(property));
        });
    });

    return properties;
}

function getModelDescription(modelTypeDeclaration: UsableDeclaration) {
    return getNodeDescription(modelTypeDeclaration);
}

function getNodeDescription(node: UsableDeclaration | ts.PropertyDeclaration | ts.ParameterDeclaration) {
    const symbol = MetadataGenerator.current.typeChecker.getSymbolAtLocation(node.name as ts.Node);

    if (symbol) {
        /**
         * TODO: Workaround for what seems like a bug in the compiler
         * Warrants more investigation and possibly a PR against typescript
         */
        if (node.kind === ts.SyntaxKind.Parameter) {
            // TypeScript won't parse jsdoc if the flag is 4, i.e. 'Property'
            symbol.flags = 0;
        }

        const comments = symbol.getDocumentationComment(MetadataGenerator.current.typeChecker);
        if (comments.length) { return ts.displayPartsToString(comments); }
    }

    return '';
}

function getSubClassGenericTypes(genericTypeMap?: Map<String, ts.TypeNode>, typeArguments?: Array<ts.TypeNode>) {
    if (genericTypeMap && typeArguments) {
        const result: Array<ts.TypeNode> = [];
        typeArguments.forEach((t: any) => {
            const typeName = getAnyTypeName(t);
            if (genericTypeMap.has(typeName)) {
                result.push(genericTypeMap.get(typeName) as ts.TypeNode);
            } else {
                result.push(t);
            }
        });
        return result;
    }
    return null;
}

export function getSuperClass(node: ts.ClassDeclaration, typeArguments?: Map<String, ts.TypeNode>) {
    const clauses = node.heritageClauses;
    if (clauses) {
        const filteredClauses = clauses.filter(clause => clause.token === ts.SyntaxKind.ExtendsKeyword);
        if (filteredClauses.length > 0) {
            const clause: ts.HeritageClause = filteredClauses[0];
            if (clause.types && clause.types.length) {
                const type: any = MetadataGenerator.current.getClassDeclaration(clause.types[0].expression.getText());
                return {
                    type: type,
                    typeArguments: resolveTypeArguments(type, clause.types[0].typeArguments, typeArguments)
                };
            }
        }
    }
    return undefined;
}

function buildGenericTypeMap(node: ts.ClassDeclaration, typeArguments?: ReadonlyArray<ts.TypeNode>) {
    const result: Map<String, ts.TypeNode> = new Map<String, ts.TypeNode>();
    if (node.typeParameters && typeArguments) {
        node.typeParameters.forEach((typeParam, index) => {
            const paramName = typeParam.name.text;
            result.set(paramName, typeArguments[index]);
        });
    }
    return result;
}

function resolveTypeArguments(node: ts.ClassDeclaration, typeArguments?: ReadonlyArray<ts.TypeNode>, parentTypeArguments?: Map<String, ts.TypeNode>) {
    const result = buildGenericTypeMap(node, typeArguments);
    if (parentTypeArguments) {
        result.forEach((value: any, key) => {
            const typeName = getAnyTypeName(value);
            if (parentTypeArguments.has(typeName)) {
                result.set(key, parentTypeArguments.get(typeName) as ts.TypeNode);
            }
        });
    }
    return result;
}

/**
 * Used to identify union types of a primitive and array of the same primitive, e.g. `string | string[]`
 */
export function getCommonPrimitiveAndArrayUnionType(typeNode?: ts.TypeNode): Type | null {
    if (typeNode && typeNode.kind === ts.SyntaxKind.UnionType) {
        const union = typeNode as ts.UnionTypeNode;
        const types = union.types.map(t => resolveType(t));
        const arrType = types.find(t => t.typeName === 'array') as ArrayType | undefined;
        const primitiveType = types.find(t => t.typeName !== 'array');

        if (types.length === 2 && arrType && arrType.elementType && primitiveType && arrType.elementType.typeName === primitiveType.typeName) {
            return arrType;
        }
    }

    return null;
}

export function getLiteralValue(expression: ts.Expression): any {
    if (expression.kind === ts.SyntaxKind.StringLiteral) {
        return (expression as ts.StringLiteral).text;
    }
    if (expression.kind === ts.SyntaxKind.NumericLiteral) {
        return parseFloat((expression as ts.NumericLiteral).text);
    }
    if (expression.kind === ts.SyntaxKind.TrueKeyword) {
        return true;
    }
    if (expression.kind === ts.SyntaxKind.FalseKeyword) {
        return false;
    }
    if (expression.kind === ts.SyntaxKind.ArrayLiteralExpression) {
        return (expression as ts.ArrayLiteralExpression).elements.map(e => getLiteralValue(e));
    }
    return;
}
