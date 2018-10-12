#!/usr/bin/env node
'use strict';

import { ArgumentParser } from 'argparse';
import { Config, SwaggerConfig } from './config';
import { MetadataGenerator } from './metadata/metadataGenerator';
import { SpecGenerator } from './swagger/generator';

const packageJson = require(`../package.json`);

const workingDir: string = process.cwd();
const versionDefault = getPackageJsonValue('version');
const nameDefault = getPackageJsonValue('name');
const descriptionDefault = getPackageJsonValue('description');
const licenseDefault = getPackageJsonValue('license');

const parser = new ArgumentParser({
    addHelp: true,
    description: 'Tree-Gateway Swagger tool',
    version: packageJson.version
});

parser.addArgument(
    ['-c', '--config'],
    {
        help: 'The swagger config file (swagger.json).'
    }
);

const parameters = parser.parseArgs();
const config = getConfig(parameters.config);

const swaggerConfig = validateSwaggerConfig(config.swagger);
const metadata = new MetadataGenerator(swaggerConfig.entryFile).generate();
new SpecGenerator(metadata, swaggerConfig).generate(swaggerConfig.outputDirectory, swaggerConfig.yaml)
    .then(() => {
        console.info ('Generation completed.');
    })
    .catch((err: any) => {
        console.error(`Error generating swagger. ${err}`);
    });

function getPackageJsonValue(key: string): string {
    try {
        const projectPackageJson = require(`${workingDir}/package.json`);
        return projectPackageJson[key] || '';
    } catch (err) {
        return '';
    }
}

function getConfig(configPath = 'swagger.json'): Config {
    try {
        return require(`${workingDir}/${configPath}`);
    } catch (err) {
        if (err.code === 'MODULE_NOT_FOUND') {
            throw Error(`No config file found at '${configPath}'`);
        } else if (err.name === 'SyntaxError') {
            throw Error(`Invalid JSON syntax in config at '${configPath}': ${err.message}`);
        } else {
            throw Error(`Unhandled error encountered loading '${configPath}': ${err.message}`);
        }
    }
}

function validateSwaggerConfig(conf: SwaggerConfig): SwaggerConfig {
    if (!conf.outputDirectory) { throw new Error('Missing outputDirectory: onfiguration most contain output directory'); }
    if (!conf.entryFile) { throw new Error('Missing entryFile: Configuration must contain an entry point file.'); }
    conf.version = conf.version || versionDefault;
    conf.name = conf.name || nameDefault;
    conf.description = conf.description || descriptionDefault;
    conf.license = conf.license || licenseDefault;
    conf.yaml = conf.yaml === false ? false : true;

    return conf;
}
