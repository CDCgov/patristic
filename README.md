# patristic

`patristic` is a javascript toolkit for working with phylogenies. It can:

* Parse newick into Javacsipt objects representing the phylogenetic tree
* Run rapid neighbor joining to compute a phylogenetic tree from a distance matrix
* Infer a patristic distance matrix from a phylogenetic tree
* Reroot a tree on any given leaf node
* Infer directionality between two leaves in the tree (in development)

## Installation

To install patristic package with NPM use: `npm install --save patristic`

## Usage

Please note that this is very much an alpha-stage API and is (all but certainly)
going to change in the very near future.

### Quick Start

```javascript
var newick = "(A:0.1,B:0.2,(C:0.3,(D:0.4,E:0.6):0.1):0.5);";
var tree = patristic.parseNewick(newick);
```

We can use this tree to compute a patristic distance matrix.

```javascript
var matrix = tree.toMatrix();
```

Note that elements in the tree object maintain references to their parents,
creating circular references. If you need a tree without circular references for
some sort of serialization:

```javascript
tree.toObject();
```

Although, let's be honest: you're going to make it JSON. We've got you covered:

```javascript
tree.toJSON();
```

## Function Reference

`patristic.parseJSON(json, idLabel, lengthLabel, childrenLabel)` - Parses a JSON string (`json`) containing a tree, returning a `Branch` object representing the root of the tree.

`patristic.parseMatrix(matrix, labels)` - Parses a "matrix" (an array of arrays) specifying pairwise distances between individuals/samples/whatever. Also accepts an optional array of strings to be used as identifiers for the aforementioned individuals/samples/whatever. Runs [Rapid Neighbor Joining]() to assemble a tree and returns the Branch object of the root.

`patristic.parseNewick(newick)` - Parses a newick string and returns a Branch object representing the root node of the tree.

`patristic.Branch(data)` - creates a new Branch Object. You'll probably want to use one of the above parsers, rather than programatically create branches directly.

Once you have your root `Branch`, it (and its children) expose the following methods:

`Branch.addChild(data)` - Takes `data` and (if it is not already a Branch object, creates one with it, and) adds it as a child of the Branch on which it is called.

`Branch.addChildren(children)` - Iterates over either an array or the given arguments and calls `Branch.addChild` on each.

`Branch.addParent(data, siblings)`

`Branch.depthOf(child)`

`Branch.distanceBetween(a, b)`

`Branch.fixParenthood(nonrecursive)` - corrects records of parenthood, which can become corrupted during certain mutative operations (e.g. `reroot`). Mostly intended for internal use: If you need to call this, you've probably edited some Branch incorrectly.

`Branch.getDescendant(id)`

`Branch.getDescendants()`

`Branch.getRoot()`

`Branch.hasChild(child)`

`Branch.hasDescendant(descendant)`

`Branch.isChildOf(parent)`

`Branch.isDescendantOf(ancestor)`

`Branch.isLeaf()` - returns a boolean indicating whether or not a Branch object is a leaf node (i.e. has no children).

`Branch.isRoot()` - returns a boolean indicating whether or not a Branch object is the root of a tree (i.e. has no parent).

`Branch.remove()`

`Branch.reorder(sortfn)`

`Branch.reroot()`

`Branch.setLength(length)`

`Branch.setParent(parent)`

`Branch.toJSON()`

`Branch.toMatrix()`

`Branch.toNewick(nonterminus)`

`Branch.toObject()`

## Public Domain
This repository constitutes a work of the United States Government and is not
subject to domestic copyright protection under 17 USC § 105. This repository is in
the public domain within the United States, and copyright and related rights in
the work worldwide are waived through the [CC0 1.0 Universal public domain dedication](https://creativecommons.org/publicdomain/zero/1.0/).
All contributions to this repository will be released under the CC0 dedication. By
submitting a pull request you are agreeing to comply with this waiver of
copyright interest.

## License
The repository utilizes code licensed under the terms of the Apache Software
License and therefore is licensed under ASL v2 or later.

This source code in this repository is free: you can redistribute it and/or modify it under
the terms of the Apache Software License version 2, or (at your option) any
later version.

This source code in this repository is distributed in the hope that it will be useful, but WITHOUT ANY
WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
PARTICULAR PURPOSE. See the Apache Software License for more details.

You should have received a copy of the Apache Software License along with this
program. If not, see http://www.apache.org/licenses/LICENSE-2.0.html

The source code forked from other open source projects will inherit its license.

## Privacy
This repository contains only non-sensitive, publicly available data and
information. All material and community participation is covered by the
Surveillance Platform [Disclaimer](https://github.com/CDCgov/template/blob/master/DISCLAIMER.md)
and [Code of Conduct](https://github.com/CDCgov/template/blob/master/code-of-conduct.md).
For more information about CDC's privacy policy, please visit [http://www.cdc.gov/privacy.html](http://www.cdc.gov/privacy.html).

## Contributing
Anyone is encouraged to contribute to the repository by [forking](https://help.github.com/articles/fork-a-repo)
and submitting a pull request. (If you are new to GitHub, you might start with a
[basic tutorial](https://help.github.com/articles/set-up-git).) By contributing
to this project, you grant a world-wide, royalty-free, perpetual, irrevocable,
non-exclusive, transferable license to all users under the terms of the
[Apache Software License v2](http://www.apache.org/licenses/LICENSE-2.0.html) or
later.

All comments, messages, pull requests, and other submissions received through
CDC including this GitHub page are subject to the [Presidential Records Act](http://www.archives.gov/about/laws/presidential-records.html)
and may be archived. Learn more at [http://www.cdc.gov/other/privacy.html](http://www.cdc.gov/other/privacy.html).

## Records
This repository is not a source of government records, but is a copy to increase
collaboration and collaborative potential. All government records will be
published through the [CDC web site](http://www.cdc.gov).

## Notices
Please refer to [CDC's Template Repository](https://github.com/CDCgov/template)
for more information about [contributing to this repository](https://github.com/CDCgov/template/blob/master/CONTRIBUTING.md),
[public domain notices and disclaimers](https://github.com/CDCgov/template/blob/master/DISCLAIMER.md),
and [code of conduct](https://github.com/CDCgov/template/blob/master/code-of-conduct.md).
