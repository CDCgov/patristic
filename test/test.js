const patristic = require('../dist/patristic');

const newick = "(A:0.1,B:0.2,(C:0.3,D:0.4):0.5);";
var tree = patristic.parseNewick(newick);

test('Newick Parsing and Serialization', () => {
  expect(tree.toNewick()).toEqual('(A:0.1,B:0.2,(C:0.3,D:0.4):0.5);');
});

test('JSON Serialization', () => {
  let json = '{"id":"","length":0,"children":[{"id":"A","length":0.1},{"id":"B","length":0.2},{"id":"","length":0.5,"children":[{"id":"C","length":0.3},{"id":"D","length":0.4}]}]}';
  expect(JSON.stringify(tree.toObject())).toEqual(json);
  expect(JSON.stringify(tree.toJSON())).toEqual(json);
  expect(JSON.stringify(tree)).toEqual(json);
});

test('Tree Consistency', () => {
  expect(tree.isConsistent()).toBe(true);
  let clone = patristic.parseNewick(newick);
  clone.children[0].parent = clone.children[1];
  expect(clone.isConsistent()).toBe(false);
});

test('Tree can addChild', () => {
  //Note that Branch.addChild returns the new child, so we have to ascend a step
  //to check the whole tree.
  expect(JSON.stringify(tree.addChild({'id': 'luca'}).parent)).toEqual('{"id":"","length":0,"children":[{"id":"A","length":0.1},{"id":"B","length":0.2},{"id":"","length":0.5,"children":[{"id":"C","length":0.3},{"id":"D","length":0.4}]},{"id":"luca","length":0}]}');
});
