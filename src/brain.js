/** What is this? Asked of the answer, over and over, until nothing answers. */

export function createBrain(terms) {
  const byId = new Map(terms.map((term) => [term.id, term]));
  const byName = new Map(terms.map((term) => [term.name, term]));
  const chain = (of) => walk(byId, byName.get(of), of);

  return function brain(signal) {
    return { signal, chains: [chain(signal), ...parts(signal).map(chain)] };
  };
}

/** A word is its chars. Nothing else is broken down yet. */
const parts = (signal) => (signal.length > 1 ? [...signal] : []);

/** `existence` is the bottom: the one term nothing else explains. */
function walk(byId, term, of) {
  const chain = [];
  const seen = new Set();

  for (let at = term; ; ) {
    if (at === undefined) return { of, chain, ends: chain.length === 0 ? "unknown" : "untaught" };
    if (seen.has(at.id)) return { of, chain, ends: "circular" };

    seen.add(at.id);
    chain.push(at.name);

    if (at.is === null) return { of, chain, ends: "bottom" };
    at = byId.get(at.is);
  }
}
