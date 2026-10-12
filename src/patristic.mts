// The entry point of the ES module build. It has the same named exports as the
// UMD build, and a default export holding all of them, so that
// `import patristic from "patristic"` keeps working as it did when the
// package was CommonJS only.
export * from "./patristic.js";
import * as patristic from "./patristic.js";
export default patristic;
