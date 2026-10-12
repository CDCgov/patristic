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
  test("reads the label of a tree that's a single Branch", () => {
    expect(summary("A;")).toEqual([["A", 0]]);
    expect(summary("A:2;")).toEqual([["A", 2]]);
  });

  test("stops at the end of the tree", () => {
    expect(summary("(A:1,B:2);(C,D);")).toEqual(summary("(A:1,B:2);"));
  });
});

describe("quoted labels", () => {
  test("may contain punctuation, brackets and spaces", () => {
    expect(
      summary("('Homo sapiens':1,'a,b:c;(d)':2,'[not a comment]':3,' A ':4);")
    ).toEqual([
      ["", 0],
      ["Homo sapiens", 1],
      ["a,b:c;(d)", 2],
      ["[not a comment]", 3],
      [" A ", 4]
    ]);
  });

  test("escape quotes by doubling them", () => {
    expect(summary("('O''Brien':1,\"say \"\"hi\"\"\":2);")).toEqual([
      ["", 0],
      ["O'Brien", 1],
      ['say "hi"', 2]
    ]);
  });

  test("label internal Branches and roots", () => {
    expect(summary("(('A',B)'clade one':1)'the root';")).toEqual([
      ["the root", 0],
      ["clade one", 1],
      ["A", 0],
      ["B", 0]
    ]);
  });
});

describe("comments", () => {
  test("are skipped wherever they appear", () => {
    expect(
      summary("[start](A[c1]:1[c2],B:[c3]2,[c4]C)[root]:[c5]3[end];")
    ).toEqual([
      ["", 3],
      ["A", 1],
      ["B", 2],
      ["C", 0]
    ]);
  });
});

describe("malformed Newick", () => {
  test.each([
    ["(A,B", "missing ')'"],
    ["((A,B);", "missing ')'"],
    ["(A,B));", "')' without a matching '('"],
    ["A,B;", "',' outside parentheses"],
    ["('A:1,B);", "unterminated quoted label"],
    ["(A[comment,B);", "unterminated comment"]
  ])("%s throws a SyntaxError", (newick, message) => {
    expect(() => patristic.parseNewick(newick)).toThrow(SyntaxError);
    expect(() => patristic.parseNewick(newick)).toThrow(message);
  });
});

describe("toNewick quoting", () => {
  test("quotes labels that need it, doubling quotes inside them", () => {
    let t = patristic.parseNewick("(A:1,B:2,C:3,D:4,E:5,F:6)R;");
    let ids = ["O'Brien", "Homo sapiens", "a,b:c;(d)", "[x]", ' "q" ', "plain_id"];
    t.children.forEach((b, i) => (b.id = ids[i]));
    expect(t.toNewick()).toBe(
      `('O''Brien':1,'Homo sapiens':2,'a,b:c;(d)':3,'[x]':4,' "q" ':5,plain_id:6)R;`
    );
  });

  test("round-trips any label", () => {
    let ids = ["O'Brien", "a b", "x,y", "(z)", "''", "[c]", "tab\there", "1:2", 0, ""];
    let t = new patristic.Branch();
    ids.forEach((id, i) => t.addChild({ id, length: i + 1 }));
    let back = patristic.parseNewick(t.toNewick());
    expect(back.children.map(b => b.id)).toEqual(ids.map(String));
    expect(back.toNewick()).toBe(t.toNewick());
  });
});
