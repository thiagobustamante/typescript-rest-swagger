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
      let expression = jsonata('paths."/mypath".get.responses.400.description');
      expect(expression.evaluate(spec)).to.eq('The request format was incorrect.');
      expression = jsonata('paths."/mypath".get.responses.500.description');
      expect(expression.evaluate(spec)).to.eq('There was an unexpected error.');
    });

    it('should support multiple response decorators', () => {
      const expression = jsonata('definitions.SimpleHelloType.properties.greeting.description');
      expect(expression.evaluate(spec)).to.eq('Description for greeting property');
    });

  });

 describe('TypeEndpoint', () => {
    it('should generate definitions for type aliases', () => {
      expect(spec.paths).to.have.property('/type/{param}');
      const expression = jsonata('definitions.SimpleHelloType.properties.greeting.description');
      expect(expression.evaluate(spec)).to.eq('Description for greeting property');
    });
  });
});
