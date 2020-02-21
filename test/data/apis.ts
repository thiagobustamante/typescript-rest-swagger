'use strict';

import {
    Accept, DELETE, FormParam, GET, Path,
    PathParam, POST, PUT, QueryParam,
    Return,
    Security
} from 'typescript-rest';

import * as swagger from '../../src/decorators';
import { TestInterface } from './TestInterface'; // to test compilerOptions.paths

export interface MytypeWithUnion {
    property: 'value1' | 'value2';
}

@Path('unionTypes')
export class TestUnionType {
    @POST
    public post(body: MytypeWithUnion): string {
        return '42';
    }
}

interface Address {
    street: string;
}

interface Person {
    name: string;
    address?: Address;
}

enum TestEnum {
    Option1 = 'option1',
    Option2 = 'option2'
}

enum TestNumericEnum {
    Option1,
    Option2,
}

enum TestMixedEnum {
    Option1,
    Option2 = 'String param',
}

@Accept('text/plain')
@Path('mypath')
@swagger.Tags('My Services')
export class MyService {
    @swagger.Response<string>('default', 'Error')
    @swagger.Response<string>(400, 'The request format was incorrect.')
    @swagger.Response<string>(500, 'There was an unexpected error.')
    @GET
    @Accept('text/html')
    public test(): string {
        return 'OK';
    }

    /**
     * This is the method description
     * @param test This is the test param description
     */
    @GET
    @Path('secondpath')
    @swagger.Example<Person>({
        name: 'Joe'
    })
    @swagger.Response<Person>(200, 'The success test.')
    public test2(
        @QueryParam('testRequired') test: string,
        @QueryParam('testDefault') test2: string = 'value',
        @QueryParam('testOptional') test3?: string,
        @QueryParam('testEnum') test4?: TestEnum,
        @QueryParam('testNumericEnum') test5?: TestNumericEnum,
        @QueryParam('testMixedEnum') test6?: TestMixedEnum
    ): Person {
        return { name: 'OK' };
    }

    @POST
    @swagger.Example<Array<Person>>([{
        name: 'Joe'
    }])
    public testPostString(body: string): Array<Person> {
        return [];
    }

    @Path('obj')
    @POST
    public testPostObject(data: object) {
        return data;
    }

    @GET
    @Path('multi-query')
    public testMultiQuery(
        @QueryParam('id') ids: Array<string>,
        @QueryParam('name'/*, { collectionFormat: 'multi', allowEmptyValue: true }*/) names?: string | Array<string>
    ) {
        return { ids: ids, names: names };
    }

    @GET
    @Path('default-query')
    public testDefaultQuery(
        @QueryParam('num') num: number = 5,
        @QueryParam('str') str: string = 'default value',
        @QueryParam('bool1') bool1: boolean = true,
        @QueryParam('bool2') bool2: boolean = false,
        @QueryParam('arr') arr: Array<string> = ['a', 'b', 'c']
    ) {
        return;
    }

    @POST
    @Path('test-compiler-options')
    public async testCompilerOptions(payload: TestInterface): Promise<TestInterface> {
        return { a: 'string', b: 123 };
    }

    @POST
    @Path('test-form-param')
    public testFormParam(@FormParam('id') id: string): string {
        return id;
    }
}

class BaseService {
    @DELETE
    @Path(':id')
    public testDelete(@PathParam('id') id: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            resolve();
        });
    }
}

@Path('promise')
export class PromiseService extends BaseService {
    /**
     * Esta eh a da classe
     * @param test Esta eh a description do param teste
     */
    @swagger.Response<string>(401, 'Unauthorized')
    @GET
    public test(@QueryParam('testParam') test?: string): Promise<Person> {
        return new Promise<Person>((resolve, reject) => {
            resolve({ name: 'OK' });
        });
    }

    @swagger.Response<Person>(200, 'All Good')
    @swagger.Response<string>(401, 'Unauthorized')
    @swagger.Example<Person>({ name: 'Test Person' })
    @GET
    @Path(':id')
    public testGetSingle(@PathParam('id') id: string): Promise<Person> {
        return new Promise<Person>((resolve, reject) => {
            resolve({ name: 'OK' });
        });
    }

    @swagger.Response<Person>(201, 'Person Created', { name: 'Test Person' })
    @swagger.Response<string>(401, 'Unauthorized')
    @swagger.Example<Person>({ name: 'Example Person' }) // NOTE: this is here to test that it doesn't overwrite the example in the @Response above
    @POST
    public testPost(obj: Person): Promise<Return.NewResource<Person>> {
        return new Promise<Return.NewResource<Person>>((resolve, reject) => {
            resolve(new Return.NewResource<Person>('id', { name: 'OK' }));
        });
    }

    @GET
    @Path('myFile')
    @swagger.Produces('application/pdf')
    public testFile(@QueryParam('testParam') test?: string): Promise<Return.DownloadBinaryData> {
        return new Promise<Return.DownloadBinaryData>((resolve, reject) => {
            resolve(null);
        });
    }
}

export class BasicModel {
    public id: number;
}

export class BasicEndpoint<T extends BasicModel>  {

    protected list(@QueryParam('full') full?: boolean): Promise<Array<T>> {
        return new Promise((resolve, reject) => {
            // todo
        });
    }

    @POST
    protected save(entity: T): Promise<Return.NewResource<number>> {
        return new Promise((resolve, reject) => {
            // todo
        });
    }

    @PUT
    @Path('/:id')
    protected update(@PathParam('id') id: number, entity: T): Promise<void> {
        return new Promise((resolve, reject) => {
            // todo
        });
    }

    @DELETE
    @Path('/:id')
    protected remove(@PathParam('id') id: string): Promise<void> {
        return new Promise((resolve, reject) => {
            // todo
        });
    }

    @GET
    @Path('/:id')
    protected get(@PathParam('id') id: string): Promise<T> {
        return new Promise((resolve, reject) => {
            // todo
        });
    }
}

export interface MyDatatype extends BasicModel {
    property1: string;
}

@Path('generics1')
export class DerivedEndpoint extends BasicEndpoint<MyDatatype> {

    @GET
    @Path(':param')
    protected test(@PathParam('param') param: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            // content
        });
    }
}

export interface BasicModel2<T> {
    prop: T;
}

export interface MyDatatype2 extends BasicModel2<string> {
    property1: string;
}

@Path('generics2')
export class DerivedEndpoint2 {

    @GET
    @Path(':param')
    protected test(@PathParam('param') param: string): Promise<MyDatatype2> {
        return new Promise<MyDatatype2>((resolve, reject) => {
            // content
        });
    }
}

// tslint:disable-next-line: interface-over-type-literal
export type SimpleHelloType = {
    /**
     * Description for greeting property
     */
    greeting: string;
    arrayOfSomething: Array<Something>;

    /**
     * Description for profile
     */
    profile: {
        /**
         * Description for profile name
         */
        name: string
    };

    comparePassword: (candidatePassword: string, cb: (err: any, isMatch: any) => {}) => void;
};

export interface Something {
    id: UUID;
    someone: string;
    kind: string;
}

export type UUID = string;

@Path('type')
export class TypeEndpoint {

    @GET
    @Path(':param')
    public test(@PathParam('param') param: string): Promise<MyDatatype2> {
        return new Promise<MyDatatype2>((resolve, reject) => {
            // content
        });
    }

    @GET
    @Path(':param/2')
    public test2(@PathParam('param') param: string): Promise<SimpleHelloType> {
        return new Promise<SimpleHelloType>((resolve, reject) => {
            // content
        });
    }
}

export interface ResponseBody<T> {
    data: T;
}

export class PrimitiveClassModel {
    /**
     * An integer
     */
    @swagger.IsInt
    public int?: number;

    @swagger.IsLong
    public long?: number;

    @swagger.IsFloat
    public float?: number;

    @swagger.IsDouble
    public double?: number;
}

export interface PrimitiveInterfaceModel {
    /**
     * An integer
     * @IsInt
     */
    int?: number;

    /**
     * @IsLong
     */
    long?: number;

    /**
     * @IsFloat
     */
    float?: number;

    /**
     * @IsDouble
     */
    double?: number;
}

@Path('primitives')
export class PrimitiveEndpoint {

    @Path('/class')
    @GET
    public getClass(): PrimitiveClassModel {
        return new PrimitiveClassModel();
    }

    @Path('/interface')
    @GET
    public testInterface(): PrimitiveInterfaceModel {
        return {};
    }

    @Path(':id')
    @GET
    public getById(@PathParam('id') @swagger.IsLong id: number) {
        // ...
    }

    @Path('/arrayNative')
    @GET
    // tslint:disable-next-line:array-type
    public getArrayNative(): ResponseBody<string[]> {
        return { data: ['hello', 'world'] };
    }

    @Path('/array')
    @GET
    public getArray(): ResponseBody<Array<string>> {
        return { data: ['hello', 'world'] };
    }
}

@Path('parameterized/:objectId')
export class ParameterizedEndpoint {

    @Path('/test')
    @GET
    public test(@PathParam('objectId') objectId: string): PrimitiveClassModel {
        return new PrimitiveClassModel();
    }
}

export abstract class Entity {
    /**
     * A numeric identifier
     */
    public id?: number;
}

export class NamedEntity implements Entity {
    public id: number;
    public name: string;
}

@Path('abstract')
export class AbstractEntityEndpoint {
    @GET
    public get(): NamedEntity {
        return new NamedEntity();
    }
}

@Path('secure')
@Security(['ROLE_1', 'ROLE_2'], 'access_token')
export class SecureEndpoint {
    @GET
    public get(): string {
        return 'Access Granted';
    }

    @POST
    @Security([], 'user_email')
    public post(): string {
        return 'Posted';
    }
}

@Path('supersecure')
@Security('access_token')
@Security('user_email')
@Security()
export class SuperSecureEndpoint {
    @GET
    public get(): string {
        return 'Access Granted';
    }
}

@Path('response')
@swagger.Response<string>(400, 'The request format was incorrect.')
@swagger.Response<string>(500, 'There was an unexpected error.')
export class ResponseController {
    @GET
    public get(): string {
        return '42';
    }

    @swagger.Response<string>(401, 'Unauthorized.')
    @swagger.Response<string>(502, 'Internal server error.')
    @GET
    @Path('/test')
    public test(): string {
        return 'OK';
    }
}
