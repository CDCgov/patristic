import { copyFileSync, existsSync, readFileSync } from 'node:fs';

// `npm run build` first compiles src/ with tsc into build/, which this bundles.

// tsc names the declarations after the sources, which are named after the
// bundles, so they can be copied as they are.
const copyDeclarations = {
  name: 'copy-declarations',
  writeBundle() {
    for (const file of ['patristic.d.ts', 'patristic.d.mts']) {
      copyFileSync(`build/${file}`, `dist/${file}`);
    }
  }
};

// Rollup doesn't read the source maps tsc writes next to its output, so this
// hands each one over with its file. Rollup then maps the bundles all the way
// back to src/.
const loadSourceMaps = {
  name: 'load-source-maps',
  load(id) {
    if (!id.startsWith(`${process.cwd()}/build/`) || !existsSync(`${id}.map`)) return null;
    return { code: readFileSync(id, 'utf8'), map: readFileSync(`${id}.map`, 'utf8') };
  }
};

export default [
  {
    input: 'build/patristic.js',
    output: {
      file: 'dist/patristic.js',
      format: 'umd',
      name: 'patristic',
      sourcemap: true
    },
    plugins: [loadSourceMaps]
  },
  {
    input: 'build/patristic.mjs',
    output: {
      file: 'dist/patristic.mjs',
      format: 'es',
      sourcemap: true
    },
    plugins: [loadSourceMaps, copyDeclarations]
  }
];
