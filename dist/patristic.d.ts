/**
 * The [SemVer](https://semver.org/) version string of the patristic library
 * @type {String} A string specifying the current version of the Patristic Library.
 * If not given, the version of patristic you are using if less than or equal to 0.2.2.
 * @example
 * console.log(patristic.version);
 */
export declare const version = "0.6.0";
/** A Branch's identifier. Trees built by parseMatrix without labels use numbers. */
export type Id = string | number;
/**
 * Data a Branch is built from. Its known attributes initialize the Branch's;
 * the whole object is kept as the Branch's `data`.
 */
export interface BranchData {
    id?: Id | undefined;
    length?: number | undefined;
    depth?: number | undefined;
    height?: number | undefined;
    parent?: Branch | null | undefined;
    children?: Branch[] | undefined;
    value?: number | undefined;
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
type Replacer = ((this: unknown, key: string, value: unknown) => unknown) | (string | number)[] | null;
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
export declare class Branch {
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
    constructor(data?: BranchData | null, children?: (data: BranchData) => Branch[] | null | undefined);
    /**
     * Adds a new child to this Branch
     * @param  {(Branch|Object)} [data={}] The new Branch, or data to attach to it.
     * @return {Branch} The (possibly new) child Branch
     */
    addChild(data?: Branch | BranchData | null): Branch;
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
    addParent(data?: Branch | BranchData | null, siblings?: Branch[]): this;
    /**
     * Returns an array of Branches from this Branch to the root.
     * [d3-hierarchy compatibility method.](https://github.com/d3/d3-hierarchy#node_ancestors)
     * @type {Array} An array of Branches
     */
    ancestors(): Branch[];
    /**
     * Returns a deep clone of the Branch on which it is called. Note that this does
     * not clone all descendants, rather than providing references to the existing
     * descendant Branches.
     * @return {Branch} A clone of the Branch on which it is called.
     */
    clone(): Branch;
    /**
     * All descendant Branches with near-zero length are excised
     * @return {Branch} The Branch on which this method was called.
     */
    consolidate(): this;
    /**
     * Returns a clone of the Branch on which it is called. Note that this also
     * clones all descendants, rather than providing references to the existing
     * descendant Branches. (For a shallow clone, see [Branch.clone](#clone).
     * Finally, the cloned Branch will become the root of the cloned tree, having a
     * parent of `null`.
     * [d3-hierarchy compatibility method.](https://github.com/d3/d3-hierarchy#node_copy)
     * @return {Branch} A clone of the Branch on which it is called.
     */
    copy(): Branch;
    /**
     * Sets the value of each Branch to the number of leaves in its subtree (1
     * for a leaf), as d3-hierarchy's count does.
     * [d3-hierarchy compatibility method.](https://github.com/d3/d3-hierarchy#node_count)
     * @return {Branch} The Branch on which it was called
     */
    count(): this;
    /**
     * Returns an array pf descendants, starting with this Branch.
     * [d3-hierarchy compatibility method.](https://github.com/d3/d3-hierarchy#node_descendants)
     * @type {Array} An Array of Branches, starting with this one.
     */
    descendants(): Branch[];
    /**
     * Returns the depth of a given child, relative to the Branch on which it is
     * called.
     * @param  {(Branch|String)} descendant A descendant Branch (or `id` string
     * thereof)
     * @return {Number} The sum of the lengths of all Branches between the Branch on
     * which it is called and `descendant`. Throws an error if `descendant` is not a
     * descendant of this Branch.
     */
    depthOf(descendant: Branch | string): number;
    /**
     * Computes the patristic distance between `descendantA` and `descendantB`.
     * @param  {Branch} descendantA The Branch from which you wish to compute
     * distance
     * @param  {Branch} descendantB The Branch to which you wish to compute distance
     * @return {number} The patristic distance between the given descendants.
     */
    distanceBetween(descendantA: Branch, descendantB: Branch): number;
    /**
     * Computes the patristic distance between `cousin` and the Branch on which
     * this method is called.
     * @param  {Branch} cousin The Branch to which you wish to compute distance
     * @return {number} The patristic distance between `cousin` and the Branch on
     * this method is called.
     */
    distanceTo(cousin: Branch): number;
    /**
     * Visits each Branch descended from the Branch on which it is called in
     * [Breadth First Search](https://en.wikipedia.org/wiki/Breadth-first_search)
     * order and returns the Branch on which it was called.
     * @param  {Function} callback The function to be run on each Branch
     * @return {Branch} The Branch on which it was called.
     */
    each(callback: (branch: Branch) => void): this;
    /**
     * Visits each Branch descended from the Branch on which it is called in
     * [post-traversal order](https://en.wikipedia.org/wiki/Tree_traversal#Post-order)
     * and returns the Branch on which it was called.
     * @param  {Function} callback Function to run on each Branch
     * @return {Branch} The Branch on which it was called
     */
    eachAfter(callback: (branch: Branch) => void): this;
    /**
     * Visits each Branch descended from the Branch on which it is called in
     * [pre-traversal order](https://en.wikipedia.org/wiki/Tree_traversal#Pre-order)
     * and returns the Branch on which it was called.
     * @param  {Function} callback [description]
     * @return {[type]}            [description]
     */
    eachBefore(callback: (branch: Branch) => void): this;
    /**
     * Runs a function on each child of the Branch on which it is called.
     * @param  {Function} callback The function to run on each child.
     * @return {Branch} The Branch on which it was called.
     */
    eachChild(callback: (child: Branch, index: number, children: Branch[]) => void): this;
    /**
     * Excises the Branch on which it is called and updates its parent and children.
     * Excising a root Branch with a single child makes that child the new root.
     * @return {Branch} The parent of the excised Branch, or the new root if the
     * excised Branch was the root.
     */
    excise(): Branch;
    /**
     * Sets the distance values (height and depth) for each Branch, and sets each
     * Branch's value to the number of Branches in its subtree (see
     * [Branch.count](#count)).
     * @return {Branch} The Branch on which it is called.
     */
    fixDistances(): this;
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
    fixParenthood(nonrecursive?: boolean): this;
    /**
     * Reverses the order of (all of) the descendants of the Branch.
     * @return {Branch} The Branch on which this was called.
     */
    flip(): this;
    /**
     * Returns an Array of all the ancestors of the Branch on which it is called.
     * Note that this does not include itself. For all ancestors and itself, see
     * [Branch.ancestors](#ancestors)
     * @param {Boolean} includeSelf Should the Branch on which this is called be
     * included in the results?
     * @return {Array} Every Ancestor of the Branch on which it was called.
     */
    getAncestors(includeSelf?: boolean): Branch[];
    /**
     * Given an `childID`, returns the child with that id (or `undefined` if no such
     * child is present).
     * @param  {(String|Number)} childID the ID of the child to return. (Trees
     * built by [parseMatrix](#parseMatrix) without labels have numeric ids.)
     * @return {(Branch|undefined)} The desired child Branch, or `undefined` if the
     * child doesn't exist.
     */
    getChild(childID: Id): Branch | undefined;
    /**
     * Given an id string, returns the descendant Branch with that ID, or
     * `undefined` if it doesn't exist.
     * @param  {String} id The id string of the Branch to find
     * @return {(Branch|undefined)} The descendant Branch, or `undefined` if it
     * doesn't exist
     */
    getDescendant(id: Id): Branch | undefined;
    /**
     * Returns an array of all Branches which are descendants of this Branch
     * @param {Boolean} [includeSelf] Is this not the Branch on which the user
     * called the function? This is used internally and should be ignored.
     * @return {Array} An array of all Branches descended from this Branch
     */
    getDescendants(includeSelf?: boolean): Branch[];
    /**
     * Returns an array of all leaves which are descendants of this Branch.
     * Alias of [getLeaves](#getLeaves) for people whose strong suit isn't spelling.
     * @return {Array} An array of all leaves descended from this Branch
     */
    getLeafs(): Branch[];
    /**
     * Returns an array of all leaves which are descendants of this Branch
     * See also: [getLeafs](#getLeafs)
     * @return {Array} An array of all leaves descended from this Branch
     */
    getLeaves(): Branch[];
    /**
     * Traverses the tree upward until it finds the Most Recent Common Ancestor
     * (i.e. the first Branch for which both the Branch on which it was called and
     * `cousin` are descendants). A Branch counts as its own descendant here, so
     * the MRCA of a Branch and one of its ancestors is that ancestor.
     * @return {Branch} The Most Recent Common Ancestor of both the Branch on
     * which it was called and the `cousin`.
     */
    getMRCA(cousin: Branch): Branch;
    /**
     * Traverses the tree upward until it finds the root Branch, and returns the
     * root.
     * @return {Branch} The root Branch of the tree
     */
    getRoot(): Branch;
    /**
     * Determines if a given Branch (or ID) is a child of this Branch
     * @param  {(Branch|String)} child The Branch (or the id thereof) to check for
     * @return {Boolean}
     */
    hasChild(child: Branch | string): boolean;
    /**
     * Checks to see if `descendant` is a descendant of the Branch on which this
     * method is called.
     * @param  {(Branch|String)} descendant Either the descendant Branch or its'
     * `id`.
     * @return {Boolean} True if `descendant` is descended from the Branch from
     * which this is called, otherwise false.
     */
    hasDescendant(descendant: Branch | string): boolean;
    /**
     * Checks to see if a Branch has a descendant leaf.
     * @return {Boolean} True if leaf is both a leaf and a descendant of the
     * Branch on which this method is called, False otherwise.
     */
    hasLeaf(leaf: Branch | string): boolean;
    /**
     * Swaps the branch on which it is called with its parent. This method is
     * probably only useful as an internal component of [Branch.reroot](#reroot).
     * @return {Branch} The Branch object on which it was called.
     */
    invert(): this;
    /**
     * Returns whether the Branch on which it is called is a child of a given parent
     * (or parent ID).
     * @param  {(Branch|String)} parent A Branch (or ID thereof) to test for
     * paternity of this Branch.
     * @return {Boolean} True is `parent` is the parent of this Branch, false
     * otherwise.
     */
    isChildOf(parent: Branch | string): boolean;
    /**
     * Tests whether this and each descendant Branch holds correct links to both
     * its parent and its children.
     * @return {Boolean} True if consistent, otherwise false
     */
    isConsistent(): boolean;
    /**
     * Returns whether a given Branch is an ancestor of the Branch on which this
     * method is called.
     * @param  {Branch} ancestor The Branch to check for ancestorhood
     * @return {Boolean} If this Branch is descended from `ancestor`
     */
    isDescendantOf(ancestor: Branch | string): boolean;
    /**
     * Returns a boolean indicating if this Branch is a leaf (i.e. has no
     * children).
     * @return {Boolean} True is this Branch is a leaf, otherwise false.
     */
    isLeaf(): boolean;
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
    isolate(): this;
    /**
     * Returns a boolean indicating if this Branch is the root of a tree (i.e. has
     * no parents).
     * @return {Boolean} True if this Branch is the root, otherwise false.
     */
    isRoot(): boolean;
    /**
     * Returns the array of leaf nodes in traversal order; leaves are nodes with no
     * children. Alias of [Branch.getLeaves](#getLeaves) `cuz spelling is hard.
     * @type {Array} An Array of Branches which are descended from this Branch and
     * have no children.
     */
    leafs(): Branch[];
    /**
     * Returns the array of leaf nodes in traversal order; leaves are nodes with no
     * children. Alias of [Branch.getLeaves](#getLeaves).
     * [d3-hierarchy compatibility method.](https://github.com/d3/d3-hierarchy#node_leaves)
     * @type {Array} An Array of Branches which are descended from this Branch and
     * have no children.
     */
    leaves(): Branch[];
    /**
     * Returns an Array of links, which are plain javascript objects containing a
     * `source` attribute (which is a reference to the parent Branch) and a `target`
     * attribute (which is a reference to the child Branch).
     * [d3-hierarchy compatibility method](https://github.com/d3/d3-hierarchy#node_links)
     * @return {Array} An array of plain Javascript objects
     */
    links(): Link[];
    /**
     * Normalizes this and all descendant Branches `value` attributes to between
     * `newmin` and `newmax`. Note that normalize can function as its own inverse
     * when passed an original range. For example:
     * @example tree.normalize().normalize(1, tree.getDescendants().length + 1);
     * @param  {Number} newmin The desired minimum value.
     * @param  {Number} newmax The desired maximum value.
     * @return {Branch} The Branch on which it was called.
     */
    normalize(newmin?: number, newmax?: number): this;
    /**
     * Gets the path from this Branch to `target`. If this Branch and `target` are
     * the same, returns an array containing only the Branch on which it is called.
     * @param  {Branch} target A Branch object
     * @return {Array} An ordered Array of Branches following the path between this
     * Branch and `target`
     */
    path(target: Branch): Branch[];
    /**
     * Removes a Branch and its subtree from the tree. Similar to
     * [Branch.isolate](#isolate), only it returns the root Branch of the tree
     * from which this Branch is removed.
     * @param {Boolean} pruneAncestors - If true, removes ancestors with no remaining children as well
     * @return {Branch} The root of the remaining tree.
     */
    remove(pruneAncestors?: boolean): Branch;
    /**
     * Removes the branch if it has no children. Then recursively removes all
     * ancestors with no children.
     *
     * @param {Boolean} nonrecursive - If true, does not remove ancestors with no children
     * @return {Branch} The root of the modified tree.
     */
    removeIfNoChildren(nonrecursive?: boolean): Branch;
    /**
     * Removes a Branch and its subtree from the tree, and replaces it. The
     * replacement is detached from wherever it was, and the replaced Branch
     * becomes the root of its own tree.
     * @param {Branch} replacement - The branch to replace the branch on which the
     * method is called.
     * @return {Branch} The root of the modified tree.
     */
    replace(replacement: Branch): Branch;
    /**
     * Reroots a tree on this Branch. Use with caution, this returns the new root,
     * which should typically supplant the existing root Branch object, but does
     * not replace that root automatically.
     * @example
     * tree = tree.children[0].children[0].reroot();
     * @return {Branch} The new root Branch, which is the Branch on which this was
     * called
     */
    reroot(): this;
    /**
     * Reverses the order of the children of the branch on which it is called.
     * @return {Branch} The Branch on which this was called.
     */
    rotate(recursive?: boolean): this;
    /**
     * Set the length of a Branch
     * @param  {number} length The new length to assign to the Branch
     * @return {Branch} The Branch object on which this was called
     */
    setLength(length: number): this;
    /**
     * Sets the parent of the Branch on which it is called.
     * @param  {Branch} parent The Branch to set as parent
     * @return {Branch} The Branch on which this method was called.
     */
    setParent(parent: Branch | null): this;
    /**
     * Collapses each descendant Branch with exactly one child into a single
     * continuous branch. The Branch on which it is called is left in place.
     * @return {Branch} The Branch on which this method was called.
     */
    simplify(): this;
    /**
     * Sorts the Tree from the branch on which it is called downward.
     * @param  {Function} [comparator] A Function taking two Branches and returning
     * a numberic value. For details, see [MDN Array.sort](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort#Description)
     * @return {Branch} The Branch on which it was called
     */
    sort(comparator?: (a: Branch, b: Branch) => number): this;
    /**
     * Determines whether this Branch is likelier to be a source of `cousin`, or
     * if `cousin` is a source of this Branch.
     * @param  {Branch} cousin The other Branch to test
     * @return {Boolean} True if this might be the source of cousin, otherwise
     * false.
     */
    sources(cousin: Branch): boolean;
    /**
     * Computes the value of each Branch according to some valuator function
     * @param  {Function} value A Function taking a Branch and returning a
     * (numeric?) value.
     * @return {Branch} The Branch on which it was called.
     */
    sum(value?: (branch: Branch) => number): this;
    /**
     * Determines whether this Branch is likelier to be a target of `cousin`, or
     * if `cousin` is a target of this Branch.
     * @param  {Branch} cousin The other Branch to test
     * @return {Boolean} True if this might be the target of cousin, otherwise
     * false.
     */
    targets(cousin: Branch): boolean;
    /**
     * toJSON is an alias for [toObject](#toObject), enabling the safe use of
     * `JSON.stringify` on Branch objects (in spite of their circular references).
     * @type {Function}
     * @returns {Object} A serializable Object
     */
    toJSON(): BranchObject;
    /**
     * Computes a matrix of all patristic distances between all leaves which are
     * descendants of the Branch on which this method is called.
     * @return {Object} An Object containing a matrix (an Array of Arrays) and
     * Array of `id`s corresponding to the rows (and columns) of the matrix.
     */
    toMatrix(): DistanceMatrix;
    /**
     * Returns the Newick representation of this Branch and its descendants.
     * @param  {Boolean} [nonterminus=falsy] Is this not the terminus of the
     * Newick Tree? This should be falsy when called by a user (i.e. you). It's
     * used internally to decide whether or not in include a semicolon in the
     * returned string.
     * @return {String} The [Newick](https://en.wikipedia.org/wiki/Newick_format)
     * representation of the Branch.
     */
    toNewick(nonterminus?: boolean): string;
    /**
     * Returns a simple Javascript object version of this Branch and its
     * descendants. This is useful in cases where you want to serialize the tree
     * (e.g. `JSON.stringify(tree)`) but can't because the tree contains circular
     * references (for simplicity, elegance, and performance reasons, each Branch
     * tracks both its children and its parent).
     * @return {Object} A serializable bare Javascript Object representing this
     * Branch and its descendants.
     */
    toObject(): BranchObject;
    /**
     * Returns a valid JSON-string version of this Branch and its descendants.
     * @param {Function} replacer A replacer function to [pass to `JSON.stringify`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#Parameters).
     * @param {(Number|String)} space A string or number of spaces to use for
     * indenting the output. See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#Parameters
     * for additional details.
     * @return {Object} A valid JSON string representing this Branch and its
     * descendants.
     */
    toString(replacer?: Replacer, width?: string | number): string;
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
export declare function parseJSON(json: string | object, idLabel?: string, lengthLabel?: string, childrenLabel?: string): Branch;
/**
 * Parses a matrix of distances and returns the root Branch of the output tree.
 * This is adapted from Maciej Korzepa's [neighbor-joining](https://github.com/biosustain/neighbor-joining),
 * which is released for modification under the [MIT License](https://opensource.org/licenses/MIT).
 * @param  {Array} matrix An array of `n` arrays of length `n`
 * @param  {Array} labels An array of `n` strings, each corresponding to the
 * values in `matrix`.
 * @param  {Object} [options] See ParseMatrixOptions; `{ float32: true }`
 * stores distances in half the memory, at single precision.
 * @return {Branch} A Branch object representing the root Branch of the tree
 * inferred by neighbor joining on `matrix`.
 */
export declare function parseMatrix(matrix: ArrayLike<ArrayLike<number | string>>, labels?: Id[] | null, options?: ParseMatrixOptions): Branch;
/** Options for [parseMatrix](#parseMatrix). */
export interface ParseMatrixOptions {
    /**
     * Store distances as 32-bit floats, which halves the memory they take
     * (the matrix and each row's sorted copy) at the cost of precision:
     * distances keep about 7 significant digits. Arithmetic is still done in
     * 64 bits. Defaults to false.
     */
    float32?: boolean | undefined;
}
/**
 * Parses a Newick String and returns a Branch object representing the root
 * of the output Tree.
 * This is adapted Jason Davies' [newick.js](https://github.com/jasondavies/newick.js/blob/master/src/newick.js),
 * which is released for modification under [the MIT License](https://opensource.org/licenses/MIT).
 * @param  {string} newick A Newick String
 * @return {Branch} A Branch representing the root of the output tree
 */
export declare function parseNewick(newick: string): Branch;
export {};
