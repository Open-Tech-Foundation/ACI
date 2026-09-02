/** Type a word, see what it is, all the way down. */

import { args } from "runtime:process";
import world from "../data/world.json" with { type: "json" };
import { createBrain } from "../src/brain.js";

const brain = createBrain(world);
const { signal, chains } = brain(args[0] ?? "hi");

console.log(`\n  ${signal}\n`);

for (const { of, chain, ends } of chains) {
  const line = chain.join(" -> ");
  const tail = ends === "bottom" ? " -> null" : ` -> ? (${ends})`;
  console.log(`  ${of.padEnd(6)} ${line}${tail}`);
}
console.log();
