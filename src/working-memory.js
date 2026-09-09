// The brain's working memory: the conversation graph, held in memory.
//
// Phase one of the design in GRAPH.md — what *is*. The kinds of item a
// conversation introduces, the slots they stand in, the properties they hold,
// the collections they gather into, and the order it was all said in. What
// *governs* — a standing instruction, a condition, an action waiting on one,
// what is owed — is the phase after this, and nothing here anticipates it.
//
// Three things this module holds to:
//
//   Nothing is stored that can be worked out. A count, a total, a property's
//   current value are all read back off what was said, at the moment asked
//   for. Store one and it goes stale the moment a member moves.
//
//   Everything said is kept in the order it was said. That single list is the
//   history, and it is also how any read looks back: a question asked of an
//   earlier moment reads the same walk with a shorter list.
//
//   No words. A concept, a relation, a slot's role are whatever the caller
//   hands in. Which word a language spells them with is that language's.
//
// It holds no world either. Concepts named here are the ones this conversation
// needs; joining them to the world the brain already has is a later phase.

// What an action carries as its standing: it happened, or it is still to.
// An action waiting on a condition is phase two.
export const DONE = 'done';
export const TO_COME = 'to come';

const PREFIX = { node: 'n', collection: 'c', fact: 'f', action: 'a' };

export function openGraph() {
  // What is known before anyone speaks, and the facts about it.
  const concepts = new Map();
  // Only what this conversation introduced.
  const items = new Map();
  // Everything said, in the order it was said.
  const told = [];
  const made = new Map();
  const counted = { node: 0, collection: 0, fact: 0, action: 0 };

  const now = () => told.length - 1;
  const upto = (at) => (at == null ? now() : Math.min(at, now()));

  function say(record) {
    told.push(record);
    return told.length - 1;
  }

  // ---- what is known before anyone speaks ---------------------------------

  // A concept gains facts; it never loses them. `is` says what it is a kind
  // of, `has` the properties that come with being one. Anything else said of
  // it is kept as it was given — this phase does not read it, and the phase
  // that needs it should find it still there.
  function concept(of, facts = {}) {
    const held = concepts.get(of) || {};
    const grown = { ...held, ...facts };
    if (facts.is !== undefined) grown.is = joined(held.is, facts.is);
    if (facts.has !== undefined) grown.has = { ...(held.has || {}), ...facts.has };
    concepts.set(of, grown);
    return of;
  }

  const knows = (of) => (concepts.has(of) ? { ...concepts.get(of) } : null);

  // A concept, then everything it is a kind of, nearest first. A concept
  // nothing was said about is still a concept — it is simply a kind of
  // nothing else.
  function kinds(of, seen = new Set()) {
    if (of == null || seen.has(of)) return [];
    seen.add(of);
    const out = [of];
    for (const above of concepts.get(of)?.is || []) out.push(...kinds(above, seen));
    return out;
  }

  // ---- what this conversation introduces ----------------------------------

  function put(kind, of, props, rest) {
    const id = PREFIX[kind] + ++counted[kind];
    items.set(id, { id, kind, of, ...rest });
    made.set(id, say({ what: 'made', id }));
    property(id, props);
    return id;
  }

  // A thing this conversation brought in. `Ravi has 5 apples` makes one for
  // Ravi and none for apple: apple was already a concept.
  const node = (of, props = {}) => put('node', of, props, {});

  // A quantity of a kind and no particular thing. It is identified, so a later
  // action can reach it.
  const collection = (of, props = {}) => put('collection', of, props, {});

  // What is so. It holds; it did not happen, so it is not in the history.
  const fact = (of, slots = {}, opts = {}) =>
    put('fact', of, opts.props || {}, { slots: { ...slots }, denied: opts.denied === true });

  // What occurred, and when. A slot named with `null` in it is the empty slot:
  // there is a place for this kind and nothing is in it. A slot left out was
  // never spoken of at all, and the two must stay apart.
  const action = (of, slots = {}, opts = {}) =>
    put('action', of, opts.props || {}, {
      slots: { ...slots },
      when: opts.when ?? DONE,
      denied: opts.denied === true,
    });

  // A property takes a value. Recorded rather than overwritten: the latest
  // change wins when the graph is read now, and the history keeps the rest.
  function property(id, props = {}) {
    for (const [name, value] of Object.entries(props)) say({ what: 'held', id, name, value });
    return id;
  }

  // This thing is one of those. Recorded like anything else, so a collection
  // read at an earlier moment has the members it had then.
  const collect = (into, member) => say({ what: 'joined', into, member });

  // ---- reading it back -----------------------------------------------------

  const item = (id) => items.get(id) || null;
  const all = (kind) => [...items.values()].filter((held) => held.kind === kind).map((held) => held.id);

  // What a thing was made at, and the moment just before that — where a
  // question about how things stood before it is asked.
  const at = (id) => (made.has(id) ? made.get(id) : -1);
  const before = (id) => at(id) - 1;

  // A property held now, or at some earlier moment. Where nothing was said of
  // it, the kind may still carry it: `john is a husband` and a husband's sex
  // is male gives john a sex nobody stated.
  function propertyOf(id, name, moment) {
    for (let i = upto(moment); i >= 0; i--) {
      const record = told[i];
      if (record.what === 'held' && record.id === id && record.name === name) return record.value;
    }
    const held = items.get(id);
    if (!held) return undefined;
    for (const kind of kinds(held.of)) {
      const from = concepts.get(kind)?.has;
      if (from && name in from) return from[name];
    }
    return undefined;
  }

  // Whether a thing is one of a kind — its own concept, or anything that
  // concept is a kind of.
  const isA = (id, of) => {
    const held = items.get(id);
    return held ? kinds(held.of).includes(of) : false;
  };

  const members = (into, moment) => {
    const out = [];
    for (let i = 0; i <= upto(moment); i++) {
      const record = told[i];
      if (record.what === 'joined' && record.into === into) out.push(record.member);
    }
    return out;
  };

  // How many. Members where any were named, and otherwise the number stated,
  // moved by whatever has come or gone since it was stated. An action moves a
  // collection when it names it as what moved and carries a quantity of its
  // own: arriving where there is somewhere to arrive, leaving where there is
  // not. The action that introduced the collection carries no quantity — the
  // number is on the collection — so it moves nothing.
  function count(of, moment) {
    const end = upto(moment);
    const named = members(of, end);
    if (named.length) return named.length;

    let total = 0;
    let stated = -1;
    for (let i = end; i >= 0; i--) {
      const record = told[i];
      if (record.what === 'held' && record.id === of && record.name === 'count') {
        total = record.value;
        stated = i;
        break;
      }
    }
    for (let i = stated + 1; i <= end; i++) {
      const record = told[i];
      if (record.what !== 'made') continue;
      const held = items.get(record.id);
      if (!held || held.kind !== 'action' || held.denied) continue;
      const slots = held.slots || {};
      if (slots.what !== of || slots.quantity == null) continue;
      total += slots.destination != null ? slots.quantity : -slots.quantity;
    }
    return total;
  }

  // One measured property, added across the members. A member that has no such
  // measure makes the total unknowable, and saying so beats adding what is
  // there and calling it the whole.
  function sum(of, name, moment) {
    const end = upto(moment);
    const named = members(of, end);
    if (!named.length) return null;
    let total = 0;
    for (const member of named) {
      const value = propertyOf(member, name, end);
      if (typeof value !== 'number') return null;
      total += value;
    }
    return total;
  }

  // The highest or lowest member by one measure. Two members level at the top
  // is no answer, the same way two candidates for a pointer is no answer.
  const highest = (of, name, moment) => edge(of, name, moment, 1);
  const lowest = (of, name, moment) => edge(of, name, moment, -1);

  function edge(of, name, moment, way) {
    const end = upto(moment);
    let found = null;
    let best = null;
    let tied = false;
    for (const member of members(of, end)) {
      const value = propertyOf(member, name, end);
      if (typeof value !== 'number') continue;
      if (best === null || (value - best) * way > 0) {
        best = value;
        found = member;
        tied = false;
      } else if (value === best) tied = true;
    }
    return tied ? null : found;
  }

  // The recorded history: what happened, in the order it was said, up to the
  // moment asked about.
  function history(moment) {
    const out = [];
    for (let i = 0; i <= upto(moment); i++) {
      const record = told[i];
      if (record.what !== 'made') continue;
      const held = items.get(record.id);
      if (held && held.kind === 'action') out.push(held.id);
    }
    return out;
  }

  const graph = {
    concept, knows, kinds,
    node, collection, fact, action, property, collect,
    item, all, isA,
    propertyOf, members, count, sum, highest, lowest,
    history, moment: now, at, before,
  };
  return { ...graph, context: openContext(graph) };
}

// ---- context ---------------------------------------------------------------

// Not part of the graph. What a word in this conversation lands on, thrown
// away with the conversation.
//
// A pointer resolves by walking what is still in reach, nearest first, and
// skipping whatever conflicts with it — and it resolves only where exactly
// one candidate fits. None, or more than one, and it says it does not know.
// It never takes the first and hopes.
export function openContext(graph) {
  const inReach = [];
  const names = new Map();

  const reach = (...ids) => {
    for (const id of ids.filter((given) => given != null).reverse()) {
      const held = inReach.indexOf(id);
      if (held >= 0) inReach.splice(held, 1);
      inReach.unshift(id);
    }
    return [...inReach];
  };

  // Everything an action involves comes into reach: the doing itself, then
  // whoever and whatever it names, in the order they were named. That is why
  // one giving between two people leaves both of them in reach and a pointer
  // at one of them refuses.
  //
  // Only what this conversation introduced. A slot may also hold a concept or
  // a bare quantity, and neither is something a word can land on.
  const saw = (id) => {
    const held = graph.item(id);
    if (!held) return [...inReach];
    const named = Object.values(held.slots || {}).filter((slot) => graph.item(slot) != null);
    return reach(id, ...named);
  };

  const name = (word, id) => {
    names.set(word, id);
    return id;
  };

  function point(fits = {}) {
    const wanted = fits.has || {};
    const found = [];
    for (const id of inReach) {
      if (fits.is != null && !graph.isA(id, fits.is)) continue;
      let conflicts = false;
      for (const [property, value] of Object.entries(wanted)) {
        const held = graph.propertyOf(id, property);
        if (held !== undefined && held !== value) conflicts = true;
      }
      if (!conflicts) found.push(id);
    }
    return found.length === 1 ? found[0] : null;
  }

  return {
    reach,
    saw,
    name,
    named: (word) => (names.has(word) ? names.get(word) : null),
    focus: () => [...inReach],
    spoken: () => inReach[0] ?? null,
    point,
  };
}

function joined(held, added) {
  const out = [...(Array.isArray(held) ? held : held == null ? [] : [held])];
  for (const one of Array.isArray(added) ? added : [added]) if (!out.includes(one)) out.push(one);
  return out;
}
