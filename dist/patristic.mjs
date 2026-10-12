/**
 * The [SemVer](https://semver.org/) version string of the patristic library
 * @type {String} A string specifying the current version of the Patristic Library.
 * If not given, the version of patristic you are using if less than or equal to 0.2.2.
 * @example
 * console.log(patristic.version);
 */
const version = "0.6.0";
// No parent, child or sibling.
const NONE = -1;
// The parent of a slot whose Branch has moved to another Store.
const MOVED = -2;
/**
 * @internal
 * The storage behind Branches: a forest kept in parallel arrays, one slot per
 * Branch. Each tree lives in one Store; Branch objects are views onto slots,
 * made the first time they're asked for and kept, so a Branch is always the
 * same object.
 */
class Store {
    constructor(capacity = 16) {
        this.size = 0;
        this.ids = [];
        this.data = [];
        this.views = [];
        this.capacity = Math.max(capacity, 1);
        this.parent = new Int32Array(this.capacity);
        this.firstChild = new Int32Array(this.capacity);
        this.lastChild = new Int32Array(this.capacity);
        this.nextSibling = new Int32Array(this.capacity);
        this.prevSibling = new Int32Array(this.capacity);
        this.length = new Float64Array(this.capacity);
        this.value = new Float64Array(this.capacity);
        this.depth = new Int32Array(this.capacity);
        this.height = new Int32Array(this.capacity);
        this.representing = new Int32Array(this.capacity);
    }
    grow() {
        let capacity = this.capacity * 2;
        let resize = (array) => {
            let bigger = new array.constructor(capacity);
            bigger.set(array);
            return bigger;
        };
        this.parent = resize(this.parent);
        this.firstChild = resize(this.firstChild);
        this.lastChild = resize(this.lastChild);
        this.nextSibling = resize(this.nextSibling);
        this.prevSibling = resize(this.prevSibling);
        this.length = resize(this.length);
        this.value = resize(this.value);
        this.depth = resize(this.depth);
        this.height = resize(this.height);
        this.representing = resize(this.representing);
        this.capacity = capacity;
    }
    /** Adds a slot for a new root Branch and returns its index. */
    add(id, length, data) {
        if (this.size === this.capacity)
            this.grow();
        let i = this.size++;
        this.parent[i] = NONE;
        this.firstChild[i] = NONE;
        this.lastChild[i] = NONE;
        this.nextSibling[i] = NONE;
        this.prevSibling[i] = NONE;
        this.length[i] = length;
        this.value[i] = 1;
        this.depth[i] = 0;
        this.height[i] = 0;
        this.representing[i] = 1;
        this.ids[i] = id;
        this.data[i] = data;
        this.views[i] = undefined;
        return i;
    }
    /** The Branch for slot i. */
    view(i) {
        let view = this.views[i];
        if (view === undefined) {
            view = Object.create(Branch.prototype);
            bind(view, this, i);
        }
        return view;
    }
    /**
     * Links root slot `child` under `parent`, before its child `before`, or
     * last if `before` is NONE.
     */
    link(child, parent, before) {
        let { firstChild, lastChild, nextSibling, prevSibling } = this;
        this.parent[child] = parent;
        if (before === NONE) {
            let last = lastChild[parent];
            prevSibling[child] = last;
            nextSibling[child] = NONE;
            if (last === NONE)
                firstChild[parent] = child;
            else
                nextSibling[last] = child;
            lastChild[parent] = child;
        }
        else {
            let previous = prevSibling[before];
            prevSibling[child] = previous;
            nextSibling[child] = before;
            prevSibling[before] = child;
            if (previous === NONE)
                firstChild[parent] = child;
            else
                nextSibling[previous] = child;
        }
    }
    /** Unlinks slot `child` from its parent, if it has one. */
    unlink(child) {
        let parent = this.parent[child];
        if (parent < 0)
            return;
        let { nextSibling, prevSibling } = this;
        let previous = prevSibling[child], next = nextSibling[child];
        if (previous === NONE)
            this.firstChild[parent] = next;
        else
            nextSibling[previous] = next;
        if (next === NONE)
            this.lastChild[parent] = previous;
        else
            prevSibling[next] = previous;
        this.parent[child] = NONE;
        nextSibling[child] = NONE;
        prevSibling[child] = NONE;
    }
    /** The slots of i's children, in order. */
    children(i) {
        let children = [];
        for (let c = this.firstChild[i]; c !== NONE; c = this.nextSibling[c]) {
            children.push(c);
        }
        return children;
    }
    /** The slots of the subtree under i, in pre-order. */
    preorder(i) {
        let order = [];
        let stack = [i];
        let { lastChild, prevSibling } = this;
        while (stack.length) {
            let j = stack.pop();
            order.push(j);
            for (let c = lastChild[j]; c !== NONE; c = prevSibling[c])
                stack.push(c);
        }
        return order;
    }
    /** The slots of the subtree under i, in post-order. */
    postorder(i) {
        // Visiting children last to first and reversing gives post-order.
        let order = [];
        let stack = [i];
        let { firstChild, nextSibling } = this;
        while (stack.length) {
            let j = stack.pop();
            order.push(j);
            for (let c = firstChild[j]; c !== NONE; c = nextSibling[c])
                stack.push(c);
        }
        return order.reverse();
    }
    /** Puts i's children in the given order. */
    reorder(i, children) {
        let previous = NONE;
        for (let c of children) {
            this.prevSibling[c] = previous;
            if (previous === NONE)
                this.firstChild[i] = c;
            else
                this.nextSibling[previous] = c;
            previous = c;
        }
        if (previous !== NONE)
            this.nextSibling[previous] = NONE;
        this.lastChild[i] = previous;
    }
    /** Whether slot a is slot b or one of its ancestors. */
    isAncestorOrSelf(a, b) {
        for (let j = b; j >= 0; j = this.parent[j])
            if (j === a)
                return true;
        return false;
    }
}
// Each Branch's _guid is unique within this copy of the library.
let lastGuid = 0;
// Points a view at a slot, and the slot at the view.
function bind(view, store, index) {
    view._store = store;
    view._index = index;
    if (view._guid === undefined)
        view._guid = ++lastGuid;
    store.views[index] = view;
}
/**
 * Moves the subtree under root slot `root` of `from` into `to`, and returns
 * its new root slot. Views of the moved Branches are re-pointed, so they keep
 * their identity; their old slots are left empty.
 */
function move(from, root, to) {
    let order = from.preorder(root);
    let slots = new Map();
    for (let i of order) {
        let j = to.add(from.ids[i], from.length[i], from.data[i]);
        to.value[j] = from.value[i];
        to.depth[j] = from.depth[i];
        to.height[j] = from.height[i];
        to.representing[j] = from.representing[i];
        slots.set(i, j);
        let parent = from.parent[i];
        if (i !== root)
            to.link(j, slots.get(parent), NONE);
        let view = from.views[i];
        if (view !== undefined)
            bind(view, to, j);
    }
    for (let i of order) {
        from.parent[i] = MOVED;
        from.firstChild[i] = NONE;
        from.lastChild[i] = NONE;
        from.ids[i] = "";
        from.data[i] = undefined;
        from.views[i] = undefined;
    }
    return slots.get(root);
}
// Removes a Branch from its parent's children, if it has a parent.
function detach(branch) {
    branch._store.unlink(branch._index);
}
// Throws if `child` is `parent` or one of its ancestors.
function checkNotAncestor(child, parent) {
    let store = parent._store;
    if (child._store === store && store.isAncestorOrSelf(child._index, parent._index)) {
        throw new Error("Cannot make a Branch a descendant of itself.");
    }
}
/**
 * Makes `child` a child of `parent`: before `before` (one of parent's
 * children) or last. The child is detached from wherever it was, and moved
 * into parent's Store if it's in another.
 */
function attach(child, parent, before) {
    let store = parent._store;
    checkNotAncestor(child, parent);
    detach(child);
    if (child._store !== store)
        move(child._store, child._index, store);
    store.link(child._index, parent._index, before ? before._index : NONE);
}
/**
 * A class for representing Branches in trees.
 * It's written predominantly for phylogenetic trees (hence the
 * [Newick parser](#parseNewick),
 * [neighbor-joining implementation](#parseMatrix), etc.), but could
 * conceivably be useful for representing other types of trees as well.
 *
 * A tree's data is stored in typed arrays; a Branch is a view onto one entry,
 * made when it's first asked for and kept from then on. Its links (`parent`
 * and `children`) can't disagree: setting either updates both sides.
 * @param {Object} [data] An object containing data you wish to assign to
 * this Branch object. In particular, intended to overwrite the default
 * attributes of a Branch, namely `id`, `parent`, `length`, and `children`.
 * @constructor
 */
class Branch {
    constructor(data, children) {
        if (!data)
            data = {};
        let store = new Store(1);
        let i = store.add(data.id ?? "", data.length ?? 0, data);
        store.depth[i] = data.depth ?? 0;
        store.height[i] = data.height ?? 0;
        store.value[i] = data.value ?? 1;
        bind(this, store, i);
        let kids = (children ? children(data) : data.children) || [];
        kids.forEach(kid => this.addChild(kid));
        if (data.parent)
            attach(this, data.parent);
    }
    /** This Branch's identifier. */
    get id() {
        return this._store.ids[this._index];
    }
    set id(id) {
        this._store.ids[this._index] = id;
    }
    /** The length of the edge from this Branch to its parent. */
    get length() {
        return this._store.length[this._index];
    }
    set length(length) {
        this._store.length[this._index] = length;
    }
    /** The number of edges from the root (set by fixDistances). */
    get depth() {
        return this._store.depth[this._index];
    }
    set depth(depth) {
        this._store.depth[this._index] = depth;
    }
    /** The greatest number of edges to a leaf below (set by fixDistances). */
    get height() {
        return this._store.height[this._index];
    }
    set height(height) {
        this._store.height[this._index] = height;
    }
    /** A value for layouts and sorting (see count, sum and fixDistances). */
    get value() {
        return this._store.value[this._index];
    }
    set value(value) {
        this._store.value[this._index] = value;
    }
    /** How many Branches this one stands for, after excising others into it. */
    get representing() {
        return this._store.representing[this._index];
    }
    set representing(representing) {
        this._store.representing[this._index] = representing;
    }
    /** The data this Branch was made from, or an empty object. */
    get data() {
        var _a, _b;
        let store = this._store;
        return ((_a = store.data)[_b = this._index] ?? (_a[_b] = {}));
    }
    set data(data) {
        this._store.data[this._index] = data;
    }
    /**
     * This Branch's parent, or null for a root. Setting it moves this Branch
     * (with its subtree) to be the last child of the new parent, or detaches
     * it if set to null.
     */
    get parent() {
        let parent = this._store.parent[this._index];
        return parent < 0 ? null : this._store.view(parent);
    }
    set parent(parent) {
        if (parent === this.parent)
            return;
        if (parent === null)
            detach(this);
        else
            attach(this, parent);
    }
    /**
     * This Branch's children, as a new array, or undefined for a leaf (as in
     * d3-hierarchy). Changing the array doesn't change the tree. Assigning an
     * array of Branches makes them the children, in that order; children left
     * out are detached, and assigning null or an empty array makes this Branch
     * a leaf.
     */
    get children() {
        let store = this._store;
        let c = store.firstChild[this._index];
        if (c === NONE)
            return undefined;
        let children = [];
        for (; c !== NONE; c = store.nextSibling[c])
            children.push(store.view(c));
        return children;
    }
    set children(children) {
        let store = this._store;
        // Check every new child before changing anything.
        if (children)
            children.forEach(child => checkNotAncestor(child, this));
        for (let c of store.children(this._index))
            store.unlink(c);
        if (children)
            children.forEach(child => attach(child, this));
    }
    /**
     * Adds a new child to this Branch
     * @param  {(Branch|Object)} [data={}] The new Branch, or data to attach to it.
     * @return {Branch} The (possibly new) child Branch
     */
    addChild(data) {
        if (data instanceof Branch) {
            attach(data, this);
            return data;
        }
        if (!data) {
            let store = this._store;
            let i = store.add("", 0);
            store.link(i, this._index, NONE);
            return store.view(i);
        }
        let child = new Branch(data);
        attach(child, this);
        return child;
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
    addParent(data, siblings) {
        if (!siblings)
            siblings = [];
        let c = data instanceof Branch ? data : new Branch(data ?? {});
        detach(c);
        let oldParent = this.parent;
        if (oldParent) {
            attach(c, oldParent, this);
        }
        else if (c._store !== this._store) {
            // Move the new parent into this tree's Store rather than the reverse.
            move(c._store, c._index, this._store);
        }
        attach(this, c);
        siblings.forEach(sib => attach(sib, c));
        return this;
    }
    /**
     * Returns an array of Branches from this Branch to the root.
     * [d3-hierarchy compatibility method.](https://github.com/d3/d3-hierarchy#node_ancestors)
     * @type {Array} An array of Branches
     */
    ancestors() {
        return this.getAncestors(true);
    }
    /**
     * Returns a deep clone of the Branch on which it is called. Note that this does
     * not clone all descendants, rather than providing references to the existing
     * descendant Branches.
     * @return {Branch} A clone of the Branch on which it is called.
     */
    clone() {
        return copyTree(this);
    }
    /**
     * All descendant Branches with near-zero length are excised
     * @return {Branch} The Branch on which this method was called.
     */
    consolidate() {
        // Collect first: excising while traversing would shift the arrays being
        // traversed and skip Branches.
        let branches = [];
        this.eachAfter(branch => branches.push(branch));
        branches.forEach(branch => {
            if (branch === this || branch.isRoot() || branch.length >= 0.0005)
                return;
            branch.parent.id = joinIds(branch.parent.id, branch.id);
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
    copy() {
        return copyTree(this);
    }
    /**
     * Sets the value of each Branch to the number of leaves in its subtree (1
     * for a leaf), as d3-hierarchy's count does.
     * [d3-hierarchy compatibility method.](https://github.com/d3/d3-hierarchy#node_count)
     * @return {Branch} The Branch on which it was called
     */
    count() {
        let store = this._store;
        for (let i of store.postorder(this._index)) {
            let sum = 0;
            for (let c = store.firstChild[i]; c !== NONE; c = store.nextSibling[c]) {
                sum += store.value[c];
            }
            store.value[i] = store.firstChild[i] === NONE ? 1 : sum;
        }
        return this;
    }
    /**
     * Returns an array pf descendants, starting with this Branch.
     * [d3-hierarchy compatibility method.](https://github.com/d3/d3-hierarchy#node_descendants)
     * @type {Array} An Array of Branches, starting with this one.
     */
    descendants() {
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
    depthOf(descendant) {
        let distance = 0;
        let target = typeof descendant == "string"
            ? this.getDescendant(descendant)
            : descendant;
        if (typeof target == "undefined")
            throw Error("Cannot compute depth of undefined descendant!");
        let current = target;
        while (current != this) {
            distance += current.length;
            current = current.parent;
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
    distanceBetween(descendantA, descendantB) {
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
    distanceTo(cousin) {
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
    each(callback) {
        let branch = this, next = [branch], current;
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
    eachAfter(callback) {
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
    eachBefore(callback) {
        walk(this, callback, null);
        return this;
    }
    /**
     * Runs a function on each child of the Branch on which it is called.
     * @param  {Function} callback The function to run on each child.
     * @return {Branch} The Branch on which it was called.
     */
    eachChild(callback) {
        (this.children ?? []).forEach(callback);
        return this;
    }
    /**
     * Excises the Branch on which it is called and updates its parent and children.
     * Excising a root Branch with a single child makes that child the new root.
     * @return {Branch} The parent of the excised Branch, or the new root if the
     * excised Branch was the root.
     */
    excise() {
        let children = this.children ?? [];
        if (this.isRoot()) {
            if (children.length > 1) {
                throw new Error("Cannot excise a root Branch with multiple children.");
            }
            let child = children[0];
            if (!child)
                throw new Error("Cannot excise a root Branch with no children.");
            child.length += this.length;
            detach(child);
            return child;
        }
        let parent = this.parent;
        // Put the children in this Branch's place among its siblings.
        children.forEach(child => {
            child.length += this.length;
            attach(child, parent, this);
        });
        detach(this);
        parent.representing++;
        return parent;
    }
    /**
     * Sets the distance values (height and depth) for each Branch, and sets each
     * Branch's value to the number of Branches in its subtree (see
     * [Branch.count](#count)).
     * @return {Branch} The Branch on which it is called.
     */
    fixDistances() {
        let store = this._store;
        let { parent, depth, height, value, firstChild, nextSibling } = store;
        depth[this.getRoot()._index] = 0;
        for (let i of store.preorder(this._index)) {
            if (parent[i] >= 0)
                depth[i] = depth[parent[i]] + 1;
        }
        for (let i of store.postorder(this._index)) {
            let h = 0, v = 1;
            for (let c = firstChild[i]; c !== NONE; c = nextSibling[c]) {
                if (height[c] + 1 > h)
                    h = height[c] + 1;
                v += value[c];
            }
            height[i] = h;
            value[i] = v;
        }
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
    fixParenthood(nonrecursive) {
        // Parent and child links are stored together and can't disagree.
        return this;
    }
    /**
     * Reverses the order of (all of) the descendants of the Branch.
     * @return {Branch} The Branch on which this was called.
     */
    flip() {
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
    getAncestors(includeSelf) {
        let ancestors = includeSelf ? [this] : [];
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
    getChild(childID) {
        return this.children?.find(c => c.id === childID);
    }
    /**
     * Given an id string, returns the descendant Branch with that ID, or
     * `undefined` if it doesn't exist.
     * @param  {String} id The id string of the Branch to find
     * @return {(Branch|undefined)} The descendant Branch, or `undefined` if it
     * doesn't exist
     */
    getDescendant(id) {
        let store = this._store;
        for (let i of store.preorder(this._index)) {
            if (store.ids[i] === id)
                return store.view(i);
        }
        return undefined;
    }
    /**
     * Returns an array of all Branches which are descendants of this Branch
     * @param {Boolean} [includeSelf] Is this not the Branch on which the user
     * called the function? This is used internally and should be ignored.
     * @return {Array} An array of all Branches descended from this Branch
     */
    getDescendants(includeSelf) {
        let store = this._store;
        let order = store.preorder(this._index);
        let descendants = [];
        for (let k = includeSelf ? 0 : 1; k < order.length; k++) {
            descendants.push(store.view(order[k]));
        }
        return descendants;
    }
    /**
     * Returns an array of all leaves which are descendants of this Branch.
     * Alias of [getLeaves](#getLeaves) for people whose strong suit isn't spelling.
     * @return {Array} An array of all leaves descended from this Branch
     */
    getLeafs() {
        return this.getLeaves();
    }
    /**
     * Returns an array of all leaves which are descendants of this Branch
     * See also: [getLeafs](#getLeafs)
     * @return {Array} An array of all leaves descended from this Branch
     */
    getLeaves() {
        let store = this._store;
        let leaves = [];
        for (let i of store.preorder(this._index)) {
            if (store.firstChild[i] === NONE)
                leaves.push(store.view(i));
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
    getMRCA(cousin) {
        let [mrca] = climbToMRCA(this, cousin);
        return this._store.view(mrca);
    }
    /**
     * Traverses the tree upward until it finds the root Branch, and returns the
     * root.
     * @return {Branch} The root Branch of the tree
     */
    getRoot() {
        let store = this._store;
        let i = this._index;
        while (store.parent[i] >= 0)
            i = store.parent[i];
        return store.view(i);
    }
    /**
     * Determines if a given Branch (or ID) is a child of this Branch
     * @param  {(Branch|String)} child The Branch (or the id thereof) to check for
     * @return {Boolean}
     */
    hasChild(child) {
        if (child instanceof Branch) {
            return child.parent === this;
        }
        else if (typeof child === "string") {
            return (this.children ?? []).some(c => c.id === child);
        }
        throw Error(`Unknown type of child (${typeof child}) passed to Branch.hasChild!`);
    }
    /**
     * Checks to see if `descendant` is a descendant of the Branch on which this
     * method is called.
     * @param  {(Branch|String)} descendant Either the descendant Branch or its'
     * `id`.
     * @return {Boolean} True if `descendant` is descended from the Branch from
     * which this is called, otherwise false.
     */
    hasDescendant(descendant) {
        if (descendant instanceof Branch) {
            return descendant.isDescendantOf(this);
        }
        else if (typeof descendant === "string") {
            return findBelow(this, (s, i) => s.ids[i] === descendant) !== undefined;
        }
        throw Error("Unknown type of descendant passed to Branch.hasDescendant!");
    }
    /**
     * Checks to see if a Branch has a descendant leaf.
     * @return {Boolean} True if leaf is both a leaf and a descendant of the
     * Branch on which this method is called, False otherwise.
     */
    hasLeaf(leaf) {
        if (leaf instanceof Branch) {
            // A leaf's only leaf is itself.
            return leaf.isLeaf() && (leaf === this || leaf.isDescendantOf(this));
        }
        else if (typeof leaf === "string") {
            if (this.isLeaf())
                return this.id === leaf;
            return (findBelow(this, (s, i) => s.firstChild[i] === NONE && s.ids[i] === leaf) !==
                undefined);
        }
        throw Error("Unknown type of leaf passed to Branch.hasLeaf.");
    }
    /**
     * Swaps the branch on which it is called with its parent. This method is
     * probably only useful as an internal component of [Branch.reroot](#reroot).
     * @return {Branch} The Branch object on which it was called.
     */
    invert() {
        let oldParent = this.parent;
        if (oldParent) {
            let temp = oldParent.length;
            oldParent.length = this.length;
            this.length = temp;
            let grandparent = oldParent.parent;
            if (grandparent)
                attach(this, grandparent, oldParent);
            else
                detach(this);
            attach(oldParent, this);
        }
        else {
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
    isChildOf(parent) {
        if (parent instanceof Branch)
            return this.parent === parent;
        if (typeof parent === "string")
            return this.parent.id === parent;
        throw Error("Unknown parent type passed to Branch.isChildOf");
    }
    /**
     * Tests whether this and each descendant Branch holds correct links to both
     * its parent and its children.
     * @return {Boolean} True if consistent, otherwise false
     */
    isConsistent() {
        // Every child's parent link is checked against the list it's in, though
        // the two are kept together and can't disagree.
        let store = this._store;
        for (let i of store.preorder(this._index)) {
            for (let c = store.firstChild[i]; c !== NONE; c = store.nextSibling[c]) {
                if (store.parent[c] !== i)
                    return false;
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
    isDescendantOf(ancestor) {
        if (!ancestor)
            return false;
        for (let current = this.parent; current; current = current.parent) {
            if (current === ancestor || current.id === ancestor)
                return true;
        }
        return false;
    }
    /**
     * Returns a boolean indicating if this Branch is a leaf (i.e. has no
     * children).
     * @return {Boolean} True is this Branch is a leaf, otherwise false.
     */
    isLeaf() {
        return this._store.firstChild[this._index] === NONE;
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
    isolate() {
        if (this.isRoot()) {
            throw new TypeError("Cannot isolate a root Branch.");
        }
        detach(this);
        return this;
    }
    /**
     * Returns a boolean indicating if this Branch is the root of a tree (i.e. has
     * no parents).
     * @return {Boolean} True if this Branch is the root, otherwise false.
     */
    isRoot() {
        return this._store.parent[this._index] < 0;
    }
    /**
     * Returns the array of leaf nodes in traversal order; leaves are nodes with no
     * children. Alias of [Branch.getLeaves](#getLeaves) `cuz spelling is hard.
     * @type {Array} An Array of Branches which are descended from this Branch and
     * have no children.
     */
    leafs() {
        return this.getLeaves();
    }
    /**
     * Returns the array of leaf nodes in traversal order; leaves are nodes with no
     * children. Alias of [Branch.getLeaves](#getLeaves).
     * [d3-hierarchy compatibility method.](https://github.com/d3/d3-hierarchy#node_leaves)
     * @type {Array} An Array of Branches which are descended from this Branch and
     * have no children.
     */
    leaves() {
        return this.getLeaves();
    }
    /**
     * Returns an Array of links, which are plain javascript objects containing a
     * `source` attribute (which is a reference to the parent Branch) and a `target`
     * attribute (which is a reference to the child Branch).
     * [d3-hierarchy compatibility method](https://github.com/d3/d3-hierarchy#node_links)
     * @return {Array} An array of plain Javascript objects
     */
    links() {
        let links = [];
        this.each(d => {
            if (d.isRoot())
                return;
            links.push({
                source: d.parent,
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
    normalize(newmin, newmax) {
        if (typeof newmax !== "number")
            newmax = 1;
        if (typeof newmin !== "number")
            newmin = 0;
        let min = Infinity, max = -Infinity;
        this.each(d => {
            if (d.value < min)
                min = d.value;
            if (d.value > max)
                max = d.value;
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
    path(target) {
        let mrca = this.getMRCA(target);
        let branches = [];
        for (let current = this; current !== mrca; current = current.parent) {
            branches.push(current);
        }
        branches.push(mrca);
        let down = [];
        for (let current = target; current !== mrca; current = current.parent) {
            down.push(current);
        }
        for (let i = down.length - 1; i >= 0; i--)
            branches.push(down[i]);
        return branches;
    }
    /**
     * Removes a Branch and its subtree from the tree. Similar to
     * [Branch.isolate](#isolate), only it returns the root Branch of the tree
     * from which this Branch is removed.
     * @param {Boolean} pruneAncestors - If true, removes ancestors with no remaining children as well
     * @return {Branch} The root of the remaining tree.
     */
    remove(pruneAncestors) {
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
    removeIfNoChildren(nonrecursive) {
        let root = this.getRoot();
        let parent = this.parent;
        if (this.isLeaf() && parent) {
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
    replace(replacement) {
        let parent = this.parent;
        if (!parent)
            throw new Error("Cannot replace a root Branch.");
        let root = this.getRoot();
        attach(replacement, parent, this);
        detach(this);
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
    reroot() {
        let current = this;
        let toInvert = [];
        while (!current.isRoot()) {
            toInvert.push(current);
            current = current.parent;
        }
        toInvert.reverse().forEach(c => c.invert());
        return this.fixDistances();
    }
    /**
     * Reverses the order of the children of the branch on which it is called.
     * @return {Branch} The Branch on which this was called.
     */
    rotate(recursive) {
        let store = this._store;
        store.reorder(this._index, store.children(this._index).reverse());
        return this;
    }
    /**
     * Set the length of a Branch
     * @param  {number} length The new length to assign to the Branch
     * @return {Branch} The Branch object on which this was called
     */
    setLength(length) {
        this.length = length;
        return this;
    }
    /**
     * Sets the parent of the Branch on which it is called.
     * @param  {Branch} parent The Branch to set as parent
     * @return {Branch} The Branch on which this method was called.
     */
    setParent(parent) {
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
    simplify() {
        this.eachAfter(branch => {
            // Excising this Branch would detach it from the tree we return.
            if (branch === this)
                return;
            let children = branch.children;
            if (children && children.length == 1) {
                let child = children[0];
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
    sort(comparator) {
        if (!comparator)
            comparator = (a, b) => a.value - b.value;
        let compare = comparator;
        return this.eachBefore(d => {
            let children = d.children;
            if (!children)
                return;
            children.sort(compare);
            d._store.reorder(d._index, children.map(c => c._index));
        });
    }
    /**
     * Determines whether this Branch is likelier to be a source of `cousin`, or
     * if `cousin` is a source of this Branch.
     * @param  {Branch} cousin The other Branch to test
     * @return {Boolean} True if this might be the source of cousin, otherwise
     * false.
     */
    sources(cousin) {
        let [, a, b] = distancesToMRCA(this, cousin);
        return a < b;
    }
    /**
     * Computes the value of each Branch according to some valuator function
     * @param  {Function} value A Function taking a Branch and returning a
     * (numeric?) value.
     * @return {Branch} The Branch on which it was called.
     */
    sum(value) {
        if (!value)
            value = d => d.value;
        return this.eachAfter(d => (d.value =
            value(d) + (d.children ?? []).reduce((a, c) => a + c.value, 0)));
    }
    /**
     * Determines whether this Branch is likelier to be a target of `cousin`, or
     * if `cousin` is a target of this Branch.
     * @param  {Branch} cousin The other Branch to test
     * @return {Boolean} True if this might be the target of cousin, otherwise
     * false.
     */
    targets(cousin) {
        return cousin.sources(this);
    }
    /**
     * toJSON is an alias for [toObject](#toObject), enabling the safe use of
     * `JSON.stringify` on Branch objects (in spite of their circular references).
     * @type {Function}
     * @returns {Object} A serializable Object
     */
    toJSON() {
        return this.toObject();
    }
    /**
     * Computes a matrix of all patristic distances between all leaves which are
     * descendants of the Branch on which this method is called.
     * @return {Object} An Object containing a matrix (an Array of Arrays) and
     * Array of `id`s corresponding to the rows (and columns) of the matrix.
     */
    toMatrix() {
        let store = this._store;
        let { firstChild, nextSibling, length } = store;
        let order = store.postorder(this._index);
        let leafs = [];
        for (let i of order)
            if (firstChild[i] === NONE)
                leafs.push(i);
        let n = leafs.length;
        let matrix = new Array(n);
        for (let i = 0; i < n; i++)
            matrix[i] = new Array(n).fill(0);
        let nextLeaf = 0;
        // In post-order, each Branch's children's lists are the last ones on the
        // stack. A list holds the indices of a subtree's leaves and their distances
        // to the subtree's root. Each pair of leaves is visited once, at its MRCA,
        // so this is O(n^2) in the number of leaves.
        let indexStack = [], distanceStack = [];
        for (let branch of order) {
            if (firstChild[branch] === NONE) {
                // Leaves come in the same order as getLeaves lists them.
                indexStack.push([nextLeaf++]);
                distanceStack.push([0]);
                continue;
            }
            let k = 0;
            for (let c = firstChild[branch]; c !== NONE; c = nextSibling[c])
                k++;
            let first = indexStack.length - k;
            // Every internal Branch has a first child, which sets these.
            let indices, distances;
            let c = 0;
            for (let child = firstChild[branch]; child !== NONE; child = nextSibling[child], c++) {
                let childLength = length[child];
                let childIndices = indexStack[first + c], childDistances = distanceStack[first + c];
                // Sum each leaf's lengths upward, in the order depthOf sums them.
                for (let y = 0; y < childDistances.length; y++)
                    childDistances[y] += childLength;
                // Extend the first child's list rather than copying it.
                if (c === 0) {
                    indices = childIndices;
                    distances = childDistances;
                    continue;
                }
                for (let x = 0; x < indices.length; x++) {
                    let i = indices[x], di = distances[x], row = matrix[i];
                    for (let y = 0; y < childIndices.length; y++) {
                        let j = childIndices[y], distance = di + childDistances[y];
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
        }
        return {
            matrix: matrix,
            ids: leafs.map(i => store.ids[i])
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
    toNewick(nonterminus) {
        let store = this._store;
        let { firstChild, lastChild, prevSibling } = store;
        let parts = [];
        // The stack holds slots still to write (as numbers), and strings to write
        // as they are.
        let stack = [this._index];
        while (stack.length) {
            let item = stack.pop();
            if (typeof item === "string") {
                parts.push(item);
            }
            else if (firstChild[item] === NONE) {
                parts.push(newickLabel(store, item));
            }
            else {
                parts.push("(");
                stack.push(")" + newickLabel(store, item));
                for (let c = lastChild[item]; c !== NONE; c = prevSibling[c]) {
                    stack.push(c);
                    if (c !== firstChild[item])
                        stack.push(",");
                }
            }
        }
        if (!nonterminus)
            parts.push(";");
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
    toObject() {
        let store = this._store;
        let { firstChild, lastChild, prevSibling } = store;
        let output;
        // Pairs of a slot and the children array its object belongs in.
        let stack = [[this._index, null]];
        while (stack.length) {
            let [i, siblings] = stack.pop();
            let object = {
                id: store.ids[i],
                length: store.length[i]
            };
            if (siblings)
                siblings.push(object);
            else
                output = object;
            if (firstChild[i] !== NONE) {
                let objects = (object.children = []);
                for (let c = lastChild[i]; c !== NONE; c = prevSibling[c]) {
                    stack.push([c, objects]);
                }
            }
        }
        return output;
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
    toString(replacer, width) {
        if (!replacer)
            replacer = null;
        if (!width)
            width = 0;
        // JSON.stringify's overloads take each kind of replacer separately.
        return JSON.stringify(this, replacer, width);
    }
}
// Copies the ids, lengths and structure of a subtree into a new Store, and
// returns the new root with depth, height and value computed afresh.
function copyTree(root) {
    let from = root._store;
    let order = from.preorder(root._index);
    let to = new Store(order.length);
    let slots = new Map();
    for (let i of order) {
        let j = to.add(from.ids[i], from.length[i]);
        slots.set(i, j);
        if (i !== root._index)
            to.link(j, slots.get(from.parent[i]), NONE);
    }
    return to.view(0).fixDistances();
}
// Combines the ids of two merged Branches, ignoring empty ones.
function joinIds(a, b) {
    if (a === "")
        return b;
    if (b === "")
        return a;
    return a + "+" + b;
}
// Finds the MRCA of two Branches along with each one's distance to it, in a
// single climb from each side. Returns [mrca, distanceFromA, distanceFromB].
// Lengths are summed from each Branch upward, as depthOf sums them.
function distancesToMRCA(a, b) {
    let [mrca, i, j, fromA, fromB] = climbToMRCA(a, b);
    let length = a._store.length;
    let distanceA = 0, distanceB = 0;
    for (let k = 0; k < i; k++)
        distanceA += length[fromA[k]];
    for (let k = 0; k < j; k++)
        distanceB += length[fromB[k]];
    return [a._store.view(mrca), distanceA, distanceB];
}
// Lists the ancestors of two Branches (each including itself) as slots and
// matches them up from the root down; the last match is the MRCA. Returns
// [mrca, i, j, fromA, fromB], where fromA[i] and fromB[j] are the MRCA.
function climbToMRCA(a, b) {
    if (a._store !== b._store) {
        throw Error("Branch and cousin do not appear to share a common ancestor!");
    }
    let parent = a._store.parent;
    let fromA = [], fromB = [];
    for (let k = a._index; k >= 0; k = parent[k])
        fromA.push(k);
    for (let k = b._index; k >= 0; k = parent[k])
        fromB.push(k);
    let i = fromA.length - 1, j = fromB.length - 1;
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
// on leaving it. Each Branch's children are read after `before` is called on
// it, so callbacks can edit the tree as they could with a recursive traversal.
function walk(root, before, after) {
    let nodes = [root], arrays = [], indices = [];
    if (before)
        before(root);
    arrays.push(root.children ?? []);
    indices.push(0);
    while (nodes.length) {
        let top = nodes.length - 1, i = indices[top], array = arrays[top];
        if (i < array.length) {
            indices[top] = i + 1;
            let child = array[i];
            if (before)
                before(child);
            nodes.push(child);
            arrays.push(child.children ?? []);
            indices.push(0);
        }
        else {
            let node = nodes.pop();
            arrays.pop();
            indices.pop();
            if (after)
                after(node);
        }
    }
}
// Returns the first descendant of `branch` (in pre-order, excluding `branch`
// itself) for which `test` returns true, or undefined if there is none.
function findBelow(branch, test) {
    let store = branch._store;
    let order = store.preorder(branch._index);
    for (let k = 1; k < order.length; k++) {
        if (test(store, order[k]))
            return store.view(order[k]);
    }
    return undefined;
}
// A Branch's id and (if it has one) length, as written in Newick.
function newickLabel(store, i) {
    let label = "" + store.ids[i];
    if (store.length[i])
        label += ":" + numberToString(store.length[i]);
    return label;
}
// Returns a string representation of a number that doesn't use scientific
// notation. Works on the digits of JavaScript's own (shortest round-trip)
// representation, so it introduces no floating point artifacts.
function numberToString(num) {
    let str = String(num);
    let match = str.match(/^(-?)(\d)(?:\.(\d+))?e([+-]\d+)$/);
    if (!match)
        return str;
    let [, sign, whole, fraction = "", exponent] = match;
    let e = Number(exponent);
    if (e < 0)
        return sign + "0." + "0".repeat(-e - 1) + whole + fraction;
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
function parseJSON(json, idLabel, lengthLabel, childrenLabel) {
    if (!idLabel)
        idLabel = "id";
    if (!lengthLabel)
        lengthLabel = "length";
    if (!childrenLabel)
        childrenLabel = "children";
    if (typeof json === "string")
        json = JSON.parse(json);
    let store = new Store();
    let stack = [[json, NONE]];
    while (stack.length) {
        let [node, parent] = stack.pop();
        let i = store.add(node[idLabel] ?? "", node[lengthLabel] ?? 0);
        if (parent !== NONE)
            store.link(i, parent, NONE);
        let children = node[childrenLabel];
        if (children instanceof Array) {
            for (let k = children.length - 1; k >= 0; k--) {
                if (k in children)
                    stack.push([children[k], i]);
            }
        }
    }
    return store.view(0).fixDistances();
}
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
function parseMatrix(matrix, labels, options) {
    let N = matrix.length;
    if (!labels)
        labels = [...Array(N).keys()];
    let nj = new NeighborJoining(matrix, options?.float32 ?? false);
    // currIndexToLabel maps each row to the label of the taxon or joined node
    // it holds; labels from N up are joined nodes, in the order they were made.
    let currIndexToLabel = new Int32Array(N);
    for (let i = 0; i < N; i++)
        currIndexToLabel[i] = i;
    // The tree is built in one Store; labelToNode maps labels to its slots.
    let store = new Store(2 * N);
    let labelToNode = new Int32Array(2 * N);
    let nextIndex = N;
    function setUpNode(labelIndex, distance) {
        let node;
        if (labelIndex < N) {
            node = store.add(labels[labelIndex], distance);
            labelToNode[labelIndex] = node;
        }
        else {
            node = labelToNode[labelIndex];
            store.length[node] = distance;
        }
        return node;
    }
    function join(node1, node2) {
        let node = store.add("", 0);
        store.link(node1, node, NONE);
        store.link(node2, node, NONE);
        return node;
    }
    let minI, minJ, d1, d2;
    while (nj.cN > 2) {
        [minI, minJ] = nj.search();
        let dIJ = nj.distance(minI, minJ);
        d1 =
            0.5 * dIJ +
                (nj.rowSums[minI] - nj.rowSums[minJ]) / (2 * nj.cN - 4);
        d2 = dIJ - d1;
        let node1 = setUpNode(currIndexToLabel[minI], d1);
        let node2 = setUpNode(currIndexToLabel[minJ], d2);
        nj.join(minI, minJ);
        labelToNode[nextIndex] = join(node1, node2);
        currIndexToLabel[minI] = -1;
        currIndexToLabel[minJ] = nextIndex++;
    }
    // Join the last two rows (in index order) at the root.
    [minI, minJ] = nj.remaining();
    d1 = d2 = nj.distance(minI, minJ) / 2;
    let node1 = setUpNode(currIndexToLabel[minI], d1);
    let node2 = setUpNode(currIndexToLabel[minJ], d2);
    return store.view(join(node1, node2)).fixDistances();
}
/**
 * The distance matrix and search structures of a neighbor-joining run, after
 * RapidNJ (Simonsen, Mailund & Pedersen, 2008): each row keeps its distances
 * sorted, so the search for the pair to join can stop scanning a row once
 * no later entry can beat the best pair found so far.
 *
 * When two rows are joined, the first is removed and the second is reused for
 * the new node. Sorted rows aren't updated for the new node's column (only its
 * own row is re-sorted), so other rows hold stale values for it; every pair
 * is still found with its current distance in the row of whichever of its two
 * nodes was made last.
 */
class NeighborJoining {
    constructor(matrix, float32) {
        this.rowSumMax = 0;
        let N = (this.N = this.cN = matrix.length);
        let Floats = float32 ? Float32Array : Float64Array;
        this.rowStart = new Float64Array(N);
        for (let i = 0; i < N; i++)
            this.rowStart[i] = (i * (i - 1)) / 2;
        // Distances given as strings (e.g. read from a CSV file) become numbers.
        let D = (this.D = new Floats((N * (N - 1)) / 2));
        for (let i = 0; i < N; i++) {
            let row = matrix[i], start = this.rowStart[i];
            for (let j = 0; j < i; j++)
                D[start + j] = Number(row[j]);
        }
        this.removed = new Uint8Array(N);
        this.newRow = new Float64Array(N);
        this.rowChange = new Float64Array(N);
        this.sorter = new ArgSorter(N);
        this.sortedValues = new Array(N);
        this.sortedColumns = new Array(N);
        this.sortedLength = new Int32Array(N);
        for (let i = 0; i < N; i++) {
            this.sortedValues[i] = new Floats(N - 1);
            this.sortedColumns[i] = new Int32Array(N - 1);
            this.sortRow(i);
        }
        this.rowSums = new Float64Array(N);
        for (let i = 0; i < N; i++) {
            let sum = 0;
            for (let j = 0; j < N; j++)
                if (j !== i)
                    sum += this.distance(i, j);
            this.rowSums[i] = sum;
            if (sum > this.rowSumMax)
                this.rowSumMax = sum;
        }
    }
    /** The distance between rows i and j. */
    distance(i, j) {
        if (i > j)
            return this.D[this.rowStart[i] + j];
        if (j > i)
            return this.D[this.rowStart[j] + i];
        return 0;
    }
    /** The first two rows (in index order) that haven't been joined. */
    remaining() {
        let found = [];
        for (let i = 0; found.length < 2; i++)
            if (!this.removed[i])
                found.push(i);
        return [found[0], found[1]];
    }
    /** Sorts row r's distances to the other rows not yet joined. */
    sortRow(r) {
        let { removed, sorter } = this, keys = sorter.keys, columns = sorter.items, m = 0;
        for (let k = 0; k < this.N; k++) {
            if (removed[k] || k === r)
                continue;
            columns[m] = k;
            keys[m++] = this.distance(r, k);
        }
        sorter.sort(m);
        this.sortedValues[r].set(keys.subarray(0, m));
        this.sortedColumns[r].set(columns.subarray(0, m));
        this.sortedLength[r] = m;
    }
    /** Finds the pair of rows that minimizes the neighbor-joining criterion. */
    search() {
        let qMin = Infinity, n2 = this.cN - 2, { removed, rowSums, sortedValues, sortedColumns, sortedLength } = this, uMax = this.rowSumMax, q, minI = -1, minJ = -1, c2;
        // Initial guess for qMin: each row's nearest neighbor.
        for (let r = 0; r < this.N; r++) {
            if (removed[r] || sortedLength[r] === 0)
                continue;
            c2 = sortedColumns[r][0];
            if (removed[c2])
                continue;
            q = this.distance(r, c2) * n2 - rowSums[r] - rowSums[c2];
            if (q < qMin) {
                qMin = q;
                minI = r;
                minJ = c2;
            }
        }
        for (let r = 0; r < this.N; r++) {
            if (removed[r])
                continue;
            let values = sortedValues[r], columns = sortedColumns[r], length = sortedLength[r], rowSum = rowSums[r];
            for (let c = 0; c < length; c++) {
                c2 = columns[c];
                if (removed[c2])
                    continue;
                if (values[c] * n2 - rowSum - uMax > qMin)
                    break;
                q = this.distance(r, c2) * n2 - rowSum - rowSums[c2];
                if (q < qMin) {
                    qMin = q;
                    minI = r;
                    minJ = c2;
                }
            }
        }
        return [minI, minJ];
    }
    /** Joins rows i and j: removes row i and reuses row j for the new node. */
    join(joinedIndex1, joinedIndex2) {
        let { D, rowStart, removed, rowSums, newRow, rowChange } = this, n = this.N, sum = 0, aux, newMax = 0;
        let aux2 = this.distance(joinedIndex1, joinedIndex2);
        removed[joinedIndex1] = 1;
        for (let i = 0; i < n; i++) {
            if (removed[i])
                continue;
            aux = this.distance(joinedIndex1, i) + this.distance(joinedIndex2, i);
            newRow[i] = 0.5 * (aux - aux2);
            sum += newRow[i];
            rowChange[i] = -0.5 * (aux + aux2);
        }
        for (let i = 0; i < n; i++) {
            if (removed[i])
                continue;
            if (i !== joinedIndex2) {
                if (i > joinedIndex2)
                    D[rowStart[i] + joinedIndex2] = newRow[i];
                else
                    D[rowStart[joinedIndex2] + i] = newRow[i];
            }
            // This includes row joinedIndex2 itself, whose sum is replaced below;
            // the original implementation counted this interim value towards the
            // maximum, and the search's results depend on that bound.
            rowSums[i] += rowChange[i];
            if (rowSums[i] > newMax)
                newMax = rowSums[i];
        }
        rowSums[joinedIndex1] = 0;
        rowSums[joinedIndex2] = sum;
        if (sum > newMax)
            newMax = sum;
        this.rowSumMax = newMax;
        this.sortRow(joinedIndex2);
        this.sortedLength[joinedIndex1] = 0;
        this.cN--;
    }
}
/**
 * Sorts items (column indices) by their keys (distances), stably: items with
 * equal keys stay in the order given. A bottom-up merge sort on typed arrays,
 * which avoids Array.prototype.sort's comparator calls.
 */
class ArgSorter {
    constructor(capacity) {
        this.keys = new Float64Array(capacity);
        this.items = new Int32Array(capacity);
        this.keyBuffer = new Float64Array(capacity);
        this.itemBuffer = new Int32Array(capacity);
    }
    /** Sorts the first n keys and items in place. */
    sort(n) {
        let keys = this.keys, items = this.items;
        // Insertion sort runs of 16.
        const RUN = 16;
        for (let start = 0; start < n; start += RUN) {
            let end = Math.min(start + RUN, n);
            for (let i = start + 1; i < end; i++) {
                let key = keys[i], item = items[i], j = i - 1;
                while (j >= start && keys[j] > key) {
                    keys[j + 1] = keys[j];
                    items[j + 1] = items[j];
                    j--;
                }
                keys[j + 1] = key;
                items[j + 1] = item;
            }
        }
        // Merge runs, alternating between the arrays and the buffers.
        let fromKeys = keys, fromItems = items, toKeys = this.keyBuffer, toItems = this.itemBuffer;
        for (let width = RUN; width < n; width *= 2) {
            for (let left = 0; left < n; left += 2 * width) {
                let middle = Math.min(left + width, n), right = Math.min(left + 2 * width, n), i = left, j = middle, k = left;
                while (i < middle && j < right) {
                    // Take from the right only when strictly smaller, for stability.
                    if (fromKeys[j] < fromKeys[i]) {
                        toKeys[k] = fromKeys[j];
                        toItems[k++] = fromItems[j++];
                    }
                    else {
                        toKeys[k] = fromKeys[i];
                        toItems[k++] = fromItems[i++];
                    }
                }
                while (i < middle) {
                    toKeys[k] = fromKeys[i];
                    toItems[k++] = fromItems[i++];
                }
                while (j < right) {
                    toKeys[k] = fromKeys[j];
                    toItems[k++] = fromItems[j++];
                }
            }
            [fromKeys, toKeys] = [toKeys, fromKeys];
            [fromItems, toItems] = [toItems, fromItems];
        }
        if (fromKeys !== keys) {
            keys.set(fromKeys.subarray(0, n));
            items.set(fromItems.subarray(0, n));
        }
    }
}
/**
 * Parses a Newick String and returns a Branch object representing the root
 * of the output Tree.
 * This is adapted Jason Davies' [newick.js](https://github.com/jasondavies/newick.js/blob/master/src/newick.js),
 * which is released for modification under [the MIT License](https://opensource.org/licenses/MIT).
 * @param  {string} newick A Newick String
 * @return {Branch} A Branch representing the root of the output tree
 */
function parseNewick(newick) {
    let store = new Store(), ancestors = [], tree = store.add("", 0), tokens = newick.split(/\s*(;|\(|\)|,|:)\s*/), n = tokens.length;
    for (let t = 0; t < n; t++) {
        let token = tokens[t];
        let c;
        switch (token) {
            case "(": // new Branchset
                c = store.add("", 0);
                store.link(c, tree, NONE);
                ancestors.push(tree);
                tree = c;
                break;
            case ",": // another Branch
                c = store.add("", 0);
                store.link(c, ancestors[ancestors.length - 1], NONE);
                tree = c;
                break;
            case ")": // optional name next
                tree = ancestors.pop();
                break;
            case ":": // optional length next
                break;
            default:
                let x = tokens[t - 1];
                if (x == ")" || x == "(" || x == ",") {
                    store.ids[tree] = token;
                }
                else if (x == ":") {
                    store.length[tree] = parseFloat(token);
                }
        }
    }
    return store.view(0).fixDistances();
}

var patristic = /*#__PURE__*/Object.freeze({
    __proto__: null,
    Branch: Branch,
    parseJSON: parseJSON,
    parseMatrix: parseMatrix,
    parseNewick: parseNewick,
    version: version
});

// The entry point of the ES module build. It has the same named exports as the
// UMD build, and a default export holding all of them, so that
// `import patristic from "patristic"` keeps working as it did when the
// package was CommonJS only.

export { Branch, patristic as default, parseJSON, parseMatrix, parseNewick, version };
