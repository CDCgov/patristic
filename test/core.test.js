const patristic = require("../dist/patristic");
if (!test) test = require("jest");

const newick = "(A:0.1,B:0.2,(C:0.3,D:0.4):0.5);";
let tree = patristic.parseNewick(newick);

test("Newick Parsing and Serialization", () => {
  expect(tree.toNewick()).toEqual(newick);
});

test("JSON Serialization", () => {
  let json =
    '{"id":"","length":0,"children":[{"id":"A","length":0.1},{"id":"B","length":0.2},{"id":"","length":0.5,"children":[{"id":"C","length":0.3},{"id":"D","length":0.4}]}]}';
  expect(JSON.stringify(tree.toObject())).toEqual(json);
  expect(JSON.stringify(tree.toJSON())).toEqual(json);
  expect(JSON.stringify(tree)).toEqual(json);
});

test("Tree can getRoot", () => {
  expect(tree.children[2].children[1].getRoot()).toBe(tree);
});

test("Tree can addChild", () => {
  //Note that Branch.addChild returns the new child, so we have to ascend a step
  //to check the whole tree.
  let clone = patristic.parseNewick(newick);
  expect(JSON.stringify(clone.addChild({ id: "luca" }).getRoot())).toEqual(
    '{"id":"","length":0,"children":[{"id":"A","length":0.1},{"id":"B","length":0.2},{"id":"","length":0.5,"children":[{"id":"C","length":0.3},{"id":"D","length":0.4}]},{"id":"luca","length":0}]}'
  );
});

test("Tree can addParent", () => {
  let clone = patristic.parseNewick(newick);
  expect(JSON.stringify(clone.addParent({ id: "luca" }).getRoot())).toEqual(
    '{"id":"luca","length":0,"children":[{"id":"","length":0,"children":[{"id":"A","length":0.1},{"id":"B","length":0.2},{"id":"","length":0.5,"children":[{"id":"C","length":0.3},{"id":"D","length":0.4}]}]}]}'
  );
});

test("Tree Consistency", () => {
  expect(tree.isConsistent()).toBe(true);
  let clone = patristic.parseNewick(newick);
  clone.children[0].parent = clone.children[1];
  expect(clone.isConsistent()).toBe(false);
});

test("Tree can find descendants", () => {
  expect(tree.getDescendant("A")).toBe(tree.children[0]);
  expect(tree.getDescendant("B")).toBe(tree.children[1]);
  expect(tree.getDescendant("C")).toBe(tree.children[2].children[0]);
  expect(tree.getDescendant("D")).toBe(tree.children[2].children[1]);
  expect(tree.getDescendant("E")).toBe(
    tree.children[2].children[1].children[1]
  );
});

test("Rerooting works", () => {
  let dtbe = patristic.parseNewick(
    "(19RF0118:2,(((((10L7127:1,11L1117:1),(10L9175,10L8592):1),(17RF3547:4,(((((((17RF6547,18RF2741),18RF0577),19RF0987):8,18RF0763:4),12L0360:5),18RF6688:5):1,(18RF5919:8,MRCA):1):2):2),12L6184:2),16RF7906:2):2);"
  );
  let a = dtbe.getDescendant("19RF0118");
  let b = dtbe.getDescendant("18RF5919");
  expect(dtbe.distanceBetween(a, b)).toEqual(17);
  let rooted = dtbe.getDescendant("MRCA").reroot();
  expect(rooted.distanceBetween(a, b)).toEqual(17);
  let rerooted = rooted.getDescendant("10L8592").reroot();
  expect(rerooted.distanceBetween(a, b)).toEqual(17);
});

test("Consolidation works", () => {
  let simplifiable = "(A:0.1,B:0.2,(C,D:0.4):0.5);";
  let simpTree = patristic.parseNewick(simplifiable);
  expect(simpTree.consolidate().toNewick()).toBe("(A:0.1,B:0.2,(D:0.4)C:0.5);");
});

test("Simplification works", () => {
  let simplifiable = "(A:0.1,B:0.2,(D:0.4):0.5);";
  let simpTree = patristic.parseNewick(simplifiable);
  expect(simpTree.simplify().toNewick()).toBe("(A:0.1,B:0.2,D:0.9);");
});
