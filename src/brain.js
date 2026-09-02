/** What is this? Asked over and over until nothing answers. */

export function createBrain(world) {
  const chain = (of) => walk(world, of);

  return function brain(signal) {
    return { signal, chains: [chain(signal), ...parts(signal).map(chain)] };
  };
}

/** A word is its chars. Nothing else is broken down yet. */
const parts = (signal) => (signal.length > 1 ? [...signal] : []);

/**
 * Ask `what is this` of the answer, until something has no parent.
 * `existence` is the bottom: it is the one thing nothing else explains.
 */
function walk(world, of) {
  const chain = [];
  const seen = new Set();

  for (let at = of; ; ) {
    if (!(at in world)) return { of, chain, ends: chain.length === 0 ? "unknown" : "untaught" };
    if (seen.has(at)) return { of, chain, ends: "circular" };

    seen.add(at);
    chain.push(at);

    const next = world[at];
    if (next === null) return { of, chain, ends: "bottom" };
    at = next;
  }
}
