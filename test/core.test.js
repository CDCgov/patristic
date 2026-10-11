const patristic = require("../dist/patristic");
if (!test) test = require("jest");

// Tests marked `test.failing` describe the intended behavior of a known bug.
// Jest reports them as passing while they fail; when the bug is fixed, flip
// them to `test`.

const newick = "(A:0.1,B:0.2,(C:0.3,D:0.4):0.5);";

// Every test gets its own tree so that mutations can't leak between tests.
let tree;
beforeEach(() => {
  tree = patristic.parseNewick(newick);
});

const ids = branches => branches.map(b => b.id);

describe("parseNewick", () => {
  test("parses structure, ids and lengths", () => {
    expect(tree).toBeInstanceOf(patristic.Branch);
    expect(tree.id).toBe("");
    expect(tree.length).toBe(0);
    expect(ids(tree.children)).toEqual(["A", "B", ""]);
    expect(ids(tree.children[2].children)).toEqual(["C", "D"]);
    expect(tree.children.map(c => c.length)).toEqual([0.1, 0.2, 0.5]);
    expect(tree.children[2].children.map(c => c.length)).toEqual([0.3, 0.4]);
    expect(tree.children[0].children).toHaveLength(0);
    expect(tree.isConsistent()).toBe(true);
  });

  test("parses internal node labels", () => {
    let t = patristic.parseNewick("((A:1,B:1)X:1,C:1)R;");
    expect(t.id).toBe("R");
    expect(t.children[0].id).toBe("X");
  });

  test("sets depth", () => {
    expect(tree.depth).toBe(0);
    expect(tree.children[0].depth).toBe(1);
    expect(tree.children[2].children[1].depth).toBe(2);
  });

  test("sets value to the number of Branches in each subtree", () => {
    expect(tree.value).toBe(6);
    expect(tree.children.map(c => c.value)).toEqual([1, 1, 3]);
  });
});

describe("serialization", () => {
  test("Newick round trip", () => {
    expect(tree.toNewick()).toEqual(newick);
  });

  test("JSON serialization", () => {
    let json =
      '{"id":"","length":0,"children":[{"id":"A","length":0.1},{"id":"B","length":0.2},{"id":"","length":0.5,"children":[{"id":"C","length":0.3},{"id":"D","length":0.4}]}]}';
    expect(JSON.stringify(tree.toObject())).toEqual(json);
    expect(JSON.stringify(tree.toJSON())).toEqual(json);
    expect(JSON.stringify(tree)).toEqual(json);
  });

  test("toString", () => {
    expect(JSON.parse(tree.toString())).toEqual(tree.toObject());
    expect(tree.toString(null, 2)).toContain("\n  ");
  });

  test("parseJSON round trip", () => {
    let t = patristic.parseJSON(tree.toString());
    expect(t.toNewick()).toBe(newick);
    expect(t.isConsistent()).toBe(true);
  });

  test("numbers are written without scientific notation", () => {
    tree.children[0].length = 1e21;
    expect(tree.toNewick()).toMatch(/A:10{21}\b/);
    tree.children[0].length = -1.5;
    expect(tree.toNewick()).toContain("A:-1.5");
  });
});

describe("Branch constructor", () => {
  test("handles empty input", () => {
    for (let data of [undefined, null, {}]) {
      let b = new patristic.Branch(data);
      expect(b.id).toBe("");
      expect(b.length).toBe(0);
      expect(b.depth).toBe(0);
      expect(b.height).toBe(0);
      expect(b.value).toBe(1);
      expect(b.parent).toBeNull();
      expect(b.children).toEqual([]);
      expect(b._guid).toBeDefined();
    }
    let guids = tree.descendants().map(d => d._guid);
    expect(new Set(guids).size).toBe(guids.length);
  });

  test("accepts a children accessor", () => {
    let data = { id: "test", children: [{ id: "child1" }] };
    let branch = new patristic.Branch(data, d =>
      d.children.map(c => new patristic.Branch(c))
    );
    expect(branch.id).toBe("test");
    expect(ids(branch.children)).toEqual(["child1"]);
    expect(new patristic.Branch({}, () => []).children).toEqual([]);
  });
});

describe("tree construction", () => {
  test("addChild with data returns the new child", () => {
    let child = tree.children[2].addChild({ id: "E", length: 0.6 });
    expect(child).toBeInstanceOf(patristic.Branch);
    expect(child.parent).toBe(tree.children[2]);
    expect(child.length).toBe(0.6);
    expect(tree.children[2].children).toContain(child);
  });

  test("addChild keeps the caller's data object as is", () => {
    let data = { id: "E", length: 0.6 };
    let child = tree.addChild(data);
    expect(data).toEqual({ id: "E", length: 0.6 });
    expect(child.data).toBe(data);
  });

  test("Branches don't keep their parent in their data", () => {
    let x = tree.children[2];
    x.isolate();
    expect(Object.values(x.data)).not.toContain(tree);
  });

  test("addChild with a Branch returns that Branch", () => {
    let e = new patristic.Branch({ id: "E", length: 0.6 });
    expect(tree.addChild(e)).toBe(e);
    expect(e.parent).toBe(tree);
    expect(tree.children).toContain(e);
  });

  test("addParent", () => {
    let node = tree.children[0];
    let newParent = new patristic.Branch({ id: "P" });
    let sibling = new patristic.Branch({ id: "S" });
    expect(node.addParent(newParent, [sibling])).toBe(node);
    expect(node.parent).toBe(newParent);
    expect(sibling.parent).toBe(newParent);
    expect(newParent.children).toEqual([node, sibling]);
  });

  test("replace", () => {
    let e = new patristic.Branch({ id: "E", length: 0.5 });
    expect(tree.children[2].replace(e)).toBe(tree);
    expect(ids(tree.children)).toEqual(["A", "B", "E"]);
  });

  test("setLength", () => {
    expect(tree.setLength(1.5)).toBe(tree);
    expect(tree.length).toBe(1.5);
  });

  test("setParent", () => {
    let a = tree.children[0];
    expect(a.setParent(null)).toBe(a);
    expect(a.parent).toBeNull();
  });
});

describe("queries", () => {
  test("ancestors includes self (d3-hierarchy)", () => {
    let d = tree.children[2].children[1];
    expect(d.ancestors()).toEqual([d, tree.children[2], tree]);
  });

  test("getAncestors excludes self", () => {
    let d = tree.children[2].children[1];
    expect(d.getAncestors()).toEqual([tree.children[2], tree]);
  });

  test("descendants includes self in pre-order", () => {
    expect(ids(tree.descendants())).toEqual(["", "A", "B", "", "C", "D"]);
    expect(tree.descendants()[0]).toBe(tree);
  });

  test("getDescendants", () => {
    expect(tree.getDescendants()).toHaveLength(5);
    expect(tree.children[2].getDescendants(true)).toEqual([
      tree.children[2],
      ...tree.children[2].children
    ]);
  });

  test("getDescendant", () => {
    expect(tree.getDescendant("D")).toBe(tree.children[2].children[1]);
    expect(tree.getDescendant("nonexistent")).toBeUndefined();
  });

  test("leaves and aliases", () => {
    expect(ids(tree.getLeaves())).toEqual(["A", "B", "C", "D"]);
    expect(tree.getLeafs()).toEqual(tree.getLeaves());
    expect(tree.leafs()).toEqual(tree.getLeaves());
    expect(tree.leaves()).toEqual(tree.getLeaves());
    expect(tree.children[0].getLeaves()).toEqual([tree.children[0]]);
  });

  test("getChild", () => {
    expect(tree.getChild("A")).toBe(tree.children[0]);
    expect(tree.getChild("nonexistent")).toBeUndefined();
    let numeric = new patristic.Branch();
    numeric.addChild({ id: 0 });
    expect(numeric.getChild(0)).toBe(numeric.children[0]);
  });

  test("hasChild", () => {
    expect(tree.hasChild(tree.children[0])).toBe(true);
    expect(tree.hasChild("A")).toBe(true);
    expect(tree.hasChild("D")).toBe(false);
  });

  test("hasDescendant", () => {
    expect(tree.hasDescendant(tree.children[2].children[1])).toBe(true);
    expect(tree.hasDescendant("D")).toBe(true);
    expect(tree.hasDescendant("nonexistent")).toBe(false);
    expect(tree.hasDescendant(tree)).toBe(false);
    expect(tree.children[2].hasDescendant(tree.children[0])).toBe(false);
    expect(tree.children[2].hasDescendant("A")).toBe(false);
    expect(tree.hasDescendant(new patristic.Branch({ id: "D" }))).toBe(false);
  });

  test("hasLeaf", () => {
    expect(tree.hasLeaf(tree.children[0])).toBe(true);
    expect(tree.hasLeaf("A")).toBe(true);
    expect(tree.hasLeaf("nonexistent")).toBe(false);
    expect(tree.hasLeaf(tree)).toBe(false);
    expect(tree.hasLeaf(tree.children[2])).toBe(false);
    expect(tree.hasLeaf("")).toBe(false);
    expect(tree.children[2].hasLeaf("A")).toBe(false);
    let a = tree.children[0];
    expect(a.hasLeaf(a)).toBe(true);
    expect(a.hasLeaf("A")).toBe(true);
  });

  test("isChildOf / isDescendantOf", () => {
    expect(tree.children[0].isChildOf(tree)).toBe(true);
    expect(tree.children[0].isChildOf("")).toBe(true);
    expect(tree.children[2].children[1].isDescendantOf(tree)).toBe(true);
    expect(tree.isDescendantOf(tree.children[0])).toBe(false);
  });

  test("isLeaf / isRoot", () => {
    expect(tree.children[0].isLeaf()).toBe(true);
    expect(tree.isLeaf()).toBe(false);
    expect(tree.isRoot()).toBe(true);
    expect(tree.children[0].isRoot()).toBe(false);
  });

  test("getRoot", () => {
    expect(tree.children[2].children[1].getRoot()).toBe(tree);
  });

  test("getMRCA", () => {
    let [c, d] = tree.children[2].children;
    expect(tree.children[0].getMRCA(d)).toBe(tree);
    expect(c.getMRCA(d)).toBe(tree.children[2]);
  });

  test("path", () => {
    let a = tree.children[0],
      d = tree.children[2].children[1];
    expect(a.path(d)).toEqual([a, tree, tree.children[2], d]);
    expect(d.path(a)).toEqual([d, tree.children[2], tree, a]);
    expect(d.path(tree)).toEqual([d, tree.children[2], tree]);
    expect(tree.path(d)).toEqual([tree, tree.children[2], d]);
  });

  test("links", () => {
    let links = tree.links();
    expect(links).toHaveLength(5); // one per non-root Branch
    expect(links[0]).toEqual({ source: tree, target: tree.children[0] });
  });

  test("isConsistent", () => {
    expect(tree.isConsistent()).toBe(true);
    tree.children[0].parent = null;
    expect(tree.isConsistent()).toBe(false);
  });

  test("isConsistent detects cycles", () => {
    let x = tree.children[2];
    x.children.push(tree);
    tree.parent = x;
    expect(x.isConsistent()).toBe(false);
  });
});

describe("distances", () => {
  test("depthOf", () => {
    expect(tree.depthOf(tree.children[2].children[1])).toBe(0.9);
    expect(tree.depthOf("D")).toBe(0.9);
    expect(() => tree.depthOf("nonexistent")).toThrow();
  });

  test("distanceTo / distanceBetween", () => {
    let a = tree.children[0],
      d = tree.children[2].children[1];
    expect(a.distanceTo(d)).toBe(1.0);
    expect(tree.distanceBetween(a, d)).toBe(1.0);
  });

  test("sources / targets: the Branch nearer the MRCA is the source", () => {
    let a = tree.children[0],
      d = tree.children[2].children[1];
    expect(a.sources(d)).toBe(true);
    expect(a.targets(d)).toBe(false);
    expect(d.sources(a)).toBe(false);
    expect(tree.children[2].sources(d)).toBe(true);
  });

  test("toMatrix", () => {
    let { matrix, ids: labels } = tree.toMatrix();
    expect(labels).toEqual(["A", "B", "C", "D"]);
    let expected = [
      [0, 0.3, 0.9, 1.0],
      [0.3, 0, 1.0, 1.1],
      [0.9, 1.0, 0, 0.7],
      [1.0, 1.1, 0.7, 0]
    ];
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++)
        expect(matrix[i][j]).toBeCloseTo(expected[i][j], 12);
  });

  test("toMatrix matches distanceTo exactly", () => {
    let points = Array.from({ length: 40 }, (_, i) => [
      Math.sin(i * 12.9898) % 1,
      Math.sin(i * 78.233) % 1
    ]);
    let t = patristic.parseMatrix(
      points.map(a => points.map(b => Math.hypot(a[0] - b[0], a[1] - b[1])))
    );
    // Include a polytomy, and an internal Branch's subtree.
    let internal = t.descendants().filter(d => !d.isRoot() && !d.isLeaf());
    internal[3].excise();
    expect(Math.max(...t.descendants().map(d => d.children.length))).toBe(3);
    let subtree = internal.find(d => d !== internal[3] && d.value > 15);
    for (let root of [t, subtree]) {
      let leaves = root.getLeaves();
      let { matrix, ids: labels } = root.toMatrix();
      expect(labels).toEqual(ids(leaves));
      for (let i = 0; i < leaves.length; i++)
        for (let j = 0; j < leaves.length; j++)
          expect(matrix[i][j]).toBe(leaves[i].distanceTo(leaves[j]));
    }
  });

  test("toMatrix of a leaf", () => {
    expect(tree.children[0].toMatrix()).toEqual({ matrix: [[0]], ids: ["A"] });
  });
});

describe("traversal", () => {
  test("each visits breadth-first", () => {
    let visited = [];
    tree.each(node => visited.push(node.id));
    expect(visited).toEqual(["", "A", "B", "", "C", "D"]);
  });

  test("eachBefore visits pre-order", () => {
    let visited = [];
    tree.eachBefore(node => visited.push(node));
    expect(ids(visited)).toEqual(["", "A", "B", "", "C", "D"]);
    expect(visited[3]).toBe(tree.children[2]);
  });

  test("eachAfter visits post-order", () => {
    let visited = [];
    tree.eachAfter(node => visited.push(node));
    expect(ids(visited)).toEqual(["A", "B", "C", "D", "", ""]);
    expect(visited[5]).toBe(tree);
  });

  test("eachChild", () => {
    let visited = [];
    tree.eachChild(node => visited.push(node.id));
    expect(visited).toEqual(["A", "B", ""]);
  });
});

describe("values", () => {
  test("count counts every Branch in each subtree", () => {
    expect(tree.count()).toBe(tree);
    expect(tree.value).toBe(6);
    expect(tree.children[2].value).toBe(3);
  });

  test("sum", () => {
    tree.sum(d => d.length);
    expect(tree.children[2].value).toBeCloseTo(1.2);
    expect(tree.value).toBeCloseTo(1.5);
  });

  test("normalize", () => {
    tree.normalize(0, 10);
    expect(tree.value).toBe(10);
    expect(tree.children[0].value).toBe(0);
  });

  test("sort with comparator", () => {
    tree.sort((a, b) => b.id.localeCompare(a.id));
    expect(ids(tree.children)).toEqual(["B", "A", ""]);
    expect(ids(tree.children[2].children)).toEqual(["D", "C"]);
  });

  test("sort by value (default)", () => {
    tree.children[0].value = 5;
    tree.sort();
    expect(ids(tree.children)).toEqual(["B", "", "A"]);
  });
});

describe("restructuring", () => {
  test("rotate reverses children", () => {
    tree.rotate();
    expect(ids(tree.children)).toEqual(["", "B", "A"]);
    expect(ids(tree.children[0].children)).toEqual(["C", "D"]);
  });

  test("flip reverses all descendants", () => {
    tree.flip();
    expect(ids(tree.children)).toEqual(["", "B", "A"]);
    expect(ids(tree.children[0].children)).toEqual(["D", "C"]);
  });

  test("clone produces an independent, equivalent tree", () => {
    let clone = tree.clone();
    expect(clone).not.toBe(tree);
    expect(clone.toObject()).toEqual(tree.toObject());
    expect(clone.children[0]).not.toBe(tree.children[0]);
  });

  test("copy of a subtree is a new root", () => {
    let copy = tree.children[2].copy();
    expect(copy.parent).toBeNull();
    expect(copy.toNewick()).toBe("(C:0.3,D:0.4):0.5;");
  });

  test("copy and clone recompute depth, height and value", () => {
    tree.children[2].sum(d => d.length);
    for (let t of [tree.children[2].copy(), tree.children[2].clone()]) {
      expect(t.isConsistent()).toBe(true);
      expect(t.descendants().map(d => [d.depth, d.height, d.value])).toEqual([
        [0, 1, 3],
        [1, 0, 1],
        [1, 0, 1]
      ]);
    }
  });

  test("isolate", () => {
    let inner = tree.children[2];
    expect(inner.isolate()).toBe(inner);
    expect(inner.parent).toBeNull();
    expect(ids(tree.children)).toEqual(["A", "B"]);
  });

  test("remove returns the root of the remaining tree", () => {
    expect(tree.children[2].remove()).toBe(tree);
    expect(ids(tree.children)).toEqual(["A", "B"]);
  });

  test("excise an internal Branch", () => {
    let inner = tree.children[2];
    expect(inner.excise()).toBe(tree);
    expect(tree.getLeaves().map(l => [l.id, l.length])).toEqual([
      ["A", 0.1],
      ["B", 0.2],
      ["C", 0.8],
      ["D", 0.9]
    ]);
    expect(tree.isConsistent()).toBe(true);
  });

  test("excise a root with multiple children throws", () => {
    expect(() => tree.excise()).toThrow(
      "Cannot excise a root Branch with multiple children."
    );
  });

  test("invert on root throws", () => {
    expect(() => tree.invert()).toThrow("Cannot invert root node!");
  });

  test("reroot", () => {
    let d = tree.children[2].children[1];
    expect(d.reroot()).toBe(d);
    expect(d.isRoot()).toBe(true);
    expect(d.isConsistent()).toBe(true);
    expect(d.getLeaves()).toHaveLength(3);
    // Patristic distances are preserved by rerooting
    let a = d.getDescendant("A");
    expect(a.distanceTo(d.getDescendant("C"))).toBeCloseTo(0.9);
  });

  test("fixParenthood", () => {
    let [c] = tree.children[2].children;
    c.parent = null;
    tree.children[2].parent = null;
    tree.fixParenthood(true);
    expect(tree.children[2].parent).toBe(tree);
    expect(c.parent).toBeNull();
    tree.fixParenthood();
    expect(c.parent).toBe(tree.children[2]);
    expect(tree.isConsistent()).toBe(true);
  });

  test("consolidate excises near-zero-length Branches", () => {
    tree.children[0].addChild({ id: "short", length: 0.0001 });
    tree.consolidate();
    expect(tree.children[0].children).toHaveLength(0);
    expect(tree.children[0].id).toBe("A+short");
  });

  test("simplify and consolidate leave the Branch they're called on", () => {
    let t = patristic.parseNewick("((A:1,B:1)X:1)R;");
    expect(t.simplify()).toBe(t);
    expect(t.toNewick()).toBe("((A:1,B:1)X:1)R;");
    let u = patristic.parseNewick("((A:1,B:1)X:0.0001,C:1);");
    let x = u.children[0];
    expect(x.consolidate()).toBe(x);
    expect(x.parent).toBe(u);
  });

  test("simplify collapses single-child Branches", () => {
    let t = patristic.parseNewick("((A:1)P:1,B:1);");
    t.simplify();
    expect(t.toNewick()).toBe("(P+A:2,B:1);");
  });
});

describe("parseMatrix", () => {
  const additive = [
    [0, 0.1, 0.2, 0.3],
    [0.1, 0, 0.4, 0.5],
    [0.2, 0.4, 0, 0.6],
    [0.3, 0.5, 0.6, 0]
  ];
  const labels = ["A", "B", "C", "D"];
  const copy = m => m.map(r => r.slice());

  test("builds a tree with every label as a leaf", () => {
    let t = patristic.parseMatrix(copy(additive), labels);
    expect(t).toBeInstanceOf(patristic.Branch);
    expect(ids(t.getLeaves()).sort()).toEqual(labels);
    expect(t.isConsistent()).toBe(true);
  });

  test("defaults labels to indices", () => {
    let t = patristic.parseMatrix([
      [0, 1, 2],
      [1, 0, 3],
      [2, 3, 0]
    ]);
    expect(t.getLeaves()).toHaveLength(3);
  });

  test("index labels survive as ids, including 0", () => {
    let t = patristic.parseMatrix([
      [0, 1, 2],
      [1, 0, 3],
      [2, 3, 0]
    ]);
    expect(ids(t.getLeaves()).sort()).toEqual([0, 1, 2]);
  });

  test("can store distances as 32-bit floats", () => {
    let pair = [
      [0, 0.1],
      [0.1, 0]
    ];
    expect(patristic.parseMatrix(pair).children[0].length).toBe(0.05);
    expect(
      patristic.parseMatrix(pair, null, { float32: true }).children[0].length
    ).toBe(Math.fround(0.1) / 2);
    let t = patristic.parseMatrix(copy(additive), labels, { float32: true });
    let { matrix, ids: order } = t.toMatrix();
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) {
        let a = labels.indexOf(order[i]),
          b = labels.indexOf(order[j]);
        expect(matrix[i][j]).toBeCloseTo(additive[a][b], 6);
      }
  });

  test("accepts distances given as numeric strings", () => {
    let strings = additive.map(row => row.map(String));
    expect(patristic.parseMatrix(strings, labels).toNewick()).toBe(
      patristic.parseMatrix(copy(additive), labels).toNewick()
    );
  });

  test("recovers an additive matrix exactly", () => {
    let t = patristic.parseMatrix(copy(additive), labels);
    let { matrix, ids: order } = t.toMatrix();
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) {
        let a = labels.indexOf(order[i]),
          b = labels.indexOf(order[j]);
        expect(matrix[i][j]).toBeCloseTo(additive[a][b], 12);
      }
  });

  test("does not modify its input", () => {
    let input = copy(additive);
    patristic.parseMatrix(input, labels);
    expect(input).toEqual(additive);
  });
});

describe("known bugs", () => {
  test("Branch constructor keeps falsy-but-valid values", () => {
    let b = new patristic.Branch({ id: 0, value: 0 });
    expect(b.id).toBe(0);
    expect(b.value).toBe(0);
  });

  test("getMRCA with itself or an ancestor", () => {
    let [c] = tree.children[2].children;
    expect(c.getMRCA(c)).toBe(c);
    expect(c.getMRCA(tree.children[2])).toBe(tree.children[2]);
    expect(tree.children[2].getMRCA(c)).toBe(tree.children[2]);
    expect(c.path(c)).toEqual([c]);
    expect(c.distanceTo(tree.children[2])).toBe(0.3);
    expect(() => c.getMRCA(new patristic.Branch())).toThrow(
      "do not appear to share a common ancestor"
    );
  });

  test("small numbers are written without float artifacts", () => {
    tree.children[0].length = 1e-7;
    expect(tree.toNewick()).toContain("A:0.0000001,");
    tree.children[0].length = -1.5e-8;
    expect(tree.toNewick()).toContain("A:-0.000000015,");
    tree.children[0].length = 1.25e22;
    expect(tree.toNewick()).toContain("A:12500000000000000000000,");
  });

  test("fixDistances is idempotent", () => {
    let before = tree.descendants().map(d => [d.depth, d.height, d.value]);
    tree.fixDistances().fixDistances();
    expect(tree.descendants().map(d => [d.depth, d.height, d.value])).toEqual(
      before
    );
  });

  test("height is the distance to the deepest descendant leaf (d3-hierarchy)", () => {
    expect(tree.height).toBe(2);
    expect(tree.children.map(c => c.height)).toEqual([0, 0, 1]);
    expect(tree.children[2].children.map(c => c.height)).toEqual([0, 0]);
  });

  test("excise increments the parent's representing count", () => {
    let t = patristic.parseNewick("((A:1,B:1)X:1,C:1);");
    expect(t.representing).toBe(1);
    t.children[0].excise();
    expect(t.representing).toBe(2);
  });

  test("excise a root with one child promotes the child", () => {
    let t = patristic.parseNewick("((A:1,B:1)X:1);");
    let x = t.children[0];
    expect(t.excise()).toBe(x);
    expect(x.isRoot()).toBe(true);
    expect(x.length).toBe(1);
    expect(() => new patristic.Branch().excise()).toThrow(
      "Cannot excise a root Branch with no children."
    );
  });

  test("excise keeps the excised Branch's children in its place", () => {
    let t = patristic.parseNewick("(A:1,(B:1,C:1)X:1,D:1);");
    t.children[1].excise();
    expect(ids(t.children)).toEqual(["A", "B", "C", "D"]);
  });

  test("consolidate excises adjacent short siblings", () => {
    let t = patristic.parseNewick("((A:0.0001,B:0.0001,C:1)X:1,D:1);");
    t.consolidate();
    expect(t.toNewick()).toBe("((C:1)X+A+B:1,D:1);");
  });

  test("simplify collapses adjacent single-child siblings", () => {
    let t = patristic.parseNewick("(((A:1)P:1,(B:1)Q:1)X:1,C:1);");
    t.simplify();
    expect(t.toNewick()).toBe("((P+A:2,Q+B:2)X:1,C:1);");
  });

  test("simplify and consolidate don't add '+' for unlabeled Branches", () => {
    let t = patristic.parseNewick("((A:1):1,B:1);");
    t.simplify();
    expect(t.toNewick()).toBe("(A:2,B:1);");
    let u = patristic.parseNewick("(((A:1,B:1):0.0001,C:1)P:1,D:1);");
    u.consolidate();
    expect(u.toNewick()).toBe("((A:1.0001,B:1.0001,C:1)P:1,D:1);");
  });

  test("parseJSON applies custom labels to descendants", () => {
    let t = patristic.parseJSON(
      { name: "r", len: 0, kids: [{ name: "a", len: 1 }, { name: "b", len: 2 }] },
      "name",
      "len",
      "kids"
    );
    expect(t.toNewick()).toBe("(a:1,b:2)r;");
  });

  test("parseJSON computes values once", () => {
    let t = patristic.parseJSON(tree.toObject());
    expect(t.value).toBe(6);
    expect(t.children[2].value).toBe(3);
  });

  test("setParent rejects non-Branch parents", () => {
    expect(() => tree.setParent({})).toThrow(
      "Cannot set parent to non-Branch object!"
    );
  });

  test("remove(true) prunes ancestors left without children", () => {
    let t = patristic.parseNewick("(((A:1)X:1)Y:1,B:1);");
    t.getDescendant("A").remove(true);
    expect(t.toNewick()).toBe("(B:1);");
  });

  test("removeIfNoChildren removes empty ancestors", () => {
    let t = patristic.parseNewick("(((A:1)X:1)Y:1,B:1);");
    t.getDescendant("A").isolate();
    expect(t.getDescendant("X").removeIfNoChildren()).toBe(t);
    expect(t.toNewick()).toBe("(B:1);");
    let u = patristic.parseNewick("(((A:1)X:1)Y:1,B:1);");
    u.getDescendant("A").isolate();
    u.getDescendant("X").removeIfNoChildren(true);
    expect(u.toNewick()).toBe("(Y:1,B:1);");
    let leaf = new patristic.Branch();
    expect(leaf.removeIfNoChildren()).toBe(leaf);
  });
});

describe("addParent and replace keep the tree consistent", () => {
  test("addParent inserts the new parent where this Branch was", () => {
    let a = tree.children[0];
    let p = new patristic.Branch({ id: "P" });
    expect(a.addParent(p)).toBe(a);
    expect(ids(tree.children)).toEqual(["P", "B", ""]);
    expect(p.parent).toBe(tree);
    expect(p.children).toEqual([a]);
    expect(a.parent).toBe(p);
    expect(tree.isConsistent()).toBe(true);
    expect(tree.toNewick()).toBe("((A:0.1)P,B:0.2,(C:0.3,D:0.4):0.5);");
  });

  test("addParent detaches the given siblings from where they were", () => {
    let [a, b] = tree.children;
    let d = tree.children[2].children[1];
    a.addParent({ id: "P" }, [b, d]);
    expect(tree.isConsistent()).toBe(true);
    expect(tree.toNewick()).toBe("((A:0.1,B:0.2,D:0.4)P,(C:0.3):0.5);");
  });

  test("addParent on a root makes the new parent the root", () => {
    let p = new patristic.Branch({ id: "P" });
    tree.addParent(p);
    expect(p.isRoot()).toBe(true);
    expect(p.children).toEqual([tree]);
    expect(p.isConsistent()).toBe(true);
  });

  test("addParent keeps the new parent's existing children", () => {
    let p = new patristic.Branch({ id: "P" });
    let e = p.addChild({ id: "E" });
    let a = tree.children[0];
    a.addParent(p);
    expect(p.children).toEqual([e, a]);
    expect(tree.isConsistent()).toBe(true);
  });

  test("replace links the replacement and detaches the replaced Branch", () => {
    let old = tree.children[2];
    let e = new patristic.Branch({ id: "E", length: 0.5 });
    expect(old.replace(e)).toBe(tree);
    expect(e.parent).toBe(tree);
    expect(old.parent).toBeNull();
    expect(tree.isConsistent()).toBe(true);
  });

  test("replace detaches the replacement from its old parent", () => {
    let [a, , x] = tree.children;
    let c = x.children[0];
    a.replace(c);
    expect(tree.toNewick()).toBe("(C:0.3,B:0.2,(D:0.4):0.5);");
    expect(tree.isConsistent()).toBe(true);
  });

  test("replace on a root throws a clear error", () => {
    expect(() => tree.replace(new patristic.Branch())).toThrow(
      "Cannot replace a root Branch."
    );
  });
});

describe("error conditions", () => {
  test("unknown argument types throw", () => {
    expect(() => tree.hasChild(123)).toThrow("Unknown type of child");
    expect(() => tree.hasChild(undefined)).toThrow("Unknown type of child");
    expect(() => tree.hasDescendant(123)).toThrow("Unknown type of descendant");
    expect(() => tree.hasLeaf(true)).toThrow(
      "Unknown type of leaf passed to Branch.hasLeaf."
    );
    expect(() => tree.isChildOf(123)).toThrow("Unknown parent type");
  });
});
