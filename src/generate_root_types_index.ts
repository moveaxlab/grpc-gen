import * as ts from "typescript";
import { existsSync, writeFileSync } from "fs";
import { join } from "path";

export function generateRootTypesIndex(basePath: string, packages: string[]) {
  const result = ts.createSourceFile(
    "types.ts",
    "",
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.TS,
  );

  const printer = ts.createPrinter({});

  const output: string[] = [];

  const basePackageInterfaceMembers: Array<ts.PropertySignature> = [];

  for (const packageName of packages) {
    if (!existsSync(join(basePath, packageName, "types.ts"))) {
      continue;
    }

    const packageImport = ts.factory.createImportDeclaration(
      undefined,
      ts.factory.createImportClause(
        false,
        undefined,
        ts.factory.createNamedImports([
          ts.factory.createImportSpecifier(
            false,
            undefined,
            ts.factory.createIdentifier(packageName),
          ),
        ]),
      ),
      ts.factory.createStringLiteral(`./${packageName}/types`),
    );

    output.push(
      printer.printNode(ts.EmitHint.Unspecified, packageImport, result),
    );

    basePackageInterfaceMembers.push(
      ts.factory.createPropertySignature(
        undefined,
        packageName,
        undefined,
        ts.factory.createTypeReferenceNode(packageName),
      ),
    );
  }

  const modelsInterface = ts.factory.createInterfaceDeclaration(
    undefined,
    "models",
    undefined,
    undefined,
    basePackageInterfaceMembers,
  );

  output.push(
    printer.printNode(ts.EmitHint.Unspecified, modelsInterface, result),
  );

  const exportDeclaration = ts.factory.createExportDeclaration(
    undefined,
    false,
    ts.factory.createNamedExports([
      ts.factory.createExportSpecifier(false, undefined, "models"),
    ]),
  );

  output.push(
    printer.printNode(ts.EmitHint.Unspecified, exportDeclaration, result),
  );

  writeFileSync(join(basePath, "types.ts"), output.join("\n"));
}
