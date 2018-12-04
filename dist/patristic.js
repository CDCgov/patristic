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

  var patristic = {};

  function Branch(data) {
    Object.assign(this, {
      id: '',
      parent: null,
      children: []
    }, data);
  }

  Object.assign(Branch.prototype, {
    addChild: function addChild(data) {
      var c = new Branch(Object.assign({
        parent: this
      }, data));
      this.children.push(c);
      return c;
    },
    hasChild: function hasChild(child) {
      if (_typeof(child) === "object") child = child.id;
      return this.children.includes(child);
    },
    getDescendant: function getDescendant(id) {
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
    },
    getDescendants: function getDescendants() {
      var _this = this;

      if (this.descendants) return this.descendants;
      this.descendants = [];

      if (this.children.length > 0) {
        this.children.forEach(function (child) {
          _this.descendants = _this.descendants.concat(child.getDescendants());
        });
      } else {
        this.descendants.push(this);
      }

      return this.descendants;
    },
    hasDescendant: function hasDescendant(descendant) {
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
    },
    isRoot: function isRoot() {
      return this.parent === null;
    },
    isChildOf: function isChildOf(parent) {
      if (_typeof(parent) === 'object') {
        return this.parent === parent;
      }

      return this.parent.id === parent;
    },
    isDescendedFrom: function isDescendedFrom(ancestor) {
      if (!ancestor || !this.parent) return false;
      if (this.parent === ancestor || this.parent.id === ancestor) return true;
      return this.parent.isDescendedFrom(ancestor);
    },
    isDescendantOf: function isDescendantOf(ancestor) {
      return this.isDescendedFrom(ancestor);
    },
    depthOf: function depthOf(child) {
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
    },
    distanceBetween: function distanceBetween(a, b) {
      var distance = -1;
      var descendants = this.getDescendants();
      if (typeof a == 'string') a = patristic.getLeaf(tree, a);
      if (typeof b == 'string') b = patristic.getLeaf(tree, b);

      if (descendants.includes(a) && descendants.includes(b)) {
        var node = a;

        while (!b.isDescendedFrom(node)) {
          node = node.parent;
        }

        distance = node.depthOf(a) + node.depthOf(b);
      }

      return distance;
    },
    toMatrix: function toMatrix() {
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
    }
  });

  patristic.parseNewick = function (newick) {
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

  patristic.getLeaves = function (tree) {
    var leaves = [];

    if (tree.children) {
      tree.children.forEach(function (branch) {
        leaves = leaves.concat(patristic.getLeaves(branch));
      });
    } else {
      leaves.push(tree);
    }

    return leaves;
  };

  patristic.getleafIDs = function (tree) {
    return patristic.getLeaves(tree).map(function (l) {
      return l.id;
    });
  };

  patristic.isChildOf = function (root, leaf) {
    if (_typeof(leaf) === 'object') {
      return patristic.getLeaves(tree).includes(leaf);
    }

    if (typeof leaf === 'string') {
      return patristic.getleafIDs(root).includes(leaf);
    }

    return false;
  };

  patristic.depth = function (root, leaf) {
    var distance = 0;
    if (_typeof(leaf) === 'object') leaf = leaf.id;

    if (root.children) {
      root.children.forEach(function (branch) {
        if (patristic.isChildOf(branch, leaf)) {
          distance += branch.length;
          distance += patristic.depth(branch, leaf);
        }
      });
    }

    return distance;
  };

  patristic.getLeaf = function (root, id) {
    if (root.id === id) return root;
    var response;

    for (var i = 0; i < root.children.length; i++) {
      var branch = root.children[i];
      if (branch.id === id) return branch;

      if (branch.children) {
        response = patristic.getLeaf(branch, id);
        if (response) break;
      }
    }

    return response;
  };

  patristic.distanceBetween = function (tree, a, b) {
    var distance = -1;
    if (typeof a == 'string') a = patristic.getLeaf(tree, a);
    if (typeof b == 'string') b = patristic.getLeaf(tree, b);
    var root = a;

    while (root.parent) {
      root = root.parent;

      if (patristic.isChildOf(root, b.id)) {
        distance = patristic.depth(root, a.id) + patristic.depth(root, b.id);
        break;
      }
    }

    return distance;
  };

  patristic.computeMatrix = function (text) {
    var tree = patristic.parseNewick(text);
    var leaves = patristic.getLeaves(tree);
    var n = leaves.length;
    var matrix = new Array(n);

    for (var i = 0; i < n; i++) {
      matrix[i] = new Array(n);
      matrix[i][i] = 0;

      for (var j = 0; j < i; j++) {
        var distance = patristic.distanceBetween(tree, leaves[i], leaves[j]);
        matrix[i][j] = distance;
        matrix[j][i] = distance;
      }
    }

    return matrix;
  };

  return patristic;
});

