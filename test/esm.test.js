const { execFileSync } = require("child_process");
const path = require("path");
const patristic = require("../dist/patristic");
if (!test) test = require("jest");

// Jest runs CommonJS, so import the ES module build in a separate Node process.
function importESM(code) {
  let url = "file://" + path.resolve(__dirname, "../dist/patristic.mjs");
  let script = `import * as patristic from ${JSON.stringify(url)};\n${code}`;
  return JSON.parse(
    execFileSync(process.execPath, ["--input-type=module", "-e", script], {
      encoding: "utf8"
    })
  );
}

test("the ES module build has the same exports as the UMD build", () => {
  let exports = importESM(
    "console.log(JSON.stringify(Object.keys(patristic).sort()));"
  );
  expect(exports).toEqual([...Object.keys(patristic), "default"].sort());
});

test("the ES module build works", () => {
  let newick = importESM(`
    let tree = patristic.parseNewick("(A:0.1,B:0.2,(C:0.3,D:0.4):0.5);");
    console.log(JSON.stringify(tree.toNewick()));
  `);
  expect(newick).toBe("(A:0.1,B:0.2,(C:0.3,D:0.4):0.5);");
});

test("the ES module build's default export holds the same exports", () => {
  let keys = importESM(
    "console.log(JSON.stringify(Object.keys(patristic.default).sort()));"
  );
  expect(keys).toEqual(Object.keys(patristic).sort());
});

test("the package resolves to the ES module build for import, UMD for require", () => {
  let run = script =>
    execFileSync(process.execPath, ["--input-type=module", "-e", script], {
      encoding: "utf8",
      cwd: path.resolve(__dirname, "..")
    }).trim();
  expect(run('console.log(import.meta.resolve("patristic"))')).toMatch(
    /\/dist\/patristic\.mjs$/
  );
  expect(
    run(
      'import { createRequire } from "module"; console.log(createRequire(import.meta.url).resolve("patristic"))'
    )
  ).toMatch(/\/dist\/patristic\.js$/);
  // Paths into the package stay reachable.
  expect(run('console.log(import.meta.resolve("patristic/dist/patristic.min.js"))')).toMatch(
    /\/dist\/patristic\.min\.js$/
  );
});
