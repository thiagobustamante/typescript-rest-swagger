'use strict';

import {Path, Server, GET, POST, PUT, DELETE, HttpMethod,
        PathParam, QueryParam, CookieParam, HeaderParam,
        FormParam, Param, Context, ServiceContext, ContextRequest,
        ContextResponse, ContextLanguage, ContextAccept,
        ContextNext, AcceptLanguage, Accept, FileParam,
        Errors, Return, BodyOptions} from 'typescript-rest';

import * as swagger from '../../src/decorators';

interface Address {
    street: string;
}

interface Person {
    name: string;
    address?: Address;
}

@Accept('text/plain')
@Path('mypath')
@swagger.Tags('My Services')
export class MyService {
    @Response<string>('default', 'Error')
    @Response<string>(400, 'The request format was incorrect.')
    @Response<string>(500, 'There was an unexpected error.')
    @GET
    @Accept('text/html')
    test( ): string {
        return 'OK';
    }

    /**
     * Esta eh a da classe
     * @param test Esta eh a description do param teste
     */
    @GET
    @Path('secondpath')
    @swagger.Example<Person>({
        name: 'Joe'
    })
    test2( @QueryParam('testParam')test?: string ): Person {
        return {name: 'OK'};
    }
}

class BaseService {
    @DELETE
    @Path(':id')
    testDelete( @PathParam('id')id: string): Promise<void> {
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
    @GET
    test( @QueryParam('testParam')test?: string ): Promise<Person> {
        return new Promise<Person>((resolve, reject) => {
            resolve({name: 'OK'});
        });
    }

    @POST
    testPost( obj: Person ): Promise<Return.NewResource<Person>> {
        return new Promise<Return.NewResource<Person>>((resolve, reject) => {
            resolve(new Return.NewResource<Person>('id', {name: 'OK'}));
        });
    }

    @GET
    @Path('myFile')
    @swagger.Produces('application/pdf')
    testFile( @QueryParam('testParam')test?: string ): Promise<Return.DownloadBinaryData> {
        return new Promise<Return.DownloadBinaryData>((resolve, reject) => {
            resolve(null);
        });
    }
}

export class BasicModel {
  id: number;
}

export class BasicEndpoint <T extends BasicModel>  {

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
        return new Promise<void>((resolve, reject)=> {
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
        return new Promise<MyDatatype2>((resolve, reject)=> {
            // content
        });
    }
}

export type SimpleHelloType = {
    /**
     * Description for greeting property
     */
    greeting: string;
    arrayOfSomething: Something[];

    profile: {
        name: string
    };

    comparePassword: (candidatePassword: string, cb: (err: any, isMatch: any) => {}) => void
};

export type Something = {
    someone: string,
    kind: string
};

@Path('type')
export class TypeEndpoint {

    @GET
    @Path(':param')
    test(@PathParam('param') param: string): Promise<SimpleHelloType> {
        return new Promise<MyDatatype2>((resolve, reject)=> {
            // content
        });
    }
}
