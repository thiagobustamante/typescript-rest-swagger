import 'mocha';
import { MetadataGenerator } from '../../src/metadata/metadataGenerator';
// import {Swagger} from '../../src/swagger/swagger';
import { SpecGenerator } from '../../src/swagger/generator';
import { getDefaultOptions } from '../data/defaultOptions';
import * as chai from 'chai';

const expect = chai.expect;

describe('Definition generation', () => {
  const metadata = new MetadataGenerator('./test/data/apis.ts').generate();
  const spec = new SpecGenerator(metadata, getDefaultOptions()).getSpec();

 describe('MyService', () => {
    it('should generate paths for decorated services', () => {
      expect(spec.paths).to.have.property('/mypath');
      expect(spec.paths).to.have.property('/mypath/secondpath');
    });
 });
});
