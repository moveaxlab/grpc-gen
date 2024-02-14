import * as ts from "typescript";
import { readdirSync, writeFileSync } from "fs";
import { basename, join } from "path";

export function generateTypesIndex(basePath: string, packageName: string) {
  const result = ts.createSourceFile(
    "types.ts",
    "",
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.TS,
  );

  const printer = ts.createPrinter({});

  const output: string[] = [];

  const packageFiles = readdirSync(join(basePath, packageName)).map((f) =>
    join(basePath, packageName, f),
  );

  const program = ts.createProgram(packageFiles, {});

  const importDeclarations: Array<ts.ImportDeclaration> = [];
  const packageInterfaceMembers: Array<ts.PropertySignature> = [];

  const sourceFiles = program.getSourceFiles();

  for (const sourceFile of sourceFiles) {
    if (!sourceFile.fileName.includes(join(basePath, packageName))) {
      continue;
    }

    const fileImportSpecifiers: Array<ts.ImportSpecifier> = [];

    ts.forEachChild(sourceFile, (node) => {
      if (ts.isInterfaceDeclaration(node)) {
        fileImportSpecifiers.push(
          ts.factory.createImportSpecifier(
            false,
            undefined,
            ts.factory.createIdentifier(node.name.text),
          ),
        );

        packageInterfaceMembers.push(
          ts.factory.createPropertySignature(
            undefined,
            node.name.text,
            undefined,
            ts.factory.createTypeReferenceNode(node.name.text),
          ),
        );
      }
    });

    if (fileImportSpecifiers.length == 0) {
      continue;
    }

    importDeclarations.push(
      ts.factory.createImportDeclaration(
        undefined,
        ts.factory.createImportClause(
          false,
          undefined,
          ts.factory.createNamedImports(fileImportSpecifiers),
        ),
        ts.factory.createStringLiteral(
          `./${basename(sourceFile.fileName, ".ts")}`,
        ),
      ),
    );
  }

  const packageInterface = ts.factory.createInterfaceDeclaration(
    undefined,
    packageName,
    undefined,
    undefined,
    packageInterfaceMembers,
  );

  for (const importDeclaration of importDeclarations) {
    output.push(
      printer.printNode(ts.EmitHint.Unspecified, importDeclaration, result),
    );
  }

  output.push(
    printer.printNode(ts.EmitHint.Unspecified, packageInterface, result),
  );

  const exportDeclaration = ts.factory.createExportDeclaration(
    undefined,
    false,
    ts.factory.createNamedExports([
      ts.factory.createExportSpecifier(false, undefined, packageName),
    ]),
  );

  output.push(
    printer.printNode(ts.EmitHint.Unspecified, exportDeclaration, result),
  );

  writeFileSync(join(basePath, packageName, "types.ts"), output.join("\n"));
}
