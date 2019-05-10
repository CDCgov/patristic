const patristic = require('../dist/patristic');
if(!test) test = require('jest');

const newick = "(A:0.1,B:0.2,(C:0.3,D:0.4):0.5);";
var tree = patristic.parseNewick(newick);

test('Tree can return ancestors like d3-hierarchy', () => {
  expect(tree.children[2].children[1].ancestors()).toEqual([tree.children[2].children[1], tree.children[2], tree]);
});
