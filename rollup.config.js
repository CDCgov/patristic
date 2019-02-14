//import resolve from 'rollup-plugin-node-resolve';

export default {
  input: 'main.js',
  output: {
    file: 'dist/patristic.js',
    format: 'umd',
    //globals: ['d3-hierarchy'],
    name: 'patristic'
  },
  plugins: [
    //resolve()
  ]
};
