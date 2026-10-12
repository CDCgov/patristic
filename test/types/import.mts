import patristic, {
  Branch,
  parseJSON,
  parseMatrix,
  parseNewick,
  version,
  type BranchObject,
  type DistanceMatrix,
  type Id
} from "patristic";

const v: string = version;
const tree: Branch = parseNewick("(A:0.1,B:0.2,(C:0.3,D:0.4):0.5);");
const viaDefault: Branch = patristic.parseNewick("(A:1,B:1);");
const leaves: Branch[] = tree.getLeaves();
const child: Branch | undefined = tree.getChild("A");
const object: BranchObject = tree.toObject();
const fromJSON: Branch = parseJSON(object);
const { matrix, ids }: DistanceMatrix = tree.toMatrix();
const labels: Id[] = ids;
const nj: Branch = parseMatrix(matrix, labels);
const nj32: Branch = parseMatrix(matrix, null, { float32: true });
const bionj: Branch = parseMatrix(matrix, labels, { method: "bionj" });
// @ts-expect-error methods are "nj" or "bionj"
parseMatrix(matrix, labels, { method: "fast" });
const distance: number = leaves[0].distanceTo(leaves[1]);
// Methods that return the Branch they're called on chain.
const chained: Branch = tree
  .sort((a, b) => a.value - b.value)
  .eachBefore(b => b.depth)
  .fixDistances();
const parent: Branch | null = tree.parent;
const withData = new Branch({ id: 0, length: 1, color: "red" });
// Optional fields accept undefined, which means "use the default".
const defaults = new Branch({ id: undefined, length: undefined });

// @ts-expect-error parseNewick takes a string
parseNewick(42);
// @ts-expect-error a parent must be a Branch or null
tree.setParent({});
// @ts-expect-error toNewick returns a string
const notANumber: number = tree.toNewick();

export {};
