var patristic = require('../index');
var D = [
    [0,  5,  9,  9, 8],
    [5,  0, 10, 10, 9],
    [9, 10,  0,  8, 7],
    [9, 10,  8,  0, 3],
    [8,  9,  7,  3, 0]
];
var labels = ['A', 'B', 'C', 'D', 'E'];
var tree = patristic.parseMatrix(D, labels);
