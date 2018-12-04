(function (root, patristic) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define([], function(){
      return (root.patristic = patristic());
    });
  } else if (typeof module === 'object' && module.exports) {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = patristic();
  } else {
    // Browser globals
    root.patristic = patristic();
  }
}(typeof self !== 'undefined' ? self : this, function(){
  "use strict";

  let patristic = {};

  function Branch(data){
    Object.assign(this, {
      id: '',
      parent: null,
      children: []
    }, data);
  }

  Object.assign(Branch.prototype, {
    addChild: function(data){
      var c = new Branch(Object.assign({
        parent: this
      }, data));
      this.children.push(c);
      return c;
    },
    hasChild: function(child){
      if(typeof child === "object") child = child.id;
      return this.children.includes(child);
    },
    getDescendant: function(id){
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
    },
    getDescendants: function(){
      if(this.descendants) return this.descendants;
      this.descendants = [];
      if(this.children.length > 0){
        this.children.forEach(child => {
          this.descendants = this.descendants.concat(child.getDescendants());
        });
      } else {
        this.descendants.push(this);
      }
      return this.descendants;
    },
    hasDescendant: function(descendant){
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
    },
    isRoot: function(){
      return this.parent === null;
    },
    isChildOf: function(parent){
      if(typeof parent === 'object'){
        return this.parent === parent;
      }
      return this.parent.id === parent;
    },
    isDescendedFrom: function(ancestor){
      if(!ancestor || !this.parent) return false;
      if(this.parent === ancestor || this.parent.id === ancestor) return true;
      return this.parent.isDescendedFrom(ancestor);
    },
    isDescendantOf: function(ancestor){
      return this.isDescendedFrom(ancestor);
    },
    depthOf: function(child){
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
    },
    distanceBetween: function(a, b){
      let distance = -1;
      let descendants = this.getDescendants();
      if(typeof a == 'string') a = patristic.getLeaf(tree, a);
      if(typeof b == 'string') b = patristic.getLeaf(tree, b);
      if(descendants.includes(a) && descendants.includes(b)){
        let node = a;
        while(!b.isDescendedFrom(node)) node = node.parent;
        distance = node.depthOf(a) + node.depthOf(b);
      }
      return distance;
    },
    toMatrix: function(){
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
    }
  });

  patristic.parseNewick = function(newick){
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

  patristic.getLeaves = function(tree){
    let leaves = [];
    if(tree.children){
      tree.children.forEach(branch => {
        leaves = leaves.concat(patristic.getLeaves(branch));
      });
    } else {
      leaves.push(tree);
    }
    return leaves;
  };

  patristic.getleafIDs = function(tree){
    return patristic.getLeaves(tree).map(l => l.id);
  };

  patristic.isChildOf = function(root, leaf){
    if(typeof leaf === 'object'){
      return patristic.getLeaves(tree).includes(leaf);
    }
    if(typeof leaf === 'string'){
      return patristic.getleafIDs(root).includes(leaf);
    }
    return false;
  };

  patristic.depth = function(root, leaf){
    let distance = 0;
    if(typeof leaf === 'object') leaf = leaf.id;
    if(root.children){
      root.children.forEach(branch => {
        if(patristic.isChildOf(branch, leaf)){
          distance += branch.length;
          distance += patristic.depth(branch, leaf);
        }
      });
    }
    return distance;
  };

  patristic.getLeaf = function(root, id){
    if(root.id === id) return root;
    let response;
    for(let i = 0; i < root.children.length; i++){
      let branch = root.children[i];
      if(branch.id === id) return branch;
      if(branch.children){
        response = patristic.getLeaf(branch, id);
        if(response) break;
      }
    }
    return response;
  };

  patristic.distanceBetween = function(tree, a, b){
    let distance = -1;
    if(typeof a == 'string') a = patristic.getLeaf(tree, a);
    if(typeof b == 'string') b = patristic.getLeaf(tree, b);
    let root = a;
    while(root.parent){
      root = root.parent;
      if(patristic.isChildOf(root, b.id)){
        distance = patristic.depth(root, a.id) + patristic.depth(root, b.id);
        break;
      }
    }
    return distance;
  };

  patristic.computeMatrix = function(text){
    let tree = patristic.parseNewick(text);
    let leaves = patristic.getLeaves(tree);
    let n = leaves.length;
    let matrix = new Array(n);
    for(let i = 0; i < n; i++){
      matrix[i] = new Array(n);
      matrix[i][i] = 0;
      for(let j = 0; j < i; j++){
        let distance = patristic.distanceBetween(tree, leaves[i], leaves[j]);
        matrix[i][j] = distance;
        matrix[j][i] = distance;
      }
    }
    return matrix;
  };

  return patristic;
}));
