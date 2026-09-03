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
    // Everything that links to a term directly by one relation: the members of a
    // kind, where `linked` gives what a term is a member of.
    members: (id, rel) => {
      if (id == null || rel == null) return [];
      const out = [];
      for (const t of terms.values()) {
        if ((t.links || []).some((l) => l.rel === rel && l.to === id)) out.push(t.id);
      }
      return out;
    },
    // The value a term names, and the term that names a value. This is the
    // whole of the world's part in arithmetic: which symbol is which number.
    // What follows from those numbers is the brain's, not the world's.
    valueOf: (id) => {
      const t = terms.get(id);
      return t && Number.isInteger(t.value) ? t.value : null;
    },
    termFor: (value) => {
      if (!Number.isInteger(value)) return null;
      for (const t of terms.values()) if (t.value === value) return t.id;
      return null;
    },
    // A kind names many; an individual exists once. Everything else about a term
    // is the same either way — an individual simply `is` its kind.
    isIndividual: (id) => {
      const t = terms.get(id);
      return Boolean(t && t.individual);
    },
    individualsOf: (kind) => {
      const out = [];
      for (const t of terms.values()) {
        if (!t.individual) continue;
        if ((t.links || []).some((l) => l.rel === isRel && l.to === kind)) out.push(t.id);
      }
      return out;
    },
    // The one individual of a kind. None yet, or more than one, and there is no
    // "the" to resolve — the brain does not guess which was meant.
    oneOf: (kind) => {
      let found = null;
      for (const t of terms.values()) {
        if (!t.individual) continue;
        if (!(t.links || []).some((l) => l.rel === isRel && l.to === kind)) continue;
        if (found != null) return null;
        found = t.id;
      }
      return found;
    },
    // The next id nothing has taken. Deterministic: the same signals in the same
    // order give the same individuals.
    nextId: () => {
      let top = -1;
      for (const id of terms.keys()) if (id > top) top = id;
      return top + 1;
    },
    // How many of `object` a term holds by one relation, where the world has
    // been told. This is state — what is so now — not what a thing is.
    held: (id, rel, object) => {
      const t = terms.get(id);
      if (!t || rel == null) return null;
      let latest = null;
      for (const l of t.links || []) {
        if (l.rel !== rel || l.to !== object || !Number.isInteger(l.quantity)) continue;
        if (latest == null || (l.at ?? -1) >= (latest.at ?? -1)) latest = l;
      }
      return latest ? latest.quantity : null;
    },
    // Everything the world has been told about what a thing held, in order.
    // Revising a count does not erase what was so before it.
    heldOver: (id, rel, object) => {
      const t = terms.get(id);
      if (!t || rel == null) return [];
      return (t.links || [])
        .filter((l) => l.rel === rel && l.to === object && Number.isInteger(l.quantity))
        .map((l) => ({ quantity: l.quantity, at: l.at ?? 0 }))
        .sort((x, y) => x.at - y.at);
    },
    // The brain's clock. It ticks on what happens, not on any outside time, so
    // the same signals in the same order always give the same moments.
    now: () => {
      let top = -1;
      for (const t of terms.values()) {
        for (const l of t.links || []) if (Number.isInteger(l.at) && l.at > top) top = l.at;
      }
      return top + 1;
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
