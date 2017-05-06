'use strict';

import {Inject, AutoWired} from 'typescript-ioc';

import {Path, Server, GET, POST, PUT, DELETE, HttpMethod,
        PathParam, QueryParam, CookieParam, HeaderParam,
        FormParam, Param, Context, ServiceContext, ContextRequest,
        ContextResponse, ContextLanguage, ContextAccept,
        ContextNext, AcceptLanguage, Accept, FileParam,
        Errors, Return, BodyOptions} from 'typescript-rest';

interface Address {
    street: string;
}

interface Person {
    name: string;
    address?: Address;
}

@Accept('text/plain')
@Path('mypath')
export class MyService {
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

@Path('promise')
export class PromiseService {
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

}
