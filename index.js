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

  function Branch(data){
    Object.assign(this, {
      id: '',
      parent: null,
      children: []
    }, data);
  }

  Branch.prototype.addChild = function(data){
    if(!data) data = {};
    let c = new Branch(Object.assign(data, {
      parent: this
    }));
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
    if(this.descendants) return this.descendants;
    this.descendants = [];
    if(this.children.length > 0){
      this.children.forEach(child => {
        this.descendants = this.descendants.concat(child.getDescendants());
      });
    } else {
      return [this];
    }
    return this.descendants;
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

  return {
    branch: Branch,
    parseNewick: parseNewick
  };
}));
