/** Ask it things from a terminal. */

import world from "../data/knowledge/world.json" with { type: "json" };
import english from "../data/language/english.json" with { type: "json" };
import { Knowledge } from "../src/knowledge.js";
import { Language } from "../src/language.js";
import { createBrain } from "../src/brain.js";

const brain = createBrain({
  knowledge: new Knowledge(world),
  language: new Language(english),
});

const QUESTIONS = [
  "is a sparrow an animal?",
  "is an apple an animal?",
  "which is heavier, apple or cat?",
  "which is lighter, apple or cat?",
  "what is your name?",
  "what is a sparrow?",
  "explain me algebra",
];

console.log(`\n  ${String(brain.knowledge.given.length)} taught, ${String(brain.knowledge.derived)} derived\n`);

for (const question of QUESTIONS) {
  const { gap, answer, because, unknown } = brain.ask(question);
  console.log(`  ${question}`);
  console.log(`    gap    ${gap === null ? "—" : JSON.stringify(gap)}`);
  console.log(`    answer ${answer.length === 0 ? "(nothing)" : answer.join(", ")}`);
  if (because.length > 0) console.log(`    from   ${because.map((f) => f.join(" ")).join(" ; ")}`);
  if (unknown.length > 0) console.log(`    unknown ${unknown.join(", ")}`);
  console.log();
}
