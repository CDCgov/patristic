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

  function parseMatrix(matrix, labels){
    if(!labels) labels = [...Array(5).keys()];
    let that = {};
    let N = that.N = labels.length;
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

    var tree = new Branch({children: [node1, node2]});
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
    var n = toSort.length;
    var indexCopy = new Array(n);
    var valueCopy = new Array(n);
    var i2 = 0;
    for (var i = 0; i < n; i++){
      if (toSort[i] === -1 || i === skip) continue;
      indexCopy[i2] = i;
      valueCopy[i2++] = toSort[i];
    }
    indexCopy.length = i2;
    valueCopy.length = i2;
    indexCopy.sort((a, b) => toSort[a] - toSort[b]);
    valueCopy.sortIndices = indexCopy;
    for (var j = 0; j < i2; j++){
      valueCopy[j] = toSort[indexCopy[j]];
    }
    return valueCopy;
  }

  function Branch(data){
    Object.assign(this, {
      id: '',
      parent: null,
      length: 0,
      children: []
    }, data);
  }

  Branch.prototype.setLength = function(length){
    this.length = length;
  };

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

  Branch.prototype.hasChild = function(child){
    if(typeof child === "object") child = child.id;
    return this.children.includes(child);
  };

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

  Branch.prototype.isRoot = function(){
    return this.parent === null;
  };

  Branch.prototype.getRoot = function(){
    var node = this;
    while(!node.isRoot()) node = node.parent;
    return node;
  };

  Branch.prototype.isChildOf = function(parent){
    if(typeof parent === 'object'){
      return this.parent === parent;
    }
    return this.parent.id === parent;
  };

  Branch.prototype.isDescendantOf = function(ancestor){
    if(!ancestor || !this.parent) return false;
    if(this.parent === ancestor || this.parent.id === ancestor) return true;
    return this.parent.isDescendantOf(ancestor);
  };

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

  Branch.prototype.remove = function(){
    var index = this.parent.children.indexOf(this);
    this.parent.children.splice(index, 1);
    this.parent = null;
    return this;
  };

  Branch.prototype.fixParenthood = function(nonrecursive){
    this.children.forEach(child => {
      if(!child.parent) child.parent = this;
      if(!nonrecursive && child.children.length > 0){
        child.fixParenthood();
      }
    });
  };

  //Largely adapted from http://lh3lh3.users.sourceforge.net/knhx.js#kn_reroot
  Branch.prototype.reroot = function(){
    if(this.isRoot()) return this;
    var d, //d: previous distance p->d
        i, //i: previous position of q in p
        j,
        k,
  	    p, //p: the central multi-parent node
        s,
        newParent, //q: the new parent, previous a child of p
        oldParent, //r: old parent
        tmp;
  	tmp = this.length;
    p = this.parent;
  	newParent = new Branch();
  	newParent.addChild(this);
    i = p.children.indexOf(this);
  	newParent.children[1] = p;
  	d = p.length;
  	p.length = tmp;
  	oldParent = p.parent;
  	p.parent = newParent;
  	while(oldParent != null){
  		s = oldParent.parent; /* store r's parent */
  		p.children[i] = oldParent; /* change r to p's child */
      i = oldParent.children.indexOf(p);
  		oldParent.parent = p; /* update r's parent */
  		tmp = oldParent.length;
      oldParent.length = d;
      d = tmp; /* swap r->d and d, i.e. update r->d */
  		newParent = p;
      p = oldParent;
      oldParent = s; /* update p, newParent and oldParent */
  	}
  	/* now p is the root node */
  	if(p.children.length == 2){ /* remove p and link the other child of p to newParent */
  		oldParent = p.children[1 - i]; /* get the other child */
      i = newParent.children.indexOf(p); /* the position of p in newParent */
  		oldParent.length += p.length;
  		oldParent.parent = newParent;
  		newParent.children[i] = oldParent; /* link oldParent to newParent */
  	} else { /* remove one child in p */
  		for(j = k = 0; j < p.children.length; ++j){
  			p.children[k] = p.children[j];
  			if(j != i) ++k;
  		}
  		--p.children.length;
  	}
  	return p;
  };

  Branch.prototype.reorder = function(sortfn){
    if(!sortfn) sortfn = function(a, b){
  		if (a.length < b.length) return 1;
  		if (a.length > b.length) return -1;
  		return String(a.id) < String(b.id)? -1 : String(a.id) > String(b.id)? 1 : 0;
  	};
  	var x = new Array();
  	var i, node = this.getRoot();
  	// get depth
  	node.depth = 0;
  	for(i = node.length - 2; i >= 0; --i){
  		var q = node[i];
  		q.depth = q.parent.depth + 1;
  		if (q.children.length == 0) x.push(q);
  	}
  	x.sort(sortfn);
  	for(i = 0; i < x.length; ++i) x[i].weight = i, x[i].n_tips = 1;
  	// set weight for internal nodes
  	for(i = 0; i < node.length; ++i){
  		var q = node[i];
  		if(q.children.length){ // internal
  			var j, n = 0, w = 0;
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

  Branch.prototype.toNewick = function(nonterminus){
    var out = '';
    if(this.id === '') out += '(';
    else out += this.id;
    out += this.children.map(child => child.toNewick(true)).join(',');
    if(this.id === '') out += ')';
    if(this.length) out += ':' + numberToString(this.length);
    if(!nonterminus) out += ';'
    return out;
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

  let parseNewick = function(newick){
    let stack = [],
        tree = new Branch(),
        s = newick.split(/\s*(;|\(|\)|,|:)\s*/);
    for(let t = 0; t < s.length; t++){
      let n = s[t];
      let c;
      switch(n){
        case "(":
          c = tree.addChild();
          stack.push(tree);
          tree = c;
          break;
        case ",":
          c = stack[stack.length-1].addChild();
          tree = c;
          break;
        case ")":
          tree = stack.pop();
          break;
        case ":":
          break;
        default:
          let h = s[t-1];
          ")" == h || "(" == h || "," == h ? tree.id = n : ":" == h && (tree.length = parseFloat(n));
      }
    }
    return tree;
  };

  return { Branch, parseMatrix, parseNewick };
}));
