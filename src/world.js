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
  const subrelationRel = anchors.subrelation ?? null;
  const outgoing = new Map();
  const incoming = new Map();
  for (const term of terms.values()) {
    for (const link of term.links || []) {
      if (link.not) continue;
      if (!outgoing.has(link.rel)) outgoing.set(link.rel, new Map());
      if (!incoming.has(link.rel)) incoming.set(link.rel, new Map());
      const from = outgoing.get(link.rel);
      const to = incoming.get(link.rel);
      if (!from.has(term.id)) from.set(term.id, new Set());
      if (!to.has(link.to)) to.set(link.to, new Set());
      from.get(term.id).add(link.to);
      to.get(link.to).add(term.id);
    }
  }
  const converseBy = new Map();
  if (anchors.converse != null) {
    for (const relation of terms.values()) {
      for (const other of outgoing.get(anchors.converse)?.get(relation.id) || []) {
        if (!converseBy.has(relation.id)) converseBy.set(relation.id, new Set());
        if (!converseBy.has(other)) converseBy.set(other, new Set());
        converseBy.get(relation.id).add(other);
        converseBy.get(other).add(relation.id);
      }
    }
  }

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

  // What a term is a kind of, one step up.
  function up(id) {
    const t = terms.get(id);
    return t ? (t.links || []).filter((l) => !l.not && l.rel === isRel).map((l) => l.to) : [];
  }

  // A functional relation may retain stamped history while exposing one
  // current value. Untimed links are static; validation ensures they cannot
  // compete with a different stamped object.
  function currentFunctional(links, rel) {
    if (!terms.get(rel)?.functional) return links;
    const stamped = links.filter((link) => Number.isInteger(link.at));
    if (stamped.length === 0) return links;
    const latest = Math.max(...stamped.map((link) => link.at));
    return stamped.filter((link) => link.at === latest);
  }

  const hierarchyTerms = new Set();
  if (subrelationRel != null) {
    for (const [child, parents] of outgoing.get(subrelationRel) || []) {
      hierarchyTerms.add(child);
      for (const parent of parents) hierarchyTerms.add(parent);
    }
  }
  const ancestorCache = new Map();
  const variantCache = new Map();
  function relationAncestors(rel) {
    if (subrelationRel == null) return new Set([rel]);
    if (!ancestorCache.has(rel)) ancestorCache.set(rel, reaches(rel, subrelationRel));
    return ancestorCache.get(rel);
  }

  function relationVariants(rel) {
    if (subrelationRel == null) return [rel];
    if (!variantCache.has(rel)) {
      const out = [rel];
      for (const candidate of hierarchyTerms) {
        if (candidate !== rel && relationAncestors(candidate).has(rel)) out.push(candidate);
      }
      variantCache.set(rel, out);
    }
    return variantCache.get(rel);
  }

  // Edges stated in this direction, including facts using a narrower
  // relation, before any declared converse is normalized.
  function variantLinks(id, rel) {
    const links = [];
    for (const variant of relationVariants(rel)) {
      for (const link of terms.get(id)?.links || []) {
        if (!link.not && link.rel === variant) links.push({ ...link });
      }
    }
    return currentFunctional(links, rel);
  }

  // Direct edges plus facts written through a declared converse, normalized
  // into the requested direction before relation characteristics are applied.
  function directedLinks(id, rel) {
    const links = variantLinks(id, rel);
    for (const variant of relationVariants(rel)) {
      for (const other of converseBy.get(variant) || []) {
        for (const term of terms.values()) {
          for (const link of term.links || []) {
            if (!link.not && link.rel === other && link.to === id) {
              links.push({ ...link, to: term.id });
            }
          }
        }
      }
    }
    return currentFunctional(links, rel);
  }

  // One step through a relation includes links stated through its declared
  // converse. This makes a fact written as `b after a` the same edge as `a
  // before b`, including when a transitive walk contains facts written from
  // both directions. The world supplies the converse relation and names none.
  function related(id, rel) {
    const direct = directedLinks(id, rel);
    const out = new Set(direct.map((link) => link.to));
    if (terms.get(rel)?.reflexive && terms.has(id)) out.add(id);
    if (terms.get(rel)?.symmetric) {
      for (const term of terms.values()) {
        const links = directedLinks(term.id, rel);
        if (links.some((link) => link.to === id)) out.add(term.id);
      }
    }
    return out;
  }

  function relatedBy(id, rel) {
    const relation = terms.get(rel);
    if (!relation || !relation.transitive) return related(id, rel);
    const found = new Set();
    const pending = [id];
    const seen = new Set([id]);
    while (pending.length) {
      const here = pending.pop();
      for (const next of related(here, rel)) {
        found.add(next);
        if (!seen.has(next)) {
          seen.add(next);
          pending.push(next);
        }
      }
    }
    return found;
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
      const out = new Set();
      for (const t of terms.values()) {
        const links = variantLinks(t.id, rel);
        if (links.some((link) => link.to === id)) out.add(t.id);
      }
      if (terms.get(rel)?.symmetric) {
        for (const link of variantLinks(id, rel)) out.add(link.to);
      }
      if (terms.get(rel)?.reflexive && terms.has(id)) out.add(id);
      return [...out];
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
      for (const stated of relationAncestors(rel)) {
        if ((t.links || []).some((l) => l.not && l.rel === stated && l.to === object)) return true;
        const other = terms.get(object);
        if (
          terms.get(stated)?.symmetric &&
          other &&
          (other.links || []).some((l) => l.not && l.rel === stated && l.to === id)
        ) return true;
        for (const back of converseBy.get(stated) || []) {
          if (other && (other.links || []).some((l) => l.not && l.rel === back && l.to === id)) {
            return true;
          }
        }
      }
      return false;
    },
    // A kind names many; an individual exists once. Everything else about a term
    // is the same either way — an individual simply `is` its kind.
    isIndividual: (id) => {
      const t = terms.get(id);
      return Boolean(t && t.individual);
    },
    // Asymmetry is declared on the relation term. The engine reads the
    // property, never the relation's name: temporal order and any other strict
    // ordering receive the same contradiction semantics.
    asymmetric: (rel) => Boolean(terms.get(rel)?.asymmetric),
    // Symmetry is likewise a property of the relation term. One authored fact
    // can therefore be read from either endpoint without storing its mirror.
    symmetric: (rel) => Boolean(terms.get(rel)?.symmetric),
    reflexive: (rel) => Boolean(terms.get(rel)?.reflexive),
    // Asymmetry entails irreflexivity; an explicit declaration gives the same
    // self-contradiction without imposing direction on distinct endpoints.
    irreflexive: (rel) => Boolean(terms.get(rel)?.irreflexive || terms.get(rel)?.asymmetric),
    functional: (rel) => Boolean(terms.get(rel)?.functional),
    subrelationOf: (relation, broader) => relationAncestors(relation).has(broader),
    related: (id, rel) => [...related(id, rel)],
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
      let links = variantLinks(id, rel);
      // Quantity links retain history per object; only the latest value is a
      // current link. Placement relations have one current target, while old
      // targets remain available in the authored record.
      if (terms.get(rel)?.functional) {
        links = currentFunctional(links, rel);
      } else if (links.some((l) => Number.isInteger(l.quantity))) {
        const latest = new Map();
        for (const l of links) {
          const held = latest.get(l.to);
          if (!held || (l.at ?? -1) >= (held.at ?? -1)) latest.set(l.to, l);
        }
        links = [...latest.values()];
      } else if (anchors.placement != null && reaches(rel, isRel).has(anchors.placement)) {
        const top = Math.max(...links.map((l) => l.at ?? -1));
        links = links.filter((l) => (l.at ?? -1) === top);
      }
      const found = new Set(links.map((l) => l.to));
      if (terms.get(rel)?.symmetric) {
        for (const term of terms.values()) {
          const incomingLinks = variantLinks(term.id, rel);
          if (incomingLinks.some((link) => link.to === id)) found.add(term.id);
        }
      }
      if (terms.get(rel)?.reflexive && terms.has(id)) found.add(id);
      return [...found];
    },
    // Does `id` reach `ancestorId` by following `rel` (the `is` relation by
    // default)? The relation is a term like any other, so a signal can name it.
    isA: (id, ancestorId, rel = isRel) => {
      if (ancestorId == null || id == null || rel == null) return false;
      if (rel === isRel) return reaches(id, rel).has(ancestorId);
      return relatedBy(id, rel).has(ancestorId);
    },
  };
}

export async function loadWorldFile(path) {
  const { file } = await import('runtime:fs');
  return fromWorldData(await file(path).json());
}
