/** A first run: recognise, understand, resolve. */

import lesson from "../data/lessons/comfort.json" with { type: "json" };
import { Knowledge } from "../src/knowledge.js";
import { recognise } from "../src/recognise.js";
import { understand } from "../src/understand2.js";
import { resolve } from "../src/resolve2.js";

const knowledge = new Knowledge(lesson);

for (const said of [
  "it's cold in here",
  "it's freezing",
  "it is so stuffy",
  "explain me algebra",
]) {
  const signal = { signal: "message", type: "text", data: said };
  const seen = recognise(signal);
  const understood = understand(knowledge, seen);
  const out = resolve(knowledge, understood);

  console.log(`\n  in    ${said}`);
  console.log(`  met   ${understood.met.map((m) => `${m.form}→${m.is.join("→")}`).join(", ") || "nothing"}`);
  console.log(`  out   ${out.length === 0 ? "(nothing to say)" : JSON.stringify(out)}`);
}
console.log();
