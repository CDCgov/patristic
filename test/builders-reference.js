// Textbook O(n^3) implementations of UPGMA and BIONJ, as references for
// parseMatrix's. Each returns a tree as nested { id, length, children }.

function leaves(n, labels) {
  return Array.from({ length: n }, (_, i) => ({ id: labels[i], length: 0 }));
}

// UPGMA: repeatedly merge the closest pair of clusters at half their
// distance; a merged cluster's distance to another is the size-weighted mean.
function upgma(matrix, labels) {
  let n = matrix.length;
  let D = matrix.map(row => row.map(Number));
  let active = [...Array(n).keys()];
  let node = leaves(n, labels);
  let height = new Array(n).fill(0);
  let size = new Array(n).fill(1);
  while (active.length > 1) {
    let best = Infinity, bi = -1, bj = -1;
    for (let a = 0; a < active.length; a++)
      for (let b = a + 1; b < active.length; b++) {
        let d = D[active[a]][active[b]];
        if (d < best) [best, bi, bj] = [d, a, b];
      }
    let i = active[bi], j = active[bj];
    let h = best / 2;
    node[i].length = h - height[i];
    node[j].length = h - height[j];
    for (let k of active) {
      if (k === i || k === j) continue;
      D[i][k] = D[k][i] = (size[i] * D[i][k] + size[j] * D[j][k]) / (size[i] + size[j]);
    }
    node[i] = { id: "", length: 0, children: [node[i], node[j]] };
    height[i] = h;
    size[i] += size[j];
    active.splice(bj, 1);
  }
  return node[active[0]];
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
//
// With `nj` set, lambda stays 1/2, which is neighbor joining.
function bionj(matrix, labels, lastTie = 0, nj = false) {
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
    if (!nj && V[i][j] !== 0) {
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

function nj(matrix, labels) {
  return bionj(matrix, labels, 0, true);
}

module.exports = { upgma, bionj, nj };
