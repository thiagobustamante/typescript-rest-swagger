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

@Path('mypath')
export class MyService {
    @GET
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
