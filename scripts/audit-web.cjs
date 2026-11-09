// Read-only source analysis; writes reviewable inventories only inside web/docs.
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
const source = path.join(root, "src");
function files(directory) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? files(path.join(directory, entry.name))
        : [path.join(directory, entry.name)],
    );
}
const contracts = [];
const modules = files(source).filter((file) => /\.[tj]sx?$/.test(file));
const sourceFiles = modules.map((file) => ({
  path: path.relative(root, file).replaceAll("\\", "/"),
  lines: fs.readFileSync(file, "utf8").split("\n").length,
}));
const imports = new Set();
for (const file of modules) {
  const ast = ts.createSourceFile(
    file,
    fs.readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  function visit(node) {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier)
    )
      imports.add(node.moduleSpecifier.text);
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "apiRequest"
    ) {
      const options = node.arguments[1];
      const method =
        options && ts.isObjectLiteralExpression(options)
          ? options.properties.find(
              (property) =>
                ts.isPropertyAssignment(property) &&
                property.name.getText(ast) === "method",
            )
          : undefined;
      contracts.push({
        file: path.relative(root, file).replaceAll("\\", "/"),
        line: ast.getLineAndCharacterOfPosition(node.getStart()).line + 1,
        method:
          method?.initializer && ts.isStringLiteral(method.initializer)
            ? method.initializer.text
            : method
              ? method.initializer.getText(ast)
              : "POST",
        endpointExpression: node.arguments[0]?.getText(ast) ?? "",
      });
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
}
const nativeImports = [...imports].filter((name) =>
  /^(react-native|expo(?:[-/]|$)|@react-navigation)/.test(name),
);
if (nativeImports.length)
  throw new Error("Unexpected native import in web source.");
const oversized = sourceFiles.filter((file) => file.lines > 500);
if (oversized.length)
  throw new Error(
    `Source files exceed the maintainability limit: ${oversized.map((file) => file.path).join(", ")}`,
  );
fs.writeFileSync(
  path.join(root, "docs/phase-2-api-contracts.json"),
  JSON.stringify(contracts, null, 2) + "\n",
);
fs.writeFileSync(
  path.join(root, "docs/phase-2-files.json"),
  JSON.stringify(sourceFiles, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    sourceModules: modules.length,
    apiCallSites: contracts.length,
    nativeImports: nativeImports.length,
    largestSourceFile: Math.max(...sourceFiles.map((file) => file.lines)),
  }),
);
