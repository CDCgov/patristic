const patristic = require("../dist/patristic");
if (!test) test = require("jest");

// A fully unbalanced ("caterpillar") tree is as deep as it has tips, the worst
// case for anything that recurses once per level.
const N = 100000;
function caterpillar(n) {
  let s = "T0";
  for (let i = 1; i < n; i++) s = `(${s}:1,T${i}:1)`;
  return s + ";";
}
const newick = caterpillar(N);

// Tests here only read the tree.
let tree;
beforeAll(() => {
  tree = patristic.parseNewick(newick);
});

describe(`a ${N}-tip caterpillar`, () => {
  test("parses", () => {
    expect(tree.height).toBe(N - 1);
    expect(tree.value).toBe(2 * N - 1);
    expect(tree.getDescendant("T0").depth).toBe(N - 1);
  });

  test("traverses", () => {
    let preorder = 0,
      postorder = [];
    tree.eachBefore(() => preorder++);
    tree.eachAfter(d => postorder.push(d));
    expect(preorder).toBe(2 * N - 1);
    expect(postorder[0].id).toBe("T0");
    expect(postorder[postorder.length - 1]).toBe(tree);
  });

  test("lists descendants and leaves", () => {
    let leaves = tree.getLeaves();
    expect(leaves).toHaveLength(N);
    expect(leaves[0].id).toBe("T0");
    expect(leaves[N - 1].id).toBe(`T${N - 1}`);
    expect(tree.descendants()).toHaveLength(2 * N - 1);
    expect(tree.getDescendants()).toHaveLength(2 * N - 2);
  });

  test("checks consistency and ancestry", () => {
    expect(tree.isConsistent()).toBe(true);
    expect(tree.fixParenthood()).toBe(tree);
    let t0 = tree.getDescendant("T0");
    expect(t0.isDescendantOf(tree)).toBe(true);
    expect(tree.isDescendantOf(t0)).toBe(false);
  });

  test("round-trips through Newick", () => {
    expect(tree.toNewick()).toBe(newick);
  });

  test("round-trips through objects", () => {
    let t = patristic.parseJSON(tree.toObject());
    expect(t.height).toBe(N - 1);
    expect(t.toNewick()).toBe(newick);
  });

  test("copies and clones", () => {
    for (let t of [tree.copy(), tree.clone()]) {
      expect(t.height).toBe(N - 1);
      expect(t.toNewick()).toBe(newick);
    }
  });
});

describe("a Branch with 200,000 children", () => {
  test("can be excised", () => {
    let root = patristic.parseNewick("(A:1,X:1,B:1);");
    let x = root.children[1];
    for (let i = 0; i < 200000; i++) x.addChild({ id: `C${i}`, length: 1 });
    let children = root.children;
    expect(x.excise()).toBe(root);
    expect(root.children).toBe(children);
    expect(root.children).toHaveLength(200002);
    expect(root.children[0].id).toBe("A");
    expect(root.children[1].id).toBe("C0");
    expect(root.children[200000].id).toBe("C199999");
    expect(root.children[200001].id).toBe("B");
    expect(root.children[1].length).toBe(2);
    expect(root.isConsistent()).toBe(true);
  });
});
