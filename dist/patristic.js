"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

(function (root, patristic) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define([], function () {
      return root.patristic = patristic();
    });
  } else if ((typeof module === "undefined" ? "undefined" : _typeof(module)) === 'object' && module.exports) {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = patristic();
  } else {
    // Browser globals
    root.patristic = patristic();
  }
})(typeof self !== 'undefined' ? self : void 0, function () {
  "use strict";

  function Branch(data) {
    Object.assign(this, {
      id: '',
      parent: null,
      children: []
    }, data);
  }

  Branch.prototype.addChild = function (data) {
    var c;

    if (data instanceof Branch) {
      c = data;
      c.parent = this;
    } else {
      if (!data) data = {};
      c = new Branch(Object.assign(data, {
        parent: this
      }));
    }

    this.children.push(c);
    return c;
  };

  Branch.prototype.hasChild = function (child) {
    if (_typeof(child) === "object") child = child.id;
    return this.children.includes(child);
  };

  Branch.prototype.getDescendant = function (id) {
    var descendant;

    if (this.children) {
      for (var i = 0; i < this.children.length; i++) {
        var child = this.children[i];

        if (child.id === id) {
          descendant = child;
          break;
        }

        if (child.children) {
          descendant = child.getDescendant(id);
        }
      }
    }

    return descendant;
  };

  Branch.prototype.getDescendants = function () {
    var _this = this;

    if (this.descendants) return this.descendants;
    this.descendants = [];

    if (this.children.length > 0) {
      this.children.forEach(function (child) {
        _this.descendants = _this.descendants.concat(child.getDescendants());
      });
    } else {
      return [this];
    }

    return this.descendants;
  };

  Branch.prototype.hasDescendant = function (descendant) {
    var any = false;
    var descendants = this.getDescendants();

    if (_typeof(descendant) === 'object') {
      descendants.forEach(function (d) {
        if (d === descendant) any = true;
      });
    } else {
      descendants.forEach(function (d) {
        if (d.id === descendant) any = true;
      });
    }

    return any;
  };

  Branch.prototype.isRoot = function () {
    return this.parent === null;
  };

  Branch.prototype.isChildOf = function (parent) {
    if (_typeof(parent) === 'object') {
      return this.parent === parent;
    }

    return this.parent.id === parent;
  };

  Branch.prototype.isDescendantOf = function (ancestor) {
    if (!ancestor || !this.parent) return false;
    if (this.parent === ancestor || this.parent.id === ancestor) return true;
    return this.parent.isDescendantOf(ancestor);
  };

  Branch.prototype.depthOf = function (child) {
    var distance = 0;
    if (typeof child === 'string') child = this.getDescendant(child);
    if (typeof child === 'undefined') return -1;
    var current = child;

    while (!current.isRoot()) {
      if (current === this) break;
      distance += current.length;
      current = current.parent;
    }

    return distance;
  };

  Branch.prototype.distanceBetween = function (a, b) {
    var distance = -1;
    var descendants = this.getDescendants();
    if (typeof a == 'string') a = this.getDescendant(a);
    if (typeof b == 'string') b = this.getDescendant(b);

    if (descendants.includes(a) && descendants.includes(b)) {
      var node = a;

      while (!b.isDescendantOf(node)) {
        node = node.parent;
      }

      distance = node.depthOf(a) + node.depthOf(b);
    }

    return distance;
  };

  Branch.prototype.remove = function () {
    var index = this.parent.children.indexOf(this);
    this.parent.children.splice(index, 1);
    this.parent = null;
    return this;
  };

  Branch.prototype.reroot = function () {
    if (this.isRoot()) return this;
    var d, //d: previous distance p->d
    i, //i: previous position of q in p
    j, k, p, //p: the central multi-parent node
    s, newParent, //q: the new parent, previous a child of p
    oldParent, //r: old parent
    tmp; //if(dist < 0.0 || dist > node.length) dist = node.length / 2.0;

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

    while (oldParent != null) {
      s = oldParent.parent;
      /* store r's parent */

      p.children[i] = oldParent;
      /* change r to p's child */

      i = oldParent.children.indexOf(p);
      oldParent.parent = p;
      /* update r's parent */

      tmp = oldParent.length;
      oldParent.length = d;
      d = tmp;
      /* swap r->d and d, i.e. update r->d */

      newParent = p;
      p = oldParent;
      oldParent = s;
      /* update p, newParent and oldParent */
    }
    /* now p is the root node */


    if (p.children.length == 2) {
      /* remove p and link the other child of p to newParent */
      oldParent = p.children[1 - i];
      /* get the other child */

      i = newParent.children.indexOf(p);
      /* the position of p in newParent */

      oldParent.length += p.length;
      oldParent.parent = newParent;
      newParent.children[i] = oldParent;
      /* link oldParent to newParent */
    } else {
      /* remove one child in p */
      for (j = k = 0; j < p.children.length; ++j) {
        p.children[k] = p.children[j];
        if (j != i) ++k;
      }

      --p.children.length;
    }

    var node = p;

    while (!node.isRoot()) {
      node = node.parent;
    }

    return node;
  };

  Branch.prototype.toMatrix = function () {
    var descendants = this.getDescendants();
    var n = descendants.length;
    var matrix = new Array(n);

    for (var i = 0; i < n; i++) {
      matrix[i] = new Array(n);
      matrix[i][i] = 0;

      for (var j = 0; j < i; j++) {
        var distance = this.distanceBetween(descendants[i], descendants[j]);
        matrix[i][j] = distance;
        matrix[j][i] = distance;
      }
    }

    return matrix;
  };

  Branch.prototype.toNewick = function (nonterminus) {
    var out = '';
    if (this.id === '') out += '(';else out += this.id;
    out += this.children.map(function (child) {
      return child.toNewick(true);
    }).join(',');
    if (this.id === '') out += ')';
    if (this.length) out += ':' + numberToString(this.length);
    if (!nonterminus) out += ';';
    return out;
  };

  function numberToString(num) {
    var numStr = String(num);

    if (Math.abs(num) < 1.0) {
      var e = parseInt(num.toString().split('e-')[1]);

      if (e) {
        var negative = num < 0;
        if (negative) num *= -1;
        num *= Math.pow(10, e - 1);
        numStr = '0.' + new Array(e).join('0') + num.toString().substring(2);
        if (negative) numStr = "-" + numStr;
      }
    } else {
      var _e = parseInt(num.toString().split('+')[1]);

      if (_e > 20) {
        _e -= 20;
        num /= Math.pow(10, _e);
        numStr = num.toString() + new Array(_e + 1).join('0');
      }
    }

    return numStr;
  }

  var parseNewick = function parseNewick(newick) {
    var stack = [],
        tree = new Branch(),
        s = newick.split(/\s*(;|\(|\)|,|:)\s*/);

    for (var t = 0; t < s.length; t++) {
      var n = s[t];
      var c = void 0;

      switch (n) {
        case "(":
          c = tree.addChild();
          stack.push(tree);
          tree = c;
          break;

        case ",":
          c = stack[stack.length - 1].addChild();
          tree = c;
          break;

        case ")":
          tree = stack.pop();
          break;

        case ":":
          break;

        default:
          var h = s[t - 1];
          ")" == h || "(" == h || "," == h ? tree.id = n : ":" == h && (tree.length = parseFloat(n));
      }
    }

    return tree;
  };

  return {
    branch: Branch,
    parseNewick: parseNewick
  };
});

