// The brain's working memory: the conversation graph, held in memory.
//
// The design in GRAPH.md. What *is* — the kinds of item a conversation
// introduces, the slots they stand in, the properties they hold, the
// collections they gather into, and the order it was all said in — and what
// *governs*: a standing instruction, a condition asked of the graph, an action
// waiting on one, and what is owed.
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

// What an action carries as its standing: it happened, it is still to, or it
// waits on a condition and neither has nor has not happened yet.
export const DONE = 'done';
export const TO_COME = 'to come';
export const PENDING = 'pending';

const PREFIX = { node: 'n', collection: 'c', fact: 'f', action: 'a', rule: 'r' };

export function openGraph() {
  // What is known before anyone speaks, and the facts about it.
  const concepts = new Map();
  // Only what this conversation introduced.
  const items = new Map();
  // Everything said, in the order it was said.
  const told = [];
  const made = new Map();
  const counted = { node: 0, collection: 0, fact: 0, action: 0, rule: 0 };
  // What governs. A standing instruction never occurred, so it is not in the
  // history and it is not undone by looking back.
  const rules = [];

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
  //
  // Given a condition, the action is pending: it waits on a state of the graph
  // and neither has nor has not happened. What it waits on is never an
  // arriving action to be matched — it is a question asked of the graph, true
  // now or not.
  const action = (of, slots = {}, opts = {}) =>
    put('action', of, opts.props || {}, {
      slots: { ...slots },
      when: opts.on !== undefined ? PENDING : (opts.when ?? DONE),
      ...(opts.on !== undefined ? { on: opts.on } : {}),
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

  // A property held now, or at some earlier moment. Three places it can come
  // from, nearest first: said of this thing, carried by the kind — `john is a
  // husband` and a husband's sex is male gives john a sex nobody stated — or
  // produced by an instruction whose condition stands.
  //
  // The last is worked out, never written: a produced fact needs nobody, and
  // it stops being so the moment its condition stops standing. `stated` asks
  // for only what was said, which is what a condition is read against, so a
  // rule can never be asked to answer itself.
  function propertyOf(id, name, moment, stated = false) {
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
    if (stated) return undefined;
    for (const rule of rules) {
      // An owed consequence does nothing by itself. That is what makes it
      // reportable, and what keeps it from quietly coming true.
      if (rule.owed || rule.then?.property !== name) continue;
      // Where the instruction says what it is about — rain makes the *road*
      // wet — it lands there. Where it does not, it lands on whatever the
      // condition stood for, which is how one instruction governs many.
      const found = matching(rule.on, moment, true);
      if (rule.then.of !== undefined ? rule.then.of === id && found.length : found.some((one) => one.item === id)) {
        return rule.then.value;
      }
    }
    return undefined;
  }

  // Whether a thing is one of a kind — its own concept, or anything that
  // concept is a kind of.
  const isA = (id, of) => {
    const held = items.get(id);
    return held ? kinds(held.of).includes(of) : false;
  };

  // How an action stands at some moment. What it was made with, unless it was
  // pending and its condition came to stand — settling is recorded like
  // anything else, so an action read at an earlier moment is pending again.
  function whenOf(id, moment) {
    const held = items.get(id);
    if (!held) return null;
    for (let i = upto(moment); i >= 0; i--) {
      const record = told[i];
      if (record.what === 'settled' && record.id === id) return DONE;
    }
    return held.when ?? null;
  }

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

  // ---- what governs --------------------------------------------------------

  // A standing instruction: a condition, and what stands on it. It never
  // occurred, so it has no place in the history, and it keeps applying to
  // whatever turns up later.
  //
  // What it produces is one of two things. A fact simply becomes so and needs
  // nobody — that is read back through `propertyOf`. An action is *owed*: it
  // does nothing by itself and can sit unmet for ever, which is exactly what
  // makes it reportable.
  //
  // The instruction is stored once. It never writes an owed action per record:
  // that would copy its truth as many times as there are records, the same
  // trap as a stored total. What is owed is worked out when it is asked for.
  function rule({ on, then, owed = false } = {}) {
    const id = PREFIX.rule + ++counted.rule;
    rules.push({ id, on, then, owed: owed === true });
    return id;
  }

  const ruled = (id) => rules.find((held) => held.id === id) || null;
  const governing = () => rules.map((held) => held.id);

  // A condition is a question asked of the graph. There is no matching and no
  // rule about how much of it must match: it is either true now or it is not.
  //
  // Two ways to ask. Over what is so — `each` walks the things of a kind and
  // reads a state off them — or over what happened, where `occurred` walks the
  // history. What comes back is every thing the condition stands for, which is
  // also what binds the consequence to something in particular.
  function matching(condition, moment, stated = false) {
    if (condition == null) return [];
    const end = upto(moment);

    // A fact put as a question: does this stand? Asked of what was said, and
    // of what an instruction produces — the same loop, on the other kind of
    // consequence.
    if (condition.claim !== undefined) {
      return stands(condition.claim, end, stated)
        ? [{ item: condition.claim.subject ?? null, action: null }]
        : [];
    }

    if (condition.occurred !== undefined) {
      const about = condition.about ?? 'target';
      return history(end)
        .map((id) => items.get(id))
        .filter(
          (held) =>
            !held.denied &&
            whenOf(held.id, end) === DONE &&
            kinds(held.of).includes(condition.occurred) &&
            fits(held.slots || {}, condition.slots),
        )
        .map((held) => ({ item: (held.slots || {})[about] ?? null, action: held.id }));
    }

    const over =
      condition.each !== undefined
        ? [...items.values()].filter((held) => kinds(held.of).includes(condition.each)).map((held) => held.id)
        : condition.of !== undefined
          ? [condition.of]
          : [];
    return over
      .filter((id) => tests(reads(id, condition, end, stated), condition))
      .map((id) => ({ item: id, action: null }));
  }

  const holds = (condition, moment) => matching(condition, moment).length > 0;

  const fits = (slots, wanted = {}) =>
    Object.entries(wanted).every(([role, value]) => value === undefined || slots[role] === value);

  // Whether a fact stands: said outright, or produced by an instruction whose
  // condition stands. Nothing is written when one is produced — it stops
  // standing the moment its condition does.
  function stands(claim, moment, stated = false) {
    if (claim == null) return false;
    const end = upto(moment);
    const wanted = { subject: claim.subject, object: claim.object };
    const said = [...items.values()].some(
      (held) =>
        held.kind === 'fact' &&
        !held.denied &&
        at(held.id) <= end &&
        kinds(held.of).includes(claim.of) &&
        fits(held.slots || {}, wanted),
    );
    if (said || stated) return said;
    for (const rule of rules) {
      if (rule.owed || rule.then?.claim === undefined) continue;
      const produced = rule.then.claim;
      if (produced.of !== claim.of) continue;
      if (claim.subject !== undefined && produced.subject !== claim.subject) continue;
      if (claim.object !== undefined && produced.object !== claim.object) continue;
      if (matching(rule.on, end, true).length) return true;
    }
    return false;
  }

  // What the condition reads off the thing: a property, or one of the three
  // values a collection yields.
  function reads(id, condition, end, stated) {
    if (condition.count) return count(id, end);
    if (condition.total !== undefined) return sum(id, condition.total, end);
    if (condition.highest !== undefined) return propertyOf(highest(id, condition.highest, end), condition.highest, end, stated);
    if (condition.lowest !== undefined) return propertyOf(lowest(id, condition.lowest, end), condition.lowest, end, stated);
    return propertyOf(id, condition.property, end, stated);
  }

  // The test it puts to that value. `is` compares, unless what it is compared
  // against is a state on a scale — `hot` is temperature from thirty up — and
  // then it asks whether the value falls in it. That is the same shape as one
  // measure standing above another, and it is the whole of what a threshold
  // needs to be answerable.
  function tests(value, condition) {
    if (value === undefined || value === null) return false;
    if ('is' in condition) return same(value, condition.is);
    const number = typeof value === 'number';
    if ('above' in condition) return number && value > condition.above;
    if ('below' in condition) return number && value < condition.below;
    if ('atLeast' in condition) return number && value >= condition.atLeast;
    if ('atMost' in condition) return number && value <= condition.atMost;
    return false;
  }

  function same(value, wanted) {
    const state = concepts.get(wanted);
    if (state && (state.from !== undefined || state.to !== undefined)) {
      if (typeof value !== 'number') return false;
      if (state.from !== undefined && value < state.from) return false;
      if (state.to !== undefined && value > state.to) return false;
      return true;
    }
    return value === wanted;
  }

  // One loop, not two: an action changes a property, the property may make a
  // state true, and a true state settles whatever was waiting on it. Nothing
  // arrives announcing itself, so this is asked after a change rather than
  // triggered by one — and it says what came true rather than doing anything
  // about it. Acting is the runtime's.
  function settle(moment) {
    const fired = [];
    for (const held of items.values()) {
      if (held.kind !== 'action' || whenOf(held.id, moment) !== PENDING) continue;
      if (!holds(held.on, moment)) continue;
      say({ what: 'settled', id: held.id });
      fired.push(held.id);
    }
    return fired;
  }

  // What an instruction demands and nothing has met. Worked out from whichever
  // side the condition lives on: a state is read off the records, and an
  // occurrence is paired against the history — a failure that was answered is
  // done with, and one that was not is still owed. A real action needs no
  // matching and no clearing; the thing simply stops answering the question.
  function owing(moment) {
    const end = upto(moment);
    const out = [];
    for (const held of rules) {
      if (!held.owed) continue;
      const found = matching(held.on, end);
      const answers = held.then?.action !== undefined ? consequences(held, end) : null;
      const used = new Set();
      for (const one of found) {
        if (met(held, one, end, answers, used)) continue;
        out.push({ rule: held.id, on: one.item, since: one.action });
      }
    }
    return out;
  }

  const consequences = (held, end) =>
    history(end)
      .map((id) => items.get(id))
      .filter(
        (done) =>
          !done.denied && whenOf(done.id, end) === DONE && kinds(done.of).includes(held.then.action),
      );

  function met(held, one, end, answers, used) {
    // A produced fact is met by the property simply being set. Which value it
    // took is not the instruction's to say — somebody answered it.
    if (held.then?.property !== undefined) {
      return propertyOf(held.then.of ?? one.item, held.then.property, end, true) !== undefined;
    }
    if (held.then?.action === undefined) return false;
    // Paired in order. A doing before the demand does not answer it, and one
    // answer does not answer two demands.
    for (const done of answers) {
      if (used.has(done.id)) continue;
      if (one.action != null && at(done.id) < at(one.action)) continue;
      const about = held.then.of ?? one.item;
      if (about != null && !Object.values(done.slots || {}).includes(about)) continue;
      used.add(done.id);
      return true;
    }
    return false;
  }

  // ---- saying what is in it ------------------------------------------------

  // Everything a thing holds, at some moment: what was said of it, what its
  // kind carries, and what an instruction produces for it. The three places a
  // property can come from, gathered rather than asked for one at a time.
  function propertiesOf(id, moment) {
    const held = {};
    const seen = new Set();
    for (let i = 0; i <= upto(moment); i++) {
      const record = told[i];
      if (record.what === 'held' && record.id === id) seen.add(record.name);
    }
    const item = items.get(id);
    for (const kind of item ? kinds(item.of) : []) {
      for (const name of Object.keys(concepts.get(kind)?.has || {})) seen.add(name);
    }
    for (const rule of rules) if (rule.then?.property !== undefined) seen.add(rule.then.property);
    for (const name of seen) {
      const value = propertyOf(id, name, moment);
      if (value !== undefined) held[name] = value;
    }
    return held;
  }

  // The graph as text, walked off the graph itself. Nothing here is composed
  // by whoever is looking at it: what it says is what is in it.
  //
  // The graph holds no words, so how a concept is spelled is handed in. Told
  // nothing, it says the concept's own identifier — which is still the truth,
  // only harder to read.
  function text(label = () => null, moment) {
    // Only a concept is spelled. A quantity is a number and a count is a
    // number, and nothing may go looking for a word for one: the graph knows
    // which of its values are concepts because it was told, and a value it was
    // never told about is said as it stands.
    const spell = (value) => {
      if (value === null) return '—';
      if (value === undefined) return '?';
      if (Array.isArray(value)) return value.map(spell).join('/');
      if (items.has(value)) return value;
      if (concepts.has(value)) return label(value) ?? String(value);
      return String(value);
    };
    // What a thing is. Nothing said is not the same as a place with nothing
    // in it, so it is not said the same way.
    const kindOf = (value) => (value == null ? '?' : spell(value));
    const pairs = (held) =>
      Object.entries(held)
        .map(([name, value]) => `${name}: ${spell(value)}`)
        .join(', ');
    const holding = (id) => {
      const held = pairs(propertiesOf(id, moment));
      return held ? `  (${held})` : '';
    };

    const lines = [];
    const section = (title, rows) => {
      if (!rows.length) return;
      lines.push(title);
      for (const row of rows) lines.push(`  ${row}`);
    };
    const of = (kind) => [...items.values()].filter((held) => held.kind === kind);
    const spoken = context.names();
    const calledOf = (id) => {
      const word = Object.keys(spoken).find((given) => spoken[given] === id);
      return word ? `  called ${word}` : '';
    };

    section(
      'concepts',
      [...concepts.entries()]
        .filter(([, facts]) => Object.keys(facts).length > 0)
        .map(([named, facts]) => `${spell(named)}  ${pairs(facts)}`),
    );
    section('nodes', of('node').map((held) => `${held.id}  ${kindOf(held.of)}${calledOf(held.id)}${holding(held.id)}`));
    section(
      'collections',
      of('collection').map((held) => `${held.id}  ${kindOf(held.of)} × ${count(held.id, moment)}${holding(held.id)}`),
    );
    section(
      'facts',
      of('fact').map(
        (held) =>
          `${held.id}  ${held.denied ? 'not ' : ''}${kindOf(held.of)}(${pairs(held.slots || {})})${holding(held.id)}`,
      ),
    );
    section(
      'actions',
      history(moment).map((id) => {
        const held = items.get(id);
        return `${id}  ${held.denied ? 'not ' : ''}${kindOf(held.of)}(${pairs(held.slots || {})})  [${whenOf(id, moment)}]${holding(id)}`;
      }),
    );
    section(
      'rules',
      rules.map(
        (held) => `${held.id}  on ${asked(held.on, spell, pairs)} -> ${asked(held.then, spell, pairs)}${held.owed ? '  [owed]' : ''}`,
      ),
    );
    section(
      'owed',
      owing(moment).map((one) => `${one.rule}  ${spell(one.on)}${one.since ? `  since ${one.since}` : ''}`),
    );
    const reach = context.focus();
    section('context', [
      ...(reach.length ? [`focus  ${reach.join(', ')}`] : []),
      ...Object.entries(spoken).map(([word, id]) => `name   ${word} -> ${id}`),
    ]);
    return lines.join('\n');
  }

  const graph = {
    concept, knows, kinds,
    node, collection, fact, action, property, collect, rule,
    item, all, isA, ruled, governing,
    propertyOf, propertiesOf, members, count, sum, highest, lowest,
    holds, stands, matching, whenOf, settle, owed: owing,
    history, moment: now, at, before, text,
  };
  const context = openContext({ item, propertyOf, isA });
  return { ...graph, context };
}

// A condition or a consequence, said back. Every form it can take is written
// out here rather than guessed at, so a shape nothing knows how to say shows
// itself as one instead of going missing.
function asked(side, spell, pairs) {
  if (!side) return '—';
  if (side.claim) {
    const { of, subject, object } = side.claim;
    return `${spell(subject)} ${spell(of)} ${spell(object)}`;
  }
  if (side.occurred !== undefined) {
    const slots = side.slots ? `(${pairs(side.slots)})` : '';
    return `${spell(side.occurred)}${slots} occurred`;
  }
  if (side.property !== undefined && side.value !== undefined) {
    return `${side.of !== undefined ? `${spell(side.of)} ` : ''}${side.property}: ${spell(side.value)}`;
  }
  if (side.action !== undefined) {
    return `${spell(side.action)}(${pairs(side.slots || {})})`;
  }
  const over = side.each !== undefined ? `each ${spell(side.each)}` : side.of !== undefined ? spell(side.of) : '?';
  const read =
    side.count ? 'count'
    : side.total !== undefined ? `total ${side.total}`
    : side.highest !== undefined ? `highest ${side.highest}`
    : side.lowest !== undefined ? `lowest ${side.lowest}`
    : side.property !== undefined ? side.property
    : '?';
  const test =
    'is' in side ? `is ${spell(side.is)}`
    : 'above' in side ? `above ${side.above}`
    : 'below' in side ? `below ${side.below}`
    : 'atLeast' in side ? `at least ${side.atLeast}`
    : 'atMost' in side ? `at most ${side.atMost}`
    : '?';
  return `${over} ${read} ${test}`;
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
    names: () => Object.fromEntries(names),
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
