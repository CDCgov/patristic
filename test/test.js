const patristic = require('../dist/patristic');

const newick = "(A:0.1,B:0.2,(C:0.3,D:0.4):0.5);";

test('Newick Parses', () => {
  expect(patristic.parseNewick(newick).toNewick()).toEqual('(A:0.1,B:0.2,(C:0.3,D:0.4):0.5);');
});
