'use strict';

import { ArgumentParser } from 'argparse';
import { Config, SwaggerConfig } from './config';
import { MetadataGenerator } from './metadata/metadataGenerator';
import { SpecGenerator } from './swagger/generator';

const parser = new ArgumentParser({
    addHelp: true,
    description: 'Tree-Gateway Swagger tool',
    version: '0.0.1'
});

parser.addArgument(
    ['-c', '--config'],
    {
        help: 'The swagger config file (swagger.json).'
    }
);

const getPackageJsonValue = (key: string): string => {
    try {
        const packageJson = require(`${workingDir}/package.json`);
        return packageJson[key] || '';
    } catch (err) {
        return '';
    }
};

const versionDefault = getPackageJsonValue('version');
const nameDefault = getPackageJsonValue('name');
const descriptionDefault = getPackageJsonValue('description');
const licenseDefault = getPackageJsonValue('license');

const getConfig = (configPath = 'swagger.json'): Config => {
    let config: Config;
    try {
        config = require(`${workingDir}/${configPath}`);
    } catch (err) {
        if (err.code === 'MODULE_NOT_FOUND') {
            throw Error(`No config file found at '${configPath}'`);
        } else if (err.name === 'SyntaxError') {
            throw Error(`Invalid JSON syntax in config at '${configPath}': ${err.message}`);
        } else {
            throw Error(`Unhandled error encountered loading '${configPath}': ${err.message}`);
        }
    }

    return config;
};

const validateSwaggerConfig = (config: SwaggerConfig): SwaggerConfig => {
    if (!config.outputDirectory) { throw new Error('Missing outputDirectory: onfiguration most contain output directory'); }
    if (!config.entryFile) { throw new Error('Missing entryFile: Configuration must contain an entry point file.'); }
    config.version = config.version || versionDefault;
    config.name = config.name || nameDefault;
    config.description = config.description || descriptionDefault;
    config.license = config.license || licenseDefault;
    config.basePath = config.basePath || '/';
    config.yaml = config.yaml || true;

    return config;
};

const workingDir: string = process.cwd();

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
