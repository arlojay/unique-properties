#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

main();

function getAllFiles(directory) {
    const files = fs.readdirSync(directory);
    let outputFiles = new Array;

    for(const file of files) {
        const filePath = path.join(directory, file);
        if(fs.statSync(filePath).isDirectory()) {
            const subFiles = getAllFiles(filePath);
            outputFiles = outputFiles.concat(subFiles);
        } else {
            outputFiles.push(filePath);
        }
    }

    return outputFiles;
}

function help() {
    console.log("Gives a beautified JSON output for an analysis of other json files' properties");
    console.log("Example: npx unique-properties -d myDirectory -p property.values.* -e testProp");
    console.log("");
    console.log("--directory <dir>: Searches in a specific directory");
    console.log("--dir, -d: Aliases for --directory");
    console.log("");
    console.log("--property <name>: Sets the scope of the search to a sub-property of a file. Wildcards can be used for arrays and objects.");
    console.log("--prop, -p: Aliases for --property");
    console.log("");
    console.log("--output <file>: Sets the analysis output file");
    console.log("--out, -o: Aliases for --output");
    console.log("");
    console.log("--exists <prop>: Checks if a property exists on each object found, ignoring if it doesn't. Wildcards can be used for arrays and objects. Can be stacked. Use !<prop> for negative searches.");
    console.log("--exist, -e: Aliases for --exists");
    console.log("");
    console.log("--help, -h: Shows this page");

    process.exit(0);
}

function main() {
    const flags = process.argv.slice(2);
    const options = {
        directory: ".",
        property: null,
        exists: [],
        doesntExist: [],
        output: "./uniquePropertyOutput.json"
    };

    for(let i = 0; i < flags.length; i++) {
        const flag = flags[i];

        switch(flag) {
            case "--help":
            case "-h":
                help();
                break;

            case "--directory":
            case "--dir":
            case "-d": {
                options.directory = flags[++i];
                if(flags[i] == null) help();
                break;
            }
            
            case "--property":
            case "--prop":
            case "-p": {
                options.property = flags[++i];
                if(flags[i] == null) help();
                continue;
            }
            
            case "--exists":
            case "--exist":
            case "-e": {
                const prop = flags[++i];
                if(flags[i] == null) help();
                if(prop.startsWith("!")) {
                    options.doesntExist.push(prop.slice(1));
                } else {
                    options.exists.push(prop);
                }
                continue;
            }

            case "--output":
            case "--out":
            case "-o": {
                options.output = flags[++i];
                if(flags[i] == null) help();
                continue;
            }

            default:
                console.error("Cannot find flag " + flag);
                help();
                break;
        }
    }

    const directory = getAllFiles(options.directory);

    const uniqueProperties = new Map;
    const requiredProperties = new Set;

    let firstObject = true;
    for(const fileName of directory) {
        const fullPath = path.resolve(fileName);
        const fileData = fs.readFileSync(fullPath);

        try {
            const json = JSON.parse(fileData);

            let objects = accessProperty(json, options.property);

            if(objects[0] instanceof Array) objects = objects.reduce((p, c) => p.concat(c), []).map(value => ({ array: value }));

            for(const prop of options.exists) {
                objects = objects.filter(object => accessProperty(object, prop).length > 0);
            }
            for(const prop of options.doesntExist) {
                objects = objects.filter(object => accessProperty(object, prop).length == 0);
            }

            for(const object of objects) {
                const properties = Object.keys(object);
                for(const property of properties) {
                    const existingProperty = uniqueProperties.get(property);

                    const value = object[property];

                    if(existingProperty == null) {
                        uniqueProperties.set(property, {
                            property,
                            types: new Set([ getType(value) ]),
                            values: new Set([ JSON.stringify(value) ])
                        });
                    } else {
                        existingProperty.types.add(getType(value));
                        existingProperty.values.add(JSON.stringify(value));
                    }

                    if(firstObject) {
                        requiredProperties.add(property);
                    }
                }

                if(firstObject) {
                    firstObject = false;
                } else {
                    for(const property of requiredProperties) {
                        if(properties.includes(property)) continue;
                        requiredProperties.delete(property);
                    }
                }
            }
        } catch(e) {
            console.error("Error while processing " + fullPath);
            console.error(e);
        }
    }

    const uniquePropertiesObject = {};
    
    for(const propertyId of uniqueProperties.keys()) {
        const propertyDescription = uniqueProperties.get(propertyId);

        uniquePropertiesObject[propertyId] = {
            required: requiredProperties.has(propertyId),
            types: Array.from(propertyDescription.types),
            values: Array.from(propertyDescription.values).map(value => JSON.parse(value)),
        };
    }
    fs.writeFileSync(options.output, JSON.stringify(uniquePropertiesObject, null, 4));
}

function getType(value) {
    if(typeof value == "object") {
        if(value instanceof Array) {
            const types = new Set(value.map(v => getType(v)));
            return "Array<" + Array.from(types).join("|") + ">";
        }


        const keyTypes = new Set;
        const valueTypes = new Set;

        for(const [ exampleKey, exampleValue ] of Object.entries(value)) {
            keyTypes.add(getType(exampleKey));
            valueTypes.add(getType(exampleValue));
        }

        return "Record<" + Array.from(keyTypes).join("|") + ", " + Array.from(valueTypes).join("|") + ">";
    }

    return typeof value;
}

function accessProperty(json, property) {
    if(property == null) return [json];

    const fieldNames = property.split(".");
    let values = new Array;
    values.push(json);

    for(const fieldName of fieldNames) {
        let subValues = new Array;
        for(const value of values) {
            if(value == null) break;

            if(fieldName == "*") {
                for(const subProperty in value) {
                    const subValue = value[subProperty];

                    if(subValue != null) subValues.push(subValue);
                }
            } else {
                const subValue = value[fieldName];
                
                if(subValue != null) subValues.push(subValue);
            }
        }

        values = subValues;
    }

    return values;
}