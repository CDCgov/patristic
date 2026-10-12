# Changelog

## Unreleased

### Breaking changes

- `parseNewick` throws a `SyntaxError` for malformed Newick. That covers a
  missing `)`, a `)` without a matching `(`, a `,` outside parentheses, and an
  unterminated quoted label or comment. The error names the problem and its
  position. Before, it produced a tree anyway.
- `parseNewick` stops at the first `;`. Text after it was parsed into the same
  tree.
- Square brackets start comments, so `A[x]` is labeled `A`, and a label that
  starts with a quote is read as a quoted label.
- `toNewick` writes ids containing whitespace, punctuation, brackets or quotes
  in single quotes, so `Homo sapiens` is written `'Homo sapiens'`.
- The npm package contains only `dist/`, the README, the changelog and the
  license. It used to include the whole repository, so paths like
  `patristic/demo/...` or `patristic/test/...` no longer resolve.

### New

- `parseMatrix(matrix, labels, { method: "bionj" })` builds the tree with
  BIONJ (Gascuel 1997). It picks pairs as neighbor joining does, but weights
  the new node's distances to reduce their variance, which is usually more
  accurate when distances are noisy. `method: "nj"` (the default) is
  neighbor joining as before.
- `parseMatrix(matrix, labels, { method: "upgma" })` builds a rooted
  ultrametric tree by UPGMA, with every leaf the same distance from the root.
- `parseNewick` reads quoted labels, in single or double quotes, with a
  doubled quote standing for one (`'O''Brien'`).
- NHX annotations (`[&&NHX:key=value:...]`) are read into the `data.nhx` of the
  Branch they follow, and `toNewick` writes them back.
- `dist/patristic.js` and `dist/patristic.mjs` come with source maps, which
  hold the TypeScript source, so debuggers and stack traces can show it.

### Fixes

- A tree that's a single Branch keeps its label: `"A;"` used to be read as an
  unlabeled Branch.
- Every id round-trips through `toNewick` and `parseNewick`.
- `parseMatrix` with neighbor joining or BIONJ makes a single leaf of a 1×1
  matrix, and rejects an empty one with `"parseMatrix needs at least one
  taxon."`, as UPGMA does. Both used to throw `RangeError: Invalid array
  length`.

### Performance

- `parseNewick` scans the string once, without a regex split. That makes it
  about 1.7× faster on large trees: a 100,000-tip tree takes 117 ms instead of
  190 ms.

### Tooling

- `npm run coverage` reports coverage of `src/patristic.ts`, through the
  bundles' source maps, rather than of the bundle.
- Every line and branch of `src/patristic.ts` is tested, and CI runs
  `npm run coverage`, which fails if coverage drops below 100%.

## 0.7.0

A rewrite for speed, memory and correctness. Trees are now stored in typed
arrays, with `Branch` objects as lightweight views. Neighbor joining is about
3× faster. Nothing recurses any more, so very deep trees work. The library is
written in TypeScript, ships an ES module build with type declarations, and
works directly with d3-hierarchy's layouts.

**This release changes behavior in ways existing code may notice.** Read
*Breaking changes* before upgrading.

### Breaking changes

#### Editing trees

- `branch.children` returns a new array each time, so changing that array
  (with `push`, `splice` or `sort`) doesn't change the tree. To change it:
  - assign an array of Branches to `children` (it relinks them in that order,
    and detaches children left out);
  - set `parent`;
  - or use `addChild`, `remove`, `replace`, `sort` and the other methods.
- A leaf's `children` is `undefined` rather than `[]`, as in d3-hierarchy.
  Its TypeScript type is `Branch[] | undefined`. Use `isLeaf()`, or
  `branch.children ?? []`.
- Setting `parent` (or calling `setParent`) moves the Branch, with its
  subtree, to be the last child of the new parent, or detaches it when set to
  `null`. Before, it changed only the Branch's own pointer.
  `new Branch({ parent })` also adds the Branch to the parent's children.
- Making a Branch a descendant of itself throws
  `"Cannot make a Branch a descendant of itself."` Links can't disagree any
  more, so `isConsistent()` always returns `true` and `fixParenthood()` does
  nothing.
- `id`, `length`, `depth`, `height`, `value`, `representing`, `data`,
  `parent` and `children` are accessors on `Branch.prototype`, not own
  properties. `Object.keys`, object spread and `for...in` don't list them.
  `Branch` is a class, so its methods aren't enumerable either.
- `depth`, `height` and `representing` are stored as 32-bit integers.
- Attaching a Branch from another tree copies its subtree into this tree's
  storage, so it costs time proportional to the subtree's size. The Branch
  objects themselves stay the same.

#### Values

- `count()` sets a Branch's value to the number of leaves in its subtree, as
  d3-hierarchy's does. Before, it counted every Branch in the subtree;
  `fixDistances` still sets `value` to that count.
- `height` follows d3-hierarchy: the greatest number of edges down to a leaf
  (0 for leaves).
- Calling `fixDistances` repeatedly no longer inflates `value`.
- Branches made by `parseNewick`, `parseJSON`, `parseMatrix`, `copy` and
  `clone` have an empty `data` object.
- `_guid` is a number, unique within the loaded library, rather than a
  random UUID-like string.

#### Methods

- `excise` keeps the excised Branch's children in its place among its
  siblings. Before, they were added at the end. It leaves the excised Branch
  detached and childless, and excising a root with one child makes that child
  the new root.
- `addParent` inserts the new parent between the Branch and its old parent.
  A Branch passed as the new parent keeps its existing children.
- After `replace`, the replaced Branch is a root, and a replacement taken from
  elsewhere is removed from its old place. `replace` on a root throws
  `"Cannot replace a root Branch."`
- `invert` on a Branch whose parent isn't the root puts it in its parent's
  place.
- `isolate` on a root throws `"Cannot isolate a root Branch."`
- `copy` keeps non-finite lengths (`NaN`, `Infinity`) rather than turning them
  into 0.
- `addChild(data)` no longer adds a `parent` key to the object it's given.
- The misspelled `respresenting` property is now `representing`.

#### parseMatrix

- `parseMatrix` reads only the lower triangle of the matrix and treats the
  diagonal as zero.
- A distance of exactly `-1` is no longer ignored.
- Distances given as numeric strings work; before, they silently produced a
  wrong tree.
- `parseMatrix` no longer modifies the matrix it's given.

#### Packaging

- `import "patristic"` loads the new ES module build; `require` and the
  `<script>` tag still get the UMD build. Code that both imports and requires
  the package gets two copies of `Branch`. The ES module's default export is a
  frozen namespace object.

### New

- **d3-hierarchy layouts:** `d3.tree`, `d3.cluster`, `d3.partition`,
  `d3.treemap` and `d3.pack` work on a tree directly, and give the same
  layout as on d3's own hierarchy of it.
- **TypeScript declarations** for `require` and `import`. The exported types
  are `Id`, `BranchData`, `BranchObject`, `DistanceMatrix`, `Link` and
  `ParseMatrixOptions`.
- **ES module build:** `dist/patristic.mjs`.
- **`parseMatrix(matrix, labels, { float32: true })`** stores distances as
  32-bit floats, using less memory.

### Fixes

- `getMRCA` of a Branch with itself or one of its ancestors, and so `path`
  and `distanceTo` in those cases.
- `consolidate` and `simplify` skipped Branches next to ones they removed,
  could remove the Branch they were called on, and added stray `+` to merged
  ids.
- `parseJSON` applies custom id, length and children labels at every level.
- An `id` or `value` of `0` was replaced by the default.
- Small Newick branch lengths were written with floating point artifacts
  (`1e-7` came out as `0.00000009999999999999999`).
- `setParent`'s type check never ran.
- `remove(true)` and `removeIfNoChildren` lost track of the parent.
- `addParent` and `replace` left the tree's links inconsistent.

### Performance

These comparisons are between 0.6.0 and 0.7.0 on Node 22.

| Operation | 0.6.0 | 0.7.0 |
|---|---:|---:|
| `parseMatrix`, 2,000 taxa | 2.7 s | 1.0 s |
| `parseMatrix`, 4,000 taxa | 14.1 s | 4.9 s |
| `toMatrix`, 2,000 leaves | 4.2 s | 45 ms |
| `hasDescendant`, 1,000 calls on 2,000 leaves | 1.5 s | 0.1 ms |
| `parseNewick`, 100,000-tip caterpillar | stack overflow | 0.1 s |
| Memory for a 100,000-tip tree | 56.5 MB | 20.2 MB |

Very deep trees work everywhere now. Parsing, serializing, traversing,
copying and querying a 100,000-deep tree used to overflow the call stack.

### Tooling

- The source is TypeScript (`src/patristic.ts`), with `strict` and further
  checks turned on.
- `npm test`, `npm run build` and `npm run typecheck` use pinned jest,
  rollup and TypeScript.
- GitHub Actions run the tests on Node 20, 22 and 24. They also check that
  the committed `dist/` matches the source, and the publish workflow runs the
  same checks before publishing.
- `npm run bench` runs a benchmark suite.
