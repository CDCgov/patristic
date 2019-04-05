(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = global || self, factory(global.patristic = {}));
}(this, function (exports) { 'use strict';

  /**
   * The [SemVer](https://semver.org/) version string of the patristic library
   * @type {String} A string specifying the current version of the Patristic Library.
   * If not given, the version of patristic you are using if less than or equal to 0.2.2.
   * @example
   * console.log(patristic.version);
   */
  const version = "0.3.6";

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
  function Branch(data){
    Object.assign(this, {
      _guid: guid(),
      id: '',
      parent: null,
      length: 0,
      value: 1,
      children: []
    }, data);
  }

  function guid(a){
    if(a){
      return (a^Math.random()*16>>a/4).toString(16);
    } else {
      return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,guid);
    }
  }

  /**
   * Adds a new child to this Branch
   * @param  {(Branch|Object)} [data={}] The new Branch, or data to attach to it.
   * @return {Branch} The (possibly new) child Branch
   */
  Branch.prototype.addChild = function(data){
    let c;
    if(data instanceof Branch){
      c = data;
      c.parent = this;
    } else {
      if(!data) data = {};
      c = new Branch(Object.assign(data, {
        parent: this
      }));
    }
    this.children.push(c);
    return c;
  };

  /**
   * Adds a new parent to this Branch. This is a bit esoteric and generally not
   * recommended.
   * @param  {(Branch|Object)} [data={}] A Branch object, or the data to attach to one
   * @param  {Array} [siblings=[]] An array of Branches to be the children of the new parent Branch (i.e. siblings of this Branch)
   * @return {Branch} The Branch on which this was called
   */
  Branch.prototype.addParent = function(data, siblings){
    if(!siblings) siblings = [];
    let c;
    if(data instanceof Branch){
      c = data;
    } else {
      if(!data) data = {};
      c = new Branch(Object.assign(data));
    }
    siblings.forEach(sib => sib.setParent(c));
    c.children = [this].concat(siblings);
    this.parent = c;
    return this;
  };

  /**
   * Returns an array of Branches from this Branch to the root.
   * [d3-hierarchy compatibility method.](https://github.com/d3/d3-hierarchy#node_ancestors)
   * @type {Array} An array of Branches
   */
  Branch.prototype.ancestors = function(){
    return [this].concat(this.getAncestors());
  };

  /**
   * Returns a clone of the Branch on which it is called. Note that this also
   * clones all descendants, rather than providing references to the existing
   * descendant Branches.
   * @return {Branch} A clone of the Branch on which it is called.
   */
  Branch.prototype.clone = function(){
    return parseJSON(this.toObject());
  };

  /**
   * Returns a clone of the Branch on which it is called. Note that this also
   * clones all descendants, rather than providing references to the existing
   * descendant Branches. Finally, the cloned Branch will become the root of the
   * cloned tree, having a parent of `null`.
   * [d3-hierarchy compatibility method.](https://github.com/d3/d3-hierarchy#node_copy)
   * @return {Branch} A clone of the Branch on which it is called.
   */
  Branch.prototype.copy = function(){
    return parseJSON(this.toObject());
  };

  /**
   * Sets the values of all nodes to be equal to the number of their descendants.
   * @return {Branch} The Branch on which it was called
   */
  Branch.prototype.count = function(){
    return this.sum(() => 1);
  };

  /**
   * Returns an array pf descendants, starting with this Branch.
   * [d3-hierarchy compatibility method.](https://github.com/d3/d3-hierarchy#node_descendants)
   * @type {Array} An Array of Branches, starting with this one.
   */
  Branch.prototype.descendants = function(){
    return this.getDescendants(true);
  };

  /**
   * Returns the depth of a given child, relative to the Branch on which it is
   * called.
   * @param  {(Branch|String)} descendant A descendant Branch (or `id` string
   * thereof)
   * @return {Number} The sum of the lengths of all Branches between the Branch on
   * which it is called and `descendant`. Throws an error if `descendant` is not a
   * descendant of this Branch.
   */
  Branch.prototype.depthOf = function(descendant){
    let distance = 0;
    if(typeof descendant === 'string') descendant = this.getDescendant(descendant);
    if(typeof descendant === 'undefined') throw Error('Cannot compute depth of undefined descendant!');
    let current = descendant;
    while(!current.isRoot()){
      if(current === this) break;
      distance += current.length;
      current = current.parent;
    }
    return distance;
  };

  /**
   * Computes the patristic distance between `cousin` and the Branch on which
   * this method is called.
   * @param  {Branch} cousin The Branch to which you wish to compute distance
   * @return {number} The patristic distance between `cousin` and the Branch on
   * this method is called.
   */
  Branch.prototype.distanceTo = function(cousin){
    let mrca = this.getMRCA(cousin);
    return mrca.depthOf(this) + mrca.depthOf(cousin);
  };

  /**
   * Visits each Branch descended from the Branch on which it is called in
   * [Breadth First Search order]() and returns the Branch on which it was called.
   * @param  {Function} callback The function to be run on each Branch
   * @return {Branch} The Branch on which it was called.
   */
  Branch.prototype.each = function(callback){
    let branch = this, next = [branch], current;
    while(next.length){
      current = next.reverse();
      next = [];
      while(branch = current.pop()){
        callback(branch);
        branch.eachChild(child => next.push(child));
      }
    }
    return this;
  };

  /**
   * Visits each Branch descended from the Branch on which it is called in
   * [post-traversal order](https://en.wikipedia.org/wiki/Tree_traversal#Post-order)
   * and returns the Branch on which it was called.
   * @param  {Function} callback Function to run on each Branch
   * @return {Branch} The Branch on which it was called
   */
  Branch.prototype.eachAfter = function(callback){
    this.eachChild(child => child.eachAfter(callback));
    callback(this);
    return this;
  };

  /**
   * Visits each Branch descended from the Branch on which it is called in
   * [pre-traversal order](https://en.wikipedia.org/wiki/Tree_traversal#Pre-order)
   * and returns the Branch on which it was called.
   * @param  {Function} callback [description]
   * @return {[type]}            [description]
   */
  Branch.prototype.eachBefore = function(callback){
    callback(this);
    this.eachChild(child => child.eachBefore(callback));
    return this;
  };

  /**
   * Runs a function on each child of the Branch on which it is called.
   * This is mostly a helper-function to the other Branch.each* methods.
   * @param  {Function} callback The function to run on each child.
   * @return {Branch} The Branch on which it was called.
   */
  Branch.prototype.eachChild = function(callback){
    this.children.forEach(callback);
    return this;
  };

  /**
   * Excises the Branch on which it is called and updates its parent and children.
   * @return {Branch} The parent of the excised Branch.
   */
  Branch.prototype.excise = function(){
    if(this.isRoot() && this.children.length > 1){
      throw new Error('Cannot excise a root Branch with multiple children.');
    }
    this.children.forEach(child => {
      child.length += this.length;
      child.parent = this.parent;
      if(!this.isRoot()) this.parent.children.push(child);
    });
    this.parent.children.splice(this.parent.children.indexOf(this), 1);
    return this.parent;
  };

  /**
   * Sets the distance values (height and depth) for each Branch
   * @return {Branch} The Branch on which it is called.
   */
  Branch.prototype.fixDistances = function(){
    let maxdepth = 0, root = this.getRoot();
    root.depth = 0;
    this
      .eachBefore(d => {
        if(d.isRoot()) return;
        d.depth = d.parent.depth + 1;
        if(d.depth > maxdepth) maxdepth = d.depth;
      })
      .eachAfter(d => {
        d.height = maxdepth - d.depth;
        d.value = d.value + d.children.reduce((a, c) => a + c.value, 0);
      });
    return this;
  };

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
  Branch.prototype.fixParenthood = function(nonrecursive){
    this.children.forEach(child => {
      if(!child.parent) child.parent = this;
      if(child.parent !== this) child.parent = this;
      if(!nonrecursive && child.children.length > 0){
        child.fixParenthood();
      }
    });
    return this;
  };

  /**
   * Returns an Array of all the ancestors of the Branch on which it is called.
   * Note that this does not include itself. For all ancestors and itself, see
   * [Branch.ancestors](#ancestors)
   * @return {Array} Every Ancestor of the Branch on which it was called.
   */
  Branch.prototype.getAncestors = function(){
    let ancestors = [];
    let current = this;
    while(!current.isRoot()){
      ancestors.push(current.parent);
      current = current.parent;
    }
    return ancestors;
  };

  /**
   * Given an `childID`, returns the child with that id (or `undefined` if no such
   * child is present).
   * @param  {String} childID the ID of the child to return.
   * @return {(Branch|undefined)} The desired child Branch, or `undefined` if the
   * child doesn't exist.
   */
  Branch.prototype.getChild = function(childID){
    if(!typeof childID == 'string') throw Error('childID is not a String!');
    return this.children.find(c => c.id === childID);
  };

  /**
   * Given an id string, returns the descendant Branch with that ID, or
   * `undefined` if it doesn't exist.
   * @param  {String} id The id string of the Branch to find
   * @return {(Branch|undefined)} The descendant Branch, or `undefined` if it
   * doesn't exist
   */
  Branch.prototype.getDescendant = function(id){
    if(this.id === id) return this;
    let children = this.children, n = children.length;
    if(children){
      for(let i = 0; i < n; i++){
        let descendant = children[i].getDescendant(id);
        if(descendant) return descendant;
      }
    }
  };

  /**
   * Returns an array of all Branches which are descendants of this Branch
   * @param {falsy} [nonterminus] Is this not the Branch on which the user called
   * the function? This is used internally and should be ignored.
   * @return {Array} An array of all Branches descended from this Branch
   */
  Branch.prototype.getDescendants = function(nonterminus){
    let descendants = nonterminus ? [this] : [];
    if(!this.isLeaf()){
      this.children.forEach(child => {
        child.getDescendants(true).forEach(d => descendants.push(d));
      });
    }
    return descendants;
  };

  /**
   * Returns an array of all leaves which are descendants of this Branch.
   * Alias of [getLeaves](#getLeaves) for people whose strong suit isn't spelling.
   * @return {Array} An array of all leaves descended from this Branch
   */
  Branch.prototype.getLeafs = function(){
    return this.getLeaves();
  };

  /**
   * Returns an array of all leaves which are descendants of this Branch
   * See also: [getLeafs](#getLeafs)
   * @return {Array} An array of all leaves descended from this Branch
   */
  Branch.prototype.getLeaves = function(){
    if(this.isLeaf()){
      return [this];
    } else {
      let descendants = [];
      this.children.forEach(child => {
        child.getLeaves().forEach(d => descendants.push(d));
      });
      return descendants;
    }
    throw new Error("Something very weird happened. Sorry about that!");
  };

  /**
   * Traverses the tree upward until it finds the Most Recent Common Ancestor
   * (i.e. the first Branch for which both the Branch on which it was called and
   * `cousin` are descendants).
   * @return {Branch} The Most Recent Common Ancestor of both the Branch on
   * which it was called and the `cousin`.
   */
  Branch.prototype.getMRCA = function(cousin){
    let mrca = this;
    while(!mrca.hasDescendant(cousin)){
      if(mrca.isRoot()) throw Error('Branch and cousin do not appear to share a common ancestor!');
      mrca = mrca.parent;
    }
    return mrca;
  };

  /**
   * Traverses the tree upward until it finds the root Branch, and returns the
   * root.
   * @return {Branch} The root Branch of the tree
   */
  Branch.prototype.getRoot = function(){
    let branch = this;
    while(!branch.isRoot()) branch = branch.parent;
    return branch;
  };

  /**
   * Determines if a given Branch (or ID) is a child of this Branch
   * @param  {(Branch|String)} child The Branch (or the id thereof) to check for
   * @return {Boolean}
   */
  Branch.prototype.hasChild = function(child){
    if(child instanceof Branch){
      return this.children.includes(child);
    } else if(typeof child === 'string'){
      return this.children.some(c => c.id === child);
    }
    throw Error(`Unknown type of child (${typeof child}) passed to Branch.hasChild!`);
  };

  /**
   * Checks to see if `descendant` is a descendant of the Branch on which this
   * method is called.
   * @param  {(Branch|String)} descendant Either the descendant Branch or its'
   * `id`.
   * @return {Boolean} True if `descendant` is descended from the Branch from
   * which this is called, otherwise false.
   */
  Branch.prototype.hasDescendant = function(descendant){
    let descendants = this.getDescendants();
    if(descendant instanceof Branch){
      return descendants.some(d => d === descendant);
    } else if(typeof descendant === 'string'){
      return descendants.some(d => d.id === descendant);
    }
    throw Error('Unknown type of descendant passed to Branch.hasDescendant!');
  };

  /**
   * Checks to see if a Branch has a descendant leaf.
   * @return {Boolean} True if leaf is both a leaf and a descendant of the
   * Branch on which this method is called, False otherwise.
   */
  Branch.prototype.hasLeaf = function(leaf){
    let leaves = this.getleaves();
    if(leaf instanceof Branch){
      return leaves.includes(leaf);
    } else if(typeof leaf === 'string'){
      return leaves.some(d => d.id === leaf);
    }
    throw Error('Unknown type of leaf passed to Branch.hasLeaf.');
  };

  /**
   * Swaps a child with its parent. This method is probably only useful as an
   * internal component of [Branch.reroot](#reroot).
   * @return {Branch} The Branch object on which it was called.
   */
  Branch.prototype.invert = function(){
    let oldParent = this.parent;
    if(oldParent){
      this.parent = oldParent.parent;
      this.children.push(oldParent);
      oldParent.parent = this;
      oldParent.children.splice(oldParent.children.indexOf(this), 1);
    }
    return this;
  };

  /**
   * Returns whether the Branch on which it is called is a child of a given parent
   * (or parent ID).
   * @param  {(Branch|String)} parent A Branch (or ID thereof) to test for
   * paternity of this Branch.
   * @return {Boolean} True is `parent` is the parent of this Branch, false
   * otherwise.
   */
  Branch.prototype.isChildOf = function(parent){
    if(parent instanceof Branch) return this.parent === parent;
    if(typeof parent === 'string') return this.parent.id === parent;
    throw Error('Unknown parent type passed to Branch.isChildOf');
  };

  /**
   * Tests whether this and each descendant Branch holds correct links to both
   * its parent and its children.
   * @return {Boolean} True if consistent, otherwise false
   */
  Branch.prototype.isConsistent = function(){
    if(!this.isRoot()){
      if(!this.parent.children.includes(this)) return false;
    }
    if(!this.isLeaf()){
      if(this.children.some(c => c.parent !== this)) return false;
      return this.children.every(c => c.isConsistent());
    }
    return true;
  };

  /**
   * Returns whether a given Branch is an ancestor of the Branch on which this
   * method is called. Uses recursive tree-climbing.
   * @param  {Branch} ancestor The Branch to check for ancestorhood
   * @return {Boolean} If this Branch is descended from `ancestor`
   */
  Branch.prototype.isDescendantOf = function(ancestor){
    if(!ancestor || !this.parent) return false;
    if(this.parent === ancestor || this.parent.id === ancestor) return true;
    return this.parent.isDescendantOf(ancestor);
  };

  /**
   * Returns a boolean indicating if this Branch is a leaf (i.e. has no
   * children).
   * @return {Boolean} True is this Branch is a leaf, otherwise false.
   */
  Branch.prototype.isLeaf = function(){
    return this.children.length === 0;
  };

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
  Branch.prototype.isolate = function(){
    let index = this.parent.children.indexOf(this);
    this.parent.children.splice(index, 1);
    this.setParent(null);
    return this;
  };

  /**
   * Returns a boolean indicating if this Branch is the root of a tree (i.e. has
   * no parents).
   * @return {Boolean} True if this Branch is the root, otherwise false.
   */
  Branch.prototype.isRoot = function(){
    return this.parent === null;
  };

  /**
   * Returns the array of leaf nodes in traversal order; leaves are nodes with no
   * children. Alias of [Branch.getLeaves](#getLeaves) `cuz spelling is hard.
   * @type {Array} An Array of Branches which are descended from this Branch and
   * have no children.
   */
  Branch.prototype.leafs = function(){
    return this.getLeaves();
  };

  /**
   * Returns the array of leaf nodes in traversal order; leaves are nodes with no
   * children. Alias of [Branch.getLeaves](#getLeaves).
   * [d3-hierarchy compatibility method.](https://github.com/d3/d3-hierarchy#node_leaves)
   * @type {Array} An Array of Branches which are descended from this Branch and
   * have no children.
   */
  Branch.prototype.leaves = function(){
    return this.getLeaves();
  };

  /**
   * Returns an Array of links, which are plain javascript objects containing a
   * `source` attribute (which is a reference to the parent Branch) and a `target`
   * attribute (which is a reference to the child Branch).
   * [d3-hierarchy compatibility method](https://github.com/d3/d3-hierarchy#node_links)
   * @return {Array} An array of plain Javascript objects
   */
  Branch.prototype.links = function(){
    let links = [];
    this.each(d => {
      if(d.isRoot()) return;
      links.push({
        source: d.parent,
        target: d
      });
    });
    return links;
  };

  /**
   * Normalizes this and all descendant Branches `value` attributes to between
   * `newmin` and `newmax`. Note that normalize can function as its own inverse
   * when passed an original range. For example:
   * @example tree.normalize().normalize(1, tree.getDescendants().length + 1);
   * @param  {Number} newmin The desired minimum value.
   * @param  {Number} newmax The desired maximum value.
   * @return {Branch} The Branch on which it was called.
   */
  Branch.prototype.normalize = function(newmin, newmax){
    if(typeof newmax !== 'number') newmax = 1;
    if(typeof newmin !== 'number') newmin = 0;
    let min = Infinity, max = -Infinity;
    this.each(d => {
      if(d.value < min) min = d.value;
      if(d.value > max) max = d.value;
    });
    let ratio = (newmax - newmin) / (max - min);
    return this.each(d => d.value = (d.value - min) * ratio + newmin);
  };

  /**
   * Gets the path from this Branch to `target`. If this Branch and `target` are
   * the same, returns an array containing only the Branch on which it is called.
   * @param  {Branch} target A Branch object
   * @return {Array} An ordered Array of Branches following the path between this
   * Branch and `target`
   */
  Branch.prototype.path = function(target){
    let current = this;
    let branches = [this];
    let mrca = this.getMRCA(target);
    while(start !== mrca){
      current = current.parent;
      branches.push(start);
    }
    let k = branches.length;
    current = target;
    while(current !== mrca){
      branches.splice(k, 0, current);
      current = current.parent;
    }
    return branches;
  };

  /**
   * Removes a Branch and its subtree from the tree. Similar to
   * [Branch.isolate](#isolate), only it returns the root Branch of the tree
   * from which this Branch is removed.
   * @return {Branch} The root of the remaining tree.
   */
  Branch.prototype.remove = function(){
    let root = this.getRoot();
    this.isolate();
    return root;
  };

  /**
   * Reroots a tree on this Branch. Use with caution, this returns the new root,
   * which should typically supplant the existing root Branch object, but does
   * not replace that root automatically.
   * @example
   * tree = tree.children[0].children[0].reroot();
   * @return {Branch} The new root Branch, which is either the Branch on which
   * this was called or its parent
   */
  Branch.prototype.reroot = function(){
    if(this.isRoot()) return this;
    if(this.parent.isRoot() && this.isLeaf()) return this.parent;
    let newRoot = this.isLeaf() ? this.parent : this;
    let current = newRoot;
    let toInvert = [];
    while(!current.isRoot()){
      toInvert.push(current);
      current = current.parent;
    }
    toInvert.reverse().forEach(c => c.invert());
  	return newRoot;
  };

  /**
   * Reverses the order of children (or descendants, if `recursive` of a Branch.
   * @param {Boolean} recursive Whether or not to rotate all descendants, or just
   * children. Non-recursive appears as though Branches have been swapped.
   * Recursive appears as though the entire subtree has been flipped over.
   * @return {Branch} The Branch on which this was called.
   */
  Branch.prototype.rotate = function(recursive){
    if(!this.children) return this;
    if(recursive){
      this.each(c => c.rotate());
    } else {
      this.children.reverse();
    }
    return this;
  };

  /**
   * Set the length of a Branch
   * @param  {number} length The new length to assign to the Branch
   * @return {Branch} The Branch object on which this was called
   */
  Branch.prototype.setLength = function(length){
    this.length = length;
    return this;
  };

  /**
   * Sets the parent of the Branch on which it is called.
   * @param  {Branch} parent The Branch to set as parent
   * @return {Branch} The Branch on which this method was called.
   */
  Branch.prototype.setParent = function(parent){
    if(!parent instanceof Branch && parent !== null) throw Error('Cannot set parent to non-Branch object!');
    this.parent = parent;
    return this;
  };

  /**
   * Sorts the Tree from the branch on which it is called downward.
   * @param  {Function} [comparator] A Function taking two Branches and returning
   * a numberic value. For details, see [MDN Array.sort](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort#Description)
   * @return {Branch} The Branch on which it was called
   */
  Branch.prototype.sort = function(comparator){
    if(!comparator) comparator = (a, b) => a.value - b.value;
    return this.eachBefore(d => d.children.sort(comparator));
  };

  /**
   * Determines whether this Branch is likelier to be a source of `cousin`, or
   * if `cousin` is a source of this Branch.
   * @param  {Branch} cousin The other Branch to test
   * @return {Boolean} True if this might be the source of cousin, otherwise
   * false.
   */
  Branch.prototype.sources = function(cousin){
    let mrca = this.getMRCA(cousin);
    return mrca.depthOf(this) < mrca.depthOf(cousin);
  };

  /**
   * Computes the value of each Branch according to some valuator function
   * @param  {Function} value A Function taking a Branch and returning a
   * (numeric?) value.
   * @return {Branch} The Branch on which it was called.
   */
  Branch.prototype.sum = function(value){
    if(!value) value = d => d.value;
    return this.eachAfter(d => d.value = value(d) + d.children.reduce((a, c) => a + c.value, 0));
  };

  /**
   * Determines whether this Branch is likelier to be a target of `cousin`, or
   * if `cousin` is a target of this Branch.
   * @param  {Branch} cousin The other Branch to test
   * @return {Boolean} True if this might be the target of cousin, otherwise
   * false.
   */
  Branch.prototype.targets = function(cousin){
    return cousin.sources(this);
  };

  /**
   * toJSON is an alias for [toObject](#toObject), enabling the safe use of
   * `JSON.stringify` on Branch objects (in spite of their circular references).
   * @type {Function}
   * @returns {Object} A serializable Object
   */
  Branch.prototype.toJSON = function(){
    return this.toObject();
  };

  /**
   * Computes a matrix of all patristic distances between all leaves which are
   * descendants of the Branch on which this method is called.
   * @return {Object} An Object containing a matrix (an Array of Arrays) and
   * Array of `id`s corresponding to the rows (and columns) of the matrix.
   */
  Branch.prototype.toMatrix = function(){
    let leafs = this.getLeaves();
    let n = leafs.length;
    let matrix = new Array(n);
    for(let i = 0; i < n; i++){
      matrix[i] = new Array(n);
      matrix[i][i] = 0;
      for(let j = 0; j < i; j++){
        let distance = leafs[i].distanceTo(leafs[j]);
        matrix[i][j] = distance;
        matrix[j][i] = distance;
      }
    }
    return {
      'matrix': matrix,
      'ids': leafs.map(d => d.id)
    };
  };

  /**
   * Returns the Newick representation of this Branch and its descendants.
   * @param  {Boolean} [nonterminus=falsy] Is this not the terminus of the
   * Newick Tree? This should be falsy when called by a user (i.e. you). It's
   * used internally to decide whether or not in include a semicolon in the
   * returned string.
   * @return {String} The [Newick](https://en.wikipedia.org/wiki/Newick_format)
   * representation of the Branch.
   */
  Branch.prototype.toNewick = function(nonterminus){
    let out = '';
    if(!this.isLeaf()){
      out += '(' + this.children.map(child => child.toNewick(true)).join(',') + ')';
    }
    out += this.id;
    if(this.length) out += ':' + numberToString(this.length);
    if(!nonterminus) out += ';';
    return out;
  };

  //This function takes a number and returns a string representation that does
  //not use Scientific Notation.
  //It's adapted from [StackOverflow](https://stackoverflow.com/a/46545519/521121),
  //Which makes it available under the [CC BY-SA 3.0 License](https://creativecommons.org/licenses/by-sa/3.0/)
  function numberToString(num){
    let numStr = String(num);
    if(Math.abs(num) < 1.0){
      let e = parseInt(num.toString().split('e-')[1]);
      if(e){
        let negative = num < 0;
        if (negative) num *= -1;
        num *= Math.pow(10, e - 1);
        numStr = '0.' + (new Array(e)).join('0') + num.toString().substring(2);
        if(negative) numStr = "-" + numStr;
      }
    } else {
      let e = parseInt(num.toString().split('+')[1]);
      if(e > 20){
        e -= 20;
        num /= Math.pow(10, e);
        numStr = num.toString() + (new Array(e + 1)).join('0');
      }
    }
    return numStr;
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
  Branch.prototype.toObject = function(){
    var output = {
      id: this.id,
      length: this.length
    };
    if(this.children.length > 0) output.children = this.children.map(c => c.toObject());
    return output;
  };

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
  function parseJSON(json, idLabel, lengthLabel, childrenLabel){
    if(!idLabel) idLabel = 'id';
    if(!lengthLabel) lengthLabel = 'length';
    if(!childrenLabel) childrenLabel = 'children';
    if(typeof json === 'string') json = JSON.parse(json);
    let root = new Branch({
      id: json[idLabel],
      length: json[lengthLabel]
    });
    if(json[childrenLabel] instanceof Array){
      json[childrenLabel].forEach(child => {
        root.addChild(parseJSON(child));
      });
    }
    return root.fixDistances();
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
  function parseMatrix(matrix, labels){
    let that = {};
    let N = that.N = matrix.length;
    if(!labels) labels = [...Array(N).keys()];
    that.cN = that.N;
    that.D = matrix;
    that.labels = labels;
    that.labelToTaxon = {};
    that.currIndexToLabel = new Array(N);
    that.rowChange = new Array(N);
    that.newRow = new Array(N);
    that.labelToNode = new Array(2 * N);
    that.nextIndex = N;
    that.I = new Array(that.N);
    that.S = new Array(that.N);
    for (let i = 0; i < that.N; i++){
      let sortedRow = sortWithIndices(that.D[i], i, true);
      that.S[i] = sortedRow;
      that.I[i] = sortedRow.sortIndices;
    }
    that.removedIndices = new Set();
    that.indicesLeft = new Set();
    for (let i = 0; i < N; i++){
      that.currIndexToLabel[i] = i;
      that.indicesLeft.add(i);
    }
    that.rowSumMax = 0;
    that.PNewick = "";
    let minI, minJ,
        d1, d2,
        l1, l2,
        node1, node2, node3;

    function setUpNode(labelIndex, distance){
      let node;
      if(labelIndex < that.N){
        node = new Branch({id: that.labels[labelIndex], length: distance});
        that.labelToNode[labelIndex] = node;
      } else {
        node = that.labelToNode[labelIndex];
        node.setLength(distance);
      }
      return node;
    }

    that.rowSums = sumRows(that.D);
    for (let i = 0; i < that.cN; i++){
      if (that.rowSums[i] > that.rowSumMax) that.rowSumMax = that.rowSums[i];
    }

    while(that.cN > 2){
      //if (that.cN % 100 == 0 ) console.log(that.cN);
      ({ minI, minJ } = search(that));

      d1 = 0.5 * that.D[minI][minJ] + (that.rowSums[minI] - that.rowSums[minJ]) / (2 * that.cN - 4);
      d2 = that.D[minI][minJ] - d1;

      l1 = that.currIndexToLabel[minI];
      l2 = that.currIndexToLabel[minJ];

      node1 = setUpNode(l1, d1);
      node2 = setUpNode(l2, d2);
      node3 = new Branch({children: [node1, node2]});

      recalculateDistanceMatrix(that, minI, minJ);
      let sorted = sortWithIndices(that.D[minJ], minJ, true);
      that.S[minJ] = sorted;
      that.I[minJ] = sorted.sortIndices;
      that.S[minI] = that.I[minI] = [];
      that.cN--;

      that.labelToNode[that.nextIndex] = node3;
      that.currIndexToLabel[minI] = -1;
      that.currIndexToLabel[minJ] = that.nextIndex++;
    }

    let left = that.indicesLeft.values();
    minI = left.next().value;
    minJ = left.next().value;

    l1 = that.currIndexToLabel[minI];
    l2 = that.currIndexToLabel[minJ];
    d1 = d2 = that.D[minI][minJ] / 2;

    node1 = setUpNode(l1, d1);
    node2 = setUpNode(l2, d2);

    let tree = new Branch({children: [node1, node2]});
    tree.fixParenthood();
    return tree.fixDistances();
  }

  function search(t){
    let qMin = Infinity,
        D = t.D,
        cN = t.cN,
        n2 = cN - 2,
        S = t.S,
        I = t.I,
        rowSums = t.rowSums,
        removedColumns = t.removedIndices,
        uMax = t.rowSumMax,
        q, minI = -1, minJ = -1, c2;

    // initial guess for qMin
    for (let r = 0; r < t.N; r++){
      if (removedColumns.has(r)) continue;
      c2 = I[r][0];
      if (removedColumns.has(c2)) continue;
      q = D[r][c2] * n2 - rowSums[r] - rowSums[c2];
      if (q < qMin){
        qMin = q;
        minI = r;
        minJ = c2;
      }
    }

    for (let r = 0; r < t.N; r++){
      if (removedColumns.has(r)) continue;
      for (let c = 0; c < S[r].length; c++){
        c2 = I[r][c];
        if (removedColumns.has(c2)) continue;
        if (S[r][c] * n2 - rowSums[r] - uMax > qMin) break;
        q = D[r][c2] * n2 - rowSums[r] - rowSums[c2];
        if (q < qMin){
          qMin = q;
          minI = r;
          minJ = c2;
        }
      }
    }

    return {minI, minJ};
  }

  function recalculateDistanceMatrix(t, joinedIndex1, joinedIndex2){
    let D = t.D,
        n = D.length,
        sum = 0, aux, aux2,
        removedIndices = t.removedIndices,
        rowSums = t.rowSums,
        newRow = t.newRow,
        rowChange = t.rowChange,
        newMax = 0;

    removedIndices.add(joinedIndex1);
    for (let i = 0; i < n; i++){
      if (removedIndices.has(i)) continue;
      aux = D[joinedIndex1][i] + D[joinedIndex2][i];
      aux2 = D[joinedIndex1][joinedIndex2];
      newRow[i] = 0.5 * (aux - aux2);
      sum += newRow[i];
      rowChange[i] = -0.5 * (aux + aux2);
    }
    for (let i = 0; i < n; i++){
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

  function sumRows(a){
    let n = a.length,
        sums = new Array(n);
    for (let i = 0; i < n; i++){
      let sum = 0;
      for (let j = 0; j < n; j++){
        let v = parseFloat(a[i][j]);
        if(typeof v !== 'number') continue;
        sum += a[i][j];
      }
      sums[i] = sum;
    }
    return sums;
  }

  function sortWithIndices(toSort, skip){
    if(typeof skip === 'undefined') skip = -1;
    let n = toSort.length;
    let indexCopy = new Array(n);
    let valueCopy = new Array(n);
    let i2 = 0;
    for (let i = 0; i < n; i++){
      if (toSort[i] === -1 || i === skip) continue;
      indexCopy[i2] = i;
      valueCopy[i2++] = toSort[i];
    }
    indexCopy.length = i2;
    valueCopy.length = i2;
    indexCopy.sort((a, b) => toSort[a] - toSort[b]);
    valueCopy.sortIndices = indexCopy;
    for (let j = 0; j < i2; j++){
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
  function parseNewick(newick){
    let ancestors = [],
        tree = new Branch(),
        tokens = newick.split(/\s*(;|\(|\)|,|:)\s*/),
        n = tokens.length;
    for(let t = 0; t < n; t++){
      let token = tokens[t];
      let c;
      switch(token){
        case "(": // new Branchset
          c = tree.addChild();
          ancestors.push(tree);
          tree = c;
          break;
        case ",": // another Branch
          c = ancestors[ancestors.length-1].addChild();
          tree = c;
          break;
        case ")": // optional name next
          tree = ancestors.pop();
          break;
        case ":": // optional length next
          break;
        default:
          let x = tokens[t-1];
          if (x == ')' || x == '(' || x == ',') {
            tree.id = token;
          } else if (x == ':') {
            tree.length = parseFloat(token);
          }
      }
    }
    return tree.fixDistances();
  }

  exports.Branch = Branch;
  exports.parseJSON = parseJSON;
  exports.parseMatrix = parseMatrix;
  exports.parseNewick = parseNewick;
  exports.version = version;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
