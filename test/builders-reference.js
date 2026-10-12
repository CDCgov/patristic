// A textbook O(n^3) implementation of BIONJ, as a reference for
// parseMatrix's. It returns a tree as nested { id, length, children }.

function leaves(n, labels) {
  return Array.from({ length: n }, (_, i) => ({ id: labels[i], length: 0 }));
}

// BIONJ (Gascuel 1997): neighbor joining's choice of pair and branch lengths,
// with new distances weighted by lambda, which minimizes the variance of the
// new node's distances (tracked in V).
//
// With four nodes left, neighbor joining's criterion is always tied between
// complementary pairs ({a, b} and {c, d}), and floating point rounding picks
// one. For neighbor joining the choice doesn't matter; for BIONJ it changes
// the branch lengths. `lastTie` picks which of the tied pairs to join: 0 for
// the first found, 1 for its complement.
function bionj(matrix, labels, lastTie = 0) {
  let n = matrix.length;
  let D = matrix.map(row => row.map(Number));
  let V = D.map(row => row.slice());
  let active = [...Array(n).keys()];
  let node = leaves(n, labels);
  while (active.length > 2) {
    let r = active.length;
    let S = active.map(i => active.reduce((s, k) => s + (k === i ? 0 : D[i][k]), 0));
    let best = Infinity, bi = -1, bj = -1;
    for (let a = 0; a < r; a++)
      for (let b = a + 1; b < r; b++) {
        let q = (r - 2) * D[active[a]][active[b]] - S[a] - S[b];
        if (q < best) [best, bi, bj] = [q, a, b];
      }
    if (r === 4 && lastTie === 1) {
      // Join the complement of the pair found.
      [bi, bj] = [0, 1, 2, 3].filter(x => x !== bi && x !== bj);
    }
    let i = active[bi], j = active[bj];
    let di = 0.5 * D[i][j] + (S[bi] - S[bj]) / (2 * (r - 2));
    let dj = D[i][j] - di;
    let lambda = 0.5;
    if (V[i][j] !== 0) {
      let sum = 0;
      for (let k of active) if (k !== i && k !== j) sum += V[j][k] - V[i][k];
      lambda = Math.min(1, Math.max(0, 0.5 + sum / (2 * (r - 2) * V[i][j])));
    }
    for (let k of active) {
      if (k === i || k === j) continue;
      D[j][k] = D[k][j] = lambda * (D[i][k] - di) + (1 - lambda) * (D[j][k] - dj);
      V[j][k] = V[k][j] = lambda * V[i][k] + (1 - lambda) * V[j][k] - lambda * (1 - lambda) * V[i][j];
    }
    node[i].length = di;
    node[j].length = dj;
    node[j] = { id: "", length: 0, children: [node[i], node[j]] };
    active.splice(bi, 1);
  }
  let [i, j] = active;
  node[i].length = node[j].length = D[i][j] / 2;
  return { id: "", length: 0, children: [node[i], node[j]] };
}

module.exports = { bionj };
