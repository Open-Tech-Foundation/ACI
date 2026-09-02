/**
 * The one brain the page talks to.
 *
 * Imported straight from the engine's source rather than its built package, so
 * the demo always exercises the code in this repo — if a change breaks the
 * engine, this page breaks with it, which is the point of shipping a demo
 * alongside a library.
 */

import { createBrain } from "../../src/index.js";
import { NodeType } from "../../src/memory/schema.js";

export const aci = createBrain();

/** Runs one turn. */
export function ask(input) {
  return aci.brain(input);
}

/** Every concept the engine knows, for the teach control's menu. */
export function concepts() {
  return [...aci.memory.nodes.values()]
    .filter((node) => node.type === NodeType.CONCEPT && node.props.name !== "unknown")
    .map((node) => node.props.name)
    .sort();
}

/**
 * Teaches a word and re-answers the turn that prompted it.
 *
 * There is no retraining step and nothing to reload: the word becomes a node,
 * the concept link becomes an edge, and the next lookup finds it.
 */
export function teach(surface, concept) {
  aci.memory.word(surface, { language: "en", concept });
  return ask(surface);
}

export function stats() {
  return aci.memory.stats();
}
