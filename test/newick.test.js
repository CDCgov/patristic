const patristic = require("../dist/patristic");
if (!test) test = require("jest");

// Ids and lengths of a parsed tree's Branches, in pre-order.
const summary = newick =>
  patristic
    .parseNewick(newick)
    .descendants()
    .map(b => [b.id, b.length]);

describe("parseNewick on valid input", () => {
  test("ignores whitespace around punctuation, including newlines and tabs", () => {
    expect(summary("( A : 1 , B : 2 ) R ;")).toEqual([
      ["R", 0],
      ["A", 1],
      ["B", 2]
    ]);
    expect(summary("(\nA:1,\n\tB:2\n);")).toEqual(summary("(A:1,B:2);"));
  });

  test("keeps spaces inside and underscores in unquoted labels", () => {
    expect(summary("(A B:1,C_D:2);")).toEqual([
      ["", 0],
      ["A B", 1],
      ["C_D", 2]
    ]);
  });

  test("accepts a missing semicolon, empty labels and empty lengths", () => {
    expect(summary("(A:1,B:2)")).toEqual(summary("(A:1,B:2);"));
    expect(summary("(,):1;")).toEqual([
      ["", 1],
      ["", 0],
      ["", 0]
    ]);
    expect(summary("((A,B),C);")).toEqual([
      ["", 0],
      ["", 0],
      ["A", 0],
      ["B", 0],
      ["C", 0]
    ]);
    expect(summary("")).toEqual([["", 0]]);
  });

  test("reads lengths in any JavaScript number format", () => {
    expect(summary("(A:1e-3,B:-2,C:.5,D:+4);")).toEqual([
      ["", 0],
      ["A", 0.001],
      ["B", -2],
      ["C", 0.5],
      ["D", 4]
    ]);
  });

  test("round-trips its own output", () => {
    let newick = "((A:0.1,B:0.2)X:0.3,(C:1e-7,D:4)Y:5,E)R;";
    expect(patristic.parseNewick(newick).toNewick()).toBe(
      "((A:0.1,B:0.2)X:0.3,(C:0.0000001,D:4)Y:5,E)R;"
    );
  });
});

describe("parseNewick bugs", () => {
  test.failing("reads the label of a tree that's a single Branch", () => {
    expect(summary("A;")).toEqual([["A", 0]]);
    expect(summary("A:2;")).toEqual([["A", 2]]);
  });

  test.failing("stops at the end of the tree", () => {
    expect(summary("(A:1,B:2);(C,D);")).toEqual(summary("(A:1,B:2);"));
  });
});
