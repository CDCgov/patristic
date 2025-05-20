const patristic = require("../dist/patristic");
if (!test) test = require("jest");

const newick = "(A:0.1,B:0.2,(C:0.3,D:0.4):0.5);";
let tree = patristic.parseNewick(newick);

test("Newick Parsing", () => {
  expect(tree).toBeDefined();
  expect(tree).toBeInstanceOf(patristic.Branch);
  expect(tree.id).toBe("");
  expect(tree.length).toBe(0);
  expect(tree.children.length).toBe(3); // A, B, and internal node
  expect(tree.children[0].id).toBe("A");
  expect(tree.children[1].id).toBe("B");
  expect(tree.children[2].id).toBe("");
  expect(tree.children[2].children.length).toBe(2); // C and D
  expect(tree.children[2].children[0].id).toBe("C");
  expect(tree.children[2].children[1].id).toBe("D");
  expect(tree.children[2].length).toBe(0.5);
  expect(tree.children[2].children[0].length).toBe(0.3);
  expect(tree.children[2].children[1].length).toBe(0.4);
  expect(tree.children[0].length).toBe(0.1);
  expect(tree.children[1].length).toBe(0.2);
  expect(tree.children[0].children).toHaveLength(0);
  expect(tree.children[1].children).toHaveLength(0);
  expect(tree.children[2].children[0].children).toHaveLength(0);
  expect(tree.children[2].children[1].children).toHaveLength(0);
});

test("Branch addParent works", () => {
  let newNode = new patristic.Branch("E", 0.6);
  let parent = tree.children[2].addParent(newNode);
  expect(parent).toBe(tree.children[2]);
  expect(tree.children[2].parent).toBe(newNode);
  expect(newNode.children).toContain(tree.children[2]);
  expect(newNode.length).toBe(0.6);
  expect(tree.children[2].length).toBe(0.5);
  expect(tree.children[2].parent).toBe(newNode);
  expect(tree.children[2].children).toHaveLength(2);
  expect(tree.children[2].children[0].id).toBe("C");
  expect(tree.children[2].children[1].id).toBe("D");
});

test("Branch addChild works", () => {
  let newNode = new patristic.Branch("E", 0.6);
  let parent = tree.children[2].addChild(newNode);
  expect(parent).toBe(tree.children[2]);
  expect(tree.children[2].children).toContain(newNode);
  expect(newNode.parent).toBe(tree.children[2]);
  expect(newNode.length).toBe(0.6);
});

test("Branch addSibling works", () => {
  let newNode = new patristic.Branch("E", 0.6);
  let sibling = tree.children[0].addSibling(newNode);
  expect(sibling).toBe(tree.children[0]);
  expect(tree.children[0].parent).toBe(tree);
  expect(tree.children[0].siblings).toContain(newNode);
  expect(newNode.parent).toBe(tree);
  expect(newNode.length).toBe(0.6);
  expect(tree.children[0].length).toBe(0.1);
  expect(tree.children[0].siblings).toHaveLength(1);
  expect(tree.children[0].siblings[0].id).toBe("E");
  expect(tree.children[0].siblings[0].children).toHaveLength(0);
  expect(tree.children[0].children).toHaveLength(0);
  expect(tree.children[1].children).toHaveLength(0);
  expect(tree.children[2].children).toHaveLength(2);
  expect(tree.children[2].children[0].id).toBe("C");
  expect(tree.children[2].children[1].id).toBe("D");
  expect(tree.children[2].children[0].children).toHaveLength(0);
  expect(tree.children[2].children[1].children).toHaveLength(0);
  expect(tree.children[2].children[0].parent).toBe(tree.children[2]);
  expect(tree.children[2].children[1].parent).toBe(tree.children[2]);
  expect(tree.children[2].children[0].siblings).toHaveLength(1);
  expect(tree.children[2].children[1].siblings).toHaveLength(1);
  expect(tree.children[2].children[0].siblings[0].id).toBe("D");
  expect(tree.children[2].children[1].siblings[0].id).toBe("C");
  expect(tree.children[2].children[0].siblings[0].children).toHaveLength(0);
  expect(tree.children[2].children[1].siblings[0].children).toHaveLength(0);
});

test("Branch ancestors works", () => {
  let descendant = tree.children[2].children[1]; // Node D
  let ancestors = descendant.ancestors();
  expect(ancestors.length).toBe(2);
  expect(ancestors[0]).toBe(tree.children[2]);
  expect(ancestors[1]).toBe(tree);
});

test("Branch clone works", () => {
  let clone = tree.clone();
  expect(clone).not.toBe(tree);
  expect(clone.children).toEqual(tree.children);
});

test("Branch count works", () => {
  let counted = tree.count();
  expect(counted.value).toBe(5); // Root + A + B + C + D
  expect(counted.children[2].value).toBe(2); // Internal node + C + D
});

test("Branch descendants works", () => {
  let descendants = tree.descendants();
  expect(descendants.length).toBe(5); // Root + A + B + C + D
  expect(descendants).toContain(tree.children[0]); // A
  expect(descendants).toContain(tree.children[2].children[1]); // D
});

test("Branch depthOf works", () => {
  let depth = tree.depthOf(tree.children[2].children[1]); // Depth to D
  expect(depth).toBe(0.9); // 0.5 + 0.4
});

test("Branch each works", () => {
  let visited = [];
  tree.each(node => visited.push(node.id || "root"));
  expect(visited).toEqual(["root", "A", "B", "", "C", "D"]);
});

test("Branch eachAfter works", () => {
  let visited = [];
  tree.eachAfter(node => visited.push(node.id || "root"));
  expect(visited).toContain("A");
  expect(visited).toContain("B");
  expect(visited).toContain("C");
  expect(visited).toContain("D");
});

test("Branch getAncestors works", () => {
  let leaf = tree.children[2].children[1]; // Node D
  let ancestors = leaf.getAncestors();
  expect(ancestors.length).toBe(2);
  expect(ancestors[0]).toBe(tree.children[2]);
  expect(ancestors[1]).toBe(tree);
});

test("Branch getChild works", () => {
  expect(tree.getChild("A")).toBe(tree.children[0]);
  expect(tree.getChild("nonexistent")).toBeUndefined();
});

test("Branch getLeafs works", () => {
  let leaves = tree.getLeafs();
  expect(leaves.length).toBe(4);
  expect(leaves.map(leaf => leaf.id).sort()).toEqual(["A", "B", "C", "D"]);
});

test("Branch getLeaves works", () => {
  let leaves = tree.getLeaves();
  expect(leaves.length).toBe(4);
  expect(leaves.map(leaf => leaf.id).sort()).toEqual(["A", "B", "C", "D"]);
});

test("Branch getMRCA works", () => {
  let leafA = tree.children[0]; // A
  let leafD = tree.children[2].children[1]; // D
  let mrca = leafA.getMRCA(leafD);
  expect(mrca).toBe(tree);
});

test("Branch isLeaf works", () => {
  expect(tree.children[0].isLeaf()).toBe(true);
  expect(tree.isLeaf()).toBe(false);
});

test("Branch path works", () => {
  let leafA = tree.children[0]; // A
  let leafD = tree.children[2].children[1]; // D
  let path = leafA.path(leafD);
  expect(path.length).toBe(4);
  expect(path[0]).toBe(leafA);
  expect(path[path.length - 1]).toBe(leafD);
});

test("Branch rotate works", () => {
  let clone = patristic.parseNewick(newick);
  let originalOrder = clone.children.map(child => child.id);
  clone.rotate();
  let rotatedOrder = clone.children.map(child => child.id);
  expect(rotatedOrder).not.toEqual(originalOrder);
});

test("Branch sort works", () => {
  let clone = patristic.parseNewick(newick);
  clone.sort((a, b) => (a.id || "").localeCompare(b.id || ""));
  expect(clone.children[0].id).toBe("A");
  expect(clone.children[1].id).toBe("B");
});

test("Branch setLength works", () => {
  let clone = tree.clone();
  clone.setLength(1.5);
  expect(clone.length).toBe(1.5);
});

test("Branch hasLeaf works", () => {
  expect(tree.hasLeaf(tree.children[0])).toBe(true);
  expect(tree.hasLeaf(tree)).toBe(false);
});

test("Branch isChildOf works", () => {
  expect(tree.children[0].isChildOf(tree)).toBe(true);
  expect(tree.isChildOf(tree.children[0])).toBe(false);
});

test("Newick Serialization", () => {
  expect(tree.toNewick()).toEqual(newick);
});

test("JSON Serialization", () => {
  let json =
    '{"id":"","length":0,"children":[{"id":"A","length":0.1},{"id":"B","length":0.2},{"id":"","length":0.5,"children":[{"id":"C","length":0.3},{"id":"D","length":0.4}]}]}';
  expect(JSON.stringify(tree.toObject())).toEqual(json);
  expect(JSON.stringify(tree.toJSON())).toEqual(json);
  expect(JSON.stringify(tree)).toEqual(json);
});

test("Branch copy works", () => {
  let copy = tree.copy();
  expect(copy).not.toBe(tree);
  expect(copy.toNewick()).toBe(tree.toNewick());
  expect(copy.parent).toBeNull();
});

test("Branch distanceBetween works", () => {
  let distance = tree.distanceBetween(tree.children[0], tree.children[2].children[1]);
  expect(distance).toBe(1.0); // 0.1 + 0.9
});

test("Branch distanceTo works", () => {
  let distance = tree.children[0].distanceTo(tree.children[2].children[1]);
  expect(distance).toBe(1.0); // 0.1 + 0.9
});

test("Branch eachBefore works", () => {
  let visited = [];
  tree.eachBefore(node => visited.push(node.id || "root"));
  expect(visited[0]).toBe("root");
  expect(visited).toContain("A");
  expect(visited).toContain("B");
});

test("Branch eachChild works", () => {
  let visited = [];
  tree.eachChild(node => visited.push(node.id));
  expect(visited).toEqual(["A", "B", ""]);
});

test("Branch excise works", () => {
  let clone = tree.clone();
  let innerNode = clone.children[2];
  let parent = innerNode.excise();
  expect(parent.children).toHaveLength(4); // A, B, C, D
  expect(parent.children.map(c => c.id).sort()).toEqual(["A", "B", "C", "D"]);
});

test("Branch fixDistances works", () => {
  let clone = tree.clone();
  clone.fixDistances();
  expect(clone.depth).toBe(0);
  expect(clone.children[2].children[1].depth).toBe(2);
});

test("Branch fixParenthood works", () => {
  let clone = tree.clone();
  clone.fixParenthood();
  expect(clone.isConsistent()).toBe(true);
});

test("Branch flip works", () => {
  let clone = tree.clone();
  let originalOrder = clone.children.map(child => child.id);
  clone.flip();
  let flippedOrder = clone.children.map(child => child.id);
  expect(flippedOrder).not.toEqual(originalOrder);
});

test("Branch getDescendant works", () => {
  expect(tree.getDescendant("D")).toBe(tree.children[2].children[1]);
  expect(tree.getDescendant("nonexistent")).toBeUndefined();
});

test("Branch hasChild works", () => {
  expect(tree.hasChild(tree.children[0])).toBe(true);
  expect(tree.hasChild("A")).toBe(true);
  expect(tree.hasChild("nonexistent")).toBe(false);
});

test("Branch hasDescendant works", () => {
  expect(tree.hasDescendant(tree.children[2].children[1])).toBe(true);
  expect(tree.hasDescendant("D")).toBe(true);
  expect(tree.hasDescendant("nonexistent")).toBe(false);
});

test("Branch isConsistent works", () => {
  expect(tree.isConsistent()).toBe(true);
  
  let inconsistentTree = tree.clone();
  inconsistentTree.children[0].parent = null;
  expect(inconsistentTree.isConsistent()).toBe(false);
});

test("Branch isDescendantOf works", () => {
  expect(tree.children[2].children[1].isDescendantOf(tree)).toBe(true);
  expect(tree.isDescendantOf(tree.children[0])).toBe(false);
});

test("Branch isolate works", () => {
  let clone = tree.clone();
  let isolated = clone.children[2].isolate();
  expect(isolated.parent).toBeNull();
  expect(isolated.children).toHaveLength(2);
});

test("Branch isRoot works", () => {
  expect(tree.isRoot()).toBe(true);
  expect(tree.children[0].isRoot()).toBe(false);
});

test("Branch leafs and leaves aliases work", () => {
  expect(tree.leafs()).toEqual(tree.getLeaves());
  expect(tree.leaves()).toEqual(tree.getLeaves());
});

test("Branch links works", () => {
  let links = tree.links();
  expect(links).toHaveLength(4); // One for each non-root node
  expect(links[0]).toHaveProperty('source');
  expect(links[0]).toHaveProperty('target');
});

test("Branch normalize works", () => {
  let clone = tree.clone();
  clone.normalize(0, 10);
  expect(clone.value).toBeLessThanOrEqual(10);
  expect(clone.value).toBeGreaterThanOrEqual(0);
});

test("Branch removeIfNoChildren works", () => {
  let clone = tree.clone();
  clone.children[2].children = [];
  let root = clone.children[2].removeIfNoChildren();
  expect(root.children).toHaveLength(2); // Just A and B remain
});

test("Branch replace works", () => {
  let clone = tree.clone();
  let newNode = new patristic.Branch({ id: "E", length: 0.5 });
  clone.children[2].replace(newNode);
  expect(clone.children[2].id).toBe("E");
  expect(clone.children[2].length).toBe(0.5);
});

test("Branch sources and targets work", () => {
  let leafA = tree.children[0];
  let leafD = tree.children[2].children[1];
  expect(leafA.sources(leafD)).toBe(false);
  expect(leafA.targets(leafD)).toBe(true);
});

test("Branch sum works", () => {
  let summed = tree.sum(d => 1);
  expect(summed.value).toBe(5); // Same as count
});

test("Branch toMatrix works", () => {
  let result = tree.toMatrix();
  expect(result).toHaveProperty('matrix');
  expect(result).toHaveProperty('ids');
  expect(result.ids).toHaveLength(4); // A, B, C, D
  expect(result.matrix).toHaveLength(4);
});

test("Branch toString works", () => {
  expect(JSON.parse(tree.toString())).toEqual(tree.toObject());
  expect(tree.toString(null, 2)).toBeDefined(); // Pretty print with indent
});

test("Branch constructor handles empty input", () => {
  let emptyBranch = new patristic.Branch();
  expect(emptyBranch).toBeDefined();
  expect(emptyBranch.id).toBe("");
  expect(emptyBranch.length).toBe(0);
  expect(emptyBranch.children).toHaveLength(0);
});

// Test error conditions
test("Branch error conditions", () => {
  expect(() => tree.getChild(123)).toThrow("childID is not a String!");
  expect(() => tree.hasChild(123)).toThrow("Unknown type of child");
  expect(() => tree.hasDescendant(123)).toThrow("Unknown type of descendant");
  expect(() => tree.hasLeaf(123)).toThrow("Unknown type of leaf");
  expect(() => tree.isChildOf(123)).toThrow("Unknown parent type");
});

test("Branch constructor with children function", () => {
  let data = { id: "test", children: [{ id: "child1" }] };
  let customChildren = (d) => d.children.map(c => new patristic.Branch(c));
  let branch = new patristic.Branch(data, customChildren);
  expect(branch.id).toBe("test");
  expect(branch.children).toHaveLength(1);
  expect(branch.children[0].id).toBe("child1");
});

test("Branch constructor with no data sets defaults", () => {
  let branch = new patristic.Branch();
  expect(branch.id).toBe("");
  expect(branch.depth).toBe(0);
  expect(branch.height).toBe(0);
  expect(branch.length).toBe(0);
  expect(branch.value).toBe(1);
  expect(branch.respresenting).toBe(1);
  expect(branch._guid).toBeDefined();
});

test("Branch addParent with Branch instance", () => {
  let newBranch = new patristic.Branch({ id: "parent" });
  let result = tree.children[0].addParent(newBranch);
  expect(result).toBe(tree.children[0]);
  expect(newBranch.children).toContain(tree.children[0]);
});

test("Branch addParent with siblings", () => {
  let newParent = new patristic.Branch({ id: "parent" });
  let sibling = new patristic.Branch({ id: "sibling" });
  tree.children[0].addParent(newParent, [sibling]);
  expect(newParent.children).toContain(sibling);
  expect(sibling.parent).toBe(newParent);
});

test("Branch addChild with Branch instance", () => {
  let newBranch = new patristic.Branch({ id: "child" });
  let parent = tree.addChild(newBranch);
  expect(newBranch.parent).toBe(tree);
  expect(tree.children).toContain(newBranch);
});

test("Branch invert throws on root node", () => {
  expect(() => tree.invert()).toThrow("Cannot invert root node!");
});

test("Branch reroot complex operations", () => {
  let clone = tree.clone();
  let newRoot = clone.children[2].children[1]; // Node D
  let rerooted = newRoot.reroot();
  expect(rerooted.id).toBe("D");
  expect(rerooted.parent).toBeNull();
  expect(rerooted.isRoot()).toBe(true);
});

test("Branch excise root with multiple children throws", () => {
  let clone = tree.clone();
  expect(() => clone.excise()).toThrow("Cannot excise a root Branch with multiple children.");
});

test("Branch getLeaves handles all node types", () => {
  let leaf = new patristic.Branch({ id: "leaf" });
  let parent = new patristic.Branch({ id: "parent" });
  parent.addChild(leaf);
  
  expect(leaf.getLeaves()).toEqual([leaf]);
  expect(parent.getLeaves()).toEqual([leaf]);
  expect(tree.getLeaves().length).toBe(4);
});

test("Branch getDescendants with includeSelf", () => {
  let descendants = tree.children[2].getDescendants(true);
  expect(descendants).toHaveLength(3); // Self + C + D
  expect(descendants[0]).toBe(tree.children[2]);
});

test("Branch consolidate handles edge cases", () => {
  let clone = tree.clone();
  // Add a near-zero length branch
  let shortBranch = new patristic.Branch({ id: "short", length: 0.0001 });
  clone.children[0].addChild(shortBranch);
  clone.consolidate();
  // The short branch should be excised
  expect(clone.children[0].children).toHaveLength(0);
});

test("Branch hasLeaf with string id", () => {
  expect(tree.hasLeaf("A")).toBe(true);
  expect(tree.hasLeaf("nonexistent")).toBe(false);
  expect(() => tree.hasLeaf(true)).toThrow("Unknown type of leaf passed to Branch.hasLeaf.");
});

test("Branch hasChild edge cases", () => {
  expect(tree.hasChild(undefined)).toThrow;
  expect(tree.hasChild(null)).toThrow;
  expect(tree.hasChild({})).toThrow;
});

test("Branch toMatrix computes distances correctly", () => {
  let result = tree.toMatrix();
  // A to B distance should be 0.3 (0.1 + 0.2)
  let aIndex = result.ids.indexOf("A");
  let bIndex = result.ids.indexOf("B");
  expect(result.matrix[aIndex][bIndex]).toBe(0.3);
});

test("Branch simplify collapses single-child nodes", () => {
  let clone = tree.clone();
  // Add intermediate node
  let intermediate = new patristic.Branch({ id: "intermediate", length: 0.1 });
  let child = clone.children[0];
  clone.children[0] = intermediate;
  intermediate.addChild(child);
  
  clone.simplify();
  // The intermediate node should be gone, with its ID merged into the child
  expect(clone.children[0].id).toBe("intermediate+A");
});

test("Branch fixParenthood with nonrecursive option", () => {
  let clone = tree.clone();
  clone.children[2].parent = null; // Break the parent reference
  clone.fixParenthood(true); // Only fix direct children
  expect(clone.children[2].parent).toBe(clone);
});

test("Parse Matrix handles edge cases", () => {
  const matrix = [
    [0, 1, 2],
    [1, 0, 3],
    [2, 3, 0]
  ];
  const labels = ["A", "B", "C"];
  const tree = patristic.parseMatrix(matrix, labels);
  expect(tree).toBeDefined();
  expect(tree).toBeInstanceOf(patristic.Branch);
});

test("Parse Matrix without labels", () => {
  const matrix = [
    [0, 1, 2],
    [1, 0, 3],
    [2, 3, 0]
  ];
  const tree = patristic.parseMatrix(matrix);
  expect(tree).toBeDefined();
  expect(tree).toBeInstanceOf(patristic.Branch);
});


test("Number to string conversion handles edge cases", () => {
  let clone = tree.clone();
  // Test scientific notation case
  clone.children[0].length = 1e21;
  let newick = clone.toNewick();
  expect(newick).toMatch(/\d{1,}0{20}/); // Should convert scientific notation to plain

  // Test negative numbers
  clone.children[0].length = -1.5;
  newick = clone.toNewick();
  expect(newick).toContain("-1.5");
});

test("Branch methods with string IDs", () => {
  let descendant = "D";
  let depth = tree.depthOf(descendant);
  expect(depth).toBe(0.9);

  let node = tree.getDescendant(descendant);
  expect(node).toBeDefined();
  expect(node.id).toBe("D");
});

test("Branch fixParenthood handles recursive and non-recursive modes", () => {
  let clone = tree.clone();
  let childNode = clone.children[2].children[0];
  childNode.parent = null;  // Break the parent reference
  
  // Test non-recursive mode
  clone.children[2].fixParenthood(true);
  expect(childNode.parent).toBe(clone.children[2]);
  
  // Break deep reference and test recursive mode
  childNode.parent = null;
  clone.fixParenthood();
  expect(childNode.parent).toBe(clone.children[2]);
});

test("toMatrix includes all distances", () => {
  let result = tree.toMatrix();
  let aIndex = result.ids.indexOf("A");
  let bIndex = result.ids.indexOf("B");
  let cIndex = result.ids.indexOf("C");
  let dIndex = result.ids.indexOf("D");
  
  // Check all pairwise distances
  expect(result.matrix[aIndex][bIndex]).toBe(0.3); // A to B
  expect(result.matrix[aIndex][cIndex]).toBe(0.9); // A to C
  expect(result.matrix[aIndex][dIndex]).toBe(1.0); // A to D
  expect(result.matrix[bIndex][cIndex]).toBe(1.0); // B to C
  expect(result.matrix[bIndex][dIndex]).toBe(1.1); // B to D
  expect(result.matrix[cIndex][dIndex]).toBe(0.7); // C to D
  
  // Verify symmetry
  expect(result.matrix[bIndex][aIndex]).toBe(result.matrix[aIndex][bIndex]);
  expect(result.matrix[cIndex][aIndex]).toBe(result.matrix[aIndex][cIndex]);
});

test("Complex matrix parsing", () => {
  const complexMatrix = [
    [0, 0.1, 0.2, 0.3],
    [0.1, 0, 0.4, 0.5],
    [0.2, 0.4, 0, 0.6],
    [0.3, 0.5, 0.6, 0]
  ];
  const labels = ["A", "B", "C", "D"];
  const result = patristic.parseMatrix(complexMatrix, labels);
  expect(result).toBeDefined();
  expect(result).toBeInstanceOf(patristic.Branch);
  expect(result.getLeaves().length).toBe(4);
  
  // Verify the structure maintains distances
  const resultMatrix = result.toMatrix();
  for(let i = 0; i < 4; i++) {
    for(let j = 0; j < 4; j++) {
      if(i !== j) {
        expect(Math.abs(resultMatrix.matrix[i][j] - complexMatrix[i][j])).toBeLessThan(0.001);
      }
    }
  }
});

test("Branch constructor handles various input types", () => {
  // Test with undefined data
  let branch1 = new patristic.Branch(undefined);
  expect(branch1.id).toBe("");
  expect(branch1.length).toBe(0);

  // Test with null data
  let branch2 = new patristic.Branch(null);
  expect(branch2.id).toBe("");
  expect(branch2.length).toBe(0);

  // Test with empty object
  let branch3 = new patristic.Branch({});
  expect(branch3.id).toBe("");
  expect(branch3.length).toBe(0);

  // Test with custom children function
  let customChildren = () => [];
  let branch4 = new patristic.Branch({}, customChildren);
  expect(branch4.children).toEqual([]);
});
