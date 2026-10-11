const patristic = require("../dist/patristic");
const { matrices } = require("./nj-fixtures");
const golden = require("./nj-golden.json");
if (!test) test = require("jest");

// parseMatrix's output on these matrices was recorded from the original
// implementation (test/nj-golden.json). Rewrites of neighbor joining must
// reproduce it exactly: the same joins, the same tie-breaking and the same
// floating point arithmetic.
describe("parseMatrix reproduces its recorded output", () => {
  for (let [name, matrix] of Object.entries(matrices())) {
    test(name, () => {
      expect(patristic.parseMatrix(matrix).toNewick()).toBe(golden[name]);
    });
  }
});
