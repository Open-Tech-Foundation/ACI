// World model loader.
// The world is external knowledge: what exists, and how it relates. It holds
// no language — a term is an id and its links, never a word. The `name` field
// is a debug label; nothing here reads it.
//
// The brain owns the categories (living, person); the world says which term
// realizes each one, via `anchors`. That is the whole bridge.

export function fromWorldData(source) {
  // One order, whichever door the world came through. A file authors its terms
  // in whatever order reads well; a store hands them back by id. Nothing that
  // reads the world should be able to tell which it was given — every walk
  // below goes through this map, and what several of them hand back is a list
  // in the order they walked. So the order is settled once, here.
  const data = {
    ...source,
    terms: [...(source.terms || [])].sort((a, b) => a.id - b.id),
  };
  const terms = new Map();
  for (const t of data.terms) terms.set(t.id, t);

  const isRel = (data.relations && data.relations.is) ?? null;
  const sameRel = (data.relations && data.relations.same) ?? data.anchors?.same ?? null;
  const differentRel = (data.relations && data.relations.different) ?? data.anchors?.different ?? null;
  const anchors = data.anchors || {};
  const subrelationRel = anchors.subrelation ?? null;
  const domainRel = anchors.domain ?? null;
  const rangeRel = anchors.range ?? null;
  const subtypeRel = anchors.subtype ?? null;
  const instanceRel = anchors.instance ?? null;
  const predicationRel = anchors.predication ?? null;
  const inferredTypes = new Map();
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

  // `same` does not copy or merge stored terms. It supplies an equivalence
  // class at the read boundary, so every fact about one representative can be
  // read through every other representative. The walk is deliberately based
  // only on positive authored edges and treats them in both directions: those
  // are the invariant semantics of identity, not a spelling convention.
  const identityCache = new Map();
  function equivalents(id) {
    if (!terms.has(id)) return new Set();
    if (sameRel == null) return new Set([id]);
    if (identityCache.has(id)) return identityCache.get(id);
    const found = new Set();
    const pending = [id];
    while (pending.length) {
      const here = pending.pop();
      if (found.has(here)) continue;
      found.add(here);
      for (const next of outgoing.get(sameRel)?.get(here) || []) pending.push(next);
      for (const previous of incoming.get(sameRel)?.get(here) || []) pending.push(previous);
    }
    for (const member of found) identityCache.set(member, found);
    return found;
  }

  const canonical = (id) => {
    let first = null;
    for (const member of equivalents(id)) if (first == null || member < first) first = member;
    return first;
  };
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

  // A relation may be two relations followed one after the other: a father's
  // father is a grandfather, and going east does not change how far north a
  // thing is. The world says which pair gives which relation; the walk derives
  // the fact when it is asked for and never writes it down. Transitivity is
  // the case where a relation composes with itself, and keeps its own flag.
  const compositions = [];
  if (anchors.composition != null && anchors.leading != null && anchors.trailing != null) {
    for (const term of terms.values()) {
      const [gives] = outgoing.get(anchors.composition)?.get(term.id) || [];
      const [leading] = outgoing.get(anchors.leading)?.get(term.id) || [];
      const [trailing] = outgoing.get(anchors.trailing)?.get(term.id) || [];
      if (gives == null || leading == null || trailing == null) continue;
      compositions.push({ gives, leading, trailing });
    }
  }

  const rawClassificationCache = new Map();
  function rawClassificationReaches(id, target, skip = null) {
    const key = `${id}:${skip ? `${skip[0]}:${skip[1]}` : ''}`;
    if (rawClassificationCache.has(key)) return rawClassificationCache.get(key).has(target);
    const seen = new Set();
    const pending = [id];
    while (pending.length) {
      const at = pending.pop();
      if (seen.has(at)) continue;
      seen.add(at);
      for (const link of terms.get(at)?.links || []) {
        if (link.not || ![isRel, subtypeRel, instanceRel].includes(link.rel)) continue;
        if (skip && at === skip[0] && link.rel === isRel && link.to === skip[1]) continue;
        pending.push(link.to);
      }
    }
    rawClassificationCache.set(key, seen);
    return seen.has(target);
  }

  // Old sources used broad `is` for property assertions. It is a predication
  // when the object is a property and the subject independently belongs to a
  // different existence mode; property-to-property links remain taxonomy.
  const legacyPredicationCache = new Map();
  function legacyPredication(subject, object) {
    const key = `${subject}:${object}`;
    if (legacyPredicationCache.has(key)) return legacyPredicationCache.get(key);
    const property = anchors.property ?? null;
    const isPredication = property != null &&
      rawClassificationReaches(object, property) &&
      !rawClassificationReaches(subject, property, [subject, object]) &&
      [anchors.thing, anchors.action, anchors.relation]
      .filter((kind) => kind != null)
      .some((kind) => rawClassificationReaches(subject, kind, [subject, object]));
    legacyPredicationCache.set(key, isPredication);
    return isPredication;
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
      for (const equivalent of equivalents(at)) {
        if (!seen.has(equivalent)) pending.push(equivalent);
      }
      const cur = terms.get(at);
      if (!cur) continue;
      // A walk sees what is so now. Where a signal stamped the moment, the
      // latest of that state stands and the ones before it are history, so a
      // drum moved to a shelf is no longer reached through the box.
      const links = cur.links || [];
      const dated = links.some((l) => l.rel === rel && Number.isInteger(l.at));
      const current = dated
        ? [
            ...links.filter((l) => l.rel !== rel),
            ...currentState(links.filter((l) => l.rel === rel), rel),
          ]
        : links;
      for (const l of current) {
        // A denied link joins nothing. It records that the relation does not
        // hold, and nothing can be reached across it.
        if (l.not) continue;
        const legacyClassifies = l.rel === rel &&
          !(rel === isRel && legacyPredication(at, l.to));
        const classifies = rel === isRel && (l.rel === subtypeRel || l.rel === instanceRel);
        if ((legacyClassifies || classifies) && !seen.has(l.to)) pending.push(l.to);
      }
      if (rel === isRel) {
        for (const inferred of inferredTypes.get(at) || []) {
          if (!seen.has(inferred)) pending.push(inferred);
        }
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
  // How a thing stands on one of its quantities is state: a drum that was cold
  // and is now hot is hot, and was cold. Where a signal stamped the moment, the
  // latest stands and the rest are history — one quantity at a time, since a
  // drum may be hot and heavy at once.
  function currentState(links, rel) {
    // Where a thing is is state too, and a placement says which one it is in
    // rather than which quantity it stands on: the latest of them all.
    if (rel != null && anchors.placement != null && reaches(rel, isRel).has(anchors.placement)) {
      const stamped = links.filter((l) => Number.isInteger(l.at));
      if (stamped.length === 0) return links;
      const top = Math.max(...stamped.map((l) => l.at));
      return links.filter((l) => !Number.isInteger(l.at) || l.at === top);
    }
    const on = (id) => {
      if (anchors.measure == null) return null;
      for (const l of terms.get(id)?.links || []) if (l.rel === anchors.measure) return l.to;
      return null;
    };
    const latest = new Map();
    const rest = [];
    for (const l of links) {
      const quantity = Number.isInteger(l.at) ? on(l.to) : null;
      if (quantity == null) {
        rest.push(l);
        continue;
      }
      const held = latest.get(quantity);
      if (!held || (l.at ?? -1) >= (held.at ?? -1)) latest.set(quantity, l);
    }
    return [...rest, ...latest.values()];
  }

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

  const domainCache = new Map();
  const rangeCache = new Map();
  function declaredKinds(rel, declaration) {
    const out = new Set();
    if (declaration == null) return out;
    for (const broader of relationAncestors(rel)) {
      for (const link of terms.get(broader)?.links || []) {
        if (!link.not && link.rel === declaration) out.add(link.to);
      }
    }
    return out;
  }

  // Converse relations exchange their subject and object constraints. A fact
  // written as `vehicle belongs-to person` therefore carries the same typing
  // as `person owns vehicle`, without duplicating schema declarations.
  function constraintKinds(rel, side) {
    const cache = side === 'domain' ? domainCache : rangeCache;
    if (cache.has(rel)) return cache.get(rel);
    const own = side === 'domain' ? domainRel : rangeRel;
    const opposite = side === 'domain' ? rangeRel : domainRel;
    const out = declaredKinds(rel, own);
    for (const broader of relationAncestors(rel)) {
      for (const converse of converseBy.get(broader) || []) {
        for (const kind of declaredKinds(converse, opposite)) out.add(kind);
      }
    }
    cache.set(rel, out);
    return out;
  }

  // Domain and range are implications, not copied classification edges. They
  // are compiled once so every later kind walk sees the same deterministic
  // closure while the authored world remains unchanged.
  if (domainRel != null || rangeRel != null) {
    const infer = (id, kinds) => {
      if (kinds.size === 0) return;
      if (!inferredTypes.has(id)) inferredTypes.set(id, new Set());
      for (const kind of kinds) inferredTypes.get(id).add(kind);
    };
    for (const term of terms.values()) {
      for (const link of term.links || []) {
        if (link.not) continue;
        infer(term.id, constraintKinds(link.rel, 'domain'));
        infer(link.to, constraintKinds(link.rel, 'range'));
      }
    }
  }

  function reflexiveAt(id, rel) {
    if (!terms.get(rel)?.reflexive || !terms.has(id)) return false;
    const required = [
      ...constraintKinds(rel, 'domain'),
      ...constraintKinds(rel, 'range'),
    ];
    return required.every((kind) => reaches(id, isRel).has(kind));
  }

  function semanticClassificationRelation(
    subject,
    object,
    individual = null,
  ) {
    const isIndividual = individual ?? [...equivalents(subject)].some(
      (representative) => terms.get(representative)?.individual,
    );
    const property = anchors.property ?? null;
    if (property != null && reaches(object, isRel).has(property)) {
      if (!isIndividual && reaches(subject, isRel).has(property)) return subtypeRel ?? isRel;
      return predicationRel ?? isRel;
    }
    return isIndividual && instanceRel != null
      ? instanceRel
      : subtypeRel ?? isRel;
  }

  // Edges stated in this direction, including facts using a narrower
  // relation, before any declared converse is normalized.
  function variantLinks(id, rel) {
    const links = [];
    const variants = new Set(relationVariants(rel));
    if (rel === isRel) {
      if (subtypeRel != null) variants.add(subtypeRel);
      if (instanceRel != null) variants.add(instanceRel);
      if (predicationRel != null) variants.add(predicationRel);
    }
    for (const variant of variants) {
      for (const link of terms.get(id)?.links || []) {
        if (!link.not && link.rel === variant) links.push({ ...link });
      }
    }
    if (rel === subtypeRel || rel === instanceRel || rel === predicationRel) {
      for (const link of terms.get(id)?.links || []) {
        if (
          !link.not &&
          link.rel === isRel &&
          semanticClassificationRelation(id, link.to) === rel
        ) links.push({ ...link, rel });
      }
    }
    if (rel === isRel) {
      for (const to of inferredTypes.get(id) || []) links.push({ rel, to });
    }
    return currentFunctional(links, rel);
  }

  // Facts written through a relation declared this one's converse, held by the
  // term they point at. Asking one term what points at it is a walk of the
  // whole world, and every term asks; so the walk is made once per relation and
  // kept, in the order the terms themselves are in.
  const converseCache = new Map();
  function converseLinks(rel) {
    if (converseCache.has(rel)) return converseCache.get(rel);
    const index = new Map();
    for (const variant of relationVariants(rel)) {
      for (const other of converseBy.get(variant) || []) {
        for (const term of terms.values()) {
          // Read the other way round, state is still state, and it is the term
          // it was written on that says which of it is current: a drum moved
          // from a box to a shelf leaves the box holding nothing, and the box's
          // own links cannot tell — the drum has to be asked.
          const written = (term.links || []).filter((l) => !l.not && l.rel === other);
          for (const link of currentState(written, other)) {
            if (!index.has(link.to)) index.set(link.to, []);
            index.get(link.to).push({ ...link, to: term.id });
          }
        }
      }
    }
    converseCache.set(rel, index);
    return index;
  }

  // Direct edges plus facts written through a declared converse, normalized
  // into the requested direction before relation characteristics are applied.
  function directedLinks(id, rel) {
    const links = variantLinks(id, rel);
    for (const link of converseLinks(rel).get(id) || []) links.push({ ...link });
    return currentFunctional(links, rel);
  }

  // One step through a relation includes links stated through its declared
  // converse. This makes a fact written as `b after a` the same edge as `a
  // before b`, including when a transitive walk contains facts written from
  // both directions. The world supplies the converse relation and names none.
  function rawRelated(id, rel) {
    // What is so now, not everything that was ever so. A stamped link is state
    // — how many, where a thing is, how it stands on one of its quantities —
    // and the latest of each supersedes the ones before it, which stay on the
    // record as history.
    const direct = currentState(directedLinks(id, rel), rel);
    const out = new Set(direct.map((link) => link.to));
    if (reflexiveAt(id, rel)) out.add(id);
    if (terms.get(rel)?.symmetric) {
      for (const subject of pointingAt(rel).get(id) || []) out.add(subject);
    }
    return out;
  }

  // Which terms reach a term by one relation. A symmetric relation asks this of
  // every term, so it is compiled in one pass and kept rather than recomputed
  // for each term in turn.
  const pointingCache = new Map();
  function pointingAt(rel) {
    if (pointingCache.has(rel)) return pointingCache.get(rel);
    const index = new Map();
    pointingCache.set(rel, index);
    for (const term of terms.values()) {
      for (const link of directedLinks(term.id, rel)) {
        if (!index.has(link.to)) index.set(link.to, new Set());
        index.get(link.to).add(term.id);
      }
    }
    return index;
  }

  // The same index over edges as they are stated, without converse
  // normalization — what `linked` reads back.
  const statedCache = new Map();
  function statedAt(rel) {
    if (statedCache.has(rel)) return statedCache.get(rel);
    const index = new Map();
    statedCache.set(rel, index);
    for (const term of terms.values()) {
      for (const link of variantLinks(term.id, rel)) {
        if (!index.has(link.to)) index.set(link.to, new Set());
        index.get(link.to).add(term.id);
      }
    }
    return index;
  }

  function related(id, rel) {
    if (!terms.has(id)) return new Set();
    if (rel === sameRel) return new Set(equivalents(id));
    const out = new Set();
    for (const subject of equivalents(id)) {
      for (const object of rawRelated(subject, rel)) {
        for (const equivalent of equivalents(object)) out.add(equivalent);
      }
    }
    return out;
  }

  // Everything said of a thing: what was said of it, and what was said of any
  // kind it is one of.
  function predicated(id) {
    const out = new Set();
    if (predicationRel == null) return out;
    for (const kind of reaches(id, isRel)) {
      for (const said of related(kind, predicationRel)) out.add(said);
    }
    return out;
  }

  // How much of one thing another holds, under any narrower way of saying it.
  //
  // What is held may be the kind itself, or a thing that is one of it: four
  // balls in a box are a thing of their own, which is a ball and is however
  // many it is. Asking how many balls the box holds finds them either way.
  // Each such thing is counted once, however many names it goes by, and where
  // there are several they are added.
  function heldBy(id, rel, object) {
    if (!terms.has(id) || !terms.has(object) || rel == null) return null;
    const ways = new Set(relationVariants(rel));
    const latest = new Map();
    for (const subject of equivalents(id)) {
      for (const l of terms.get(subject)?.links || []) {
        if (l.not || !ways.has(l.rel) || !Number.isInteger(l.quantity)) continue;
        if (!equivalents(object).has(l.to) && !reaches(l.to, isRel).has(object)) continue;
        const which = canonical(l.to);
        const had = latest.get(which);
        if (!had || (l.at ?? -1) >= (had.at ?? -1)) latest.set(which, l);
      }
    }
    if (latest.size === 0) return null;
    let total = 0;
    for (const l of latest.values()) total += l.quantity;
    return total;
  }

  const reachedBy = new Map();
  const partialBy = new Map();
  const walking = new Set();
  // A walk that had to cut a cycle short is not the whole answer, so it is not
  // kept. Only a walk that ran to the end is.
  let cut = false;
  function relatedBy(id, rel) {
    const key = `${id}:${rel}`;
    if (reachedBy.has(key)) return reachedBy.get(key);
    // A composition that leads back to where it started stops here. What the
    // walk found on the way out still counts; going round again finds nothing.
    if (walking.has(key)) {
      cut = true;
      return partialBy.get(key) || new Set();
    }
    const outermost = walking.size === 0;
    if (outermost) cut = false;
    walking.add(key);
    const relation = terms.get(rel);
    const found = new Set();
    partialBy.set(key, found);
    if (relation && relation.transitive) {
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
    } else {
      for (const next of related(id, rel)) found.add(next);
    }
    // A composition may give back the relation it starts with — a father's
    // sibling's father is a father — so what one round adds is what the next
    // round steps from. Rounds run until nothing new is reached.
    let grew = true;
    while (grew) {
      grew = false;
      for (const { gives, leading, trailing } of compositions) {
        if (gives !== rel) continue;
        for (const middle of [...relatedBy(id, leading)]) {
          for (const end of relatedBy(middle, trailing)) {
            if (found.has(end)) continue;
            found.add(end);
            grew = true;
          }
        }
      }
    }
    walking.delete(key);
    partialBy.delete(key);
    if (!cut || outermost) reachedBy.set(key, found);
    if (outermost) cut = false;
    return found;
  }

  return {
    data,
    anchors,
    // The relation the world's own links are made of, and the weakest claim a
    // signal can make: any other relation a signal names is more specific.
    baseRelation: isRel,
    term: (id) => terms.get(id) || null,
    // A term by the name it was given. Being called something is a fact like
    // any other — the thing is joined to the name it is called by — so this
    // walks that link rather than reading a label off the term. A name given in
    // conversation is held nowhere else: no language lists it.
    termNamed: (name) => {
      if (typeof name !== 'string' || anchors.name == null) return null;
      const wanted = name.toLowerCase();
      for (const t of terms.values()) {
        if (typeof t.symbol !== 'string' || t.symbol.toLowerCase() !== wanted) continue;
        for (const candidate of terms.values()) {
          if (related(candidate.id, anchors.name).has(t.id)) return canonical(candidate.id);
        }
      }
      return null;
    },
    // Whether two terms exclude each other as kinds: anything either of them is
    // a kind of, standing `different` to anything the other is a kind of. This
    // is what lets the brain say no rather than only fail to say yes.
    excludes: (x, y) => {
      if (x == null || y == null) return false;
      if (canonical(x) === canonical(y)) return false;
      const xs = reaches(x, isRel);
      const ys = reaches(y, isRel);

      // Written out pair by pair, either way round.
      if (differentRel != null) {
        for (const [these, those] of [
          [xs, ys],
          [ys, xs],
        ]) {
          for (const d of these) {
            for (const other of relatedBy(d, differentRel)) {
              if ([...those].some((candidate) => equivalents(candidate).has(other))) return true;
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
    // Who stands in a relation to a thing, counting the relations reached by
    // composition as well as the ones written down.
    standing: (id, rel) => {
      if (id == null || rel == null) return [];
      const out = new Set();
      for (const t of terms.values()) {
        if (relatedBy(t.id, rel).has(id)) out.add(canonical(t.id));
      }
      return [...out];
    },
    members: (id, rel) => {
      if (id == null || rel == null) return [];
      const out = new Set();
      for (const t of terms.values()) {
        if (related(t.id, rel).has(id)) out.add(canonical(t.id));
      }
      return [...out];
    },
    // The value a term names, and the term that names a value. This is the
    // whole of the world's part in arithmetic: which symbol is which number.
    // What follows from those numbers is the brain's, not the world's.
    valueOf: (id) => {
      for (const representative of [...equivalents(id)].sort((a, b) => a - b)) {
        const value = terms.get(representative)?.value;
        if (Number.isInteger(value)) return value;
      }
      return null;
    },
    // The symbols a thing is said as where no language has a word for it. A name
    // is not translated: it is the same in every language, so it is held here
    // rather than in any of them.
    //
    // What a thing is called it is joined to, so the walk goes out along that
    // link first. A term may also carry symbols of its own — a figure is
    // written the same everywhere and is called nothing — and those are read
    // straight off it.
    symbolOf: (id) => {
      if (anchors.name != null) {
        for (const called of related(id, anchors.name)) {
          const symbol = terms.get(called)?.symbol;
          if (typeof symbol === 'string') return symbol;
        }
      }
      for (const representative of [...equivalents(id)].sort((a, b) => a - b)) {
        const symbol = terms.get(representative)?.symbol;
        if (typeof symbol === 'string') return symbol;
      }
      return null;
    },
    termFor: (value) => {
      if (!Number.isInteger(value)) return null;
      for (const t of terms.values()) if (t.value === value) return canonical(t.id);
      return null;
    },
    // Whether the world has been told outright that a relation does not hold.
    // Not finding a path is ignorance; this is a denial, and it is knowledge.
    denies: (id, object, rel) => {
      if (!terms.has(id) || !terms.has(object) || rel == null) return false;
      const statedRelations = new Set(relationAncestors(rel));
      if (rel === isRel) {
        if (subtypeRel != null) statedRelations.add(subtypeRel);
        if (instanceRel != null) statedRelations.add(instanceRel);
        if (predicationRel != null) statedRelations.add(predicationRel);
      }
      for (const subject of equivalents(id)) {
        const t = terms.get(subject);
        for (const candidate of equivalents(object)) {
          for (const stated of statedRelations) {
            if ((t.links || []).some((l) => l.not && l.rel === stated && l.to === candidate)) return true;
            const other = terms.get(candidate);
            if (
              terms.get(stated)?.symmetric &&
              other &&
              (other.links || []).some((l) => l.not && l.rel === stated && l.to === subject)
            ) return true;
            for (const back of converseBy.get(stated) || []) {
              if (other && (other.links || []).some((l) => l.not && l.rel === back && l.to === subject)) {
                return true;
              }
            }
          }
        }
      }
      return false;
    },
    // What a term claims, where it is a claim at all.
    //
    // A claim is held the way an occurrence is held: something that exists
    // once, which is an instance of the relation it claims, and which says
    // which two things stand in it. Nothing new carries it — a relation is a
    // term, a role is a relation, and denying the claim is denying that it is
    // an instance of anything, which is the `not` every link already has.
    //
    // A term that is not a claim reaches nothing here, and that is not a
    // failure: most terms are not claims.
    claimOf: (id) => {
      if (anchors.subject == null || anchors.object == null || !terms.has(id)) return null;
      const subject = related(id, anchors.subject);
      const object = related(id, anchors.object);
      if (subject.size === 0 || object.size === 0) return null;
      const term = terms.get(id);
      // Which relation is claimed, said the broad way or the precise one. A
      // claim written down by the brain says it the precise way, because
      // memory keeps the stronger primitive wherever it can.
      const stated = (term.links || []).find(
        (l) =>
          (l.rel === isRel || l.rel === instanceRel || l.rel === subtypeRel) &&
          terms.get(l.to) &&
          reaches(l.to, isRel).has(anchors.relation),
      );
      if (!stated) return null;
      return {
        subject: canonical([...subject][0]),
        relation: stated.to,
        object: canonical([...object][0]),
        not: Boolean(stated.not),
        at: Number.isInteger(stated.at) ? stated.at : null,
      };
    },
    // A kind names many; an individual exists once. Everything else about a term
    // is the same either way — an individual simply `is` its kind.
    isIndividual: (id) => {
      return [...equivalents(id)].some((representative) => terms.get(representative)?.individual);
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
    domains: (rel) => [...constraintKinds(rel, 'domain')],
    ranges: (rel) => [...constraintKinds(rel, 'range')],
    subrelationOf: (relation, broader) => relationAncestors(relation).has(broader),
    // The narrower ways of saying one relation, the relation itself among
    // them. Holding is holding, but a count was written under one of its
    // words, and revising it writes under the same one.
    narrower: (rel) => (rel == null ? [] : [...relationVariants(rel)]),
    related: (id, rel) => [...related(id, rel)],
    equivalents: (id) => [...equivalents(id)],
    same: (left, right) => canonical(left) != null && canonical(left) === canonical(right),
    classificationRelation: semanticClassificationRelation,
    // What is said of a thing, and of every kind it is one of. A property of a
    // kind is a property of each thing that is one — that is the whole of what
    // saying it of all of them says, and the denial of one already reads this
    // way: told no cat is white, the brain says a particular cat is not.
    //
    // Saying it of some of them makes one of them and says it of that one, so
    // nothing here reaches the kind and this walk cannot make it universal.
    predicates: (id) => (predicationRel == null ? [] : [...predicated(id)]),
    kinds: (id) => {
      const out = new Set();
      for (const representative of equivalents(id)) {
        for (const inferred of inferredTypes.get(representative) || []) out.add(canonical(inferred));
        for (const link of terms.get(representative)?.links || []) {
          if (link.not) continue;
          if (link.rel === subtypeRel || link.rel === instanceRel) out.add(canonical(link.to));
          if (link.rel === isRel && !legacyPredication(representative, link.to)) out.add(canonical(link.to));
        }
      }
      return [...out];
    },
    individualsOf: (kind) => {
      const out = new Set();
      for (const t of terms.values()) {
        if (![...equivalents(t.id)].some((representative) => terms.get(representative)?.individual)) continue;
        if (reaches(t.id, isRel).has(kind)) out.add(canonical(t.id));
      }
      return [...out];
    },
    // The one individual of a kind. None yet, or more than one, and there is no
    // "the" to resolve — the brain does not guess which was meant.
    oneOf: (kind) => {
      let found = null;
      for (const t of terms.values()) {
        if (![...equivalents(t.id)].some((representative) => terms.get(representative)?.individual)) continue;
        if (!reaches(t.id, isRel).has(kind)) continue;
        const candidate = canonical(t.id);
        if (found != null && found !== candidate) return null;
        found = candidate;
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
    // Asked how much of something a thing holds, every narrower way of saying
    // it answers: a basket that holds three apples and a person who has five
    // are both holding, and which word the count was written under is not the
    // question. The world says which relations are narrower than which; the
    // count is read through them.
    held: (id, rel, object) => heldBy(id, rel, object),

    // How many of a kind there are, all told: every count anything holds of it,
    // or of a kind of it, added together. Two boxes of four balls are eight
    // balls, and it does not matter which box was spoken of last. Where nothing
    // holds any, there is no count — which is not the same as none.
    heldAll: (kind, rel) => {
      if (kind == null || rel == null || !terms.has(kind)) return null;
      let total = null;
      for (const t of terms.values()) {
        // Only what exists once is counted up. A kind holding a count says how
        // many any of them has — a hand has five fingers — and adding those
        // across the world would be counting hands nobody mentioned.
        if (!t.individual) continue;
        for (const of of related(t.id, rel)) {
          if (!reaches(of, isRel).has(kind)) continue;
          const many = heldBy(t.id, rel, of);
          if (many != null) total = (total ?? 0) + many;
        }
      }
      return total;
    },
    // Everything the world has been told about what a thing held, in order.
    // Revising a count does not erase what was so before it.
    heldOver: (id, rel, object) => {
      if (!terms.has(id) || !terms.has(object) || rel == null) return [];
      const ways = new Set(relationVariants(rel));
      const history = [...equivalents(id)].flatMap((subject) => terms.get(subject)?.links || [])
        .filter((l) =>
          !l.not &&
          ways.has(l.rel) &&
          (equivalents(object).has(l.to) || reaches(l.to, isRel).has(object)) &&
          Number.isInteger(l.quantity))
        .map((l) => ({ quantity: l.quantity, at: l.at ?? 0 }))
        .sort((x, y) => x.at - y.at);
      return history.filter(
        (entry, index) => history.findIndex(
          (other) => other.at === entry.at && other.quantity === entry.quantity,
        ) === index,
      );
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
      if (!terms.has(id) || rel == null) return [];
      if (rel === sameRel) return [...equivalents(id)];
      let links = [...equivalents(id)].flatMap((subject) => variantLinks(subject, rel));
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
      } else {
        links = currentState(links);
      }
      const found = new Set(links.map((l) => canonical(l.to)));
      if (terms.get(rel)?.symmetric) {
        const stated = statedAt(rel);
        for (const equivalent of equivalents(id)) {
          for (const subject of stated.get(equivalent) || []) found.add(canonical(subject));
        }
      }
      if (reflexiveAt(id, rel)) found.add(canonical(id));
      return [...found];
    },
    // Does `id` reach `ancestorId` by following `rel` (the `is` relation by
    // default)? The relation is a term like any other, so a signal can name it.
    isA: (id, ancestorId, rel = isRel) => {
      if (ancestorId == null || id == null || rel == null) return false;
      if (rel === isRel) {
        return reaches(id, rel).has(ancestorId) ||
          (predicationRel != null && predicated(id).has(ancestorId));
      }
      return relatedBy(id, rel).has(ancestorId);
    },
  };
}

export async function loadWorldFile(path) {
  const { file } = await import('runtime:fs');
  return fromWorldData(await file(path).json());
}
