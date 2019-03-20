#!/usr/bin/env node
'use strict';

import { isAbsolute, join } from 'path';
import * as ts from 'typescript';
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
    description: 'Typescript-REST Swagger tool',
    version: packageJson.version
});

parser.addArgument(
    ['-c', '--config'],
    {
        help: 'The swagger config file (swagger.json).'
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

const swaggerConfig = validateSwaggerConfig(config.swagger);

const metadata = new MetadataGenerator(swaggerConfig.entryFile, compilerOptions).generate();
new SpecGenerator(metadata, swaggerConfig).generate(swaggerConfig.outputDirectory, swaggerConfig.yaml)
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
        return tsConfig.compilerOptions || {};
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

function getAbsolutePath(path: string, basePath: string): string {
    if (isAbsolute(path)) {
        return path;
    } else {
        return join(basePath, path);
    }
}
