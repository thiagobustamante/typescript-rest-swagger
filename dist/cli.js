#!/usr/bin/env node
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var argparse_1 = require("argparse");
var metadataGenerator_1 = require("./metadata/metadataGenerator");
var generator_1 = require("./swagger/generator");
var parser = new argparse_1.ArgumentParser({
    addHelp: true,
    description: 'Tree-Gateway Swagger tool',
    version: '0.0.1'
});
parser.addArgument(['-c', '--config'], {
    help: 'The swagger config file (swagger.json).'
});
var getPackageJsonValue = function (key) {
    try {
        var packageJson = require(workingDir + "/package.json");
        return packageJson[key] || '';
    }
    catch (err) {
        return '';
    }
};
var versionDefault = getPackageJsonValue('version');
var nameDefault = getPackageJsonValue('name');
var descriptionDefault = getPackageJsonValue('description');
var licenseDefault = getPackageJsonValue('license');
var getConfig = function (configPath) {
    if (configPath === void 0) { configPath = 'swagger.json'; }
    var config;
    try {
        config = require(workingDir + "/" + configPath);
    }
    catch (err) {
        if (err.code === 'MODULE_NOT_FOUND') {
            throw Error("No config file found at '" + configPath + "'");
        }
        else if (err.name === 'SyntaxError') {
            throw Error("Invalid JSON syntax in config at '" + configPath + "': " + err.message);
        }
        else {
            throw Error("Unhandled error encountered loading '" + configPath + "': " + err.message);
        }
    }
    return config;
};
var validateSwaggerConfig = function (config) {
    if (!config.outputDirectory) {
        throw new Error('Missing outputDirectory: onfiguration most contain output directory');
    }
    if (!config.entryFile) {
        throw new Error('Missing entryFile: Configuration must contain an entry point file.');
    }
    config.version = config.version || versionDefault;
    config.name = config.name || nameDefault;
    config.description = config.description || descriptionDefault;
    config.license = config.license || licenseDefault;
    config.basePath = config.basePath || '/';
    config.yaml = config.yaml || true;
    return config;
};
var workingDir = process.cwd();
var parameters = parser.parseArgs();
var config = getConfig(parameters.config);
var swaggerConfig = validateSwaggerConfig(config.swagger);
var metadata = new metadataGenerator_1.MetadataGenerator(swaggerConfig.entryFile).generate();
new generator_1.SpecGenerator(metadata, swaggerConfig).generate(swaggerConfig.outputDirectory, swaggerConfig.yaml)
    .then(function () {
    console.info('Generation completed.');
})
    .catch(function (err) {
    console.error("Error generating swagger. " + err);
});
//# sourceMappingURL=cli.js.map