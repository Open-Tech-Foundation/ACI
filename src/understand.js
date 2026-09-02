/** Compiles what arrived into a gap — the thing with a piece missing. */

export function understand(language, text) {
  const read = language.words(text).map((word) => language.read(word));

  const asked = read.find((token) => token.as === "ask");
  const compare = read.find((token) => token.as === "compare");
  const relation = read.find((token) => token.as === "relation");
  const kinds = read.filter((token) => token.as === "kind").map((token) => token.kind);
  const unknown = read.filter((token) => token.as === "unknown").map((token) => token.word);

  const gap = compile({ ask: asked?.ask ?? null, compare, relation, kinds });
  return { read, kinds, unknown, gap };
}

function compile({ ask, compare, relation, kinds }) {
  if (compare !== undefined && kinds.length === 2) {
    return {
      ask: "which",
      relation: compare.relation,
      want: compare.want,
      between: kinds,
    };
  }

  if (ask === "what" && kinds.length >= 1) {
    return {
      ask: "what",
      of: kinds[0],
      relation: relation?.relation ?? "is-a",
    };
  }

  if (ask === "yes-no" && kinds.length === 2) {
    return {
      ask: "yes-no",
      fact: [kinds[0], relation?.relation ?? "is-a", kinds[1]],
    };
  }

  return null;
}
