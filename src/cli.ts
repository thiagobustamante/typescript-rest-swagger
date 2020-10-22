#!/usr/bin/env node
'use strict';

import { ArgumentParser } from 'argparse';
import * as debug from 'debug';
import * as fs from 'fs-extra-promise';
import * as _ from 'lodash';
import { isAbsolute, join } from 'path';
import * as path from 'path';
import * as ts from 'typescript';
import * as YAML from 'yamljs';
import { Config, Specification, SwaggerConfig } from './config';
import { MetadataGenerator } from './metadata/metadataGenerator';
import { SpecGenerator } from './swagger/generator';

const debugLog = debug('typescript-rest-swagger');
const packageJson = require(`../package.json`);

const workingDir: string = process.cwd();
const versionDefault = getPackageJsonValue('version');
const nameDefault = getPackageJsonValue('name');
const descriptionDefault = getPackageJsonValue('description');
const licenseDefault = getPackageJsonValue('license');

const parser = new ArgumentParser({
    addHelp: true,
    description: 'Typescript-REST Swagger tool',
    version: packageJson.version
});

parser.addArgument(
    ['-c', '--config'],
    {
        help: 'The swagger config file (swagger.json or swagger.yml or swaggerCongig.js).'
    }
);

parser.addArgument(
    ['-t', '--tsconfig'],
    {
        action: 'storeTrue',
        defaultValue: false,
        help: 'Load tsconfig.json file',
    }
);

parser.addArgument(
    ['-p', '--tsconfig_path'],
    {
        help: 'The tsconfig file (tsconfig.json) path. Default to {cwd}/tsconfig.json.',
    }
);

const parameters = parser.parseArgs();
const config = getConfig(parameters.config);
const compilerOptions = getCompilerOptions(parameters.tsconfig, parameters.tsconfig_path);
debugLog('Starting Swagger generation tool');
debugLog('Compiler Options: %j', compilerOptions);

const swaggerConfig = validateSwaggerConfig(config.swagger);
debugLog('Swagger Config: %j', swaggerConfig);

debugLog('Processing Services Metadata');
const metadata = new MetadataGenerator(swaggerConfig.entryFile, compilerOptions, swaggerConfig.ignore).generate();
debugLog('Generated Metadata: %j', metadata);

new SpecGenerator(metadata, swaggerConfig).generate()
    .then(() => {
        console.info('Generation completed.');
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
    const configFile = `${workingDir}/${configPath}`;
    if (_.endsWith(configFile, '.yml') || _.endsWith(configFile, '.yaml')) {
        return YAML.load(configFile);
    } else if (_.endsWith(configFile, '.js')) {
        return require(path.join(configFile));
    }
    else {
        return fs.readJSONSync(configFile);
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
    conf.outputFormat = conf.outputFormat ? Specification[conf.outputFormat] : Specification.Swagger_2;

    return conf;
}

function getCompilerOptions(loadTsconfig: boolean, tsconfigPath?: string | null): ts.CompilerOptions {
    if (!loadTsconfig && tsconfigPath) {
        loadTsconfig = true;
    }
    if (!loadTsconfig) {
        return {};
    }
    const cwd = process.cwd();
    const defaultTsconfigPath = join(cwd, 'tsconfig.json');
    tsconfigPath = tsconfigPath
        ? getAbsolutePath(tsconfigPath, cwd)
        : defaultTsconfigPath;
    try {
        const tsConfig = require(tsconfigPath);
        if (!tsConfig) {
            throw new Error('Invalid tsconfig');
        }
        return tsConfig.compilerOptions
            ? ts.convertCompilerOptionsFromJson(tsConfig.compilerOptions, cwd).options
            : {};
    } catch (err) {
        if (err.code === 'MODULE_NOT_FOUND') {
            throw Error(`No tsconfig file found at '${tsconfigPath}'`);
        } else if (err.name === 'SyntaxError') {
            throw Error(`Invalid JSON syntax in tsconfig at '${tsconfigPath}': ${err.message}`);
        } else {
            throw Error(`Unhandled error encountered loading tsconfig '${tsconfigPath}': ${err.message}`);
        }
    }
}

function getAbsolutePath(p: string, basePath: string): string {
    if (isAbsolute(p)) {
        return p;
    } else {
        return join(basePath, p);
    }
}
