// Deterministic distance matrices for pinning parseMatrix's output.

// A small linear congruential generator, so the matrices are the same
// everywhere.
function generator(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

// Euclidean distances between random points: real-valued, no ties.
function euclidean(n, seed) {
  let random = generator(seed);
  let points = Array.from({ length: n }, () => [random(), random(), random()]);
  return points.map(a =>
    points.map(b => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]))
  );
}

// Small integer distances: many exact ties, which exercise tie-breaking.
function integers(n, seed) {
  let random = generator(seed);
  let m = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++)
    for (let j = 0; j < i; j++) m[i][j] = m[j][i] = 1 + Math.floor(random() * 9);
  return m;
}

function matrices() {
  return {
    euclidean60: euclidean(60, 1),
    euclidean150: euclidean(150, 2),
    integers40: integers(40, 3),
    integers8: integers(8, 4)
  };
}

module.exports = { matrices };
