const fs = require('fs');
const jsonSchemaToTypescript = require('json-schema-to-typescript');

const schemasDir = 'src/event-schemas';
const typesDir = 'src/events';
const schemaPattern = /(.*)\.json/;

const compileFromSchema = (schemaFile) => {
    const name = schemaFile.match(schemaPattern)[1];
    const eventFile = `${typesDir}/${name}.ts`;
    jsonSchemaToTypescript
        .compileFromFile(`${schemasDir}/${schemaFile}`)
        .then((ts) =>
            fs.promises.writeFile(eventFile, ts).catch((e) => {
                console.log(`Could not write event type ${schemaFile}: ${e}`);
            })
        )
        .catch((e) => {
            console.log(`Could not compile schema ${schemaFile}: ${e}`);
        });
};

const compileFromSchemas = (files) => {
    files.filter((f) => schemaPattern.test(f)).forEach(compileFromSchema);
};

const compileSchemasToTypes = () => {
    fs.promises
        .readdir(schemasDir)
        .then(compileFromSchemas)
        .catch((e) => {
            console.log(`Could not read directory ${schemasDir}: ${e}`);
            process.exit(1);
        });
};

fs.promises.mkdir(typesDir, { recursive: true }).then(compileSchemasToTypes);
