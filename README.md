# gRPC gen

![NPM License](https://img.shields.io/npm/l/%40moveaxlab%2Fgrpc-gen)
![NPM Version](https://img.shields.io/npm/v/%40moveaxlab%2Fgrpc-gen)

This package contains some opinionated utility functions to generate TypeScript types
from protobuf files, to interact with gRPC services and protobuf in general.

The goal of this package is to avoid the code bloat caused by generating JS code:
we prefer to rely on packages like `@grpc/proto-loader` to generate code
at runtime from raw `.proto` files.
For this reason we want to generate only TypeScript types,
and let other packages generate the code needed to parse protobuf messages.

## Installation

```bash
yarn add --dev @moveaxlab/grpc-gen
```

## Usage

This tool comes with opinionated defaults on how protobuf files must be structured
and how code will be generated.

The expected directory structure is the following:

```
protobuf/
  common/
    file1.proto
    file2.proto
  service1/
    file1.proto
    file2.proto
  service2/
    file1.proto
    file2.proto
```

To generate code:

```bash
yarn grpc-gen -i <protobuf directory> -o <output directory> [services ...]
```

Omitting the `services` positional argument will generate code for all services
contained in the `protobuf directory` option.

The output directory will contain an index file with types for all packages,
and a `Parser.ts` file that allows you to manually decode and encode
protobuf messages in a type safe way.

To use the parser:

```typescript
import { Parser } from "./__generated__/Parser";

// obtain a parser for a generated package
const packageParser = Parser.forPackage("mypackage");

// use the parser to encode and decode protobuf data
const encodedBuffer = packageParser.encode("myType", {
  /* data */
});
const decodedValue = packageParser.decode("myType", encodedBuffer);
```

The parser relies on `@grpc/proto-loader` to load protobuf definitions at runtime,
and must be configured before usage to know where protobuf models are:

```typescript
import { join, dirname } from "path";
import { setModelsFolder, addIncludeDir } from "./__generated__/Parser";

setModelsFolder(
  process.env.NODE_ENV === "production" ? "/app/protobuf" : "../../protobuf",
);

addIncludeDIr(
  process.env.NODE_ENV == "production"
    ? "/app/node_modules/grpc-tools/bin"
    : join(dirname(require.resolve("grpc-tools")), "bin"),
);
```

Generated types are compatible with [`@moveaxlab/nestjs-grpc-client`](https://github.com/moveaxlab/nestjs-grpc-client).
