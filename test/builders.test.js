const patristic = require("../dist/patristic");
const reference = require("./builders-reference");
if (!test) test = require("jest");

function generator(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function euclidean(n, seed) {
  let random = generator(seed);
  let points = Array.from({ length: n }, () => [random(), random(), random()]);
  return points.map(a =>
    points.map(b => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]))
  );
}

// The sets of leaf ids under each internal Branch except the root (for a
// rooted tree), or each internal edge's split (for an unrooted one).
function clades(tree) {
  let out = new Set();
  tree.eachAfter(b => {
    if (b.isLeaf() || b.isRoot()) return;
    out.add(b.getLeaves().map(l => l.id).sort((x, y) => x - y).join(","));
  });
  return out;
}
function splits(tree) {
  // Normalized to the side without the smallest id, so leaf order doesn't
  // matter.
  let all = tree.getLeaves().map(l => l.id).sort((x, y) => x - y);
  let out = new Set();
  tree.eachAfter(b => {
    if (b.isLeaf() || b.isRoot()) return;
    let side = new Set(b.getLeaves().map(l => l.id));
    if (side.has(all[0])) side = new Set(all.filter(x => !side.has(x)));
    if (side.size < 2 || side.size > all.length - 2) return;
    out.add([...side].sort((x, y) => x - y).join(","));
  });
  return out;
}

// Patristic distances keyed by pairs of ids, so trees with leaves in
// different orders compare.
function distances(tree) {
  let { matrix, ids } = tree.toMatrix();
  let out = {};
  ids.forEach((a, i) => ids.forEach((b, j) => (out[a + "," + b] = matrix[i][j])));
  return out;
}

function expectSameDistances(a, b) {
  let da = distances(a),
    db = distances(b);
  expect(Object.keys(da).sort()).toEqual(Object.keys(db).sort());
  for (let key in da) expect(da[key]).toBeCloseTo(db[key], 9);
}

describe("BIONJ", () => {
  test("recovers an additive matrix exactly", () => {
    let additive = [
      [0, 0.1, 0.2, 0.3],
      [0.1, 0, 0.4, 0.5],
      [0.2, 0.4, 0, 0.6],
      [0.3, 0.5, 0.6, 0]
    ];
    let t = patristic.parseMatrix(additive, ["A", "B", "C", "D"], {
      method: "bionj"
    });
    let d = distances(t);
    let labels = ["A", "B", "C", "D"];
    labels.forEach((a, i) =>
      labels.forEach((b, j) => expect(d[a + "," + b]).toBeCloseTo(additive[i][j], 12))
    );
  });

  test("matches a textbook implementation on random matrices", () => {
    // With four nodes left, the choice between two tied pairs is down to
    // rounding, and changes BIONJ's branch lengths (not the tree's shape), so
    // the result must match the reference with one choice or the other.
    let close = (a, b) => Object.keys(a).every(k => Math.abs(a[k] - b[k]) < 1e-9);
    for (let trial = 0; trial < 40; trial++) {
      let n = 4 + trial * 2;
      let m = euclidean(n, 200 + trial);
      let labels = [...Array(n).keys()];
      let ours = patristic.parseMatrix(m, null, { method: "bionj" });
      let variants = [0, 1].map(tie =>
        patristic.parseJSON(reference.bionj(m, labels, tie))
      );
      expect(splits(ours)).toEqual(splits(variants[0]));
      expect(variants.some(v => close(distances(ours), distances(v)))).toBe(true);
    }
  });

  test("differs from neighbor joining when distances are noisy", () => {
    let m = euclidean(40, 9);
    let nj = distances(patristic.parseMatrix(m));
    let bionj = distances(patristic.parseMatrix(m, null, { method: "bionj" }));
    expect(Object.keys(nj).some(k => Math.abs(nj[k] - bionj[k]) > 1e-9)).toBe(true);
  });
});

describe("parseMatrix methods", () => {
  test("default to neighbor joining", () => {
    let m = euclidean(30, 11);
    expect(patristic.parseMatrix(m, null, { method: "nj" }).toNewick()).toBe(
      patristic.parseMatrix(m).toNewick()
    );
  });

  test("reject unknown methods", () => {
    expect(() =>
      patristic.parseMatrix(euclidean(5, 1), null, { method: "wpgma" })
    ).toThrow('Unknown parseMatrix method "wpgma"');
  });

  test("work with float32", () => {
    let m = euclidean(30, 12);
    // BIONJ's lengths depend on how rounding breaks its last tie (see above),
    // but the tree's shape doesn't.
    expect(
      splits(patristic.parseMatrix(m, null, { method: "bionj", float32: true }))
    ).toEqual(splits(patristic.parseMatrix(m, null, { method: "bionj" })));
  });
});
