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

    it('should generate paths for decorated services, declared on superclasses', () => {
      expect(spec.paths).to.have.property('/mypath/secondpath');
      const expression = jsonata('paths."/mypath/secondpath".get.responses.200.examples."application/json".name');
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
      let expression = jsonata('paths."/mypath".get.responses.400.description');
      expect(expression.evaluate(spec)).to.eq('The request format was incorrect.');
      expression = jsonata('paths."/mypath".get.responses.500.description');
      expect(expression.evaluate(spec)).to.eq('There was an unexpected error.');
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
  });

  describe('ParameterizedEndpoint', () => {
    it('should generate path param for params declared on class', () => {
      const expression = jsonata('paths."/parameterized/{objectId}/test".get.parameters[0].in');
      expect(expression.evaluate(spec)).to.eq('path');
      });
  });
});
