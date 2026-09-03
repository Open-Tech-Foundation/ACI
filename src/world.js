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
  const differentRel = (data.relations && data.relations.different) ?? null;
  const anchors = data.anchors || {};

  // Walk one relation from a term, collecting every id it reaches. A term may
  // hold several links of the same relation — the base world gives one, a
  // knowledge file may add more — so this follows all of them, not the first.
  function reaches(id, rel) {
    const seen = new Set();
    const pending = [id];
    while (pending.length) {
      const at = pending.pop();
      if (seen.has(at)) continue;
      seen.add(at);
      const cur = terms.get(at);
      if (!cur) continue;
      for (const l of cur.links || []) {
        if (l.rel === rel && !seen.has(l.to)) pending.push(l.to);
      }
    }
    return seen;
  }

  return {
    data,
    anchors,
    // The relation the world's own links are made of, and the weakest claim a
    // signal can make: any other relation a signal names is more specific.
    baseRelation: isRel,
    term: (id) => terms.get(id) || null,
    // Whether two terms exclude each other as kinds: anything either of them is
    // a kind of, standing `different` to anything the other is a kind of. This
    // is what lets the brain say no rather than only fail to say yes.
    excludes: (x, y) => {
      if (differentRel == null || x == null || y == null) return false;
      const xs = reaches(x, isRel);
      const ys = reaches(y, isRel);
      for (const dx of xs) {
        const t = terms.get(dx);
        if (!t) continue;
        for (const l of t.links || []) {
          if (l.rel === differentRel && ys.has(l.to)) return true;
        }
      }
      for (const dy of ys) {
        const t = terms.get(dy);
        if (!t) continue;
        for (const l of t.links || []) {
          if (l.rel === differentRel && xs.has(l.to)) return true;
        }
      }
      return false;
    },
    // What a term links to directly by one relation — its answer, where isA is
    // its question.
    linked: (id, rel) => {
      const t = terms.get(id);
      if (!t || rel == null) return [];
      return (t.links || []).filter((l) => l.rel === rel).map((l) => l.to);
    },
    // Does `id` reach `ancestorId` by following `rel` (the `is` relation by
    // default)? The relation is a term like any other, so a signal can name it.
    isA: (id, ancestorId, rel = isRel) =>
      ancestorId != null && id != null && rel != null && reaches(id, rel).has(ancestorId),
  };
}

export async function loadWorldFile(path) {
  const { file } = await import('runtime:fs');
  return fromWorldData(await file(path).json());
}
