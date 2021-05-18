import * as ts from 'typescript';
export declare class MetadataGenerator {
    private readonly ignorePaths?;
    static current: MetadataGenerator;
    readonly nodes: ts.Node[];
    readonly typeChecker: ts.TypeChecker;
    private readonly program;
    private referenceTypes;
    private circularDependencyResolvers;
    private debugger;
    constructor(entryFile: string | Array<string>, compilerOptions: ts.CompilerOptions, ignorePaths?: Array<string>);
    generate(): Metadata;
    TypeChecker(): ts.TypeChecker;
    addReferenceType(referenceType: ReferenceType): void;
    getReferenceType(typeName: string): ReferenceType;
    onFinish(callback: (referenceTypes: {
        [typeName: string]: ReferenceType;
    }) => void): void;
    getClassDeclaration(className: string): ts.Node;
    getInterfaceDeclaration(className: string): ts.Node;
    private getSourceFiles;
    private buildControllers;
}
export interface Metadata {
    controllers: Array<Controller>;
    referenceTypes: {
        [typeName: string]: ReferenceType;
    };
}
export interface Controller {
    location: string;
    methods: Array<Method>;
    name: string;
    path: string;
    consumes: Array<string>;
    produces: Array<string>;
    responses: Array<ResponseType>;
    tags: Array<string>;
    security?: Array<Security>;
}
export interface Method {
    deprecated?: boolean;
    description: string;
    method: string;
    name: string;
    parameters: Array<Parameter>;
    path: string;
    type: Type;
    tags: Array<string>;
    responses: Array<ResponseType>;
    security?: Array<Security>;
    summary?: string;
    consumes: Array<string>;
    produces: Array<string>;
}
export interface Parameter {
    parameterName: string;
    description: string;
    in: string;
    name: string;
    required: boolean;
    type: Type;
    collectionFormat?: boolean;
    allowEmptyValue?: boolean;
    default?: any;
    maxItems?: number;
    minItems?: number;
}
export interface Security {
    name: string;
    scopes?: Array<string>;
}
export interface Type {
    typeName: string;
    typeArgument?: Type;
}
export interface EnumerateType extends Type {
    enumMembers: Array<string>;
}
export interface ReferenceType extends Type {
    description: string;
    properties: Array<Property>;
    additionalProperties?: Array<Property>;
}
export interface ObjectType extends Type {
    properties: Array<Property>;
}
export interface ArrayType extends Type {
    elementType: Type;
}
export interface ResponseType {
    description: string;
    status: string;
    schema?: Type;
    examples?: any;
}
export interface Property {
    description: string;
    name: string;
    type: Type;
    required: boolean;
}
export interface ResponseData {
    status: string;
    type: Type;
}
