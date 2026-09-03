import { args } from "runtime:process";
import { brain } from "../src/index.js";

const input = args[0] ?? "hi";
const r = await brain(input);

function flatten(n, d = 0, prefix = "", connector = "", isLast = true) {
  const label = n.name === n.kind ? n.name : `${n.kind} (${n.name})`;
  let extra = "";
  if (n.state?.thought) extra = `  -> ${n.state.thought.pos}: ${n.state.thought.meaning} [${n.state.thought.language}]`;
  else if (n.kind === "express") extra = `  -> ${n.state.says ?? "(unsaid)"}`;
  else if (n.state?.language) extra = `  [${n.state.language}]`;
  let s = "  ".repeat(d) + connector + label + extra + "\n";
  const cp = prefix + (connector === "" ? "" : isLast ? "   " : "│  ");
  (n.branch || []).forEach((c, i) => {
    s += flatten(c, d + 1, cp, i === n.branch.length - 1 ? "└─ " : "├─ ", i === n.branch.length - 1);
  });
  return s;
}

const out = await Promise.all(
  r.roots.map(async (n) => flatten(n)),
);

console.log(`input: ${JSON.stringify(input)}\n`);
console.log(out.join(""));
console.log(`says: ${r.expression.state.says ?? "(unsaid)"}  [${r.expression.name}]`);
