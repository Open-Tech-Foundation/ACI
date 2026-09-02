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

/** How each side reached the scale, then the scale itself. */
function steps(left, a, right, b, order) {
  const walk = [];
  if (a !== left) walk.push([left, "is-a", a]);
  if (b !== right) walk.push([right, "is-a", b]);
  walk.push(order);
  return walk;
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
        return {
          answer: [want === "more" ? right : left],
          because: steps(left, a, right, b, [a, relation, b]),
        };
      }
      if (knowledge.holds([b, relation, a])) {
        return {
          answer: [want === "more" ? left : right],
          because: steps(left, a, right, b, [b, relation, a]),
        };
      }
    }
  }

  return { answer: [], because: [] };
}
