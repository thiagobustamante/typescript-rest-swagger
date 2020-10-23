import { MetadataGenerator } from '../../src/metadata/metadataGenerator';
import { SpecGenerator } from '../../src/swagger/generator';
import { getDefaultOptions } from '../data/defaultOptions';

// tslint:disable: no-unused-expression
const jsonata = require('jsonata');

describe('Definition generation', () => {
  const compilerOptions = {
    baseUrl: '.',
    paths: {
      '@/*': ['test/data/*'],
    },
  };
  const metadata = new MetadataGenerator(['./test/data/ap*.ts'], compilerOptions).generate();
  const spec = new SpecGenerator(metadata, getDefaultOptions()).getSwaggerSpec();

  describe('MyService', () => {
    it('should generate paths for decorated services', () => {
      expect(spec.paths).toHaveProperty('/mypath');
      expect(spec.paths).toHaveProperty('/mypath/secondpath');
    });

    it('should generate paths for decorated services, declared on superclasses', () => {
      expect(spec.paths).toHaveProperty('/promise');
      expect(spec.paths).toHaveProperty('/promise/{id}');
    });

    it('should generate examples for object parameter', () => {
      expect(spec.paths).toHaveProperty('/mypath/secondpath');
      const expression = jsonata('paths."/mypath/secondpath".get.responses."200".examples."application/json".name');
      expect(expression.evaluate(spec)).toEqual('Joe');
    });

    it('should generate examples for array parameter', () => {
      expect(spec.paths).toHaveProperty('/mypath');
      const expression = jsonata('paths."/mypath".post.responses."200".examples."application/json".name');
      expect(expression.evaluate(spec)).toEqual('Joe');
    });

    it('should generate optional parameters for params with question marks or default initializers', () => {
      let expression = jsonata('paths."/mypath/secondpath".get.parameters[0].required');
      expect(expression.evaluate(spec)).toEqual(true);
      expression = jsonata('paths."/mypath/secondpath".get.parameters[1].required');
      expect(expression.evaluate(spec)).toEqual(false);
      expression = jsonata('paths."/mypath/secondpath".get.parameters[2].required');
      expect(expression.evaluate(spec)).toEqual(false);
      expression = jsonata('paths."/mypath/secondpath".get.parameters[3].enum');
      expect(expression.evaluate(spec)).toEqual(['option1', 'option2']);
    });

    it('should generate specs for enum params based on it values types', () => {
      let expression = jsonata('paths."/mypath/secondpath".get.parameters[3]');
      let paramSpec = expression.evaluate(spec);
      expect(paramSpec.type).toEqual('string');
      expect(paramSpec.enum).toEqual(['option1', 'option2']);

      expression = jsonata('paths."/mypath/secondpath".get.parameters[4]');
      paramSpec = expression.evaluate(spec);
      expect(paramSpec.type).toEqual('number');
      expect(paramSpec.enum).toEqual([0, 1]);

      expression = jsonata('paths."/mypath/secondpath".get.parameters[5]');
      paramSpec = expression.evaluate(spec);
      expect(paramSpec.type).toEqual('string');
      expect(paramSpec.enum).toEqual([0, 'String param']);
    });

    it('should generate description for methods and parameters', () => {
      let expression = jsonata('paths."/mypath/secondpath".get.parameters[0].description');
      expect(expression.evaluate(spec)).toEqual('This is the test param description');
      expression = jsonata('paths."/mypath/secondpath".get.description');
      expect(expression.evaluate(spec)).toEqual('This is the method description');
    });

    it('should support multiple response decorators', () => {
      let expression = jsonata('paths."/mypath".get.responses."400".description');
      expect(expression.evaluate(spec)).toEqual('The request format was incorrect.');
      expression = jsonata('paths."/mypath".get.responses."500".description');
      expect(expression.evaluate(spec)).toEqual('There was an unexpected error.');
      expression = jsonata('paths."/mypath/secondpath".get.responses."200".description');
      expect(expression.evaluate(spec)).toEqual('The success test.');
      expression = jsonata('paths."/mypath/secondpath".get.responses."200".schema."$ref"');
      expect(expression.evaluate(spec)).toEqual('#/definitions/Person');
      expression = jsonata('paths."/mypath/secondpath".get.responses."200".examples."application/json"[0].name');
      expect(expression.evaluate(spec)).toEqual('Joe');
    });

    it('should include default response if a non-conflicting response is declared with a decorator', () => {
      let expression = jsonata('paths."/promise".get.responses');
      expect(Object.keys(expression.evaluate(spec)).length).toEqual(2);
      expression = jsonata('paths."/promise".get.responses."200".description');
      expect(expression.evaluate(spec)).toEqual('Ok');
      expression = jsonata('paths."/promise".get.responses."401".description');
      expect(expression.evaluate(spec)).toEqual('Unauthorized');
    });

    it('should not include default response if it conflicts with a declared response', () => {
      let expression = jsonata('paths."/promise".post.responses');
      expect(Object.keys(expression.evaluate(spec)).length).toEqual(2);
      expression = jsonata('paths."/promise".post.responses."201".description');
      expect(expression.evaluate(spec)).toEqual('Person Created');
      expression = jsonata('paths."/promise".post.responses."201".examples."application/json".name');
      expect(expression.evaluate(spec)).toEqual('Test Person');
      expression = jsonata('paths."/promise".post.responses."401".description');
      expect(expression.evaluate(spec)).toEqual('Unauthorized');
    });

    it('should update a declared response with the declared default response example if response annotation doesn\'t specify one', () => {
      let expression = jsonata('paths."/promise/{id}".get.responses');
      expect(Object.keys(expression.evaluate(spec)).length).toEqual(2);
      expression = jsonata('paths."/promise/{id}".get.responses."200".description');
      expect(expression.evaluate(spec)).toEqual('All Good');
      expression = jsonata('paths."/promise/{id}".get.responses."200".examples."application/json".name');
      expect(expression.evaluate(spec)).toEqual('Test Person');
      expression = jsonata('paths."/promise/{id}".get.responses."401".description');
      expect(expression.evaluate(spec)).toEqual('Unauthorized');
    });

    it('should generate a definition with a referenced type', () => {
      const expression = jsonata('definitions.Person.properties.address."$ref"');
      expect(expression.evaluate(spec)).toEqual('#/definitions/Address');
    });

    it('should generate a body param with string schema type', () => {
      let expression = jsonata('paths."/mypath".post.parameters[0].in');
      expect(expression.evaluate(spec)).toEqual('body');
      expression = jsonata('paths."/mypath".post.parameters[0].name');
      expect(expression.evaluate(spec)).toEqual('body');
      expression = jsonata('paths."/mypath".post.parameters[0].schema.type');
      expect(expression.evaluate(spec)).toEqual('string');
    });

    it('should generate a body param with object schema type', () => {
      let expression = jsonata('paths."/mypath/obj".post.parameters[0].name');
      expect(expression.evaluate(spec)).toEqual('data');
      expression = jsonata('paths."/mypath/obj".post.parameters[0].schema.type');
      expect(expression.evaluate(spec)).toEqual('object');
    });

    it('should generate a query param with array type', () => {
      const param = jsonata('paths."/mypath/multi-query".get.parameters[0]').evaluate(spec);
      expect(param.name).toEqual('id');
      expect(param.required).toEqual(true);
      expect(param.type).toEqual('array');
      expect(param.items).toBeDefined;
      expect(param.items.type).toEqual('string');
      expect(param.collectionFormat).toEqual('multi');
    });

    it('should generate an array query param for parameter with compatible array and primitive intersection type', () => {
      const param = jsonata('paths."/mypath/multi-query".get.parameters[1]').evaluate(spec);
      expect(param.name).toEqual('name');
      expect(param.required).toEqual(false);
      expect(param.type).toEqual('array');
      expect(param.items).toBeDefined;
      expect(param.items.type).toEqual('string');
      expect(param.collectionFormat).toEqual('multi');
    });

    it('should generate default value for a number query param', () => {
      const param = jsonata('paths."/mypath/default-query".get.parameters[0]').evaluate(spec);
      expect(param.name).toEqual('num');
      expect(param.required).toEqual(false);
      expect(param.type).toEqual('number');
      expect(param.default).toEqual(5);
    });

    it('should generate default value for a string query param', () => {
      const param = jsonata('paths."/mypath/default-query".get.parameters[1]').evaluate(spec);
      expect(param.name).toEqual('str');
      expect(param.required).toEqual(false);
      expect(param.type).toEqual('string');
      expect(param.default).toEqual('default value');
    });

    it('should generate default value for a true boolean query param', () => {
      const param = jsonata('paths."/mypath/default-query".get.parameters[2]').evaluate(spec);
      expect(param.name).toEqual('bool1');
      expect(param.required).toEqual(false);
      expect(param.type).toEqual('boolean');
      expect(param.default).toEqual(true);
    });

    it('should generate default value for a false boolean query param', () => {
      const param = jsonata('paths."/mypath/default-query".get.parameters[3]').evaluate(spec);
      expect(param.name).toEqual('bool2');
      expect(param.required).toEqual(false);
      expect(param.type).toEqual('boolean');
      expect(param.default).toEqual(false);
    });

    it('should generate default value for a string array query param', () => {
      const param = jsonata('paths."/mypath/default-query".get.parameters[4]').evaluate(spec);
      expect(param.name).toEqual('arr');
      expect(param.required).toEqual(false);
      expect(param.type).toEqual('array');
      expect(param.items).toBeDefined;
      expect(param.items.type).toEqual('string');
      expect(param.default).toStrictEqual(['a', 'b', 'c']);
    });
  });

  describe('TypeEndpoint', () => {
    it('should generate definitions for type aliases', () => {
      expect(spec.paths).toHaveProperty('/type/{param}');
      let expression = jsonata('definitions.SimpleHelloType.properties.greeting.description');
      expect(expression.evaluate(spec)).toEqual('Description for greeting property');

      expression = jsonata('definitions.UUID');
      expect(expression.evaluate(spec)).toEqual({
        description: '',
        properties: {},
        type: 'object',
      });
    });

    it('should generate nested object types in definitions', () => {
      let expression = jsonata('definitions.SimpleHelloType.properties.profile.type');
      expect(expression.evaluate(spec)).toEqual('object');
      expression = jsonata('definitions.SimpleHelloType.properties.profile.description');
      expect(expression.evaluate(spec)).toEqual('Description for profile');
      expression = jsonata('definitions.SimpleHelloType.properties.profile.properties.name.type');
      expect(expression.evaluate(spec)).toEqual('string');
      expression = jsonata('definitions.SimpleHelloType.properties.profile.properties.name.description');
      expect(expression.evaluate(spec)).toEqual('Description for profile name');
    });

    it('should ignore properties that are functions', () => {
      const expression = jsonata('definitions.SimpleHelloType.properties.comparePassword');
      expect(expression.evaluate(spec)).toBeUndefined;
    });

    it('should support compilerOptions', () => {
      let expression = jsonata('definitions.TestInterface');
      expect(expression.evaluate(spec)).toEqual({
        description: '',
        properties: {
          a: { type: 'string', description: '' },
          b: { type: 'number', format: 'double', description: '' }
        },
        required: ['a', 'b'],
        type: 'object',
      });
      expect(spec.paths).toHaveProperty('/mypath/test-compiler-options');
      expression = jsonata('paths."/mypath/test-compiler-options".post.responses."200".schema');
      expect(expression.evaluate(spec)).toEqual({ $ref: '#/definitions/TestInterface' });
      expression = jsonata('paths."/mypath/test-compiler-options".post.parameters[0].schema');
      expect(expression.evaluate(spec)).toEqual({ $ref: '#/definitions/TestInterface' });
    });
    it('should support formparam', () => {
      expect(spec.paths).toHaveProperty('/mypath/test-form-param');
      let expression = jsonata('paths."/mypath/test-form-param".post.responses."200".schema');
      expect(expression.evaluate(spec)).toEqual({ type: 'string' });
      expression = jsonata('paths."/mypath/test-form-param".post.parameters[0]');
      expect(expression.evaluate(spec)).toEqual({
        description: '',
        in: 'formData',
        name: 'id',
        required: true,
        type: 'string',
      });
    });
  });

  describe('PrimitiveEndpoint', () => {
    it('should generate integer type for @IsInt decorator declared on class property', () => {
      let expression = jsonata('definitions.PrimitiveClassModel.properties.int.type');
      expect(expression.evaluate(spec)).toEqual('integer');
      expression = jsonata('definitions.PrimitiveClassModel.properties.int.format');
      expect(expression.evaluate(spec)).toEqual('int32');
      expression = jsonata('definitions.PrimitiveClassModel.properties.int.description');
      expect(expression.evaluate(spec)).toEqual('An integer');
    });

    it('should generate integer type for @IsLong decorator declared on class property', () => {
      let expression = jsonata('definitions.PrimitiveClassModel.properties.long.type');
      expect(expression.evaluate(spec)).toEqual('integer');
      expression = jsonata('definitions.PrimitiveClassModel.properties.long.format');
      expect(expression.evaluate(spec)).toEqual('int64');
      expression = jsonata('definitions.PrimitiveClassModel.properties.long.description');
      expect(expression.evaluate(spec)).toEqual('');
    });

    it('should generate number type for @IsFloat decorator declared on class property', () => {
      let expression = jsonata('definitions.PrimitiveClassModel.properties.float.type');
      expect(expression.evaluate(spec)).toEqual('number');
      expression = jsonata('definitions.PrimitiveClassModel.properties.float.format');
      expect(expression.evaluate(spec)).toEqual('float');
      expression = jsonata('definitions.PrimitiveClassModel.properties.float.description');
      expect(expression.evaluate(spec)).toEqual('');
    });

    it('should generate number type for @IsDouble decorator declared on class property', () => {
      let expression = jsonata('definitions.PrimitiveClassModel.properties.double.type');
      expect(expression.evaluate(spec)).toEqual('number');
      expression = jsonata('definitions.PrimitiveClassModel.properties.double.format');
      expect(expression.evaluate(spec)).toEqual('double');
      expression = jsonata('definitions.PrimitiveClassModel.properties.double.description');
      expect(expression.evaluate(spec)).toEqual('');
    });

    it('should generate integer type for jsdoc @IsInt tag on interface property', () => {
      let expression = jsonata('definitions.PrimitiveInterfaceModel.properties.int.type');
      expect(expression.evaluate(spec)).toEqual('integer');
      expression = jsonata('definitions.PrimitiveInterfaceModel.properties.int.format');
      expect(expression.evaluate(spec)).toEqual('int32');
      expression = jsonata('definitions.PrimitiveInterfaceModel.properties.int.description');
      expect(expression.evaluate(spec)).toEqual('An integer');
    });

    it('should generate integer type for jsdoc @IsLong tag on interface property', () => {
      let expression = jsonata('definitions.PrimitiveInterfaceModel.properties.long.type');
      expect(expression.evaluate(spec)).toEqual('integer');
      expression = jsonata('definitions.PrimitiveInterfaceModel.properties.long.format');
      expect(expression.evaluate(spec)).toEqual('int64');
      expression = jsonata('definitions.PrimitiveInterfaceModel.properties.long.description');
      expect(expression.evaluate(spec)).toEqual('');
    });

    it('should generate number type for jsdoc @IsFloat tag on interface property', () => {
      let expression = jsonata('definitions.PrimitiveInterfaceModel.properties.float.type');
      expect(expression.evaluate(spec)).toEqual('number');
      expression = jsonata('definitions.PrimitiveInterfaceModel.properties.float.format');
      expect(expression.evaluate(spec)).toEqual('float');
      expression = jsonata('definitions.PrimitiveInterfaceModel.properties.float.description');
      expect(expression.evaluate(spec)).toEqual('');
    });

    it('should generate number type for jsdoc @IsDouble tag on interface property', () => {
      let expression = jsonata('definitions.PrimitiveInterfaceModel.properties.double.type');
      expect(expression.evaluate(spec)).toEqual('number');
      expression = jsonata('definitions.PrimitiveInterfaceModel.properties.double.format');
      expect(expression.evaluate(spec)).toEqual('double');
      expression = jsonata('definitions.PrimitiveInterfaceModel.properties.double.description');
      expect(expression.evaluate(spec)).toEqual('');
    });

    it('should generate number type decorated path params', () => {
      let expression = jsonata('paths."/primitives/{id}".get.parameters[0].type');
      expect(expression.evaluate(spec)).toEqual('integer');
      expression = jsonata('paths."/primitives/{id}".get.parameters[0].format');
      expect(expression.evaluate(spec)).toEqual('int64');
    });

    it('should generate array type names as type + Array', () => {
      let expression = jsonata('definitions.ResponseBodystringArray');
      expect(expression.evaluate(spec)).toBeUndefined;
      expression = jsonata('paths."/primitives/arrayNative".get.responses."200".schema."$ref"');
      expect(expression.evaluate(spec)).toEqual('#/definitions/ResponseBodystringArray');
      expression = jsonata('paths."/primitives/array".get.responses."200".schema."$ref"');
      expect(expression.evaluate(spec)).toEqual('#/definitions/ResponseBodystringArray');
    });
  });

  describe('ParameterizedEndpoint', () => {
    it('should generate path param for params declared on class', () => {
      const expression = jsonata('paths."/parameterized/{objectId}/test".get.parameters[0].in');
      expect(expression.evaluate(spec)).toEqual('path');
    });

    it('should generate formData param for params declared on method', () => {
        const expression = jsonata('paths."/parameterized/{objectId}/file".post.parameters[0].in');
        expect(expression.evaluate(spec)).to.eq('formData');
    });

    it('should generate path param for params declared on class', () => {
        const expression = jsonata('paths."/parameterized/{objectId}/stream".post.parameters[0].in');
        expect(expression.evaluate(spec)).to.eq('formData');
    });

    it('should generate formData param for params declared on method', () => {
        const expression = jsonata('paths."/parameterized/{objectId}/file".post.parameters[0].in');
        expect(expression.evaluate(spec)).to.eq('formData');
    });

    it('should generate path param for params declared on class', () => {
        const expression = jsonata('paths."/parameterized/{objectId}/stream".post.parameters[0].in');
        expect(expression.evaluate(spec)).to.eq('formData');
    });
  });

  describe('AbstractEntityEndpoint', () => {
    it('should not duplicate inherited properties in the required list', () => {
      const expression = jsonata('definitions.NamedEntity.required');
      expect(expression.evaluate(spec)).toStrictEqual(['id', 'name']);
    });

    it('should use property description from base class if not defined in child', () => {
      const expression = jsonata('definitions.NamedEntity.properties.id.description');
      expect(expression.evaluate(spec)).toEqual('A numeric identifier');
    });
  });

  describe('SecureEndpoint', () => {
    it('should apply controller security to request', () => {
      const expression = jsonata('paths."/secure".get.security');
      expect(expression.evaluate(spec)).toStrictEqual([{ 'access_token': ['ROLE_1', 'ROLE_2'] }]);
    });

    it('method security should override controller security', () => {
      const expression = jsonata('paths."/secure".post.security');
      expect(expression.evaluate(spec)).toStrictEqual([{ 'user_email': [] }]);
    });
  });

  describe('SuperSecureEndpoint', () => {
    it('should apply two controller securities to request', () => {
      const expression = jsonata('paths."/supersecure".get.security');
      expect(expression.evaluate(spec)).toStrictEqual([{ 'default': ['access_token'] }, { 'default': ['user_email'] }, { 'default': [] }]);
    });
  });

  describe('ResponseController', () => {
    it('should support multiple response decorators on controller', () => {
      let expression = jsonata('paths."/response".get.responses."400".description');
      expect(expression.evaluate(spec)).toEqual('The request format was incorrect.');
      expression = jsonata('paths."/response".get.responses."500".description');
      expect(expression.evaluate(spec)).toEqual('There was an unexpected error.');
    });

    it('should support decorators on controller and method', () => {
      let expression = jsonata('paths."/response/test".get.responses."400".description');
      expect(expression.evaluate(spec)).toEqual('The request format was incorrect.');
      expression = jsonata('paths."/response/test".get.responses."500".description');
      expect(expression.evaluate(spec)).toEqual('There was an unexpected error.');
      expression = jsonata('paths."/response/test".get.responses."502".description');
      expect(expression.evaluate(spec)).toEqual('Internal server error.');
      expression = jsonata('paths."/response/test".get.responses."401".description');
      expect(expression.evaluate(spec)).toEqual('Unauthorized.');
    });
  });

  describe('SpecGenerator', () => {
    it('should be able to generate open api 3.0 outputs', async () => {
      const openapi = await new SpecGenerator(metadata, getDefaultOptions()).getOpenApiSpec();
      const expression = jsonata('paths."/supersecure".get.security');
      expect(expression.evaluate(openapi)).toStrictEqual([{ 'default': ['access_token'] }, { 'default': ['user_email'] }, { 'default': [] }]);
      expect(openapi.openapi).toEqual('3.0.0');
    });
  });

  describe('TestUnionType', () => {
    it('should support union types', () => {
      const expression = jsonata('paths."/unionTypes".post.parameters[0]');
      const paramSpec = expression.evaluate(spec);
      const definitionExpression = jsonata('definitions.MytypeWithUnion.properties.property');
      const myTypeDefinition = definitionExpression.evaluate(spec);
      expect(paramSpec.schema.$ref).toEqual('#/definitions/MytypeWithUnion');
      expect(myTypeDefinition.type).toEqual('string');
      expect(myTypeDefinition.enum).toEqual(['value1', 'value2']);
    });
  });

});
