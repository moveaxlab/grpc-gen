#!/usr/bin/env node

import { program } from "commander";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "fs";
import { join, parse } from "path";
import { execSync } from "child_process";
import { createLogger, format, transports } from "winston";
import { generateTypesIndex } from "./generate_types_index";
import { generateRootTypesIndex } from "./generate_root_types_index";

program
  .requiredOption("-i, --models <dir>", "root directory for the models")
  .requiredOption("-o, --output <dir>", "output directory for generated types")
  .option("-d, --debug", "print debug logs");

program.parse();

const options = program.opts();

const logger = createLogger({
  format: format.cli(),
  level: options.debug ? "debug" : "info",
  transports: [new transports.Console()],
});

let services = program.args;

const allServices = readdirSync(options.models);
let generateAll = false;

if (services.length == 0) {
  logger.info(`No services specified, generating code for all services`);
  services = allServices;
  generateAll = true;
}

for (const service of services) {
  if (!allServices.includes(service)) {
    logger.error(
      `Service ${service} not found in models directory ${options.models}`,
    );
    process.exit(1);
  }
}

logger.debug(`Creating output directory ${options.output}`);
mkdirSync(options.output, { recursive: true });

for (const service of services) {
  logger.debug(`Cleaning output directory for service ${service}`);
  rmSync(join(options.output, service), { force: true, recursive: true });
  mkdirSync(join(options.output, service));
}

if (generateAll) {
  logger.debug(`Generating typescript code for all services`);
  execSync(`yarn run proto-loader-gen-types \
    --longs=Long \
    --defaults=true \
    --arrays=true \
    --objects=true \
    --keepCase=true \
    --grpcLib=@grpc/grpc-js \
    --inputTemplate "%s__input" \
    --outputTemplate "%s" \
    --includeDirs="${options.models}" \
    --outDir="${options.output}" \
    ${options.models}/**/*.proto`);
} else {
  for (const service of services) {
    logger.debug(`Generating typescript code for ${service} services`);
    execSync(`yarn run proto-loader-gen-types \
    --longs=Long \
    --defaults=true \
    --arrays=true \
    --objects=true \
    --keepCase=true \
    --grpcLib=@grpc/grpc-js \
    --inputTemplate "%s__input" \
    --outputTemplate "%s" \
    --includeDirs="${options.models}" \
    --outDir="${options.output}" \
    ${options.models}/${service}/*.proto`);
  }
}

logger.debug(`Removing unneded generated files`);
execSync(`find ${options.output} -maxdepth 1 -type f -delete`);

for (const service of services) {
  const indexFile = join(options.output, service, "index.ts");
  logger.debug(`Deleting index file ${indexFile} for service ${service}`);
  rmSync(indexFile, { force: true });
  logger.debug(`Listing all generated files for ${service}`);
  const generatedFiles = readdirSync(join(options.output, service));
  logger.debug(`Creating index file for ${service}`);
  writeFileSync(
    indexFile,
    generatedFiles.map((f) => `export * from './${parse(f).name}';`).join("\n"),
  );
  logger.debug(`Creating types index for ${service}`);
  generateTypesIndex(options.output, service);
}

logger.debug(`Creating global index file`);
rmSync(join(options.output, "index.ts"), { force: true });
const generatedServices = readdirSync(options.output).filter((dir) => {
  return existsSync(`${options.output}/${dir}/index.ts`);
});

writeFileSync(
  join(options.output, "index.ts"),
  generatedServices.map((s) => `import * as ${s} from './${s}';`).join("\n") +
    "\n\nexport {\n" +
    generatedServices.map((s) => `  ${s},`).join("\n") +
    "\n};",
);

generateRootTypesIndex(options.output, generatedServices);

const parserContents = readFileSync(join(__dirname, "Parser.txt"));
writeFileSync(
  join(options.output, "Parser.ts"),
  "import { models } from './types';\n" + parserContents,
);
