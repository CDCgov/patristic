// d3-hierarchy's layouts should lay out a patristic tree exactly as they lay
// out d3's own hierarchy of the same tree.
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const patristic = require("../dist/patristic");
if (!test) test = require("jest");

// d3-hierarchy is an ES module package; evaluate its UMD build directly.
function loadD3() {
  let sandbox = { exports: {}, module: {} };
  sandbox.module.exports = sandbox.exports;
  let file = path.join(
    __dirname,
    "../node_modules/d3-hierarchy/dist/d3-hierarchy.js"
  );
  vm.runInNewContext(fs.readFileSync(file, "utf8"), sandbox);
  return sandbox.module.exports;
}
const d3 = loadD3();

const newick = "((A:1,B:2)X:1,(C:1,(D:1,E:1):1):2,F:1);";

// Each layout, configured the same way for both trees, and the coordinates it
// assigns.
const layouts = {
  tree: [() => d3.tree().size([1, 1]), ["x", "y"]],
  cluster: [() => d3.cluster().size([1, 1]), ["x", "y"]],
  partition: [() => d3.partition().size([1, 1]), ["x0", "y0", "x1", "y1"]],
  treemap: [() => d3.treemap().size([1, 1]), ["x0", "y0", "x1", "y1"]],
  pack: [() => d3.pack().size([1, 1]), ["x", "y", "r"]]
};

function preorder(root) {
  let nodes = [];
  root.eachBefore(node => nodes.push(node));
  return nodes;
}

for (let [name, [layout, keys]] of Object.entries(layouts)) {
  test(`d3.${name} lays out a Branch tree as it does d3's hierarchy`, () => {
    let tree = patristic.parseNewick(newick).count();
    let reference = d3.hierarchy(tree.toObject()).count();
    layout()(tree);
    layout()(reference);
    let ours = preorder(tree),
      theirs = preorder(reference);
    expect(ours).toHaveLength(theirs.length);
    for (let i = 0; i < ours.length; i++) {
      for (let key of keys) {
        expect(Number.isFinite(ours[i][key])).toBe(true);
        expect(ours[i][key]).toBeCloseTo(theirs[i][key], 12);
      }
    }
  });
}
