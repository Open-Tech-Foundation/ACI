import { openBrain } from "/media/G/WD_LINUX_FILES/projects/g/ACI/src/index.js";
const { brain, forget } = openBrain("sqlite::memory:");

function kind(root, k) {
  return (root.branch || []).find((b) => b.kind === k) || null;
}

function dumpNode(n, indent = 0) {
  const pad = "  ".repeat(indent);
  const branchKinds = (n.branch || []).map((b) => `${b.kind}:${b.name}`).join(", ");
  console.log(`${pad}${n.kind}:${n.name} branch=[${branchKinds}]`);
  if (n.state?.identity) console.log(`${pad}  identity: ${n.state.identity}`);
  if (n.state?.says) console.log(`${pad}  says: ${n.state.says}`);
  if (n.state?.concept != null) console.log(`${pad}  concept: ${n.state.concept}`);
  if (n.state?.thought) console.log(`${pad}  thought: ${JSON.stringify(n.state.thought)}`);
  if (n.state?.bound != null) console.log(`${pad}  bound: ${n.state.bound}`);
  if (n.state?.mood) console.log(`${pad}  mood: ${n.state.mood}`);
  if (n.state?.subject != null) console.log(`${pad}  subject: ${n.state.subject}`);
  if (n.state?.relation != null) console.log(`${pad}  relation: ${n.state.relation}`);
  if (n.state?.object != null) console.log(`${pad}  object: ${n.state.object}`);
  if (n.state?.negated != null) console.log(`${pad}  negated: ${n.state.negated}`);
  if (n.state?.found) console.log(`${pad}  found: ${JSON.stringify(n.state.found)}`);
  if (n.state?.members != null) console.log(`${pad}  members: ${n.state.members}`);
  if (n.state?.total != null) console.log(`${pad}  total: ${n.state.total}`);
  if (n.state?.left != null) console.log(`${pad}  left: ${n.state.left}`);
  if (n.state?.right != null) console.log(`${pad}  right: ${n.state.right}`);
  if (n.state?.value != null) console.log(`${pad}  value: ${n.state.value}`);
  if (n.state?.term != null) console.log(`${pad}  term: ${n.state.term}`);
  if (n.state?.matches) console.log(`${pad}  matches: ${JSON.stringify(n.state.matches)}`);
  if (n.state?.quantity != null) console.log(`${pad}  quantity: ${n.state.quantity}`);
  if (n.state?.made != null) console.log(`${pad}  made: ${n.state.made}`);
  if (n.state?.not != null) console.log(`${pad}  not: ${n.state.not}`);
  for (const child of (n.branch || [])) {
    dumpNode(child, indent + 1);
  }
}

function traceDecision(result, input) {
  const r = result;
  console.log(`\n${"=".repeat(70)}`);
  console.log(`INPUT: "${input}"`);
  console.log(`${"=".repeat(70)}`);

  // Root info
  console.log(`\n--- ROOTS (${r.roots.length}) ---`);
  for (let i = 0; i < r.roots.length; i++) {
    const root = r.roots[i];
    console.log(`  root[${i}] kind=${root.kind} name=${root.name}`);
    if (root.state?.identity) console.log(`    identity: ${root.state.identity}`);
    const lang = kind(root, "language");
    if (lang) console.log(`    language: ${JSON.stringify(lang.state)}`);
    const thought = kind(root, "thought");
    if (thought) console.log(`    thought: ${JSON.stringify(thought.state.thought)}`);
    const entity = kind(root, "entity");
    if (entity) console.log(`    entity: ${entity.name} (concept: ${entity.state.concept})`);
  }

  // Expression
  console.log(`\n--- EXPRESSION ---`);
  console.log(`  name: ${r.expression.name}`);
  console.log(`  says: ${r.expression.state.says}`);
  console.log(`  mood: ${r.expression.state.mood}`);
  if (r.expression.state.bound != null) console.log(`  bound: ${r.expression.state.bound}`);

  // Special nodes on roots
  const specialKinds = ["standing", "answer", "learn", "refuse", "did", "sum", "count"];
  console.log(`\n--- SPECIAL NODES ---`);
  for (const root of r.roots) {
    for (const k of specialKinds) {
      const found = kind(root, k);
      if (found) {
        console.log(`  ${k}: name=${found.name} state=${JSON.stringify(found.state)}`);
      }
    }
  }

  // For multi-word: identity and thought of each root
  if (r.roots.length > 1) {
    console.log(`\n--- MULTI-WORD DETAILS ---`);
    for (let i = 0; i < r.roots.length; i++) {
      const root = r.roots[i];
      console.log(`  root[${i}]: identity=${root.state?.identity ?? "none"}`);
      const thought = kind(root, "thought");
      if (thought) {
        console.log(`    thought: concept=${thought.state.thought.concept} pos=${thought.state.thought.pos} meaning=${thought.state.thought.meaning}`);
      }
    }
  }

  // Full tree for working examples
  if (["a cat is not an animal", "how many mammal?", "two plus three?", "a cat is an animal?", "what is your name?"].includes(input)) {
    console.log(`\n--- FULL TREE ---`);
    for (const root of r.roots) {
      dumpNode(root, 1);
    }
  }
}

const inputs = [
  { input: "i hurt myself", note: "reflexive gap" },
  { input: "my cat", note: "possessive gap" },
  { input: "cat bigger than dog", note: "comparative gap" },
  { input: "nobody runs", note: "negation quantifier gap" },
  { input: "because", note: "discourse marker gap" },
  { input: "if cat then animal", note: "conditional gap" },
  { input: "i know that cat is animal", note: "meta-knowledge gap" },
  { input: "cat would be animal", note: "modal gap" },
  { input: "the elephant is bigger than the cat", note: "property comparison gap" },
  { input: "first cat then dog", note: "temporal sequencing gap" },
  { input: "a cat is not an animal", note: "contradiction (works)" },
  { input: "how many mammal?", note: "counting (works)" },
  { input: "two plus three?", note: "arithmetic (works)" },
  { input: "a cat is an animal?", note: "claim (works)" },
  { input: "what is your name?", note: "question (works)" },
];

for (const { input, note } of inputs) {
  forget();
  try {
    const result = await brain(input, { from: 45 });
    traceDecision(result, input);
  } catch (e) {
    console.log(`\n${"=".repeat(70)}`);
    console.log(`INPUT: "${input}" (${note})`);
    console.log(`ERROR: ${e.message}`);
    console.log(e.stack);
  }
}

// done
