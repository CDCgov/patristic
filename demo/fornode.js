const patristic = require('../dist/patristic');

const matrix = [
    [0,  5,  9,  9, 8],
    [5,  0, 10, 10, 9],
    [9, 10,  0,  8, 7],
    [9, 10,  8,  0, 3],
    [8,  9,  7,  3, 0]
];
const labels = ['A', 'B', 'C', 'D', 'E'];

let tree = patristic.parseMatrix(matrix, labels);
