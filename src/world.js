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
        // A denied link joins nothing. It records that the relation does not
        // hold, and nothing can be reached across it.
        if (l.not) continue;
        if (l.rel === rel && !seen.has(l.to)) pending.push(l.to);
      }
    }
    return seen;
  }

  // What a term reaches by actually following a relation. A thing is itself,
  // but it does not stand in every relation to itself: a stone is a stone, and
  // that is no reason to say a stone holds a stone. Only the ladder the world
  // is built of counts a term as reaching itself, which is why `reaches` seeds
  // its walk and this does not.
  function reachedBy(id, rel) {
    const found = new Set();
    const seen = new Set([id]);
    const pending = [id];
    while (pending.length) {
      const at = pending.pop();
      const cur = terms.get(at);
      if (!cur) continue;
      for (const l of cur.links || []) {
        if (l.not || l.rel !== rel) continue;
        found.add(l.to);
        if (!seen.has(l.to)) {
          seen.add(l.to);
          pending.push(l.to);
        }
      }
    }
    return found;
  }

  // What a term is a kind of, one step up.
  function up(id) {
    const t = terms.get(id);
    return t ? (t.links || []).filter((l) => !l.not && l.rel === isRel).map((l) => l.to) : [];
  }

  return {
    data,
    anchors,
    // The relation the world's own links are made of, and the weakest claim a
    // signal can make: any other relation a signal names is more specific.
    baseRelation: isRel,
    term: (id) => terms.get(id) || null,
    // A term by the name it was given. A name given in conversation is held
    // nowhere else — no language lists it — so this is how a word that is a
    // name is met again.
    termNamed: (name) => {
      if (typeof name !== 'string') return null;
      const wanted = name.toLowerCase();
      for (const t of terms.values()) if (t.name.toLowerCase() === wanted) return t.id;
      return null;
    },
    // Whether two terms exclude each other as kinds: anything either of them is
    // a kind of, standing `different` to anything the other is a kind of. This
    // is what lets the brain say no rather than only fail to say yes.
    excludes: (x, y) => {
      if (x == null || y == null) return false;
      const xs = reaches(x, isRel);
      const ys = reaches(y, isRel);

      // Written out pair by pair, either way round.
      if (differentRel != null) {
        for (const [these, those] of [
          [xs, ys],
          [ys, xs],
        ]) {
          for (const d of these) {
            const t = terms.get(d);
            if (!t) continue;
            for (const l of t.links || []) {
              if (l.rel === differentRel && those.has(l.to)) return true;
            }
          }
        }
      }
      // A parent may say its children are exclusive rather than every pair of
      // them being written out: two things under one such parent, by different
      // children of it, cannot be the same kind.
      for (const dx of xs) {
        const parents = up(dx);
        for (const dy of ys) {
          if (dx === dy) continue;
          for (const p of parents) {
            const t = terms.get(p);
            if (t && t.disjoint && up(dy).includes(p)) return true;
          }
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
        if ((t.links || []).some((l) => !l.not && l.rel === rel && l.to === id)) out.push(t.id);
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
    // The symbols a thing is said as where no language has a word for it. A name
    // is not translated: it is the same in every language, so it is held here
    // rather than in any of them.
    symbolOf: (id) => {
      const t = terms.get(id);
      return t && typeof t.symbol === 'string' ? t.symbol : null;
    },
    termFor: (value) => {
      if (!Number.isInteger(value)) return null;
      for (const t of terms.values()) if (t.value === value) return t.id;
      return null;
    },
    // Whether the world has been told outright that a relation does not hold.
    // Not finding a path is ignorance; this is a denial, and it is knowledge.
    denies: (id, object, rel) => {
      const t = terms.get(id);
      if (!t || rel == null) return false;
      return (t.links || []).some((l) => l.not && l.rel === rel && l.to === object);
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
        if (l.not || l.rel !== rel || l.to !== object || !Number.isInteger(l.quantity)) continue;
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
        .filter((l) => !l.not && l.rel === rel && l.to === object && Number.isInteger(l.quantity))
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
      return (t.links || []).filter((l) => !l.not && l.rel === rel).map((l) => l.to);
    },
    // Does `id` reach `ancestorId` by following `rel` (the `is` relation by
    // default)? The relation is a term like any other, so a signal can name it.
    isA: (id, ancestorId, rel = isRel) =>
      ancestorId != null &&
      id != null &&
      rel != null &&
      (rel === isRel ? reaches(id, rel) : reachedBy(id, rel)).has(ancestorId),
  };
}

export async function loadWorldFile(path) {
  const { file } = await import('runtime:fs');
  return fromWorldData(await file(path).json());
}
