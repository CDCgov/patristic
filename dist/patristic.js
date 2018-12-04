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

  patristic.parseNewick = function (newick) {
    var stack = [],
        tree = {},
        s = newick.split(/\s*(;|\(|\)|,|:)\s*/);

    for (var t = 0; t < s.length; t++) {
      var n = s[t];

      switch (n) {
        case "(":
          var c = {
            parent: tree
          };
          tree.children = [c];
          stack.push(tree);
          tree = c;
          break;

        case ",":
          var c = {
            parent: stack[stack.length - 1]
          };
          stack[stack.length - 1].children.push(c), tree = c;
          break;

        case ")":
          tree = stack.pop();
          break;

        case ":":
          break;

        default:
          var h = s[t - 1];
          ")" == h || "(" == h || "," == h ? tree.name = n : ":" == h && (tree.length = parseFloat(n));
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

  patristic.getLeafNames = function (tree) {
    return patristic.getLeaves(tree).map(function (l) {
      return l.name;
    });
  };

  patristic.isChildOf = function (root, leaf) {
    if (_typeof(leaf) === 'object') {
      return patristic.getLeaves(tree).includes(leaf);
    }

    if (typeof leaf === 'string') {
      return patristic.getLeafNames(root).includes(leaf);
    }

    return false;
  };

  patristic.depth = function (root, leaf) {
    var distance = 0;
    if (_typeof(leaf) === 'object') leaf = leaf.name;

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

  patristic.getLeaf = function (root, name) {
    if (root.name === name) return root;
    var response;

    for (var i = 0; i < root.children.length; i++) {
      var branch = root.children[i];
      if (branch.name === name) return branch;

      if (branch.children) {
        response = patristic.getLeaf(branch, name);
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

      if (patristic.isChildOf(root, b.name)) {
        distance = patristic.depth(root, a.name) + patristic.depth(root, b.name);
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
  }; // patristic.perl = function(tree){
  //   //record the distance of parentheses
  //   var dis = {};
  //   var par = -1;
  //   var current = [];
  //   var i = 0, n = tree.length;
  //   var numberMatcher = /(\d+\.\d+|\d+)/;
  //   while(i++ < n){
  //     var char = tree[i];
  //     if(char === '('){
  //       if(++par === 0) continue;
  //       current.push(par);
  //     } else if(char === ')'){
  //       if(current.length === -1) continue;
  //       dis['node_' + current.pop()] = 'foo';
  //     }
  //   }
  //
  //   //record the distance of leaves
  //   var order = [];
  //   var leaves = tree.match(/([^\(\):,]+):(\d+\.\d+|\d+)/g);
  //   leaves.forEach(leaf => {
  //     dis[$1] = $2;
  //     order.push($1);
  //   });
  //
  //   //record parents of leaves
  //   var pare = {};
  //   current = [];
  //   par = -1;
  //   while(tree =~ /(\(|\)|([^\(\):,]+):)/g){
  //     if($& == '('){
  //       if(++par == 0) continue;
  //       current.push(par);
  //     } else if($& == ')'){
  //       current.pop();
  //     } else {
  //       map {pare{$2}{$_} = 1} @current;
  //       pare{$2} = [@current];
  //     }
  //   }
  //
  //   //Distance matrix
  //   var dis2 = [];
  //   for(var i = 0; i < order.length; i++){
  //     dis2[i] = [];
  //     for(var j = i; j < order.length; j++){
  //       if(i == j){
  //         dis2[order[i]][order[j]] = 0;
  //       } else {
  //         var $tem = dis[order[i]] + dis[order[j]];
  //         var $tem2 = -1;
  //         foreach var $k (0..$#{pare{order[i]}}){
  //           last if($k > $#{pare{order[j]}});
  //           if(pare{order[i]}[$k] == pare{order[j]}[$k]){
  //             $tem2 = $k;
  //           }
  //         }
  //         if($#{pare{order[i]}} != -1){
  //           map {$tem += dis['node_'.$_]} map {pare{order[i]}[$_]} ($tem2+1)..$#{pare{order[i]}};
  //         }
  //         if($#{pare{order[j]}} != -1){
  //           map {$tem += dis['node_'.$_]} map {pare{order[j]}[$_]} ($tem2+1)..$#{pare{order[j]}};
  //         }
  //         dis2[order[i]][order[j]] = dis2[order[j]][order[i]] = $tem;
  //       }
  //     }
  //   }
  //   //output
  //   return dis2;
  // };


  return patristic;
});

