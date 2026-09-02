/** Fills the gap from what the knowledge holds. Chooses nothing. */

export function resolve(knowledge, gap) {
  if (gap === null) return { answer: [], because: [] };

  if (gap.ask === "yes-no") {
    const found = knowledge.find(gap.fact);
    return { answer: [found.length > 0 ? "yes" : "no"], because: found };
  }

  if (gap.ask === "what") {
    const found = knowledge.find([gap.of, gap.relation, null]);
    return { answer: found.map((fact) => fact[2]), because: found };
  }

  if (gap.ask === "which") return which(knowledge, gap);

  return { answer: [], because: [] };
}

/**
 * Walk both sides up until they meet on the same scale, then read the order
 * off. Nothing is measured and no number is involved.
 */
function which(knowledge, { relation, want, between: [left, right] }) {
  const ups = knowledge.isa(left);
  const downs = knowledge.isa(right);

  for (const a of ups) {
    for (const b of downs) {
      if (knowledge.holds([a, relation, b])) {
        return { answer: [want === "more" ? right : left], because: [[a, relation, b]] };
      }
      if (knowledge.holds([b, relation, a])) {
        return { answer: [want === "more" ? left : right], because: [[b, relation, a]] };
      }
    }
  }

  return { answer: [], because: [] };
}
