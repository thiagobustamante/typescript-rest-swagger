import * as pathUtil from 'path';
import * as ts from 'typescript';
import { getExamplesValue } from '../utils/valueUtils';
import { ControllerGenerator } from './controllerGenerator';

export class MetadataGenerator {
    public static current: MetadataGenerator;
    public readonly nodes = new Array<ts.Node>();
    public readonly typeChecker: ts.TypeChecker;
    private readonly program: ts.Program;
    private referenceTypes: { [typeName: string]: ReferenceType } = {};
    private circularDependencyResolvers = new Array<(referenceTypes: { [typeName: string]: ReferenceType }) => void>();

    constructor(entryFile: string, compilerOptions: ts.CompilerOptions) {
        this.program = ts.createProgram([entryFile], compilerOptions);
        this.typeChecker = this.program.getTypeChecker();
        MetadataGenerator.current = this;
    }

    public generate(): Metadata {
        this.program.getSourceFiles().forEach(sf => {
            ts.forEachChild(sf, node => {
                this.nodes.push(node);
            });
        });

        const controllers = this.buildControllers();

        this.circularDependencyResolvers.forEach(c => c(this.referenceTypes));

        return {
            controllers: controllers,
            referenceTypes: this.referenceTypes
        };
    }

    public TypeChecker() {
        return this.typeChecker;
    }

    public addReferenceType(referenceType: ReferenceType) {
        this.referenceTypes[referenceType.typeName] = referenceType;
    }

    public getReferenceType(typeName: string) {
        return this.referenceTypes[typeName];
    }

    public onFinish(callback: (referenceTypes: { [typeName: string]: ReferenceType }) => void) {
        this.circularDependencyResolvers.push(callback);
    }

    public getClassDeclaration(className: string) {
        const found = this.nodes
            .filter(node => {
                const classDeclaration = (node as ts.ClassDeclaration);
                return (node.kind === ts.SyntaxKind.ClassDeclaration && classDeclaration.name && classDeclaration.name.text === className);
            });
        if (found && found.length) {
            return found[0];
        }
        return undefined;
    }

    public getInterfaceDeclaration(className: string) {
        const found = this.nodes
            .filter(node => {
                const interfaceDeclaration = (node as ts.InterfaceDeclaration);
                return (node.kind === ts.SyntaxKind.InterfaceDeclaration && interfaceDeclaration.name && interfaceDeclaration.name.text === className);
            });
        if (found && found.length) {
            return found[0];
        }
        return undefined;
    }

    private buildControllers() {
        return this.nodes
            .filter(node => node.kind === ts.SyntaxKind.ClassDeclaration)
            .map((classDeclaration: ts.ClassDeclaration) => new ControllerGenerator(classDeclaration))
            .filter(generator => generator.isValid())
            .map(generator => generator.generate());
    }
}

export interface Metadata {
    controllers: Array<Controller>;
    referenceTypes: { [typeName: string]: ReferenceType };
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
