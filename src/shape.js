// The shape all knowledge must take.
//
// Every source — the base world, a knowledge file, a language — passes through
// here before the brain sees it, and there is one door: internal and external
// knowledge are checked by the same rules. A source that does not fit is
// refused, never trimmed to fit. Silently accepting half a source is how the
// brain ends up reasoning over knowledge it does not have.

class ShapeError extends Error {}

function fail(where, why) {
  throw new ShapeError(`${where}: ${why}`);
}

// What a word may mark: which one is meant, which side of the conversation, or
// the thing the conversation was last about. `prior` stands for the last
// action — what was just done, repeated. `idea` stands for the last thing
// said and checked — an idea, asked about again but never asserted.
const MARKS = ['new', 'known', 'unknown', 'from', 'to', 'spoken', 'named', 'prior', 'idea'];
const PERSONS = ['first', 'second', 'third'];
const NUMBERS = ['singular', 'plural'];
const ENTITY_CLASSES = ['living', 'nonliving'];
const COGNITIVE_FUNCTIONS = [
  'comparison',
  'condition',
  'extreme',
  'determiner',
  'encloses',
  'join',
  'modal',
  'modifier',
  'naming',
  'possessor',
];

function isId(v) {
  return Number.isSafeInteger(v) && v >= 0;
}

// One part of speech or several. Both are written the same way everywhere a
// part of speech is named.
function namesParts(pos) {
  const each = Array.isArray(pos) ? pos : [pos];
  return each.length > 0 && each.every((one) => typeof one === 'string' && one !== '');
}

// A whole number, or an exact decimal written out.
function isAmount(value) {
  if (Number.isSafeInteger(value)) return true;
  return typeof value === 'string' && /^-?\d+\.\d+$/.test(value);
}

function onlyKeys(data, allowed, where) {
  for (const key of Object.keys(data)) {
    if (!allowed.includes(key)) fail(where, `unknown field "${key}"`);
  }
}

// ---------------------------------------------------------------------------
// World, and knowledge files, which take the same shape — a knowledge file is
// simply a world that expects to be merged into another.
// ---------------------------------------------------------------------------
export function checkWorld(data, where = 'world') {
  if (!data || typeof data !== 'object') fail(where, 'must be an object');
  onlyKeys(data, ['anchors', 'relations', 'terms'], where);

  if (!Array.isArray(data.terms)) fail(where, 'terms must be an array');

  const byId = new Map();
  const byName = new Map();
  for (const t of data.terms) {
    const at = `${where} term ${JSON.stringify(t && t.id)}`;
    if (!t || typeof t !== 'object') fail(where, 'every term must be an object');
    onlyKeys(t, ['id', 'name', 'links', 'value', 'individual', 'disjoint', 'transitive', 'asymmetric', 'symmetric', 'reflexive', 'irreflexive', 'functional', 'symbol'], at);
    if (!isId(t.id)) fail(at, 'id must be a non-negative integer');
    if (typeof t.name !== 'string' || t.name === '') fail(at, 'name must be a non-empty string');
    if (byId.has(t.id)) fail(at, 'duplicate id');
    // The symbols a thing is said as, where no language translates it: a name
    // is the same in every language, so it is held with the thing, not with the
    // words. `name` remains a label the engine never reads.
    if (t.symbol !== undefined && (typeof t.symbol !== 'string' || t.symbol === '')) {
      fail(at, 'symbol, where present, must be a non-empty string');
    }
    // Two terms with one name are one thing written twice, and the brain would
    // reason over each of them as though the other were not there.
    if (byName.has(t.name)) {
      fail(at, `"${t.name}" is already term ${byName.get(t.name)} — one thing, one term`);
    }
    if (t.disjoint !== undefined && t.disjoint !== true) {
      fail(at, 'disjoint, where present, must be true');
    }
    if (t.individual !== undefined && t.individual !== true) {
      fail(at, 'individual, where present, must be true');
    }
    if (t.transitive !== undefined && t.transitive !== true) {
      fail(at, 'transitive, where present, must be true');
    }
    if (t.asymmetric !== undefined && t.asymmetric !== true) {
      fail(at, 'asymmetric, where present, must be true');
    }
    if (t.symmetric !== undefined && t.symmetric !== true) {
      fail(at, 'symmetric, where present, must be true');
    }
    if (t.reflexive !== undefined && t.reflexive !== true) {
      fail(at, 'reflexive, where present, must be true');
    }
    if (t.irreflexive !== undefined && t.irreflexive !== true) {
      fail(at, 'irreflexive, where present, must be true');
    }
    if (t.functional !== undefined && t.functional !== true) {
      fail(at, 'functional, where present, must be true');
    }
    if (t.symmetric && t.asymmetric) {
      fail(at, 'a relation cannot be both symmetric and asymmetric');
    }
    if (t.reflexive && (t.irreflexive || t.asymmetric)) {
      fail(at, 'a relation cannot be both reflexive and irreflexive or asymmetric');
    }
    if (t.value !== undefined && !Number.isSafeInteger(t.value)) {
      fail(at, 'value must be a safe whole number — it is what the term names, not a label');
    }
    if (!Array.isArray(t.links)) fail(at, 'links must be an array');
    byId.set(t.id, t);
    byName.set(t.name, t.id);
  }

  for (const t of data.terms) {
    const at = `${where} term ${t.id}`;
    const seen = new Set();
    const polarities = new Map();
    for (const l of t.links) {
      if (!l || typeof l !== 'object') fail(at, 'every link must be an object');
      onlyKeys(l, ['rel', 'to', 'quantity', 'at', 'not'], at);
      if (!isId(l.rel)) fail(at, 'link rel must be a non-negative integer');
      if (!isId(l.to)) fail(at, 'link to must be a non-negative integer');
      // An amount is exact. A whole one is a number; one that is not is
      // written out, digit for digit, because a machine that counts in halves
      // cannot hold a tenth and the brain will not answer a hair beside what
      // it was told. Anything else is not an amount.
      if (l.quantity !== undefined && !isAmount(l.quantity)) {
        fail(at, 'link quantity must be a whole number or an exact decimal');
      }
      if (l.at !== undefined && !(Number.isSafeInteger(l.at) && l.at >= 0)) {
        fail(at, 'link at must be a safe whole number of ticks');
      }
      if (l.not !== undefined && l.not !== true) {
        fail(at, 'link not, where present, must be true — it denies the link');
      }
      const key = `${l.rel}:${l.to}:${l.at ?? ''}:${l.not ? 'not' : ''}`;
      if (seen.has(key)) fail(at, `duplicate link ${key}`);
      seen.add(key);
      const proposition = `${l.rel}:${l.to}:${l.at ?? ''}`;
      const polarity = l.not ? 'denied' : 'held';
      if (polarities.has(proposition) && polarities.get(proposition) !== polarity) {
        fail(at, `link ${proposition} is both held and denied`);
      }
      polarities.set(proposition, polarity);
    }
  }

  if (data.relations !== undefined) {
    if (!data.relations || typeof data.relations !== 'object') {
      fail(where, 'relations must be an object');
    }
    for (const [name, id] of Object.entries(data.relations)) {
      if (!isId(id)) fail(`${where} relation "${name}"`, 'must be a term id');
    }
  }

  if (data.anchors !== undefined) {
    if (!data.anchors || typeof data.anchors !== 'object') {
      fail(where, 'anchors must be an object');
    }
    for (const [name, id] of Object.entries(data.anchors)) {
      if (!isId(id)) fail(`${where} anchor "${name}"`, 'must be a term id');
    }
  }

  return data;
}

// Every id a source points at must exist once the sources are merged. Checked
// after merging, because a knowledge file may name terms from the base world.
export function checkWhole(data, origin = null, where = 'world') {
  // Name the source a bad term came from, not the merged whole.
  const from = (id) => (origin && origin.get(id)) || where;
  const ids = new Set(data.terms.map((t) => t.id));
  const relationIds = new Set(Object.values(data.relations || {}));

  // Two sources may each be sound and still name one thing twice between them.
  const named = new Map();
  for (const t of data.terms) {
    if (named.has(t.name)) {
      fail(
        `${from(t.id)} term ${t.id}`,
        `"${t.name}" is already term ${named.get(t.name)} — one thing, one term`,
      );
    }
    named.set(t.name, t.id);
  }
  for (const t of data.terms) {
    const propositions = new Map();
    for (const l of t.links) {
      if (!ids.has(l.to)) fail(`${from(t.id)} term ${t.id}`, `link to unknown term ${l.to}`);
      if (!ids.has(l.rel)) fail(`${from(t.id)} term ${t.id}`, `link by unknown term ${l.rel}`);
      const key = `${l.rel}:${l.to}:${l.at ?? ''}`;
      const held = propositions.get(key);
      if (held && Boolean(held.not) !== Boolean(l.not)) {
        fail(`${from(t.id)} term ${t.id}`, `link ${key} is both held and denied`);
      }
      if (
        held &&
        held.quantity !== undefined &&
        l.quantity !== undefined &&
        held.quantity !== l.quantity
      ) {
        fail(`${from(t.id)} term ${t.id}`, `link ${key} has conflicting quantities`);
      }
      propositions.set(key, l);
    }
  }
  for (const [name, id] of Object.entries(data.relations || {})) {
    if (!ids.has(id)) fail(`${where} relation "${name}"`, `unknown term ${id}`);
  }
  for (const [name, id] of Object.entries(data.anchors || {})) {
    if (!ids.has(id)) fail(`${where} anchor "${name}"`, `unknown term ${id}`);
  }
  const sameRelation = (data.relations && data.relations.same) ?? data.anchors?.same;
  if (sameRelation != null) {
    const relation = data.terms.find((term) => term.id === sameRelation);
    if (!relation?.reflexive || !relation.symmetric || !relation.transitive) {
      fail(`${from(sameRelation)} term ${sameRelation}`, 'same must be reflexive, symmetric and transitive');
    }
  }
  const differentRelation = (data.relations && data.relations.different) ?? data.anchors?.different;
  if (differentRelation != null) {
    const relation = data.terms.find((term) => term.id === differentRelation);
    if (!relation?.symmetric || !relation.irreflexive) {
      fail(`${from(differentRelation)} term ${differentRelation}`, 'different must be symmetric and irreflexive');
    }
  }
  if (data.terms.length > 0 && relationIds.size === 0) {
    fail(where, 'terms but no relations declared — nothing could be walked');
  }

  const subtype = data.anchors && data.anchors.subtype;
  const instance = data.anchors && data.anchors.instance;
  const predication = data.anchors && data.anchors.predication;
  const classificationRelations = new Set(
    [data.relations && data.relations.is, subtype, instance].filter((id) => id != null),
  );

  // Classification is a partial order. A cycle would make each kind an
  // ancestor of itself through another kind and collapse distinct concepts.
  const is = data.relations && data.relations.is;
  if (is != null) {
    const edges = new Map(data.terms.map((t) => [
      t.id,
      t.links.filter((l) => !l.not && classificationRelations.has(l.rel)).map((l) => l.to),
    ]));
    if (subtype != null || instance != null) {
      const byId = new Map(data.terms.map((term) => [term.id, term]));
      for (const term of data.terms) {
        for (const link of term.links) {
          if (link.rel === subtype && (term.individual || byId.get(link.to)?.individual)) {
            fail(`${from(term.id)} term ${term.id}`, 'subtype must connect kinds');
          }
          if (
            link.rel === instance &&
            (!term.individual || byId.get(link.to)?.individual)
          ) fail(`${from(term.id)} term ${term.id}`, 'instance must connect an individual to a kind');
        }
      }
    }
    const visiting = new Set();
    const visited = new Set();
    const visit = (id) => {
      if (visiting.has(id)) fail(`${from(id)} term ${id}`, 'classification cycle');
      if (visited.has(id)) return;
      visiting.add(id);
      for (const next of edges.get(id) || []) visit(next);
      visiting.delete(id);
      visited.add(id);
    };
    for (const id of edges.keys()) visit(id);

    const subrelation = data.anchors && data.anchors.subrelation;
    if (subrelation != null) {
      const relationKind = data.anchors && data.anchors.relation;
      const isA = (start, target) => {
        const seen = new Set();
        const pending = [start];
        while (pending.length) {
          const here = pending.pop();
          if (here === target) return true;
          if (seen.has(here)) continue;
          seen.add(here);
          pending.push(...(edges.get(here) || []));
        }
        return false;
      };
      const hierarchy = new Map(data.terms.map((term) => [term.id, []]));
      for (const term of data.terms) {
        for (const link of term.links) {
          if (link.not || link.rel !== subrelation) continue;
          if (relationKind != null && (!isA(term.id, relationKind) || !isA(link.to, relationKind))) {
            fail(`${from(term.id)} term ${term.id}`, 'subrelation endpoints must both be relations');
          }
          hierarchy.get(term.id).push(link.to);
        }
      }
      const active = new Set();
      const done = new Set();
      const climb = (id) => {
        if (active.has(id)) fail(`${from(id)} term ${id}`, 'subrelation cycle');
        if (done.has(id)) return;
        active.add(id);
        for (const next of hierarchy.get(id) || []) climb(next);
        active.delete(id);
        done.add(id);
      };
      for (const id of hierarchy.keys()) climb(id);
    }
  }

  const subrelation = data.anchors && data.anchors.subrelation;
  const relationParents = new Map(data.terms.map((term) => [term.id, []]));
  if (subrelation != null) {
    for (const term of data.terms) {
      for (const link of term.links) {
        if (!link.not && link.rel === subrelation) relationParents.get(term.id).push(link.to);
      }
    }
  }
  const relationAncestorCache = new Map();
  const relationVariantCache = new Map();
  const relationAncestors = (id) => {
    if (relationAncestorCache.has(id)) return relationAncestorCache.get(id);
    const found = new Set();
    const pending = [id];
    while (pending.length) {
      const here = pending.pop();
      if (found.has(here)) continue;
      found.add(here);
      pending.push(...(relationParents.get(here) || []));
    }
    relationAncestorCache.set(id, found);
    return found;
  };
  const relationVariants = (id) => {
    if (!relationVariantCache.has(id)) {
      relationVariantCache.set(id, new Set(
        data.terms.map((term) => term.id).filter((candidate) => relationAncestors(candidate).has(id)),
      ));
    }
    return relationVariantCache.get(id);
  };

  const termsById = new Map(data.terms.map((term) => [term.id, term]));
  const classificationAncestorCache = new Map();
  const classificationAncestors = (id) => {
    if (classificationAncestorCache.has(id)) return classificationAncestorCache.get(id);
    const found = new Set();
    const pending = [id];
    while (pending.length) {
      const here = pending.pop();
      if (found.has(here)) continue;
      found.add(here);
      for (const link of termsById.get(here)?.links || []) {
        if (!link.not && classificationRelations.has(link.rel)) pending.push(link.to);
      }
    }
    classificationAncestorCache.set(id, found);
    return found;
  };

  const propertyKind = data.anchors && data.anchors.property;
  const relationClass = data.anchors && data.anchors.relation;
  if (
    predication != null &&
    relationClass != null &&
    !classificationAncestors(predication).has(relationClass)
  ) fail(`${from(predication)} term ${predication}`, 'predication anchor must be a relation');
  for (const term of data.terms) {
    for (const link of term.links) {
      if (link.rel !== predication) continue;
      if (propertyKind == null || !classificationAncestors(link.to).has(propertyKind)) {
        fail(`${from(term.id)} term ${term.id}`, 'predication must name a property');
      }
    }
  }

  const domain = data.anchors && data.anchors.domain;
  const range = data.anchors && data.anchors.range;
  const relationKind = data.anchors && data.anchors.relation;
  for (const [name, declaration] of [['domain', domain], ['range', range]]) {
    if (
      declaration != null &&
      relationKind != null &&
      !classificationAncestors(declaration).has(relationKind)
    ) fail(`${from(declaration)} term ${declaration}`, `${name} anchor must be a relation`);
  }
  for (const term of data.terms) {
    for (const link of term.links) {
      if (link.not || (link.rel !== domain && link.rel !== range)) continue;
      if (relationKind != null && !classificationAncestors(term.id).has(relationKind)) {
        fail(`${from(term.id)} term ${term.id}`, 'domain and range may only constrain relations');
      }
      if (termsById.get(link.to)?.individual) {
        fail(`${from(term.id)} term ${term.id}`, 'domain and range must name kinds, not individuals');
      }
    }
  }

  const converseRelation = data.anchors && data.anchors.converse;
  const constraintCache = new Map();
  const schemaConversesOf = (relation) => {
    const out = new Set();
    if (converseRelation == null) return out;
    for (const candidate of data.terms) {
      for (const link of candidate.links) {
        if (link.not || link.rel !== converseRelation) continue;
        if (candidate.id === relation) out.add(link.to);
        if (link.to === relation) out.add(candidate.id);
      }
    }
    return out;
  };
  const declaredKinds = (relation, declaration) => {
    const out = new Set();
    if (declaration == null) return out;
    for (const broader of relationAncestors(relation)) {
      for (const link of termsById.get(broader)?.links || []) {
        if (!link.not && link.rel === declaration) out.add(link.to);
      }
    }
    return out;
  };
  const constraintKinds = (relation, side) => {
    const key = `${relation}:${side}`;
    if (constraintCache.has(key)) return constraintCache.get(key);
    const own = side === 'domain' ? domain : range;
    const opposite = side === 'domain' ? range : domain;
    const out = declaredKinds(relation, own);
    if (converseRelation != null) {
      for (const broader of relationAncestors(relation)) {
        for (const other of schemaConversesOf(broader)) {
          for (const kind of declaredKinds(other, opposite)) out.add(kind);
        }
      }
    }
    constraintCache.set(key, out);
    return out;
  };

  const inferredTypes = new Map();
  const infer = (id, kinds) => {
    if (kinds.size === 0) return;
    if (!inferredTypes.has(id)) inferredTypes.set(id, new Set());
    for (const kind of kinds) inferredTypes.get(id).add(kind);
  };
  if (domain != null || range != null) {
    for (const term of data.terms) {
      for (const link of term.links) {
        if (link.not) continue;
        infer(term.id, constraintKinds(link.rel, 'domain'));
        infer(link.to, constraintKinds(link.rel, 'range'));
      }
    }
  }

  const effectiveAncestors = (id) => {
    const found = new Set();
    const pending = [id, ...(inferredTypes.get(id) || [])];
    while (pending.length) {
      const here = pending.pop();
      if (found.has(here)) continue;
      found.add(here);
      for (const link of termsById.get(here)?.links || []) {
        if (!link.not && classificationRelations.has(link.rel)) pending.push(link.to);
      }
    }
    return found;
  };
  const different = (data.relations && data.relations.different) ?? data.anchors?.different;
  const excluded = (left, right) => {
    if (left === right) return false;
    if (different != null) {
      if ((termsById.get(left)?.links || []).some(
        (link) => !link.not && link.rel === different && link.to === right,
      )) return true;
      if ((termsById.get(right)?.links || []).some(
        (link) => !link.not && link.rel === different && link.to === left,
      )) return true;
    }
    for (const parent of (termsById.get(left)?.links || [])
      .filter((link) => !link.not && classificationRelations.has(link.rel))
      .map((link) => link.to)) {
      if (
        termsById.get(parent)?.disjoint &&
        (termsById.get(right)?.links || []).some(
          (link) => !link.not && classificationRelations.has(link.rel) && link.to === parent,
        )
      ) return true;
    }
    return false;
  };

  // Identity is an equivalence class over stored ids, not a destructive merge.
  // Normalize proposition endpoints through that class before accepting the
  // world: equivalent representatives cannot disagree about one fact, stand
  // `different`, or acquire mutually exclusive kinds.
  const same = (data.relations && data.relations.same) ?? data.anchors?.same;
  const identityEdges = new Map(data.terms.map((term) => [term.id, []]));
  if (same != null) {
    for (const term of data.terms) {
      for (const link of term.links) {
        if (link.not || link.rel !== same) continue;
        identityEdges.get(term.id).push(link.to);
        identityEdges.get(link.to).push(term.id);
      }
    }
  }
  const identityCache = new Map();
  const identities = (id) => {
    if (identityCache.has(id)) return identityCache.get(id);
    const found = new Set();
    const pending = [id];
    while (pending.length) {
      const here = pending.pop();
      if (found.has(here)) continue;
      found.add(here);
      pending.push(...(identityEdges.get(here) || []));
    }
    for (const member of found) identityCache.set(member, found);
    return found;
  };
  const identityOf = (id) => Math.min(...identities(id));

  const identityFacts = new Map();
  for (const term of data.terms) {
    for (const link of term.links) {
      let subject = identityOf(term.id);
      let object = identityOf(link.to);
      if (termsById.get(link.rel)?.symmetric && subject > object) {
        [subject, object] = [object, subject];
      }
      const key = `${subject}:${link.rel}:${object}:${link.at ?? ''}`;
      const held = identityFacts.get(key);
      const substitutesIdentity = identities(term.id).size > 1 || identities(link.to).size > 1;
      if (substitutesIdentity && held && Boolean(held.not) !== Boolean(link.not)) {
        fail(`${from(term.id)} term ${term.id}`, `equivalent terms hold and deny ${key}`);
      }
      if (
        substitutesIdentity && held && held.quantity !== undefined && link.quantity !== undefined &&
        held.quantity !== link.quantity
      ) {
        fail(`${from(term.id)} term ${term.id}`, `equivalent terms give ${key} two quantities`);
      }
      identityFacts.set(key, link);
    }
  }
  for (const component of new Set([...identityCache.values()])) {
    if (component.size < 2) continue;
    const effective = new Set();
    const values = new Set();
    for (const member of component) {
      if (termsById.get(member)?.value !== undefined) values.add(termsById.get(member).value);
      for (const ancestor of effectiveAncestors(member)) effective.add(ancestor);
      if ((termsById.get(member)?.links || []).some(
        (link) => link.not && link.rel === same && component.has(link.to),
      )) fail(`${from(member)} term ${member}`, 'equivalent terms are explicitly denied as same');
    }
    for (const member of component) {
      if ((termsById.get(member)?.links || []).some(
        (link) => link.not && classificationRelations.has(link.rel) && effective.has(link.to),
      )) fail(`${from(member)} term ${member}`, 'equivalent terms contradict an inherited classification');
    }
    if (values.size > 1) {
      fail(`${from(identityOf([...component][0]))} identity`, 'equivalent terms name different numeric values');
    }
    for (const left of effective) {
      for (const right of effective) {
        if (excluded(left, right)) {
          fail(`${from(left)} term ${left}`, 'equivalent terms have exclusive identities or kinds');
        }
      }
    }
  }
  for (const [id] of inferredTypes) {
    const effective = effectiveAncestors(id);
    for (const rung of effective) {
      for (const link of termsById.get(rung)?.links || []) {
        if (link.not && classificationRelations.has(link.rel) && effective.has(link.to)) {
          fail(`${from(id)} term ${id}`, 'domain or range inference contradicts a denied classification');
        }
      }
      for (const other of effective) {
        if (excluded(rung, other)) {
          fail(`${from(id)} term ${id}`, 'domain or range inference contradicts an exclusive classification');
        }
      }
    }
  }

  // A narrower positive fact entails every broader one, so an explicit denial
  // of any broader proposition cannot coexist with it.
  const converse = data.anchors && data.anchors.converse;
  const conversesOf = (relation) => {
    const out = new Set();
    if (converse == null) return out;
    for (const candidate of data.terms) {
      for (const link of candidate.links) {
        if (link.not || link.rel !== converse) continue;
        if (candidate.id === relation) out.add(link.to);
        if (link.to === relation) out.add(candidate.id);
      }
    }
    return out;
  };
  for (const term of data.terms) {
    for (const link of term.links) {
      if (link.not) continue;
      for (const broader of relationAncestors(link.rel)) {
        if (broader === link.rel) continue;
        const sameMoment = (other) => (other.at ?? null) === (link.at ?? null);
        if (term.links.some(
          (other) => other.not && other.rel === broader && other.to === link.to && sameMoment(other),
        )) fail(`${from(term.id)} term ${term.id}`, `narrower relation ${link.rel} contradicts denied broader relation ${broader}`);
        const object = data.terms.find((candidate) => candidate.id === link.to);
        if (
          data.terms.find((candidate) => candidate.id === broader)?.symmetric &&
          object &&
          object.links.some(
            (other) => other.not && other.rel === broader && other.to === term.id && sameMoment(other),
          )
        ) fail(`${from(term.id)} term ${term.id}`, `narrower relation ${link.rel} contradicts denied broader relation ${broader}`);
        for (const back of conversesOf(broader)) {
          if (object && object.links.some(
            (other) => other.not && other.rel === back && other.to === term.id && sameMoment(other),
          )) fail(`${from(term.id)} term ${term.id}`, `narrower relation ${link.rel} contradicts denied broader relation ${broader}`);
        }
      }
    }
  }

  // A symmetric edge and its mirror are one proposition. If both are
  // authored, their polarity and same-moment quantity must agree.
  for (const relation of data.terms.filter((term) => term.symmetric)) {
    const variants = relationVariants(relation.id);
    const facts = new Map();
    for (const term of data.terms) {
      for (const link of term.links) {
        if (!variants.has(link.rel) || (link.not && link.rel !== relation.id)) continue;
        const ends = term.id <= link.to ? [term.id, link.to] : [link.to, term.id];
        const key = `${ends[0]}:${ends[1]}:${link.at ?? ''}`;
        const held = facts.get(key);
        if (held && Boolean(held.not) !== Boolean(link.not)) {
          fail(`${from(term.id)} term ${term.id}`, `symmetric relation ${relation.id} both holds and denies ${key}`);
        }
        if (
          held &&
          held.quantity !== undefined &&
          link.quantity !== undefined &&
          held.quantity !== link.quantity
        ) {
          fail(`${from(term.id)} term ${term.id}`, `symmetric relation ${relation.id} gives ${key} two quantities`);
        }
        facts.set(key, link);
      }
    }
  }

  for (const relation of data.terms.filter((term) => term.irreflexive || term.asymmetric)) {
    const variants = relationVariants(relation.id);
    for (const term of data.terms) {
      if (term.links.some((link) => !link.not && variants.has(link.rel) && link.to === term.id)) {
        fail(`${from(term.id)} term ${term.id}`, `irreflexive relation ${relation.id} relates a term to itself`);
      }
    }
  }

  for (const relation of data.terms.filter((term) => term.reflexive)) {
    const required = [
      ...constraintKinds(relation.id, 'domain'),
      ...constraintKinds(relation.id, 'range'),
    ];
    for (const term of data.terms) {
      const eligible = required.length === 0 || required.every(
        (kind) => effectiveAncestors(term.id).has(kind),
      );
      if (!eligible) continue;
      if (term.links.some((link) => link.not && link.rel === relation.id && link.to === term.id)) {
        fail(`${from(term.id)} term ${term.id}`, `reflexive relation ${relation.id} denies its required self-link`);
      }
    }
  }

  for (const relation of data.terms.filter((term) => term.functional)) {
    const bySubject = new Map(data.terms.map((term) => [term.id, []]));
    const variants = relationVariants(relation.id);
    const converse = data.anchors && data.anchors.converse;
    const converses = new Set();
    if (converse != null) {
      for (const candidate of data.terms) {
        for (const link of candidate.links) {
          if (link.not || link.rel !== converse) continue;
          if (variants.has(candidate.id)) converses.add(link.to);
          if (variants.has(link.to)) converses.add(candidate.id);
        }
      }
    }
    const add = (subject, link) => {
      const normalizedSubject = identityOf(subject);
      const normalizedLink = { ...link, to: identityOf(link.to) };
      bySubject.get(normalizedSubject).push(normalizedLink);
      if (relation.symmetric && normalizedSubject !== normalizedLink.to) {
        bySubject.get(normalizedLink.to).push({ ...normalizedLink, to: normalizedSubject });
      }
    };
    for (const term of data.terms) {
      for (const link of term.links) {
        if (link.not) continue;
        if (variants.has(link.rel)) add(term.id, link);
        if (converses.has(link.rel)) add(link.to, { ...link, to: term.id });
      }
    }
    for (const [subject, links] of bySubject) {
      const timeless = new Set(links.filter((link) => link.at == null).map((link) => link.to));
      const all = new Set(links.map((link) => link.to));
      if (timeless.size > 1 || (timeless.size === 1 && all.size > 1)) {
        fail(`${from(subject)} term ${subject}`, `functional relation ${relation.id} has competing objects`);
      }
      const byMoment = new Map();
      for (const link of links) {
        if (link.at == null) continue;
        if (!byMoment.has(link.at)) byMoment.set(link.at, new Set());
        byMoment.get(link.at).add(link.to);
      }
      for (const objects of byMoment.values()) {
        if (objects.size > 1) {
          fail(`${from(subject)} term ${subject}`, `functional relation ${relation.id} has competing objects at one moment`);
        }
      }
    }
  }

  // An asymmetric relation can never lead back to where it began. For a
  // transitive relation every cycle implies the forbidden reverse; for any
  // asymmetric relation a direct self-link or opposing pair already does.
  for (const relation of data.terms.filter((term) => term.asymmetric)) {
    const variants = relationVariants(relation.id);
    const converse = data.anchors && data.anchors.converse;
    const converses = new Set();
    if (converse != null) {
      for (const candidate of data.terms) {
        for (const link of candidate.links) {
          if (link.not || link.rel !== converse) continue;
          if (variants.has(candidate.id)) converses.add(link.to);
          if (variants.has(link.to)) converses.add(candidate.id);
        }
      }
    }
    const edges = new Map(data.terms.map((term) => [term.id, []]));
    for (const term of data.terms) {
      for (const link of term.links) {
        if (link.not) continue;
        if (variants.has(link.rel)) edges.get(term.id).push(link.to);
        if (converses.has(link.rel)) edges.get(link.to).push(term.id);
      }
    }
    for (const [subject, objects] of edges) {
      if (objects.includes(subject)) fail(`${from(subject)} term ${subject}`, `asymmetric relation ${relation.id} relates a term to itself`);
      for (const object of objects) {
        if ((edges.get(object) || []).includes(subject)) {
          fail(`${from(subject)} term ${subject}`, `asymmetric relation ${relation.id} holds both ways`);
        }
      }
    }
    if (!relation.transitive) continue;
    const visiting = new Set();
    const visited = new Set();
    const visit = (id) => {
      if (visiting.has(id)) fail(`${from(id)} term ${id}`, `asymmetric relation ${relation.id} has a cycle`);
      if (visited.has(id)) return;
      visiting.add(id);
      for (const next of edges.get(id) || []) visit(next);
      visiting.delete(id);
      visited.add(id);
    };
    for (const id of edges.keys()) visit(id);
  }
  return data;
}

// ---------------------------------------------------------------------------
// Language
// ---------------------------------------------------------------------------
export function checkLanguage(data, where = 'language') {
  if (!data || typeof data !== 'object') fail(where, 'must be an object');
  onlyKeys(
    data,
    ['name', 'symbols', 'words', 'derivations', 'marking', 'parts', 'numbers', 'unknown', 'syntax', 'speech', 'expressions', 'grammar'],
    where,
  );

  if (typeof data.name !== 'string' || data.name === '') {
    fail(where, 'name must be a non-empty string');
  }
  const at = `language "${data.name}"`;

  if (data.symbols !== undefined) {
    if (!data.symbols || typeof data.symbols !== 'object') fail(at, 'symbols must be an object');
    for (const [type, info] of Object.entries(data.symbols)) {
      if (!info || typeof info.characters !== 'string' || info.characters === '') {
        fail(`${at} symbols.${type}`, 'characters must be a non-empty string');
      }
      onlyKeys(info, ['characters', 'alone', 'figures', 'pos', 'point', 'places'], `${at} symbols.${type}`);
      // Where the part below one begins, and how far this language writes it.
      if (info.point !== undefined && (typeof info.point !== 'string' || info.point.length !== 1)) {
        fail(`${at} symbols.${type}`, 'point, where present, must be one character');
      }
      if (info.places !== undefined && (!Number.isInteger(info.places) || info.places < 1)) {
        fail(`${at} symbols.${type}`, 'places, where present, must be a whole number of them');
      }
      if (info.pos !== undefined && (typeof info.pos !== 'string' || info.pos === '')) {
        fail(`${at} symbols.${type}`, 'pos, where present, must be a part of speech');
      }
      // The set a number is written in, in the order its symbols count from.
      if (info.figures !== undefined && info.figures !== true) {
        fail(`${at} symbols.${type}`, 'figures, where present, must be true');
      }
      // Symbols that stand as words of their own, so `1+1` comes apart where
      // `cat` does not.
      if (info.alone !== undefined && info.alone !== true) {
        fail(`${at} symbols.${type}`, 'alone, where present, must be true');
      }
    }
  }

  if (data.words !== undefined && (!data.words || typeof data.words !== 'object')) {
    fail(at, 'words must be an object');
  }

  if (data.unknown !== undefined) {
    if (!data.unknown || typeof data.unknown !== 'object') fail(at, 'unknown must be an object');
    onlyKeys(data.unknown, ['pos'], `${at} unknown`);
    if (typeof data.unknown.pos !== 'string' || data.unknown.pos === '') {
      fail(`${at} unknown`, 'pos must be a non-empty parser symbol');
    }
  }
  if (data.syntax !== undefined) {
    if (!data.syntax || typeof data.syntax !== 'object') fail(at, 'syntax must be an object');
    for (const [position, functions] of Object.entries(data.syntax)) {
      if (position === '') fail(`${at} syntax`, 'parser positions must be non-empty strings');
      checkFunctions(functions, `${at} syntax "${position}"`);
    }
  }
  for (const [word, entry] of Object.entries(data.words || {})) {
    const w = `${at} word "${word}"`;
    if (!entry || typeof entry !== 'object') fail(w, 'must be an object');
    // A word may name more than one thing — a saw is a tool, and it is also
    // what someone did with their eyes. An entry is one reading or a list of
    // them, and which one a signal means is the brain's to settle.
    const readings = Array.isArray(entry) ? entry : [entry];
    if (readings.length === 0) fail(w, 'must hold at least one reading');
    for (const info of readings) checkWord(info, w);
    const selected = readings.filter((info) => info.select !== undefined);
    if (selected.length > 0) {
      if (readings.length < 2) fail(w, 'select requires more than one reading');
      if (readings.length - selected.length !== 1) {
        fail(w, 'select requires exactly one unconstrained fallback reading');
      }
    }
  }

  if (data.marking !== undefined && data.marking !== 'before' && data.marking !== 'after') {
    fail(at, 'marking must be "before" or "after" — which side of a marker the thing it marks falls');
  }

  // Which side of an action the doer falls on is word order, and word order is
  // the language's. The values name parts the world anchors; the brain names
  // neither of them.
  if (data.parts !== undefined) {
    if (!data.parts || typeof data.parts !== 'object') fail(at, 'parts must be an object');
    onlyKeys(data.parts, ['before', 'after'], `${at} parts`);
    for (const [side, role] of Object.entries(data.parts)) {
      if (typeof role !== 'string' || role === '') {
        fail(`${at} parts "${side}"`, 'must name the part a thing on that side plays');
      }
    }
  }

  if (data.numbers !== undefined) {
    if (!data.numbers || typeof data.numbers !== 'object') fail(at, 'numbers must be an object');
    onlyKeys(data.numbers, ['composition'], `${at} numbers`);
    if (!Array.isArray(data.numbers.composition) || data.numbers.composition.length === 0) {
      fail(`${at} numbers`, 'composition must be a non-empty list of rules');
    }
    for (const rule of data.numbers.composition) {
      const r = `${at} numbers composition`;
      if (!rule || typeof rule !== 'object' || Array.isArray(rule)) {
        fail(r, 'every rule must be an object');
      }
      onlyKeys(rule, ['order', 'multipleOf', 'operation'], r);
      if (!['ascending', 'descending', 'equal', 'any'].includes(rule.order)) {
        fail(r, 'order must be ascending, descending, equal, or any');
      }
      if (!['add', 'multiply'].includes(rule.operation)) {
        fail(r, 'operation must be add or multiply');
      }
      if (rule.multipleOf !== undefined) {
        const multiple = rule.multipleOf;
        if (!multiple || typeof multiple !== 'object' || Array.isArray(multiple)) {
          fail(r, 'multipleOf must be an object');
        }
        onlyKeys(multiple, ['side', 'value'], `${r} multipleOf`);
        if (multiple.side !== 'left' && multiple.side !== 'right') {
          fail(r, 'multipleOf.side must be left or right');
        }
        if (!Number.isSafeInteger(multiple.value) || multiple.value < 1) {
          fail(r, 'multipleOf.value must be a positive safe integer');
        }
      }
    }
  }

  if (data.derivations !== undefined) {
    if (!Array.isArray(data.derivations)) fail(at, 'derivations must be an array');
    for (const rule of data.derivations) {
      const r = `${at} derivation`;
      if (!rule || typeof rule !== 'object') fail(r, 'must be an object');
      onlyKeys(rule, ['ending', 'becomes', 'of', 'pos', 'when', 'negates', 'functions'], r);
      if (typeof rule.ending !== 'string' || rule.ending === '') {
        fail(r, 'ending must be a non-empty string');
      }
      if (typeof rule.becomes !== 'string') fail(r, 'becomes must be a string');
      if (rule.of !== undefined && (typeof rule.of !== 'string' || rule.of === '')) {
        fail(r, 'of, where present, must name a part of speech');
      }
      // An ending may make more than one part of speech: a gerund both names
      // the doing and does it. A word may already list several, so a rule may.
      if (rule.pos !== undefined && !namesParts(rule.pos)) {
        fail(r, 'pos, where present, must name the parts of speech the ending makes');
      }
      if (rule.when !== undefined && (typeof rule.when !== 'string' || rule.when === '')) {
        fail(r, 'when, where present, must name when the ending puts the doing');
      }
      // A contraction may deny what its stem says: `don't` is `do` denied.
      if (rule.negates !== undefined && rule.negates !== true) {
        fail(r, 'negates, where present, must be true');
      }
      checkFunctions(rule.functions, r);
    }
  }

  if (data.speech !== undefined) {
    if (!data.speech || typeof data.speech !== 'object') fail(at, 'speech must be an object');
    for (const [role, form] of Object.entries(data.speech)) {
      // The refinements of an entity are brain primitives. A language may
      // give each one words, but it may neither add another refinement nor
      // leave a malformed label for the brain to interpret.
      if (role === 'classification') {
        if (!form || typeof form !== 'object' || Array.isArray(form)) {
          fail(`${at} speech "${role}"`, 'must be an object');
        }
        onlyKeys(form, ENTITY_CLASSES, `${at} speech "${role}"`);
        for (const [kind, said] of Object.entries(form)) {
          if (typeof said !== 'string' || said === '') {
            fail(`${at} speech "${role}" ${kind}`, 'must be a non-empty string');
          }
        }
        continue;
      }
      // A word that agrees with what follows it gives its forms instead: which
      // symbol set calls for which, and what it says otherwise.
      if (form && typeof form === 'object') {
        onlyKeys(form, ['before', 'otherwise'], `${at} speech "${role}"`);
        if (typeof form.otherwise !== 'string') {
          fail(`${at} speech "${role}"`, 'otherwise must be a string');
        }
        for (const [type, said] of Object.entries(form.before || {})) {
          if (typeof said !== 'string') {
            fail(`${at} speech "${role}" before ${type}`, 'must be a string');
          }
        }
        continue;
      }
      if (typeof form !== 'string') fail(`${at} speech "${role}"`, 'must be a string');
    }
  }

  if (data.expressions !== undefined) {
    if (!data.expressions || typeof data.expressions !== 'object') {
      fail(at, 'expressions must be an object');
    }
    for (const [intent, form] of Object.entries(data.expressions)) {
      if (typeof form !== 'string') fail(`${at} expression "${intent}"`, 'must be a string');
    }
  }

  if (data.grammar !== undefined) checkGrammar(data.grammar, at);
  return data;
}

// What a language must have once every file that speaks it has been merged.
// A single file need not carry all of it: one may add words to a language whose
// alphabet and grammar another file declared, the way a knowledge file adds
// links to a world it did not write.
export function checkWholeLanguage(data, where = 'language') {
  const at = `${where} "${data.name}"`;
  if (!data.symbols || !data.symbols.letter) {
    fail(at, 'symbols.letter is required — without it nothing is read');
  }
  if (!data.words || Object.keys(data.words).length === 0) {
    fail(at, 'words are required — a language with none recognizes nothing');
  }
  const needsMarking = Object.values(data.words).some((entry) => {
    const readings = Array.isArray(entry) ? entry : [entry];
    return readings.some((info) => {
      const own = info.functions == null
        ? []
        : (Array.isArray(info.functions) ? info.functions : [info.functions]);
      const positions = Array.isArray(info.pos) ? info.pos : [info.pos];
      const inherited = positions.flatMap((position) => {
        const functions = (data.syntax || {})[position];
        return functions == null ? [] : (Array.isArray(functions) ? functions : [functions]);
      });
      return (
        info.role !== undefined ||
        info.marks === 'new' ||
        info.marks === 'known' ||
        [...own, ...inherited].some((fn) => fn === 'determiner' || fn === 'possessor')
      );
    });
  });
  if (needsMarking && data.marking === undefined) {
    fail(at, 'marking is required when words mark neighbouring referents');
  }
  const grammar = data.grammar;
  if (grammar !== undefined) {
    if (typeof grammar.start !== 'string' || grammar.start === '') {
      fail(`${at} grammar`, 'start must name a rule');
    }
    if (!grammar.rules || !grammar.rules[grammar.start]) {
      fail(`${at} grammar`, `start "${grammar.start}" has no rule`);
    }
  }
  return data;
}

function checkGrammar(grammar, at) {
  if (!grammar || typeof grammar !== 'object') fail(at, 'grammar must be an object');
  onlyKeys(grammar, ['start', 'rules'], `${at} grammar`);
  if (grammar.start !== undefined && (typeof grammar.start !== 'string' || grammar.start === '')) {
    fail(`${at} grammar`, 'start must name a rule');
  }
  if (grammar.rules !== undefined && (!grammar.rules || typeof grammar.rules !== 'object')) {
    fail(`${at} grammar`, 'rules must be an object');
  }
  for (const [symbol, rule] of Object.entries(grammar.rules || {})) {
    const r = `${at} grammar rule "${symbol}"`;
    if (!rule || typeof rule !== 'object') fail(r, 'must be an object');
    onlyKeys(rule, ['rules', 'whole', 'referent', 'completes'], r);
    if (!Array.isArray(rule.rules) || rule.rules.length === 0) {
      fail(r, 'rules must be a non-empty array');
    }
    if (rule.whole !== undefined && rule.whole !== true) {
      fail(r, 'whole, where present, must be true');
    }
    if (rule.completes !== undefined && rule.completes !== true) {
      fail(r, 'completes, where present, must be true');
    }
    if (rule.referent !== undefined && rule.referent !== true) {
      fail(r, 'referent, where present, must be true');
    }
    for (const alt of rule.rules) {
      if (typeof alt !== 'string' || alt.trim() === '') fail(r, 'every rule must be a non-empty string');
    }
  }
}

export { ShapeError };

// One reading of a word: what it is, what it names, and what it says of
// what stands beside it.
function checkWord(info, w) {
  if (!info || typeof info !== 'object' || Array.isArray(info)) fail(w, 'must be an object');
  onlyKeys(
    info,
    ['pos', 'meaning', 'concept', 'marks', 'negates', 'role', 'when', 'names', 'groups', 'person', 'number', 'on', 'bare', 'choice', 'proximity', 'select', 'functions', 'classifies', 'stands'],
    w,
  );
  // A word may be more than one part of speech — English says a walk and
  // walks with the same word — so `pos` is one or a list of them, and which
  // one it is in a signal is what the parse settles.
  const parts = Array.isArray(info.pos) ? info.pos : [info.pos];
  if (parts.length === 0 || parts.some((p) => typeof p !== 'string' || p === '')) {
    fail(w, 'pos must be a non-empty string, or a list of them');
  }
  if (typeof info.meaning !== 'string') fail(w, 'meaning must be a string');
  checkFunctions(info.functions, w);
  if (info.concept !== undefined && !isId(info.concept)) fail(w, 'concept must be a term id');
  if (info.classifies !== undefined && !ENTITY_CLASSES.includes(info.classifies)) {
    fail(w, `classifies must be one of ${ENTITY_CLASSES.map((kind) => `"${kind}"`).join(', ')}`);
  }
  checkSelection(info.select, w);
  // Which scale a word compares on: heavier is more, on weight. The word names
  // the comparing; the scale says what is being compared.
  if (info.on !== undefined && !isId(info.on)) fail(w, 'on must be a term id');
  // What kind of thing a word points back at. A language decides that one of
  // its pointing words is said of a man and another of a woman; the brain only
  // knows that a pointer stands for some kind, and drops whatever cannot be
  // that kind.
  if (info.stands !== undefined && !isId(info.stands)) fail(w, 'stands must be a term id');
  if (info.role !== undefined && (typeof info.role !== 'string' || info.role === '')) {
    fail(w, 'role, where present, must name the part a thing plays');
  }
  // Which side of now what is said falls on. The value names a moment the
  // world anchors; the brain names none of them.
  if (info.when !== undefined && (typeof info.when !== 'string' || info.when === '')) {
    fail(w, 'when, where present, must name a moment');
  }
  // Who a word is said of, and how many. Closed sets, the same as `marks`:
  // there are exactly three persons and exactly two numbers to be.
  if (info.person !== undefined && !PERSONS.includes(info.person)) {
    fail(w, `person must be one of ${PERSONS.map((p) => `"${p}"`).join(', ')}`);
  }
  if (info.number !== undefined && !NUMBERS.includes(info.number)) {
    fail(w, `number must be one of ${NUMBERS.map((n) => `"${n}"`).join(', ')}`);
  }
  // How near what a pointer points at stands: `this` the nearest topic,
  // `that` the farthest. Near and far are the brain's to rank; which words
  // stand where is the language's.
  if (info.proximity !== undefined && info.proximity !== 'near' && info.proximity !== 'far') {
    fail(w, 'proximity, where present, must be "near" or "far"');
  }
  // Another way to write a term is not what the term is called.
  if (info.names !== undefined && info.names !== false) {
    fail(w, 'names, where present, must be false');
  }
  // A word may open or close a group, so what is inside it is worked first.
  if (info.groups !== undefined && info.groups !== 'open' && info.groups !== 'close') {
    fail(w, 'groups must be "open" or "close"');
  }
  if (info.negates !== undefined && info.negates !== true) {
    fail(w, 'negates, where present, must be true');
  }
  // A word may join what it joins as a choice rather than a togetherness.
  if (info.choice !== undefined && info.choice !== true) {
    fail(w, 'choice, where present, must be true');
  }
  // A word may stand bare, with no article: what it names is not one of a
  // kind. That a language may do without is the brain's; which of its words do
  // is the language's.
  if (info.bare !== undefined && info.bare !== true) {
    fail(w, 'bare, where present, must be true');
  }
  if (info.marks !== undefined && !MARKS.includes(info.marks)) {
    fail(w, `marks must be one of ${MARKS.map((m) => `"${m}"`).join(', ')}`);
  }
  // A pointer names no term: what it points at is the circumstance of the
  // signal it arrived in, and no world can hold that. `prior` is one: the last
  // action lives in the record, not in any file.
  if ((info.marks === 'from' || info.marks === 'to' || info.marks === 'prior') && info.concept !== undefined) {
    fail(w, 'a word that points names no term of its own');
  }
}

function checkSelection(value, where, nested = false) {
  if (value === undefined) return;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(where, 'select must be a context constraint object');
  }
  onlyKeys(
    value,
    nested ? ['position', 'before', 'after', 'across'] : ['any', 'position', 'before', 'after', 'across'],
    where,
  );
  if (value.any !== undefined) {
    if (nested || !Array.isArray(value.any) || value.any.length === 0) {
      fail(where, 'select.any must be a non-empty list of context constraints');
    }
    if (Object.keys(value).length !== 1) {
      fail(where, 'select.any cannot be combined with another constraint');
    }
    value.any.forEach((condition) => checkSelection(condition, where, true));
  }
  if (value.position !== undefined && value.position !== 'first') {
    fail(where, 'select.position must be "first"');
  }
  checkContextKinds(value.before, ['denial', 'proposition', 'unit', 'pointer'], `${where} select.before`);
  checkContextKinds(value.after, ['pointer', 'predicate', 'determiner'], `${where} select.after`);
  if (value.across !== undefined && value.across !== 'modifier') {
    fail(where, 'select.across must be "modifier"');
  }
  if (value.across !== undefined && value.after === undefined) {
    fail(where, 'select.across requires select.after');
  }
  if (
    value.any === undefined &&
    value.position === undefined &&
    value.before === undefined &&
    value.after === undefined
  ) {
    fail(where, 'select must contain a context constraint');
  }
}

function checkContextKinds(value, allowed, where) {
  if (value === undefined) return;
  const kinds = Array.isArray(value) ? value : [value];
  if (
    kinds.length === 0 ||
    kinds.some((kind) => !allowed.includes(kind)) ||
    new Set(kinds).size !== kinds.length
  ) {
    fail(where, `must contain distinct context kinds: ${allowed.join(', ')}`);
  }
}

function checkFunctions(value, where) {
  if (value === undefined) return;
  const functions = Array.isArray(value) ? value : [value];
  if (
    functions.length === 0 ||
    functions.some((fn) => !COGNITIVE_FUNCTIONS.includes(fn)) ||
    new Set(functions).size !== functions.length
  ) {
    fail(where, `functions must contain distinct cognitive functions: ${COGNITIVE_FUNCTIONS.join(', ')}`);
  }
}
