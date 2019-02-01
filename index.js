 (function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], function(){ return (root.patristic = factory()) });
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.patristic = factory();
  }
}(typeof self !== 'undefined' ? self : this, function(){
  "use strict";

  /**
   * [Branch description]
   * @param       {[type]} data [description]
   * @constructor
   */
  function Branch(data){
    Object.assign(this, {
      id: '',
      parent: null,
      length: 0,
      children: []
    }, data);
  }

  /**
   * [description]
   * @param  {[type]} length [description]
   * @return {[type]}        [description]
   */
  Branch.prototype.setLength = function(length){
    this.length = length;
  };

  /**
   * [description]
   * @param  {[type]} data [description]
   * @return {[type]}      [description]
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
   * [description]
   * @param  {[type]} data     [description]
   * @param  {[type]} siblings [description]
   * @return {[type]}          [description]
   */
  Branch.prototype.addParent = function(data, siblings){
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
    return c;
  };

  /**
   * [description]
   * @param  {[type]} child [description]
   * @return {[type]}       [description]
   */
  Branch.prototype.hasChild = function(child){
    if(typeof child === "object") child = child.id;
    return this.children.includes(child);
  };

  /**
   * [description]
   * @param  {[type]} id [description]
   * @return {[type]}    [description]
   */
  Branch.prototype.getDescendant = function(id){
    let descendant;
    if(this.children){
      for(let i = 0; i < this.children.length; i++){
        let child = this.children[i];
        if(child.id === id){
          descendant = child;
          break;
        }
        if(child.children){
          descendant = child.getDescendant(id);
        }
      }
    }
    return descendant;
  };

  /**
   * [description]
   * @return {[type]} [description]
   */
  Branch.prototype.getDescendants = function(){
    let descendants = [];
    if(this.children.length > 0){
      this.children.forEach(child => {
        child.getDescendants().forEach(d => descendants.push(d));
      });
    } else {
      return [this];
    }
    return descendants;
  };

  /**
   * [description]
   * @param  {[type]} descendant [description]
   * @return {[type]}            [description]
   */
  Branch.prototype.hasDescendant = function(descendant){
    let any = false;
    let descendants = this.getDescendants();
    if(typeof descendant === 'object'){
      descendants.forEach(d => {
        if(d === descendant) any = true;
      });
    } else {
      descendants.forEach(d => {
        if(d.id === descendant) any = true;
      });
    }
    return any;
  };

  /**
   * [description]
   * @return {[type]} [description]
   */
  Branch.prototype.isRoot = function(){
    return this.parent === null;
  };

  /**
   * [description]
   * @return {[type]} [description]
   */
  Branch.prototype.getRoot = function(){
    let node = this;
    while(!node.isRoot()) node = node.parent;
    return node;
  };

  /**
   * [description]
   * @param  {[type]} parent [description]
   * @return {[type]}        [description]
   */
  Branch.prototype.isChildOf = function(parent){
    if(typeof parent === 'object'){
      return this.parent === parent;
    }
    return this.parent.id === parent;
  };

  /**
   * [description]
   * @param  {[type]} ancestor [description]
   * @return {[type]}          [description]
   */
  Branch.prototype.isDescendantOf = function(ancestor){
    if(!ancestor || !this.parent) return false;
    if(this.parent === ancestor || this.parent.id === ancestor) return true;
    return this.parent.isDescendantOf(ancestor);
  };

  /**
   * [description]
   * @param  {[type]} child [description]
   * @return {[type]}       [description]
   */
  Branch.prototype.depthOf = function(child){
    let distance = 0;
    if(typeof child === 'string') child = this.getDescendant(child);
    if(typeof child === 'undefined') return -1;
    let current = child;
    while(!current.isRoot()){
      if(current === this) break;
      distance += current.length;
      current = current.parent;
    }
    return distance;
  };

  /**
   * [description]
   * @param  {[type]} a [description]
   * @param  {[type]} b [description]
   * @return {[type]}   [description]
   */
  Branch.prototype.distanceBetween = function(a, b){
    let distance = -1;
    let descendants = this.getDescendants();
    if(typeof a == 'string') a = this.getDescendant(a);
    if(typeof b == 'string') b = this.getDescendant(b);
    if(descendants.includes(a) && descendants.includes(b)){
      let node = a;
      while(!b.isDescendantOf(node)) node = node.parent;
      distance = node.depthOf(a) + node.depthOf(b);
    }
    return distance;
  };

  /**
   * [description]
   * @return {[type]} [description]
   */
  Branch.prototype.remove = function(){
    let root = this.getRoot();
    this.isolate();
    return root;
  };

  /**
   * [description]
   * @return {[type]} [description]
   */
  Branch.prototype.isolate = function(){
    let index = this.parent.children.indexOf(this);
    this.parent.children.splice(index, 1);
    this.setParent(null);
    return this;
  };

  /**
   * [description]
   * @param  {[type]} parent [description]
   * @return {[type]}        [description]
   */
  Branch.prototype.setParent = function(parent){
    this.parent = parent;
    return this;
  };

  /**
   * [description]
   * @param  {boolean} nonrecursive [description]
   * @return {[type]}              [description]
   */
  Branch.prototype.fixParenthood = function(nonrecursive){
    this.children.forEach(child => {
      if(!child.parent) child.parent = this;
      if(child.parent !== this) child.parent = this;
      if(!nonrecursive && child.children.length > 0){
        child.fixParenthood();
      }
    });
  };

  /**
   * [description]
   * Note that this is largely adapted from Largely adapted from http://lh3lh3.users.sourceforge.net/knhx.js#kn_reroot
   * which is released for modification under the MIT License.
   * @return {[type]} [description]
   */
  Branch.prototype.reroot = function(){
    if(this.isRoot()) return this;
    let d, //d: previous distance p->d
        i, //i: previous position of q in p
        j,
        k,
  	    newRoot, //newRoot: the central multi-parent node
        s,
        newParent, //q: the new parent, previous a child of newRoot
        oldParent, //r: old parent
        tmp;
  	tmp = this.length;
    newRoot = this.parent;
  	newParent = new Branch();
  	newParent.addChild(this);
    i = newRoot.children.indexOf(this);
  	newParent.children[1] = newRoot;
  	d = newRoot.length;
  	newRoot.length = tmp;
  	oldParent = newRoot.parent;
  	newRoot.parent = newParent;
  	while(oldParent != null){
  		s = oldParent.parent; /* store r's parent */
  		newRoot.children[i] = oldParent; /* change r to p's child */
      i = oldParent.children.indexOf(newRoot);
  		oldParent.parent = newRoot; /* update r's parent */
  		tmp = oldParent.length;
      oldParent.length = d;
      d = tmp; /* swap r->d and d, i.e. update r->d */
  		newParent = newRoot;
      newRoot = oldParent;
      oldParent = s; /* update p, newParent and oldParent */
  	}
  	/* now newRoot is the root node */
  	if(newRoot.children.length == 2){ /* remove newRoot and link the other child of newRoot to newParent */
  		oldParent = newRoot.children[1 - i]; /* get the other child */
      i = newParent.children.indexOf(newRoot); /* the position of newRoot in newParent */
  		oldParent.length += newRoot.length;
  		oldParent.parent = newParent;
  		newParent.children[i] = oldParent; /* link oldParent to newParent */
  	} else { /* remove one child in newRoot */
  		for(j = k = 0; j < newRoot.children.length; ++j){
  			newRoot.children[k] = newRoot.children[j];
  			if(j != i) ++k;
  		}
  		--newRoot.children.length;
  	}
  	return newRoot;
  };

  /**
   * [description]
   * @return {[type]} [description]
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
   * [description]
   * @param  {[type]} sortfn [description]
   * @return {[type]}        [description]
   */
  Branch.prototype.reorder = function(sortfn){
    if(!sortfn) sortfn = function(a, b){
  		if (a.length < b.length) return 1;
  		if (a.length > b.length) return -1;
  		return String(a.id) < String(b.id)? -1 : String(a.id) > String(b.id)? 1 : 0;
  	};
  	let x = new Array();
  	let i, node = this.getRoot();
  	// get depth
  	node.depth = 0;
  	for(i = node.length - 2; i >= 0; --i){
  		let q = node[i];
  		q.depth = q.parent.depth + 1;
  		if (q.children.length == 0) x.push(q);
  	}
  	x.sort(sortfn);
  	for(i = 0; i < x.length; ++i) x[i].weight = i, x[i].n_tips = 1;
  	// set weight for internal nodes
  	for(i = 0; i < node.length; ++i){
  		let q = node[i];
  		if(q.children.length){ // internal
  			let j, n = 0, w = 0;
  			for(j = 0; j < q.children.length; ++j){
  				n += q.children[j].n_tips;
  				w += q.children[j].weight;
  			}
  			q.n_tips = n;
        q.weight = w;
  		}
  	}
  	// swap children
  	for(i = 0; i < node.length; ++i){
      if(node[i].children.length >= 2){
        node[i].children.sort(sortfn);
      }
    }
    return this;
  };

  /**
   * [description]
   * @return {[type]} [description]
   */
  Branch.prototype.toMatrix = function(){
    let descendants = this.getDescendants();
    let n = descendants.length;
    let matrix = new Array(n);
    for(let i = 0; i < n; i++){
      matrix[i] = new Array(n);
      matrix[i][i] = 0;
      for(let j = 0; j < i; j++){
        let distance = this.distanceBetween(descendants[i], descendants[j]);
        matrix[i][j] = distance;
        matrix[j][i] = distance;
      }
    }
    return matrix;
  };

  /**
   * [description]
   * @param  {[type]} nonterminus [description]
   * @return {[type]}             [description]
   */
  Branch.prototype.toNewick = function(nonterminus){
    let out = '';
    if(this.id === '') out += '(';
    else out += this.id;
    out += this.children.map(child => child.toNewick(true)).join(',');
    if(this.id === '') out += ')';
    if(this.length) out += ':' + numberToString(this.length);
    if(!nonterminus) out += ';'
    return out;
  };

  /**
   * [description]
   * @return {[type]} [description]
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
   * [description]
   * @return {[type]} [description]
   */
  Branch.prototype.toJSON = function(){
    return JSON.stringify(this.toObject());
  };

  function numberToString(num){
    let numStr = String(num);
    if(Math.abs(num) < 1.0){
      let e = parseInt(num.toString().split('e-')[1]);
      if(e){
        let negative = num < 0;
        if (negative) num *= -1
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
   * [description]
   * @param  {[type]} json          [description]
   * @param  {[type]} idLabel       [description]
   * @param  {[type]} lengthLabel   [description]
   * @param  {[type]} childrenLabel [description]
   * @return {[type]}               [description]
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
        root.addChild(patristic.parseJSON(child));
      });
    }
    return root;
  }

  /**
   * Parses a matrix of distances and returns the root Branch of the output tree
   * Note that this is adapted from Maciej Korzepa's neighbor-joining, which is
   * released for modification under the MIT License.
   * @param  {Array} matrix An array of n arrays of length n
   * @param  {Array} labels An array of strings corresponding to the values in matrix
   * @return {Branch} A Branch object representing the root node of the tree inferred by neighbor joining on matrix
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
    return tree;
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
    * Note that this is adapted Jason Davies' newick.js, which is released for
    * modification under the MIT License.
    * @param  {string} newick A Newick String
    * @return {Branch}        A Branch representing the root of the output
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
        case "(": // new branchset
          c = tree.addChild();
          ancestors.push(tree);
          tree = c;
          break;
        case ",": // another branch
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
    return tree;
  }

  return { Branch, parseJSON, parseMatrix, parseNewick };
}));
