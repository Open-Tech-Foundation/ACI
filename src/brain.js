/** What is this? Asked of the answer, over and over, until nothing answers. */

export function createBrain(terms) {
  const byId = new Map(terms.map((term) => [term.id, term]));
  const byName = new Map(terms.map((term) => [term.name, term]));
  const is = byName.get("is").id;
  const chain = (of) => walk(byId, is, byName.get(of), of);

  return function brain(signal) {
    return { signal, chains: [chain(signal), ...parts(signal).map(chain)] };
  };
}

/** A word is its chars. Nothing else is broken down yet. */
const parts = (signal) => (signal.length > 1 ? [...signal] : []);

/** Follows one relation only. `existence` is where it runs out. */
function walk(byId, rel, term, of) {
  const chain = [];
  const seen = new Set();

  for (let at = term; ; ) {
    if (at === undefined) return { of, chain, ends: chain.length === 0 ? "unknown" : "untaught" };
    if (seen.has(at.id)) return { of, chain, ends: "circular" };

    seen.add(at.id);
    chain.push(at.name);

    const next = at.links.find((link) => link.rel === rel);
    if (next === undefined) return { of, chain, ends: "bottom" };
    at = byId.get(next.to);
  }
}
