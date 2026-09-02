/** One brain for the page, taught from the same data the tests use. */

import world from "../../data/knowledge/world.json" with { type: "json" };
import english from "../../data/language/english.json" with { type: "json" };
import { Knowledge, Language, createBrain } from "../../src/index.js";

export const knowledge = new Knowledge(world);
export const brain = createBrain({ knowledge, language: new Language(english) });

/** Which facts were taught and which were worked out. */
export function ledger() {
  const given = new Set(knowledge.given.map((fact) => fact.join("|")));
  return knowledge.facts.map((fact) => ({
    fact,
    derived: !given.has(fact.join("|")),
  }));
}
