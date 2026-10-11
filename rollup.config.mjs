import { copyFileSync } from 'node:fs';

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

export default [
  {
    input: 'build/patristic.js',
    output: {
      file: 'dist/patristic.js',
      format: 'umd',
      name: 'patristic'
    }
  },
  {
    input: 'build/patristic.mjs',
    output: {
      file: 'dist/patristic.mjs',
      format: 'es'
    },
    plugins: [copyDeclarations]
  }
];
