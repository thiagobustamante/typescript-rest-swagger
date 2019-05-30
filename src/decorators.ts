'use strict';

/**
 * A decorator to document the responses that a given service method can return. It is used to generate
 * documentation for the REST service.
 * ```typescript
 * interface MyError {
 *    message: string
 * }
 * @ Path('people')
 * class PeopleService {
 *   @ Response<string>(200, 'Retrieve a list of people.')
 *   @ Response<MyError>(401, 'The user is unauthorized.', {message: 'The user is not authorized to access this operation.'})
 *   @ GET
 *   getPeople(@ Param('name') name: string) {
 *      // ...
 *   }
 * }
 * ```
 * A Default response is created in swagger documentation from the method return analisys. So any response declared
 * through this decorator is an additional response created.
 * @param status The response status code
 * @param description A description for this response
 * @param example An optional example of response to be added to method documentation.
 */
export function Response<T>(name: string | number, description?: string, example?: T): any {
  return () => { return; };
}

/**
 * Used to provide an example of method return to be added into the method response section of the
 * generated documentation for this method.
 * ```typescript
 * @ Path('people')
 * class PeopleService {
 *   @ Example<Array<Person>>([{
 *     name: 'Joe'
 *   }])
 *   @ GET
 *   getPeople(@ Param('name') name: string): Person[] {
 *      // ...
 *   }
 * }
 * ```
 * @param example The example returned object
 */
export function Example<T>(example: T): any {
  return () => { return; };
}

/**
 * Add tags for a given method on generated swagger documentation.
 * ```typescript
 * @ Path('people')
 * class PeopleService {
 *   @ Tags('adiministrative', 'department1')
 *   @ GET
 *   getPeople(@ Param('name') name: string) {
 *      // ...
 *   }
 * }
 * ```
 * @param values a list of tags
 */
export function Tags(...values: string[]): any {
  return () => { return; };
}

/**
 * Add a security constraint to method generated docs.
 * Name is optional, if omitted all securityDefinitions containing the specified scopes will be included. Otherwise, specific to the named securityDefinition.
 * Scopes is optional, if omitted all defined securityDefinitions will be included, implying that any security type
 * with any scope will suffice.
 * NOTE: When supplying only one parameter, it will be interpreted as scopes.  This is for typescript-rest compatibility.
 * @summary Add a security constraint to method generated docs.
 * @param name security name from securityDefinitions
 * @param scopes security scopes from securityDefinitions
 */
export function Security( name?: string, scopes?: Array<string> | string ): any {
  return () => { return; };
}

/**
 * Document the method or class produces property in generated swagger docs
 */
export function Produces(...values: string[]): any {
  return () => { return; };
}

/**
 * Document the type of a property or parameter as `integer ($int32)` in generated swagger docs
 */
export function IsInt(target: any, propertyKey: string, parameterIndex?: number) {
  return;
}

/**
 * Document the type of a property or parameter as `integer ($int64)` in generated swagger docs
 */
export function IsLong(target: any, propertyKey: string, parameterIndex?: number) {
  return;
}

/**
 * Document the type of a property or parameter as `number ($float)` in generated swagger docs
 */
export function IsFloat(target: any, propertyKey: string, parameterIndex?: number) {
  return;
}

/**
 * Document the type of a property or parameter as `number ($double)` in generated swagger docs.
 * This is the default for `number` types without a specifying decorator.
 */
export function IsDouble(target: any, propertyKey: string, parameterIndex?: number) {
  return;
}
