patristic is a javascript library for inferring distance matrices from
phylogenetic trees.

# Installation

To install patristic package with NPM use: `npm install patristic`

# Usage

Please note that this is very much an alpha-stage API and is (all but certainly)
going to change in the very near future.

## Quick Start

```javascript
var newick = "(A:0.1,B:0.2,(C:0.3,(D:0.4,E:0.6):0.1):0.5);";
var tree = patristic.parseNewick(newick);
```

(Note that elements in the tree object maintain references to their parents,
creating circular references.)

More interestingly, we can use this tree to compute a patristic distance matrix.

```javascript
var matrix = patristic.computeMatrix(newick);
```

## Function Reference

```javascript
patristic = {
  computeMatrix: function (text) - Given a newick string, returns a patristic distance matrix.
  depth: function (root, leaf) - Given a root and a leaf, returns the depth of the leafs relative to the root.
  distanceBetween: function (tree, a, b) -
  getLeaf: function (root, name) -
  getLeafNames: function (tree) -
  getLeaves: function (tree) -
  isChildOf: function (root, leaf) -
  parseNewick: function (newick) - given newick string, returns tree
};
```
