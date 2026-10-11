// `npm run build` first compiles src/ with tsc into build/, which this bundles.
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
    }
  }
];
