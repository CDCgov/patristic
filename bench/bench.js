// Performance baseline for patristic. Run with `npm run bench` (after
// `npm run build`). Pass sizes to override the defaults, e.g.
// `npm run bench -- 500 1000`.
const patristic = require("../dist/patristic");

const sizes = process.argv.slice(2).map(Number).filter(Boolean);
if (!sizes.length) sizes.push(100, 200, 400);

// Small deterministic PRNG so runs are comparable.
let seed = 42;
function random() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}

// Euclidean distances between random points: a realistic, non-additive matrix.
function randomMatrix(n) {
  let points = Array.from({ length: n }, () => [random(), random(), random()]);
  return points.map(a =>
    points.map(b => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]))
  );
}

// A fully unbalanced tree, the worst case for recursion depth.
function caterpillar(n) {
  let s = "T0";
  for (let i = 1; i < n; i++) s = `(${s}:1,T${i}:1)`;
  return s + ";";
}

function time(fn) {
  let start = process.hrtime.bigint();
  let result;
  try {
    result = fn();
  } catch (e) {
    return { ms: NaN, error: e.message };
  }
  return { ms: Number(process.hrtime.bigint() - start) / 1e6, result };
}

function report(label, n, { ms, error }) {
  let value = error ? `error: ${error}` : `${ms.toFixed(1)} ms`;
  console.log(`${label.padEnd(24)} n=${String(n).padEnd(7)} ${value}`);
}

for (let n of sizes) {
  let matrix = randomMatrix(n);
  let nj = time(() => patristic.parseMatrix(matrix));
  report("parseMatrix", n, nj);
  let tree = nj.result;
  if (!tree) continue;
  let newick = tree.toNewick();
  report("parseNewick", n, time(() => patristic.parseNewick(newick)));
  report("toNewick", n, time(() => tree.toNewick()));
  report("parseJSON", n, time(() => patristic.parseJSON(tree.toObject())));
  report("copy", n, time(() => tree.copy()));
  let leaves = tree.getLeaves();
  report(
    "distanceTo (1000 pairs)",
    n,
    time(() => {
      for (let i = 0; i < 1000; i++)
        leaves[i % n].distanceTo(leaves[(i * 7 + 3) % n]);
    })
  );
  report("toMatrix", n, time(() => tree.toMatrix()));
}

for (let n of [1000, 10000, 100000]) {
  let newick = caterpillar(n);
  report("parseNewick caterpillar", n, time(() => patristic.parseNewick(newick)));
}
