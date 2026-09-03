// World model loader.
// The world is external knowledge: what exists, and how it relates. It holds
// no language — a term is an id and its links, never a word. The `name` field
// is a debug label; nothing here reads it.
//
// The brain owns the categories (living, person); the world says which term
// realizes each one, via `anchors`. That is the whole bridge.

export function fromWorldData(data) {
  const terms = new Map();
  for (const t of data.terms || []) terms.set(t.id, t);

  const isRel = (data.relations && data.relations.is) ?? null;
  const anchors = data.anchors || {};

  // Walk the `is` chain upward from a term, collecting every ancestor id.
  function ancestors(id) {
    const seen = new Set();
    let cur = terms.get(id);
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id);
      const up = (cur.links || []).find((l) => l.rel === isRel);
      cur = up ? terms.get(up.to) : null;
    }
    return seen;
  }

  return {
    data,
    anchors,
    term: (id) => terms.get(id) || null,
    // Does `id` reach `ancestorId` by following `is`?
    isA: (id, ancestorId) =>
      ancestorId != null && id != null && ancestors(id).has(ancestorId),
  };
}

export async function loadWorldFile(path) {
  const { file } = await import('runtime:fs');
  return fromWorldData(await file(path).json());
}
