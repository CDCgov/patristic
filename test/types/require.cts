import patristic = require("patristic");

const tree: patristic.Branch = patristic.parseNewick("(A:1,B:1);");
const leaves: patristic.Branch[] = tree.leaves();
const id: patristic.Id = leaves[0].id;

// @ts-expect-error parseMatrix needs a matrix
patristic.parseMatrix();

export {};
