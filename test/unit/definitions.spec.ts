import 'mocha';
import { MetadataGenerator } from '../../src/metadata/metadataGenerator';
// import {Swagger} from '../../src/swagger/swagger';
import { SpecGenerator } from '../../src/swagger/generator';
import { getDefaultOptions } from '../data/defaultOptions';
import * as chai from 'chai';

const expect = chai.expect;
const jsonata = require('jsonata');

describe('Definition generation', () => {
  const metadata = new MetadataGenerator('./test/data/apis.ts').generate();
  const spec = new SpecGenerator(metadata, getDefaultOptions()).getSpec();

  describe('MyService', () => {
    it('should generate paths for decorated services', () => {
      expect(spec.paths).to.have.property('/mypath');
      expect(spec.paths).to.have.property('/mypath/secondpath');
    });

    it('should generate paths for decorated services, declared on superclasses', () => {
      expect(spec.paths).to.have.property('/promise');
      expect(spec.paths).to.have.property('/promise/{id}');
    });

    it('should generate examples for object parameter', () => {
      expect(spec.paths).to.have.property('/mypath/secondpath');
      const expression = jsonata('paths."/mypath/secondpath".get.responses."200".examples."application/json".name');
      expect(expression.evaluate(spec)).to.eq('Joe');
    });

    it('should generate examples for array paraemter', () => {
      expect(spec.paths).to.have.property('/mypath');
      const expression = jsonata('paths."/mypath".post.responses."204".examples."application/json"[0].name');
      expect(expression.evaluate(spec)).to.eq('Joe');
    });

    it('should generate optional parameters for params with question marks or default initializers', () => {
      let expression = jsonata('paths."/mypath/secondpath".get.parameters[0].required');
      expect(expression.evaluate(spec)).to.eq(true);
      expression = jsonata('paths."/mypath/secondpath".get.parameters[1].required');
      expect(expression.evaluate(spec)).to.eq(false);
      expression = jsonata('paths."/mypath/secondpath".get.parameters[2].required');
      expect(expression.evaluate(spec)).to.eq(false);
    });

    it('should support multiple response decorators', () => {
      let expression = jsonata('paths."/mypath".get.responses."400".description');
      expect(expression.evaluate(spec)).to.eq('The request format was incorrect.');
      expression = jsonata('paths."/mypath".get.responses."500".description');
      expect(expression.evaluate(spec)).to.eq('There was an unexpected error.');
      expression = jsonata('paths."/mypath/secondpath".get.responses."200".description');
      expect(expression.evaluate(spec)).to.eq('The success test.');
      expression = jsonata('paths."/mypath/secondpath".get.responses."200".schema."$ref"');
      expect(expression.evaluate(spec)).to.eq('#/definitions/Person');
      expression = jsonata('paths."/mypath/secondpath".get.responses."200".examples."application/json"[0].name');
      expect(expression.evaluate(spec)).to.eq('Joe');
    });

    it('should include default response if a non-conflicting response is declared with a decorator', () => {
      let expression = jsonata('paths."/promise".get.responses');
      expect(Object.keys(expression.evaluate(spec)).length).to.eq(2);
      expression = jsonata('paths."/promise".get.responses."200".description');
      expect(expression.evaluate(spec)).to.eq('Ok');
      expression = jsonata('paths."/promise".get.responses."401".description');
      expect(expression.evaluate(spec)).to.eq('Unauthorized');
    });

    it('should not include default response if it conflicts with a declared response', () => {
      let expression = jsonata('paths."/promise".post.responses');
      expect(Object.keys(expression.evaluate(spec)).length).to.eq(2);
      expression = jsonata('paths."/promise".post.responses."201".description');
      expect(expression.evaluate(spec)).to.eq('Person Created');
      expression = jsonata('paths."/promise".post.responses."201".examples."application/json".name');
      expect(expression.evaluate(spec)).to.eq('Test Person');
      expression = jsonata('paths."/promise".post.responses."401".description');
      expect(expression.evaluate(spec)).to.eq('Unauthorized');
    });

    it('should update a declared response with the declared default response example if response annotation doesn\'t specify one', () => {
      let expression = jsonata('paths."/promise/{id}".get.responses');
      expect(Object.keys(expression.evaluate(spec)).length).to.eq(2);
      expression = jsonata('paths."/promise/{id}".get.responses."200".description');
      expect(expression.evaluate(spec)).to.eq('All Good');
      expression = jsonata('paths."/promise/{id}".get.responses."200".examples."application/json".name');
      expect(expression.evaluate(spec)).to.eq('Test Person');
      expression = jsonata('paths."/promise/{id}".get.responses."401".description');
      expect(expression.evaluate(spec)).to.eq('Unauthorized');
    });

    it('should generate a definition with a referenced type', () => {
      const expression = jsonata('definitions.Person.properties.address."$ref"');
      expect(expression.evaluate(spec)).to.eq('#/definitions/Address');
    });

    it('should generate a body param with string schema type', () => {
      let expression = jsonata('paths."/mypath".post.parameters[0].in');
      expect(expression.evaluate(spec)).to.eq('body');
      expression = jsonata('paths."/mypath".post.parameters[0].name');
      expect(expression.evaluate(spec)).to.eq('body');
      expression = jsonata('paths."/mypath".post.parameters[0].schema.type');
      expect(expression.evaluate(spec)).to.eq('string');
    });

    it('should generate a body param with object schema type', () => {
      let expression = jsonata('paths."/mypath/obj".post.parameters[0].name');
      expect(expression.evaluate(spec)).to.eq('data');
      expression = jsonata('paths."/mypath/obj".post.parameters[0].schema.type');
      expect(expression.evaluate(spec)).to.eq('object');
    });

    it('should generate a query param with array type', () => {
      const param = jsonata('paths."/mypath/multi-query".get.parameters[0]').evaluate(spec);
      expect(param.name).to.eq('id');
      expect(param.required).to.eq(true);
      expect(param.type).to.eq('array');
      expect(param.items).to.be.an('object');
      expect(param.items.type).to.eq('string');
      expect(param.collectionFormat).to.eq('multi');
    });

    it('should generate an array query param for parameter with compatible array and primitive intersection type', () => {
      const param = jsonata('paths."/mypath/multi-query".get.parameters[1]').evaluate(spec);
      expect(param.name).to.eq('name');
      expect(param.required).to.eq(false);
      expect(param.type).to.eq('array');
      expect(param.items).to.be.an('object');
      expect(param.items.type).to.eq('string');
      expect(param.collectionFormat).to.eq('multi');
    });

    it('should generate default value for a number query param', () => {
      const param = jsonata('paths."/mypath/default-query".get.parameters[0]').evaluate(spec);
      expect(param.name).to.eq('num');
      expect(param.required).to.eq(false);
      expect(param.type).to.eq('number');
      expect(param.default).to.eq(5);
    });

    it('should generate default value for a string query param', () => {
      const param = jsonata('paths."/mypath/default-query".get.parameters[1]').evaluate(spec);
      expect(param.name).to.eq('str');
      expect(param.required).to.eq(false);
      expect(param.type).to.eq('string');
      expect(param.default).to.eq('default value');
    });

    it('should generate default value for a true boolean query param', () => {
      const param = jsonata('paths."/mypath/default-query".get.parameters[2]').evaluate(spec);
      expect(param.name).to.eq('bool1');
      expect(param.required).to.eq(false);
      expect(param.type).to.eq('boolean');
      expect(param.default).to.eq(true);
    });

    it('should generate default value for a false boolean query param', () => {
      const param = jsonata('paths."/mypath/default-query".get.parameters[3]').evaluate(spec);
      expect(param.name).to.eq('bool2');
      expect(param.required).to.eq(false);
      expect(param.type).to.eq('boolean');
      expect(param.default).to.eq(false);
    });

    it('should generate default value for a string array query param', () => {
      const param = jsonata('paths."/mypath/default-query".get.parameters[4]').evaluate(spec);
      expect(param.name).to.eq('arr');
      expect(param.required).to.eq(false);
      expect(param.type).to.eq('array');
      expect(param.items).to.be.an('object');
      expect(param.items.type).to.eq('string');
      expect(param.default).to.deep.eq(['a', 'b', 'c']);
    });
  });

  describe('TypeEndpoint', () => {
    it('should generate definitions for type aliases', () => {
      expect(spec.paths).to.have.property('/type/{param}');
      const expression = jsonata('definitions.SimpleHelloType.properties.greeting.description');
      expect(expression.evaluate(spec)).to.eq('Description for greeting property');
    });

    it('should generate nested object types in definitions', () => {
      let expression = jsonata('definitions.SimpleHelloType.properties.profile.type');
      expect(expression.evaluate(spec)).to.eq('object');
      expression = jsonata('definitions.SimpleHelloType.properties.profile.description');
      expect(expression.evaluate(spec)).to.eq('Description for profile');
      expression = jsonata('definitions.SimpleHelloType.properties.profile.properties.name.type');
      expect(expression.evaluate(spec)).to.eq('string');
      expression = jsonata('definitions.SimpleHelloType.properties.profile.properties.name.description');
      expect(expression.evaluate(spec)).to.eq('Description for profile name');
    });

    it('should ignore properties that are functions', () => {
      const expression = jsonata('definitions.SimpleHelloType.properties.comparePassword');
      // tslint:disable-next-line:no-unused-expression
      expect(expression.evaluate(spec)).to.not.exist;
    });
  });

  describe('PrimitiveEndpoint', () => {
    it('should generate integer type for @IsInt decorator declared on class property', () => {
      let expression = jsonata('definitions.PrimitiveClassModel.properties.int.type');
      expect(expression.evaluate(spec)).to.eq('integer');
      expression = jsonata('definitions.PrimitiveClassModel.properties.int.format');
      expect(expression.evaluate(spec)).to.eq('int32');
      expression = jsonata('definitions.PrimitiveClassModel.properties.int.description');
      expect(expression.evaluate(spec)).to.eq('An integer');
    });

    it('should generate integer type for @IsLong decorator declared on class property', () => {
      let expression = jsonata('definitions.PrimitiveClassModel.properties.long.type');
      expect(expression.evaluate(spec)).to.eq('integer');
      expression = jsonata('definitions.PrimitiveClassModel.properties.long.format');
      expect(expression.evaluate(spec)).to.eq('int64');
      expression = jsonata('definitions.PrimitiveClassModel.properties.long.description');
      expect(expression.evaluate(spec)).to.eq('');
    });

    it('should generate number type for @IsFloat decorator declared on class property', () => {
      let expression = jsonata('definitions.PrimitiveClassModel.properties.float.type');
      expect(expression.evaluate(spec)).to.eq('number');
      expression = jsonata('definitions.PrimitiveClassModel.properties.float.format');
      expect(expression.evaluate(spec)).to.eq('float');
      expression = jsonata('definitions.PrimitiveClassModel.properties.float.description');
      expect(expression.evaluate(spec)).to.eq('');
    });

    it('should generate number type for @IsDouble decorator declared on class property', () => {
      let expression = jsonata('definitions.PrimitiveClassModel.properties.double.type');
      expect(expression.evaluate(spec)).to.eq('number');
      expression = jsonata('definitions.PrimitiveClassModel.properties.double.format');
      expect(expression.evaluate(spec)).to.eq('double');
      expression = jsonata('definitions.PrimitiveClassModel.properties.double.description');
      expect(expression.evaluate(spec)).to.eq('');
    });

    it('should generate integer type for jsdoc @IsInt tag on interface property', () => {
      let expression = jsonata('definitions.PrimitiveInterfaceModel.properties.int.type');
      expect(expression.evaluate(spec)).to.eq('integer');
      expression = jsonata('definitions.PrimitiveInterfaceModel.properties.int.format');
      expect(expression.evaluate(spec)).to.eq('int32');
      expression = jsonata('definitions.PrimitiveInterfaceModel.properties.int.description');
      expect(expression.evaluate(spec)).to.eq('An integer');
    });

    it('should generate integer type for jsdoc @IsLong tag on interface property', () => {
      let expression = jsonata('definitions.PrimitiveInterfaceModel.properties.long.type');
      expect(expression.evaluate(spec)).to.eq('integer');
      expression = jsonata('definitions.PrimitiveInterfaceModel.properties.long.format');
      expect(expression.evaluate(spec)).to.eq('int64');
      expression = jsonata('definitions.PrimitiveInterfaceModel.properties.long.description');
      expect(expression.evaluate(spec)).to.eq('');
    });

    it('should generate number type for jsdoc @IsFloat tag on interface property', () => {
      let expression = jsonata('definitions.PrimitiveInterfaceModel.properties.float.type');
      expect(expression.evaluate(spec)).to.eq('number');
      expression = jsonata('definitions.PrimitiveInterfaceModel.properties.float.format');
      expect(expression.evaluate(spec)).to.eq('float');
      expression = jsonata('definitions.PrimitiveInterfaceModel.properties.float.description');
      expect(expression.evaluate(spec)).to.eq('');
    });

    it('should generate number type for jsdoc @IsDouble tag on interface property', () => {
      let expression = jsonata('definitions.PrimitiveInterfaceModel.properties.double.type');
      expect(expression.evaluate(spec)).to.eq('number');
      expression = jsonata('definitions.PrimitiveInterfaceModel.properties.double.format');
      expect(expression.evaluate(spec)).to.eq('double');
      expression = jsonata('definitions.PrimitiveInterfaceModel.properties.double.description');
      expect(expression.evaluate(spec)).to.eq('');
    });

    it('should generate number type decorated path params', () => {
      let expression = jsonata('paths."/primitives/{id}".get.parameters[0].type');
      expect(expression.evaluate(spec)).to.eq('integer');
      expression = jsonata('paths."/primitives/{id}".get.parameters[0].format');
      expect(expression.evaluate(spec)).to.eq('int64');
    });

    it('should generate array type names as type + Array', () => {
      let expression = jsonata('definitions.ResponseBodystringArray');
      // tslint:disable-next-line:no-unused-expression
      expect(expression.evaluate(spec)).to.not.be.undefined;
      expression = jsonata('paths."/primitives/array".get.responses."200".schema."$ref"');
      expect(expression.evaluate(spec)).to.equal('#/definitions/ResponseBodystringArray');
    });
  });

  describe('ParameterizedEndpoint', () => {
    it('should generate path param for params declared on class', () => {
      const expression = jsonata('paths."/parameterized/{objectId}/test".get.parameters[0].in');
      expect(expression.evaluate(spec)).to.eq('path');
      });
  });

  describe('AbstractEntityEndpoint', () => {
    it('should not duplicate inherited properties in the required list', () => {
      const expression = jsonata('definitions.NamedEntity.required');
      expect(expression.evaluate(spec)).to.deep.equal(['id', 'name']);
    });

    it('should use property description from base class if not defined in child', () => {
      const expression = jsonata('definitions.NamedEntity.properties.id.description');
      expect(expression.evaluate(spec)).to.eq('A numeric identifier');
    });
  });

  describe('SecureEndpoint', () => {
    it('should apply controller security to request', () => {
      const expression = jsonata('paths."/secure".get.security');
      expect(expression.evaluate(spec)).to.deep.equal([ { 'access_token': [] } ]);
    });

    it('method security should override controller security', () => {
      const expression = jsonata('paths."/secure".post.security');
      expect(expression.evaluate(spec)).to.deep.equal([ { 'user_email': [] } ]);
    });
  });

  describe('SuperSecureEndpoint', () => {
    it('should apply two controller securities to request', () => {
      const expression = jsonata('paths."/supersecure".get.security');
      expect(expression.evaluate(spec)).to.deep.equal([ { 'access_token': [] }, { 'user_email': [] } ]);
    });
  });
});
