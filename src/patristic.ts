/**
 * The [SemVer](https://semver.org/) version string of the patristic library
 * @type {String} A string specifying the current version of the Patristic Library.
 * If not given, the version of patristic you are using if less than or equal to 0.2.2.
 * @example
 * console.log(patristic.version);
 */
export const version = "0.6.0";

/** A Branch's identifier. Trees built by parseMatrix without labels use numbers. */
export type Id = string | number;

/**
 * Data a Branch is built from. Its known attributes initialize the Branch's;
 * the whole object is kept as the Branch's `data`.
 */
export interface BranchData {
  id?: Id;
  length?: number;
  depth?: number;
  height?: number;
  parent?: Branch | null;
  children?: Branch[];
  value?: number;
  [key: string]: unknown;
}

/** A serializable representation of a Branch and its descendants. */
export interface BranchObject {
  id: Id;
  length: number;
  children?: BranchObject[];
}

/** Patristic distances between leaves, and the ids of the leaves in order. */
export interface DistanceMatrix {
  matrix: number[][];
  ids: Id[];
}

/** A link from a parent Branch to one of its children. */
export interface Link {
  source: Branch;
  target: Branch;
}

/** The second argument to JSON.stringify. */
type Replacer =
  | ((this: unknown, key: string, value: unknown) => unknown)
  | (string | number)[]
  | null;

/**
 * A class for representing Branches in trees.
 * It's written predominantly for phylogenetic trees (hence the
 * [Newick parser](#parseNewick),
 * [neighbor-joining implementation](#parseMatrix), etc.), but could
 * conceivably be useful for representing other types of trees as well.
 * @param {Object} [data] An object containing data you wish to assign to
 * this Branch object. In particular, intended to overwrite the default
 * attributes of a Branch, namely `id`, `parent`, `length`, and `children`.
 * @constructor
 */
export class Branch {
  /** A number unique to this Branch within the loaded library. */
  _guid: number;
  id: Id;
  data: BranchData;
  depth: number;
  height: number;
  length: number;
  parent: Branch | null;
  children: Branch[];
  value: number;
  representing: number;

  constructor(
    data?: BranchData | null,
    children?: (data: BranchData) => Branch[] | null | undefined
  ) {
    if (!data) data = {};
    this._guid = ++lastGuid;
    this.id = data.id ?? "";
    this.data = data;
    this.depth = data.depth ?? 0;
    this.height = data.height ?? 0;
    this.length = data.length ?? 0;
    this.parent = data.parent ?? null;
    this.children = (children ? children(data) : data.children) || [];
    this.value = data.value ?? 1;
    this.representing = 1;
  }

  /**
   * Adds a new child to this Branch
   * @param  {(Branch|Object)} [data={}] The new Branch, or data to attach to it.
   * @return {Branch} The (possibly new) child Branch
   */
  addChild(data?: Branch | BranchData | null): Branch {
    let c;
    if (data instanceof Branch) {
      c = data;
      c.parent = this;
    } else {
      c = new Branch(data);
      c.parent = this;
    }
    this.children.push(c);
    return c;
  }

  /**
   * Adds a new parent to this Branch, inserting it between this Branch and its
   * current parent (if any). This is a bit esoteric and generally not
   * recommended.
   * @param  {(Branch|Object)} [data={}] A Branch object, or the data to attach to one
   * @param  {Array} [siblings=[]] An array of Branches to be the children of the
   * new parent Branch (i.e. siblings of this Branch). They are detached from
   * wherever they were in the tree.
   * @return {Branch} The Branch on which this was called
   */
  addParent(data?: Branch | BranchData | null, siblings?: Branch[]): this {
    if (!siblings) siblings = [];
    let c;
    if (data instanceof Branch) {
      c = data;
      detach(c);
    } else {
      if (!data) data = {};
      c = new Branch(Object.assign(data));
    }
    let oldParent = this.parent;
    if (oldParent) {
      oldParent.children[oldParent.children.indexOf(this)] = c;
    }
    c.parent = oldParent;
    this.parent = c;
    c.children.push(this);
    siblings.forEach(sib => {
      detach(sib);
      sib.parent = c;
      c.children.push(sib);
    });
    return this;
  }

  /**
   * Returns an array of Branches from this Branch to the root.
   * [d3-hierarchy compatibility method.](https://github.com/d3/d3-hierarchy#node_ancestors)
   * @type {Array} An array of Branches
   */
  ancestors(): Branch[] {
    return this.getAncestors(true);
  }

  /**
   * Returns a deep clone of the Branch on which it is called. Note that this does
   * not clone all descendants, rather than providing references to the existing
   * descendant Branches.
   * @return {Branch} A clone of the Branch on which it is called.
   */
  clone(): Branch {
    return copyTree(this);
  }

  /**
   * All descendant Branches with near-zero length are excised
   * @return {Branch} The Branch on which this method was called.
   */
  consolidate(): this {
    // Collect first: excising while traversing would shift the arrays being
    // traversed and skip Branches.
    let branches: Branch[] = [];
    this.eachAfter(branch => branches.push(branch));
    branches.forEach(branch => {
      if (branch === this || branch.isRoot() || branch.length >= 0.0005) return;
      branch.parent!.id = joinIds(branch.parent!.id, branch.id);
      branch.excise();
    });
    return this.fixDistances();
  }

  /**
   * Returns a clone of the Branch on which it is called. Note that this also
   * clones all descendants, rather than providing references to the existing
   * descendant Branches. (For a shallow clone, see [Branch.clone](#clone).
   * Finally, the cloned Branch will become the root of the cloned tree, having a
   * parent of `null`.
   * [d3-hierarchy compatibility method.](https://github.com/d3/d3-hierarchy#node_copy)
   * @return {Branch} A clone of the Branch on which it is called.
   */
  copy(): Branch {
    return copyTree(this);
  }

  /**
   * Sets the values of all nodes to be equal to the number of their descendants.
   * @return {Branch} The Branch on which it was called
   */
  count(): this {
    return this.sum(() => 1);
  }

  /**
   * Returns an array pf descendants, starting with this Branch.
   * [d3-hierarchy compatibility method.](https://github.com/d3/d3-hierarchy#node_descendants)
   * @type {Array} An Array of Branches, starting with this one.
   */
  descendants(): Branch[] {
    return this.getDescendants(true);
  }

  /**
   * Returns the depth of a given child, relative to the Branch on which it is
   * called.
   * @param  {(Branch|String)} descendant A descendant Branch (or `id` string
   * thereof)
   * @return {Number} The sum of the lengths of all Branches between the Branch on
   * which it is called and `descendant`. Throws an error if `descendant` is not a
   * descendant of this Branch.
   */
  depthOf(descendant: Branch | string): number {
    let distance = 0;
    let target =
      typeof descendant == "string"
        ? this.getDescendant(descendant)
        : descendant;
    if (typeof target == "undefined")
      throw Error("Cannot compute depth of undefined descendant!");
    let current = target;
    while (current != this) {
      distance += current.length;
      current = current.parent!;
    }
    return distance;
  }

  /**
   * Computes the patristic distance between `descendantA` and `descendantB`.
   * @param  {Branch} descendantA The Branch from which you wish to compute
   * distance
   * @param  {Branch} descendantB The Branch to which you wish to compute distance
   * @return {number} The patristic distance between the given descendants.
   */
  distanceBetween(descendantA: Branch, descendantB: Branch): number {
    let [, a, b] = distancesToMRCA(descendantA, descendantB);
    return a + b;
  }

  /**
   * Computes the patristic distance between `cousin` and the Branch on which
   * this method is called.
   * @param  {Branch} cousin The Branch to which you wish to compute distance
   * @return {number} The patristic distance between `cousin` and the Branch on
   * this method is called.
   */
  distanceTo(cousin: Branch): number {
    let [, a, b] = distancesToMRCA(this, cousin);
    return a + b;
  }

  /**
   * Visits each Branch descended from the Branch on which it is called in
   * [Breadth First Search](https://en.wikipedia.org/wiki/Breadth-first_search)
   * order and returns the Branch on which it was called.
   * @param  {Function} callback The function to be run on each Branch
   * @return {Branch} The Branch on which it was called.
   */
  each(callback: (branch: Branch) => void): this {
    let branch: Branch | undefined = this,
      next: Branch[] = [branch],
      current: Branch[];
    while (next.length) {
      current = next.reverse();
      next = [];
      while ((branch = current.pop())) {
        callback(branch);
        branch.eachChild(child => next.push(child));
      }
    }
    return this;
  }

  /**
   * Visits each Branch descended from the Branch on which it is called in
   * [post-traversal order](https://en.wikipedia.org/wiki/Tree_traversal#Post-order)
   * and returns the Branch on which it was called.
   * @param  {Function} callback Function to run on each Branch
   * @return {Branch} The Branch on which it was called
   */
  eachAfter(callback: (branch: Branch) => void): this {
    walk(this, null, callback);
    return this;
  }

  /**
   * Visits each Branch descended from the Branch on which it is called in
   * [pre-traversal order](https://en.wikipedia.org/wiki/Tree_traversal#Pre-order)
   * and returns the Branch on which it was called.
   * @param  {Function} callback [description]
   * @return {[type]}            [description]
   */
  eachBefore(callback: (branch: Branch) => void): this {
    walk(this, callback, null);
    return this;
  }

  /**
   * Runs a function on each child of the Branch on which it is called.
   * @param  {Function} callback The function to run on each child.
   * @return {Branch} The Branch on which it was called.
   */
  eachChild(
    callback: (child: Branch, index: number, children: Branch[]) => void
  ): this {
    this.children.forEach(callback);
    return this;
  }

  /**
   * Excises the Branch on which it is called and updates its parent and children.
   * Excising a root Branch with a single child makes that child the new root.
   * @return {Branch} The parent of the excised Branch, or the new root if the
   * excised Branch was the root.
   */
  excise(): Branch {
    if (this.isRoot()) {
      if (this.children.length > 1) {
        throw new Error("Cannot excise a root Branch with multiple children.");
      }
      let child = this.children.pop();
      if (!child) throw new Error("Cannot excise a root Branch with no children.");
      child.length += this.length;
      child.parent = null;
      return child;
    }
    let parent = this.parent!;
    this.eachChild(child => {
      child.length += this.length;
      child.parent = parent;
    });
    // Replace this Branch with its children in place. Spreading the children
    // into splice's arguments would overflow the stack for very many children.
    let siblings = parent.children;
    let index = siblings.indexOf(this);
    if (this.children.length === 1) {
      siblings[index] = this.children[0];
    } else {
      let after = siblings.splice(index);
      after.shift();
      this.children.forEach(child => siblings.push(child));
      after.forEach(sibling => siblings.push(sibling));
    }
    parent.representing++;
    return parent;
  }

  /**
   * Sets the distance values (height and depth) for each Branch, and sets each
   * Branch's value to the number of Branches in its subtree (see
   * [Branch.count](#count)).
   * @return {Branch} The Branch on which it is called.
   */
  fixDistances(): this {
    this.getRoot().depth = 0;
    this.eachBefore(d => {
      if (d.isRoot()) return;
      d.depth = d.parent!.depth + 1;
    }).eachAfter(d => {
      d.height = d.children.reduce((a, c) => Math.max(a, c.height + 1), 0);
      d.value = 1 + d.children.reduce((a, c) => a + c.value, 0);
    });
    return this;
  }

  /**
   * Repairs incorrect links by recurively confirming that children reference
   * their parents, and correcting those references if they do not.
   *
   * If you need to call this, something has messed up the state of your tree
   * and you should be concerned about that. Just FYI. ¯\\_(ツ)_/¯
   * @param  {Boolean} nonrecursive Should this just fix the children of the
   * Branch on which it is called, or all descendants?
   * @return {Branch} The Branch on which it was called.
   */
  fixParenthood(nonrecursive?: boolean): this {
    let stack: Branch[] = [this];
    while (stack.length) {
      let branch = stack.pop()!;
      branch.children.forEach(child => {
        child.parent = branch;
        if (!nonrecursive) stack.push(child);
      });
    }
    return this;
  }

  /**
   * Reverses the order of (all of) the descendants of the Branch.
   * @return {Branch} The Branch on which this was called.
   */
  flip(): this {
    return this.each(c => c.rotate());
  }

  /**
   * Returns an Array of all the ancestors of the Branch on which it is called.
   * Note that this does not include itself. For all ancestors and itself, see
   * [Branch.ancestors](#ancestors)
   * @param {Boolean} includeSelf Should the Branch on which this is called be
   * included in the results?
   * @return {Array} Every Ancestor of the Branch on which it was called.
   */
  getAncestors(includeSelf?: boolean): Branch[] {
    let ancestors: Branch[] = includeSelf ? [this] : [];
    for (let current = this.parent; current; current = current.parent) {
      ancestors.push(current);
    }
    return ancestors;
  }

  /**
   * Given an `childID`, returns the child with that id (or `undefined` if no such
   * child is present).
   * @param  {(String|Number)} childID the ID of the child to return. (Trees
   * built by [parseMatrix](#parseMatrix) without labels have numeric ids.)
   * @return {(Branch|undefined)} The desired child Branch, or `undefined` if the
   * child doesn't exist.
   */
  getChild(childID: Id): Branch | undefined {
    return this.children.find(c => c.id === childID);
  }

  /**
   * Given an id string, returns the descendant Branch with that ID, or
   * `undefined` if it doesn't exist.
   * @param  {String} id The id string of the Branch to find
   * @return {(Branch|undefined)} The descendant Branch, or `undefined` if it
   * doesn't exist
   */
  getDescendant(id: Id): Branch | undefined {
    let stack: Branch[] = [this];
    while (stack.length) {
      let branch = stack.pop()!;
      if (branch.id === id) return branch;
      pushChildren(stack, branch);
    }
    return undefined;
  }

  /**
   * Returns an array of all Branches which are descendants of this Branch
   * @param {Boolean} [includeSelf] Is this not the Branch on which the user
   * called the function? This is used internally and should be ignored.
   * @return {Array} An array of all Branches descended from this Branch
   */
  getDescendants(includeSelf?: boolean): Branch[] {
    let descendants: Branch[] = includeSelf ? [this] : [];
    let stack: Branch[] = [];
    pushChildren(stack, this);
    while (stack.length) {
      let branch = stack.pop()!;
      descendants.push(branch);
      pushChildren(stack, branch);
    }
    return descendants;
  }

  /**
   * Returns an array of all leaves which are descendants of this Branch.
   * Alias of [getLeaves](#getLeaves) for people whose strong suit isn't spelling.
   * @return {Array} An array of all leaves descended from this Branch
   */
  getLeafs(): Branch[] {
    return this.getLeaves();
  }

  /**
   * Returns an array of all leaves which are descendants of this Branch
   * See also: [getLeafs](#getLeafs)
   * @return {Array} An array of all leaves descended from this Branch
   */
  getLeaves(): Branch[] {
    let leaves: Branch[] = [];
    let stack: Branch[] = [this];
    while (stack.length) {
      let branch = stack.pop()!;
      if (branch.isLeaf()) leaves.push(branch);
      else pushChildren(stack, branch);
    }
    return leaves;
  }

  /**
   * Traverses the tree upward until it finds the Most Recent Common Ancestor
   * (i.e. the first Branch for which both the Branch on which it was called and
   * `cousin` are descendants). A Branch counts as its own descendant here, so
   * the MRCA of a Branch and one of its ancestors is that ancestor.
   * @return {Branch} The Most Recent Common Ancestor of both the Branch on
   * which it was called and the `cousin`.
   */
  getMRCA(cousin: Branch): Branch {
    return climbToMRCA(this, cousin)[0];
  }

  /**
   * Traverses the tree upward until it finds the root Branch, and returns the
   * root.
   * @return {Branch} The root Branch of the tree
   */
  getRoot(): Branch {
    let branch: Branch = this;
    while (!branch.isRoot()) branch = branch.parent!;
    return branch;
  }

  /**
   * Determines if a given Branch (or ID) is a child of this Branch
   * @param  {(Branch|String)} child The Branch (or the id thereof) to check for
   * @return {Boolean}
   */
  hasChild(child: Branch | string): boolean {
    if (child instanceof Branch) {
      return this.children.includes(child);
    } else if (typeof child === "string") {
      return this.children.some(c => c.id === child);
    }
    throw Error(
      `Unknown type of child (${typeof child}) passed to Branch.hasChild!`
    );
  }

  /**
   * Checks to see if `descendant` is a descendant of the Branch on which this
   * method is called.
   * @param  {(Branch|String)} descendant Either the descendant Branch or its'
   * `id`.
   * @return {Boolean} True if `descendant` is descended from the Branch from
   * which this is called, otherwise false.
   */
  hasDescendant(descendant: Branch | string): boolean {
    if (descendant instanceof Branch) {
      return descendant.isDescendantOf(this);
    } else if (typeof descendant === "string") {
      return findBelow(this, d => d.id === descendant) !== undefined;
    }
    throw Error("Unknown type of descendant passed to Branch.hasDescendant!");
  }

  /**
   * Checks to see if a Branch has a descendant leaf.
   * @return {Boolean} True if leaf is both a leaf and a descendant of the
   * Branch on which this method is called, False otherwise.
   */
  hasLeaf(leaf: Branch | string): boolean {
    if (leaf instanceof Branch) {
      // A leaf's only leaf is itself.
      return leaf.isLeaf() && (leaf === this || leaf.isDescendantOf(this));
    } else if (typeof leaf === "string") {
      if (this.isLeaf()) return this.id === leaf;
      return findBelow(this, d => d.isLeaf() && d.id === leaf) !== undefined;
    }
    throw Error("Unknown type of leaf passed to Branch.hasLeaf.");
  }

  /**
   * Swaps the branch on which it is called with its parent. This method is
   * probably only useful as an internal component of [Branch.reroot](#reroot).
   * @return {Branch} The Branch object on which it was called.
   */
  invert(): this {
    let oldParent = this.parent;
    if (oldParent) {
      let temp = oldParent.length;
      oldParent.length = this.length;
      this.length = temp;
      this.parent = oldParent.parent;
      this.children.push(oldParent);
      oldParent.parent = this;
      oldParent.children.splice(oldParent.children.indexOf(this), 1);
    } else {
      throw Error("Cannot invert root node!");
    }
    return this;
  }

  /**
   * Returns whether the Branch on which it is called is a child of a given parent
   * (or parent ID).
   * @param  {(Branch|String)} parent A Branch (or ID thereof) to test for
   * paternity of this Branch.
   * @return {Boolean} True is `parent` is the parent of this Branch, false
   * otherwise.
   */
  isChildOf(parent: Branch | string): boolean {
    if (parent instanceof Branch) return this.parent === parent;
    if (typeof parent === "string") return this.parent!.id === parent;
    throw Error("Unknown parent type passed to Branch.isChildOf");
  }

  /**
   * Tests whether this and each descendant Branch holds correct links to both
   * its parent and its children.
   * @return {Boolean} True if consistent, otherwise false
   */
  isConsistent(): boolean {
    if (!this.isRoot()) {
      if (!this.parent!.children.includes(this)) return false;
    }
    // Below this Branch, a child whose parent points back at the Branch whose
    // children it's in is consistent from both sides. A Branch seen twice means
    // the tree has a cycle (or a Branch listed twice), which would otherwise
    // loop forever.
    let seen = new Set<Branch>([this]);
    let stack: Branch[] = [this];
    while (stack.length) {
      let branch = stack.pop()!;
      let children = branch.children;
      for (let i = 0; i < children.length; i++) {
        let child = children[i];
        if (child.parent !== branch || seen.has(child)) return false;
        seen.add(child);
        stack.push(child);
      }
    }
    return true;
  }

  /**
   * Returns whether a given Branch is an ancestor of the Branch on which this
   * method is called.
   * @param  {Branch} ancestor The Branch to check for ancestorhood
   * @return {Boolean} If this Branch is descended from `ancestor`
   */
  isDescendantOf(ancestor: Branch | string): boolean {
    if (!ancestor) return false;
    for (let current = this.parent; current; current = current.parent) {
      if (current === ancestor || current.id === ancestor) return true;
    }
    return false;
  }

  /**
   * Returns a boolean indicating if this Branch is a leaf (i.e. has no
   * children).
   * @return {Boolean} True is this Branch is a leaf, otherwise false.
   */
  isLeaf(): boolean {
    return this.children.length === 0;
  }

  /**
   * Returns a boolean indicating whether or not this Branch is olate.
   *
   * ...Just kidding!
   *
   * Isolates a Branch and its subtree (i.e. removes everything above it, making
   * it the root Branch). Similar to [Branch.remove](#remove), only it returns
   * the Branch on which it is called.
   * @return {Branch} The Branch object on which it was called.
   */
  isolate(): this {
    let index = this.parent!.children.indexOf(this);
    this.parent!.children.splice(index, 1);
    this.setParent(null);
    return this;
  }

  /**
   * Returns a boolean indicating if this Branch is the root of a tree (i.e. has
   * no parents).
   * @return {Boolean} True if this Branch is the root, otherwise false.
   */
  isRoot(): boolean {
    return this.parent === null;
  }

  /**
   * Returns the array of leaf nodes in traversal order; leaves are nodes with no
   * children. Alias of [Branch.getLeaves](#getLeaves) `cuz spelling is hard.
   * @type {Array} An Array of Branches which are descended from this Branch and
   * have no children.
   */
  leafs(): Branch[] {
    return this.getLeaves();
  }

  /**
   * Returns the array of leaf nodes in traversal order; leaves are nodes with no
   * children. Alias of [Branch.getLeaves](#getLeaves).
   * [d3-hierarchy compatibility method.](https://github.com/d3/d3-hierarchy#node_leaves)
   * @type {Array} An Array of Branches which are descended from this Branch and
   * have no children.
   */
  leaves(): Branch[] {
    return this.getLeaves();
  }

  /**
   * Returns an Array of links, which are plain javascript objects containing a
   * `source` attribute (which is a reference to the parent Branch) and a `target`
   * attribute (which is a reference to the child Branch).
   * [d3-hierarchy compatibility method](https://github.com/d3/d3-hierarchy#node_links)
   * @return {Array} An array of plain Javascript objects
   */
  links(): Link[] {
    let links: Link[] = [];
    this.each(d => {
      if (d.isRoot()) return;
      links.push({
        source: d.parent!,
        target: d
      });
    });
    return links;
  }

  /**
   * Normalizes this and all descendant Branches `value` attributes to between
   * `newmin` and `newmax`. Note that normalize can function as its own inverse
   * when passed an original range. For example:
   * @example tree.normalize().normalize(1, tree.getDescendants().length + 1);
   * @param  {Number} newmin The desired minimum value.
   * @param  {Number} newmax The desired maximum value.
   * @return {Branch} The Branch on which it was called.
   */
  normalize(newmin?: number, newmax?: number): this {
    if (typeof newmax !== "number") newmax = 1;
    if (typeof newmin !== "number") newmin = 0;
    let min = Infinity,
      max = -Infinity;
    this.each(d => {
      if (d.value < min) min = d.value;
      if (d.value > max) max = d.value;
    });
    let ratio = (newmax - newmin) / (max - min);
    return this.each(d => (d.value = (d.value - min) * ratio + newmin));
  }

  /**
   * Gets the path from this Branch to `target`. If this Branch and `target` are
   * the same, returns an array containing only the Branch on which it is called.
   * @param  {Branch} target A Branch object
   * @return {Array} An ordered Array of Branches following the path between this
   * Branch and `target`
   */
  path(target: Branch): Branch[] {
    let mrca = this.getMRCA(target);
    let branches: Branch[] = [];
    for (let current: Branch = this; current !== mrca; current = current.parent!) {
      branches.push(current);
    }
    branches.push(mrca);
    let down: Branch[] = [];
    for (let current = target; current !== mrca; current = current.parent!) {
      down.push(current);
    }
    for (let i = down.length - 1; i >= 0; i--) branches.push(down[i]);
    return branches;
  }

  /**
   * Removes a Branch and its subtree from the tree. Similar to
   * [Branch.isolate](#isolate), only it returns the root Branch of the tree
   * from which this Branch is removed.
   * @param {Boolean} pruneAncestors - If true, removes ancestors with no remaining children as well
   * @return {Branch} The root of the remaining tree.
   */
  remove(pruneAncestors?: boolean): Branch {
    let root = this.getRoot();
    let parent = this.parent;
    this.isolate();
    if (pruneAncestors) {
      parent?.removeIfNoChildren();
    }
    return root;
  }

  /**
   * Removes the branch if it has no children. Then recursively removes all
   * ancestors with no children.
   *
   * @param {Boolean} nonrecursive - If true, does not remove ancestors with no children
   * @return {Branch} The root of the modified tree.
   */
  removeIfNoChildren(nonrecursive?: boolean): Branch {
    let root = this.getRoot();
    let parent = this.parent;

    if (this.children.length === 0 && parent) {
      this.remove();
      if (!nonrecursive) {
        parent.removeIfNoChildren();
      }
    }

    return root;
  }

  /**
   * Removes a Branch and its subtree from the tree, and replaces it. The
   * replacement is detached from wherever it was, and the replaced Branch
   * becomes the root of its own tree.
   * @param {Branch} replacement - The branch to replace the branch on which the
   * method is called.
   * @return {Branch} The root of the modified tree.
   */
  replace(replacement: Branch): Branch {
    let parent = this.parent;
    if (!parent) throw new Error("Cannot replace a root Branch.");
    let root = this.getRoot();
    detach(replacement);
    parent.children[parent.children.indexOf(this)] = replacement;
    replacement.parent = parent;
    this.parent = null;
    return root;
  }

  /**
   * Reroots a tree on this Branch. Use with caution, this returns the new root,
   * which should typically supplant the existing root Branch object, but does
   * not replace that root automatically.
   * @example
   * tree = tree.children[0].children[0].reroot();
   * @return {Branch} The new root Branch, which is the Branch on which this was
   * called
   */
  reroot(): this {
    let current: Branch = this;
    let toInvert: Branch[] = [];
    while (!current.isRoot()) {
      toInvert.push(current);
      current = current.parent!;
    }
    toInvert.reverse().forEach(c => c.invert());
    return this.fixDistances();
  }

  /**
   * Reverses the order of the children of the branch on which it is called.
   * @return {Branch} The Branch on which this was called.
   */
  rotate(recursive?: boolean): this {
    if (!this.children) return this;
    this.children.reverse();
    return this;
  }

  /**
   * Set the length of a Branch
   * @param  {number} length The new length to assign to the Branch
   * @return {Branch} The Branch object on which this was called
   */
  setLength(length: number): this {
    this.length = length;
    return this;
  }

  /**
   * Sets the parent of the Branch on which it is called.
   * @param  {Branch} parent The Branch to set as parent
   * @return {Branch} The Branch on which this method was called.
   */
  setParent(parent: Branch | null): this {
    if (!(parent instanceof Branch) && parent !== null)
      throw Error("Cannot set parent to non-Branch object!");
    this.parent = parent;
    return this;
  }

  /**
   * Collapses each descendant Branch with exactly one child into a single
   * continuous branch. The Branch on which it is called is left in place.
   * @return {Branch} The Branch on which this method was called.
   */
  simplify(): this {
    this.eachAfter(branch => {
      // Excising this Branch would detach it from the tree we return.
      if (branch === this) return;
      if(branch.children.length == 1){
        let child = branch.children[0];
        child.id = joinIds(branch.id, child.id);
        branch.excise();
      }
    });
    return this.fixDistances();
  }

  /**
   * Sorts the Tree from the branch on which it is called downward.
   * @param  {Function} [comparator] A Function taking two Branches and returning
   * a numberic value. For details, see [MDN Array.sort](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort#Description)
   * @return {Branch} The Branch on which it was called
   */
  sort(comparator?: (a: Branch, b: Branch) => number): this {
    if (!comparator) comparator = (a, b) => a.value - b.value;
    return this.eachBefore(d => d.children.sort(comparator));
  }

  /**
   * Determines whether this Branch is likelier to be a source of `cousin`, or
   * if `cousin` is a source of this Branch.
   * @param  {Branch} cousin The other Branch to test
   * @return {Boolean} True if this might be the source of cousin, otherwise
   * false.
   */
  sources(cousin: Branch): boolean {
    let [, a, b] = distancesToMRCA(this, cousin);
    return a < b;
  }

  /**
   * Computes the value of each Branch according to some valuator function
   * @param  {Function} value A Function taking a Branch and returning a
   * (numeric?) value.
   * @return {Branch} The Branch on which it was called.
   */
  sum(value?: (branch: Branch) => number): this {
    if (!value) value = d => d.value;
    return this.eachAfter(
      d => (d.value = value(d) + d.children.reduce((a, c) => a + c.value, 0))
    );
  }

  /**
   * Determines whether this Branch is likelier to be a target of `cousin`, or
   * if `cousin` is a target of this Branch.
   * @param  {Branch} cousin The other Branch to test
   * @return {Boolean} True if this might be the target of cousin, otherwise
   * false.
   */
  targets(cousin: Branch): boolean {
    return cousin.sources(this);
  }

  /**
   * toJSON is an alias for [toObject](#toObject), enabling the safe use of
   * `JSON.stringify` on Branch objects (in spite of their circular references).
   * @type {Function}
   * @returns {Object} A serializable Object
   */
  toJSON(): BranchObject {
    return this.toObject();
  }

  /**
   * Computes a matrix of all patristic distances between all leaves which are
   * descendants of the Branch on which this method is called.
   * @return {Object} An Object containing a matrix (an Array of Arrays) and
   * Array of `id`s corresponding to the rows (and columns) of the matrix.
   */
  toMatrix(): DistanceMatrix {
    let leafs = this.getLeaves();
    let n = leafs.length;
    let matrix = new Array(n);
    for (let i = 0; i < n; i++) matrix[i] = new Array(n).fill(0);
    let nextLeaf = 0;
    // In post-order, each Branch's children's lists are the last ones on the
    // stack. A list holds the indices of a subtree's leaves and their distances
    // to the subtree's root. Each pair of leaves is visited once, at its MRCA,
    // so this is O(n^2) in the number of leaves.
    let indexStack: number[][] = [],
      distanceStack: number[][] = [];
    this.eachAfter(branch => {
      if (branch.isLeaf()) {
        // Leaves come in the same order as getLeaves lists them.
        indexStack.push([nextLeaf++]);
        distanceStack.push([0]);
        return;
      }
      let k = branch.children.length;
      let first = indexStack.length - k;
      // Every internal Branch has a first child, which sets these.
    let indices!: number[], distances!: number[];
      for (let c = 0; c < k; c++) {
        let length = branch.children[c].length;
        let childIndices = indexStack[first + c],
          childDistances = distanceStack[first + c];
        // Sum each leaf's lengths upward, in the order depthOf sums them.
        for (let y = 0; y < childDistances.length; y++)
          childDistances[y] += length;
        // Extend the first child's list rather than copying it.
        if (c === 0) {
          indices = childIndices;
          distances = childDistances;
          continue;
        }
        for (let x = 0; x < indices.length; x++) {
          let i = indices[x],
            di = distances[x],
            row = matrix[i];
          for (let y = 0; y < childIndices.length; y++) {
            let j = childIndices[y],
              distance = di + childDistances[y];
            row[j] = distance;
            matrix[j][i] = distance;
          }
        }
        for (let y = 0; y < childIndices.length; y++) {
          indices.push(childIndices[y]);
          distances.push(childDistances[y]);
        }
      }
      indexStack.length = first;
      distanceStack.length = first;
      indexStack.push(indices);
      distanceStack.push(distances);
    });
    return {
      matrix: matrix,
      ids: leafs.map(d => d.id)
    };
  }

  /**
   * Returns the Newick representation of this Branch and its descendants.
   * @param  {Boolean} [nonterminus=falsy] Is this not the terminus of the
   * Newick Tree? This should be falsy when called by a user (i.e. you). It's
   * used internally to decide whether or not in include a semicolon in the
   * returned string.
   * @return {String} The [Newick](https://en.wikipedia.org/wiki/Newick_format)
   * representation of the Branch.
   */
  toNewick(nonterminus?: boolean): string {
    let parts: string[] = [];
    // The stack holds Branches still to write, and strings to write as they are.
    let stack: (Branch | string)[] = [this];
    while (stack.length) {
      let item = stack.pop()!;
      if (typeof item === "string") {
        parts.push(item);
      } else if (item.isLeaf()) {
        parts.push(newickLabel(item));
      } else {
        parts.push("(");
        stack.push(")" + newickLabel(item));
        let children = item.children;
        for (let i = children.length - 1; i >= 0; i--) {
          stack.push(children[i]);
          if (i > 0) stack.push(",");
        }
      }
    }
    if (!nonterminus) parts.push(";");
    return parts.join("");
  }

  /**
   * Returns a simple Javascript object version of this Branch and its
   * descendants. This is useful in cases where you want to serialize the tree
   * (e.g. `JSON.stringify(tree)`) but can't because the tree contains circular
   * references (for simplicity, elegance, and performance reasons, each Branch
   * tracks both its children and its parent).
   * @return {Object} A serializable bare Javascript Object representing this
   * Branch and its descendants.
   */
  toObject(): BranchObject {
    let output: BranchObject | undefined;
    // Pairs of a Branch and the children array its object belongs in.
    let stack: [Branch, BranchObject[] | null][] = [[this, null]];
    while (stack.length) {
      let [branch, siblings] = stack.pop()!;
      let object: BranchObject = {
        id: branch.id,
        length: branch.length
      };
      if (siblings) siblings.push(object);
      else output = object;
      let children = branch.children;
      if (children.length > 0) {
        let objects: BranchObject[] = (object.children = []);
        for (let i = children.length - 1; i >= 0; i--) {
          stack.push([children[i], objects]);
        }
      }
    }
    return output!;
  }

  /**
   * Returns a valid JSON-string version of this Branch and its descendants.
   * @param {Function} replacer A replacer function to [pass to `JSON.stringify`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#Parameters).
   * @param {(Number|String)} space A string or number of spaces to use for
   * indenting the output. See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#Parameters
   * for additional details.
   * @return {Object} A valid JSON string representing this Branch and its
   * descendants.
   */
  toString(replacer?: Replacer, width?: string | number): string {
    if (!replacer) replacer = null;
    if (!width) width = 0;
    // JSON.stringify's overloads take each kind of replacer separately.
    return JSON.stringify(this, replacer as (string | number)[] | null, width);
  }
}

// Each Branch's _guid is unique within this copy of the library.
let lastGuid = 0;

// Removes a Branch from its parent's children, if it has a parent.
function detach(branch: Branch): void {
  let parent = branch.parent;
  if (!parent) return;
  let index = parent.children.indexOf(branch);
  if (index !== -1) parent.children.splice(index, 1);
  branch.parent = null;
}

// Copies the ids, lengths and structure of a subtree into new Branches, and
// returns the new root with depth, height and value computed afresh.
function copyTree(root: Branch): Branch {
  let newRoot = new Branch({ id: root.id, length: root.length });
  let stack: Branch[] = [root, newRoot];
  while (stack.length) {
    let copy = stack.pop()!,
      original = stack.pop()!;
    original.children.forEach(child => {
      let childCopy = new Branch({ id: child.id, length: child.length });
      childCopy.parent = copy;
      copy.children.push(childCopy);
      stack.push(child, childCopy);
    });
  }
  return newRoot.fixDistances();
}

// Combines the ids of two merged Branches, ignoring empty ones.
function joinIds(a: Id, b: Id): Id {
  if (a === "") return b;
  if (b === "") return a;
  return a + "+" + b;
}

// Finds the MRCA of two Branches along with each one's distance to it, in a
// single climb from each side. Returns [mrca, distanceFromA, distanceFromB].
// Lengths are summed from each Branch upward, as depthOf sums them.
function distancesToMRCA(a: Branch, b: Branch): [Branch, number, number] {
  let [mrca, i, j, fromA, fromB] = climbToMRCA(a, b);
  let distanceA = 0,
    distanceB = 0;
  for (let k = 0; k < i; k++) distanceA += fromA[k].length;
  for (let k = 0; k < j; k++) distanceB += fromB[k].length;
  return [mrca, distanceA, distanceB];
}

// Lists the ancestors of two Branches (each including itself) and matches
// them up from the root down; the last match is the MRCA. Returns
// [mrca, i, j, fromA, fromB], where fromA[i] and fromB[j] are the MRCA.
function climbToMRCA(
  a: Branch,
  b: Branch
): [Branch, number, number, Branch[], Branch[]] {
  let fromA = a.getAncestors(true),
    fromB = b.getAncestors(true);
  let i = fromA.length - 1,
    j = fromB.length - 1;
  if (fromA[i] !== fromB[j]) {
    throw Error("Branch and cousin do not appear to share a common ancestor!");
  }
  while (i > 0 && j > 0 && fromA[i - 1] === fromB[j - 1]) {
    i--;
    j--;
  }
  return [fromA[i], i, j, fromA, fromB];
}

// Depth-first traversal with an explicit stack, so that deep trees can't
// overflow the call stack. Calls `before` on entering each Branch and `after`
// on leaving it. Children are read the way Array.prototype.forEach reads them
// in a recursive traversal (after `before`, with the length fixed on entry),
// so callbacks that edit the tree behave as they did with recursion.
function walk(
  root: Branch,
  before: ((branch: Branch) => void) | null,
  after: ((branch: Branch) => void) | null
): void {
  let nodes: Branch[] = [root],
    arrays: Branch[][] = [],
    lengths: number[] = [],
    indices: number[] = [];
  if (before) before(root);
  arrays.push(root.children);
  lengths.push(root.children.length);
  indices.push(0);
  while (nodes.length) {
    let top = nodes.length - 1,
      i = indices[top];
    if (i < lengths[top]) {
      indices[top] = i + 1;
      let array = arrays[top];
      if (!(i in array)) continue;
      let child = array[i];
      if (before) before(child);
      nodes.push(child);
      arrays.push(child.children);
      lengths.push(child.children.length);
      indices.push(0);
    } else {
      let node = nodes.pop()!;
      arrays.pop();
      lengths.pop();
      indices.pop();
      if (after) after(node);
    }
  }
}

// Pushes a Branch's children onto a stack so that they pop in order.
function pushChildren(stack: Branch[], branch: Branch): void {
  let children = branch.children;
  for (let i = children.length - 1; i >= 0; i--) stack.push(children[i]);
}

// Returns the first descendant of `branch` (in pre-order, excluding `branch`
// itself) for which `test` returns true, or undefined if there is none.
function findBelow(
  branch: Branch,
  test: (branch: Branch) => boolean
): Branch | undefined {
  let stack: Branch[] = [];
  pushChildren(stack, branch);
  while (stack.length) {
    let d = stack.pop()!;
    if (test(d)) return d;
    pushChildren(stack, d);
  }
  return undefined;
}

// A Branch's id and (if it has one) length, as written in Newick.
function newickLabel(branch: Branch): string {
  let label = "" + branch.id;
  if (branch.length) label += ":" + numberToString(branch.length);
  return label;
}

// Returns a string representation of a number that doesn't use scientific
// notation. Works on the digits of JavaScript's own (shortest round-trip)
// representation, so it introduces no floating point artifacts.
function numberToString(num: number): string {
  let str = String(num);
  let match = str.match(/^(-?)(\d)(?:\.(\d+))?e([+-]\d+)$/);
  if (!match) return str;
  let [, sign, whole, fraction = "", exponent] = match;
  let e = Number(exponent);
  if (e < 0) return sign + "0." + "0".repeat(-e - 1) + whole + fraction;
  return sign + whole + fraction + "0".repeat(e - fraction.length);
}

/**
 * Parses a hierarchical JSON string (or Object) as a Branch object.
 * @param  {(String|Object)} json A json string (or Javascript Object)
 * representing hierarchical data.
 * @param  {String} [idLabel="id"] The key used in the objects of `json` to
 * indicate their identifiers.
 * @param  {String} [lengthLabel='length'] The key used in the objects of `json`
 * to indicate their length.
 * @param  {String} [childrenLabel=`children`] The key used in the objects of
 * `json` to indicate their children.
 * @return {Branch} The Branch representing the root of the hierarchy
 * represented by `json`.
 */
export function parseJSON(
  json: string | object,
  idLabel?: string,
  lengthLabel?: string,
  childrenLabel?: string
): Branch {
  if (!idLabel) idLabel = "id";
  if (!lengthLabel) lengthLabel = "length";
  if (!childrenLabel) childrenLabel = "children";
  if (typeof json === "string") json = JSON.parse(json);
  let root: Branch | undefined;
  // Pairs of an input object and the Branch to add its Branch to.
  type Node = Record<string, unknown>;
  let stack: [Node, Branch | null][] = [[json as Node, null]];
  while (stack.length) {
    let [node, parent] = stack.pop()!;
    let branch = new Branch({
      id: node[idLabel] as Id | undefined,
      length: node[lengthLabel] as number | undefined
    });
    if (parent) parent.addChild(branch);
    else root = branch;
    let children = node[childrenLabel];
    if (children instanceof Array) {
      for (let i = children.length - 1; i >= 0; i--) {
        if (i in children) stack.push([children[i], branch]);
      }
    }
  }
  return root!.fixDistances();
}

/**
 * Parses a matrix of distances and returns the root Branch of the output tree.
 * This is adapted from Maciej Korzepa's [neighbor-joining](https://github.com/biosustain/neighbor-joining),
 * which is released for modification under the [MIT License](https://opensource.org/licenses/MIT).
 * @param  {Array} matrix An array of `n` arrays of length `n`
 * @param  {Array} labels An array of `n` strings, each corresponding to the
 * values in `matrix`.
 * @return {Branch} A Branch object representing the root Branch of the tree
 * inferred by neighbor joining on `matrix`.
 */
export function parseMatrix(
  matrix: ArrayLike<ArrayLike<number | string>>,
  labels?: Id[]
): Branch {
  let that = {} as NJState;
  let N = (that.N = matrix.length);
  if (!labels) labels = [...Array(N).keys()];
  that.cN = that.N;
  // Copy the matrix: neighbor joining overwrites it as it goes. Distances
  // given as strings (e.g. read from a CSV file) become numbers.
  that.D = Array.from(matrix, row => Array.from(row, Number));
  that.labels = labels;
  that.currIndexToLabel = new Array(N);
  that.rowChange = new Array(N);
  that.newRow = new Array(N);
  that.labelToNode = new Array(2 * N);
  that.nextIndex = N;
  that.I = new Array(that.N);
  that.S = new Array(that.N);
  for (let i = 0; i < that.N; i++) {
    let sortedRow = sortWithIndices(that.D[i], i);
    that.S[i] = sortedRow;
    that.I[i] = sortedRow.sortIndices;
  }
  that.removedIndices = new Set();
  that.indicesLeft = new Set();
  for (let i = 0; i < N; i++) {
    that.currIndexToLabel[i] = i;
    that.indicesLeft.add(i);
  }
  that.rowSumMax = 0;
  let minI: number,
    minJ: number,
    d1: number,
    d2: number,
    l1: number,
    l2: number,
    node1: Branch,
    node2: Branch,
    node3: Branch;

  function setUpNode(labelIndex: number, distance: number): Branch {
    let node: Branch;
    if (labelIndex < that.N) {
      node = new Branch({ id: that.labels[labelIndex], length: distance });
      that.labelToNode[labelIndex] = node;
    } else {
      node = that.labelToNode[labelIndex];
      node.setLength(distance);
    }
    return node;
  }

  that.rowSums = sumRows(that.D);
  for (let i = 0; i < that.cN; i++) {
    if (that.rowSums[i] > that.rowSumMax) that.rowSumMax = that.rowSums[i];
  }

  while (that.cN > 2) {
    //if (that.cN % 100 == 0 ) console.log(that.cN);
    ({ minI, minJ } = search(that));

    d1 =
      0.5 * that.D[minI][minJ] +
      (that.rowSums[minI] - that.rowSums[minJ]) / (2 * that.cN - 4);
    d2 = that.D[minI][minJ] - d1;

    l1 = that.currIndexToLabel[minI];
    l2 = that.currIndexToLabel[minJ];

    node1 = setUpNode(l1, d1);
    node2 = setUpNode(l2, d2);
    node3 = new Branch({ children: [node1, node2] });

    recalculateDistanceMatrix(that, minI, minJ);
    let sorted = sortWithIndices(that.D[minJ], minJ);
    that.S[minJ] = sorted;
    that.I[minJ] = sorted.sortIndices;
    that.S[minI] = that.I[minI] = [];
    that.cN--;

    that.labelToNode[that.nextIndex] = node3;
    that.currIndexToLabel[minI] = -1;
    that.currIndexToLabel[minJ] = that.nextIndex++;
  }

  let left = that.indicesLeft.values();
  minI = left.next().value as number;
  minJ = left.next().value as number;

  l1 = that.currIndexToLabel[minI];
  l2 = that.currIndexToLabel[minJ];
  d1 = d2 = that.D[minI][minJ] / 2;

  node1 = setUpNode(l1, d1);
  node2 = setUpNode(l2, d2);

  let tree = new Branch({ children: [node1, node2] });
  tree.fixParenthood();
  return tree.fixDistances();
}

// The state of a neighbor-joining run.
interface NJState {
  N: number;
  cN: number;
  D: number[][];
  labels: Id[];
  currIndexToLabel: number[];
  rowChange: number[];
  newRow: number[];
  labelToNode: Branch[];
  nextIndex: number;
  I: number[][];
  S: number[][];
  removedIndices: Set<number>;
  indicesLeft: Set<number>;
  rowSumMax: number;
  rowSums: number[];
}

// A row's values in ascending order, with the columns they came from.
type SortedRow = number[] & { sortIndices: number[] };

function search(t: NJState): { minI: number; minJ: number } {
  let qMin = Infinity,
    D = t.D,
    cN = t.cN,
    n2 = cN - 2,
    S = t.S,
    I = t.I,
    rowSums = t.rowSums,
    removedColumns = t.removedIndices,
    uMax = t.rowSumMax,
    q: number,
    minI = -1,
    minJ = -1,
    c2: number;

  // initial guess for qMin
  for (let r = 0; r < t.N; r++) {
    if (removedColumns.has(r)) continue;
    c2 = I[r][0];
    if (removedColumns.has(c2)) continue;
    q = D[r][c2] * n2 - rowSums[r] - rowSums[c2];
    if (q < qMin) {
      qMin = q;
      minI = r;
      minJ = c2;
    }
  }

  for (let r = 0; r < t.N; r++) {
    if (removedColumns.has(r)) continue;
    for (let c = 0; c < S[r].length; c++) {
      c2 = I[r][c];
      if (removedColumns.has(c2)) continue;
      if (S[r][c] * n2 - rowSums[r] - uMax > qMin) break;
      q = D[r][c2] * n2 - rowSums[r] - rowSums[c2];
      if (q < qMin) {
        qMin = q;
        minI = r;
        minJ = c2;
      }
    }
  }

  return { minI, minJ };
}

function recalculateDistanceMatrix(
  t: NJState,
  joinedIndex1: number,
  joinedIndex2: number
): void {
  let D = t.D,
    n = D.length,
    sum = 0,
    aux: number,
    aux2: number,
    removedIndices = t.removedIndices,
    rowSums = t.rowSums,
    newRow = t.newRow,
    rowChange = t.rowChange,
    newMax = 0;

  removedIndices.add(joinedIndex1);
  for (let i = 0; i < n; i++) {
    if (removedIndices.has(i)) continue;
    aux = D[joinedIndex1][i] + D[joinedIndex2][i];
    aux2 = D[joinedIndex1][joinedIndex2];
    newRow[i] = 0.5 * (aux - aux2);
    sum += newRow[i];
    rowChange[i] = -0.5 * (aux + aux2);
  }
  for (let i = 0; i < n; i++) {
    D[joinedIndex1][i] = -1;
    D[i][joinedIndex1] = -1;
    if (removedIndices.has(i)) continue;
    D[joinedIndex2][i] = newRow[i];
    D[i][joinedIndex2] = newRow[i];
    rowSums[i] += rowChange[i];
    if (rowSums[i] > newMax) newMax = rowSums[i];
  }
  rowSums[joinedIndex1] = 0;
  rowSums[joinedIndex2] = sum;
  if (sum > newMax) newMax = sum;
  t.rowSumMax = newMax;
  t.indicesLeft.delete(joinedIndex1);
}

function sumRows(a: number[][]): number[] {
  let n = a.length,
    sums: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    let row = a[i],
      sum = 0;
    for (let j = 0; j < n; j++) sum += row[j];
    sums[i] = sum;
  }
  return sums;
}

function sortWithIndices(toSort: number[], skip?: number): SortedRow {
  if (typeof skip === "undefined") skip = -1;
  let n = toSort.length;
  let indexCopy: number[] = new Array(n);
  let valueCopy = new Array(n) as SortedRow;
  let i2 = 0;
  for (let i = 0; i < n; i++) {
    if (toSort[i] === -1 || i === skip) continue;
    indexCopy[i2] = i;
    valueCopy[i2++] = toSort[i];
  }
  indexCopy.length = i2;
  valueCopy.length = i2;
  indexCopy.sort((a, b) => toSort[a] - toSort[b]);
  valueCopy.sortIndices = indexCopy;
  for (let j = 0; j < i2; j++) {
    valueCopy[j] = toSort[indexCopy[j]];
  }
  return valueCopy;
}

/**
 * Parses a Newick String and returns a Branch object representing the root
 * of the output Tree.
 * This is adapted Jason Davies' [newick.js](https://github.com/jasondavies/newick.js/blob/master/src/newick.js),
 * which is released for modification under [the MIT License](https://opensource.org/licenses/MIT).
 * @param  {string} newick A Newick String
 * @return {Branch} A Branch representing the root of the output tree
 */
export function parseNewick(newick: string): Branch {
  let ancestors: Branch[] = [],
    tree = new Branch(),
    tokens = newick.split(/\s*(;|\(|\)|,|:)\s*/),
    n = tokens.length;
  for (let t = 0; t < n; t++) {
    let token = tokens[t];
    let c: Branch;
    switch (token) {
      case "(": // new Branchset
        c = tree.addChild();
        ancestors.push(tree);
        tree = c;
        break;
      case ",": // another Branch
        c = ancestors[ancestors.length - 1].addChild();
        tree = c;
        break;
      case ")": // optional name next
        tree = ancestors.pop()!;
        break;
      case ":": // optional length next
        break;
      default:
        let x = tokens[t - 1];
        if (x == ")" || x == "(" || x == ",") {
          tree.id = token;
        } else if (x == ":") {
          tree.length = parseFloat(token);
        }
    }
  }
  return tree.fixDistances();
}
