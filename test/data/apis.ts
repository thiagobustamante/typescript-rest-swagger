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
