// `npm run build` first compiles src/ with tsc into build/, which this bundles.
export default {
  input: 'build/main.js',
  output: {
    file: 'dist/patristic.js',
    format: 'umd',
    name: 'patristic'
  }
};
