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

// The textbook example from Wikipedia's UPGMA article (5S ribosomal RNA).
const fiveS = [
  [0, 17, 21, 31, 23],
  [17, 0, 30, 34, 21],
  [21, 30, 0, 28, 39],
  [31, 34, 28, 0, 43],
  [23, 21, 39, 43, 0]
];

describe("UPGMA", () => {
  test("builds the textbook example's tree", () => {
    let t = patristic.parseMatrix(fiveS, ["a", "b", "c", "d", "e"], {
      method: "upgma"
    });
    let lengths = Object.fromEntries(t.getLeaves().map(l => [l.id, l.length]));
    expect(lengths).toEqual({ a: 8.5, b: 8.5, c: 14, d: 14, e: 11 });
    expect(clades(t)).toEqual(new Set(["a,b", "a,b,e", "c,d"]));
    expect(t.getDescendant("a").parent.length).toBe(2.5);
    expect(t.getDescendant("e").parent.length).toBe(5.5);
    expect(t.getDescendant("c").parent.length).toBe(2.5);
  });

  test("builds an ultrametric tree: every leaf is as far from the root", () => {
    let t = patristic.parseMatrix(euclidean(60, 7), null, { method: "upgma" });
    let depths = t.getLeaves().map(l => t.depthOf(l));
    for (let d of depths) expect(d).toBeCloseTo(depths[0], 12);
  });

  test("matches a textbook implementation on random matrices", () => {
    for (let trial = 0; trial < 20; trial++) {
      let n = 3 + trial * 4;
      let m = euclidean(n, 100 + trial);
      let labels = [...Array(n).keys()];
      let ours = patristic.parseMatrix(m, null, { method: "upgma" });
      let theirs = patristic.parseJSON(reference.upgma(m, labels));
      expect(clades(ours)).toEqual(clades(theirs));
      expectSameDistances(ours, theirs);
    }
  });

  test("handles two taxa and leaves the input alone", () => {
    let m = [
      [0, 3],
      [3, 0]
    ];
    let t = patristic.parseMatrix(m, ["x", "y"], { method: "upgma" });
    expect(t.toNewick()).toBe("(x:1.5,y:1.5);");
    expect(m).toEqual([
      [0, 3],
      [3, 0]
    ]);
  });
});

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
    expect(() => patristic.parseMatrix(fiveS, null, { method: "wpgma" })).toThrow(
      'Unknown parseMatrix method "wpgma"'
    );
  });

  test("work with float32", () => {
    let m = euclidean(30, 12);
    let a = distances(patristic.parseMatrix(m, null, { method: "upgma" }));
    let b = distances(
      patristic.parseMatrix(m, null, { method: "upgma", float32: true })
    );
    for (let key in a) expect(b[key]).toBeCloseTo(a[key], 5);
    // BIONJ's lengths depend on how rounding breaks its last tie (see above),
    // but the tree's shape doesn't.
    expect(
      splits(patristic.parseMatrix(m, null, { method: "bionj", float32: true }))
    ).toEqual(splits(patristic.parseMatrix(m, null, { method: "bionj" })));
  });
});

describe("parseMatrix edge cases", () => {
  test("every method rejects an empty matrix with the same error", () => {
    for (let method of ["nj", "bionj", "upgma"]) {
      expect(() => patristic.parseMatrix([], null, { method })).toThrow(
        "parseMatrix needs at least one taxon."
      );
    }
  });

  test("every method makes a single leaf of a single taxon", () => {
    for (let method of ["nj", "bionj", "upgma"]) {
      let t = patristic.parseMatrix([[0]], ["A"], { method });
      expect(t.isLeaf()).toBe(true);
      expect(t.toNewick()).toBe("A;");
    }
  });

  test("neighbor joining matches a textbook implementation when distances break the triangle inequality", () => {
    // Taxon 0 is much further from 1 and 3 than its neighbor 2 is, so the
    // node made by joining 0 and 2 has a larger row sum than any other row.
    let m = [
      [0, 10, 0.1, 10],
      [10, 0, 5, 1.3],
      [0.1, 5, 0, 5],
      [10, 1.3, 5, 0]
    ];
    let labels = [0, 1, 2, 3];
    expectSameDistances(patristic.parseMatrix(m), patristic.parseJSON(reference.nj(m, labels)));
    let random = generator(77);
    for (let trial = 0; trial < 20; trial++) {
      let n = 5 + trial;
      let r = Array.from({ length: n }, () => Array(n).fill(0));
      for (let i = 0; i < n; i++)
        for (let j = 0; j < i; j++) r[i][j] = r[j][i] = random() * (random() < 0.2 ? 10 : 1);
      let ours = patristic.parseMatrix(r);
      let theirs = patristic.parseJSON(reference.nj(r, [...Array(n).keys()]));
      expect(splits(ours)).toEqual(splits(theirs));
      expectSameDistances(ours, theirs);
    }
  });

  test("BIONJ matches a textbook implementation when two taxa are identical", () => {
    // A zero distance gives a zero variance, where lambda stays at 1/2.
    let m = euclidean(8, 31);
    m[1] = m[0].slice();
    m.forEach((row, i) => (row[1] = m[0][i]));
    let labels = [...Array(8).keys()];
    let ours = patristic.parseMatrix(m, null, { method: "bionj" });
    let close = (a, b) => Object.keys(a).every(k => Math.abs(a[k] - b[k]) < 1e-9);
    let variants = [0, 1].map(tie => patristic.parseJSON(reference.bionj(m, labels, tie)));
    expect(variants.some(v => close(distances(ours), distances(v)))).toBe(true);
  });

  test("UPGMA matches a textbook implementation when averaging rounds down", () => {
    // Joining {1, 2} with 3 averages 0.7 twice and 0.7 once, which rounds to
    // just under 0.7, so 4's nearest cluster changes from 0 to {1, 2, 3}.
    expect((2 * 0.7 + 0.7) / 3).toBeLessThan(0.7);
    let m = [
      [0, 1, 1, 1, 0.7],
      [1, 0, 0.1, 0.3, 0.7],
      [1, 0.1, 0, 0.3, 0.7],
      [1, 0.3, 0.3, 0, 0.7],
      [0.7, 0.7, 0.7, 0.7, 0]
    ];
    let labels = [0, 1, 2, 3, 4];
    let ours = patristic.parseMatrix(m, labels, { method: "upgma" });
    let theirs = patristic.parseJSON(reference.upgma(m, labels));
    expect(clades(ours)).toEqual(clades(theirs));
    expectSameDistances(ours, theirs);
  });
});
