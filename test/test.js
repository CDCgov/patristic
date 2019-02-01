const patristic = require('../index');

const newick = "(A:0.1,B:0.2,(C:0.3,D:0.4):0.5);";
var tree = patristic.parseNewick(newick);

test('Newick Parses', () => {
  expect(tree.toNewick()).toEqual('(A:0.1,B:0.2,(C:0.3,D:0.4):0.5);');
});

test('Tree is Consistent', () => {
  expect(tree.isConsistent()).toBe(true);
});

test('Tree Consistency check works', () => {
  let clone = patristic.parseNewick(newick);
  clone.children[0].parent = clone.children[1];
  expect(clone.isConsistent()).toBe(false);
});
