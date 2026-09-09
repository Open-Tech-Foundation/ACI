// The conversation graph, held in memory.
//
// The brain fills it once a signal has been understood, and `serialize` says
// what is in it. Nothing outside builds any of this: what is shown is what is
// held.
//
// Four kinds, and the difference between them is the whole point:
//
//   nodes    what this conversation brought in. A quantity of a kind is not
//            one of them — five apples introduces no apple, only a number of
//            a concept the world already had.
//   facts    what is so. Holding, being taller, being inside. It did not
//            happen, so it is not in the history.
//   actions  what occurred, with the part each thing played in it.
//   rules    what governs — a condition and what stands on it.
//
// The graph holds no words. A concept is an id in the world, and how it is
// spelled is the world's business, not this module's.

const held = { nodes: [], facts: [], actions: [], rules: [] };
const counted = { nodes: 0, facts: 0, actions: 0, rules: 0 };
const KINDS = ['nodes', 'facts', 'actions', 'rules'];

// Not one of the kinds. Context is what a word in the next signal lands on —
// what is still in reach, nearest first — and it is thrown away with the
// conversation rather than being part of what is so.
let inReach = [];
const PREFIX = { nodes: 'n', facts: 'f', actions: 'a', rules: 'r' };

// Which node stands for which term of the world, and which terms turned out to
// be a quantity of a kind rather than a thing.
let standing = new Map();
let counting = new Map();
// The world the graph was filled against. Saying it back needs the same one,
// and asking the caller to find it again invites a different answer.
let against = null;

export function clear() {
  for (const kind of KINDS) {
    held[kind].length = 0;
    counted[kind] = 0;
  }
  standing = new Map();
  counting = new Map();
  inReach = [];
  against = null;
}

export function graph() {
  return {
    ...Object.fromEntries(KINDS.map((kind) => [kind, held[kind].map((one) => ({ ...one }))])),
    context: { focus: [...inReach] },
  };
}

function put(kind, entry) {
  const id = PREFIX[kind] + ++counted[kind];
  held[kind].push({ id, ...entry });
  return id;
}

// What the brain understood, laid out.
//
// Things first, then what stands between them and what happened to them: a
// fact cannot reach a thing that is not there yet.
export function fromUnderstood(roots, world, focus, marking) {
  clear();
  against = world;
  const calls = gather(roots, 'call');
  const links = gather(roots, 'learn').filter((one) => one.name === 'link');
  const events = gather(roots, 'event');
  const instructions = gather(roots, 'instruction');
  // What was claimed, whether or not the world had it already. A signal saying
  // something the brain knew still said it, and the conversation holds it.
  const claims = gather(roots, 'standing');

  // A quantity of a kind names no particular thing, so nothing is made for it.
  // What later facts reach is the kind itself.
  for (const link of links) {
    if (link.state.quantity == null) continue;
    const made = calls.find((call) => call.state.id === link.state.object);
    if (made && made.state.of != null) counting.set(made.state.id, made.state.of);
  }

  // A thing spoken of in particular is a thing, whether or not the world holds
  // one. `the sky is blue` speaks of the sky, and the next signal may point
  // back at it, so it is a node and not merely a concept two facts joined.
  const particular = determined(roots, marking);
  // Where the signal made one of a kind, that one is the thing spoken of. The
  // kind is not a second thing beside it.
  for (const call of calls) particular.delete(call.state.of);

  // Things in the order the signal reached them, not in the order it happened
  // to introduce them. A thing an earlier signal brought in is mentioned
  // rather than called, and it is no less first for that.
  const made = new Map(calls.filter((call) => call.state.id != null).map((call) => [call.state.id, call]));
  for (const id of reached(roots)) {
    if (standing.has(id) || counting.has(id)) continue;
    const call = made.get(id);
    // A thing, if this signal made one of it, if the world holds it as one, or
    // if the signal spoke of it in particular. A kind spoken of as a kind is
    // not a thing this conversation brought in.
    if (!call && !(world && world.isIndividual(id)) && !particular.has(id)) continue;
    // `the father of sam` says which one, but a father is what stands between
    // two people, not a third person beside them.
    if (!call && world && world.anchors.relation != null && world.isA(id, world.anchors.relation)) continue;
    const term = world && world.term(id);
    standing.set(
      id,
      put('nodes', {
        said: call ? named(call) : term ? term.name : String(id),
        term: id,
        of: call ? call.state.of ?? null : kindOf(id, world),
      }),
    );
  }

  // A claim put as a condition is not a claim made. What an instruction is
  // built out of stays inside the instruction.
  const governed = new Set();
  for (const one of instructions) {
    for (const side of [one.state.on, one.state.then]) {
      if (side) governed.add(triple(side.subject, side.relation, side.object));
    }
  }

  const said = new Set();
  const claimed = (subject, relation, object, quantity, denied) => {
    const key = triple(reach(subject), relation, reach(object));
    if (said.has(key) || governed.has(triple(subject, relation, object))) return;
    said.add(key);
    const primitive = standingOf(relation, reach(object), world);
    put('facts', {
      of: primitive ?? relation,
      said: relation,
      parts: [reach(subject), reach(object)],
      properties: {
        ...(quantity == null ? {} : { count: quantity }),
        // A comparison is made on something. Which scale is the world's to
        // say, and without it `taller` is only a word.
        ...(primitive === COMPARISON ? { on: scaleOf(relation, world) } : {}),
      },
      denied: denied === true,
    });
  };

  for (const link of links) {
    const { subject, relation, object, quantity, not } = link.state;
    claimed(subject, relation, object, quantity, not);
  }
  for (const claim of claims) {
    const { subject, relation, object, negated } = claim.state;
    claimed(subject, relation, object, null, negated);
  }

  for (const event of events) {
    const { action, parts, not, when } = event.state;
    const roles = {};
    const properties = {};
    for (const part of parts || []) {
      roles[part.role] = reach(part.of);
      if (part.amount != null) properties.count = part.amount;
    }
    const primitive = doing(roles, world);
    put('actions', {
      of: primitive ?? action,
      said: action,
      // A primitive of the brain's own carries the brain's own parts. A doing
      // it does not yet know keeps the roles the world gave it, rather than
      // being forced into a shape that is not its.
      ...(primitive === TRANSFER
        ? transferring(roles, properties, world)
        : primitive === PROPERTY_CHANGE
          ? changing(roles, properties, world)
          : { roles, properties }),
      denied: not === true,
      when: when ?? null,
    });
  }

  for (const instruction of instructions) {
    put('rules', { on: instruction.state.on ?? null, then: instruction.state.then ?? null });
  }

  // What is still in reach, said as the graph says everything else: a thing it
  // holds where it holds one, and the concept itself where it does not.
  inReach = (focus || [])
    .map((one) => (Number.isInteger(one) ? one : one && one.term))
    .filter((one) => Number.isInteger(one))
    .map((one) => reach(one));

  return graph();
}

// The primitives the brain knows.
//
// A primitive does not change with the language and does not change with the
// world, so it is the brain's own. It is not a term and not a file: `give`,
// `put`, `send` and `hand over` are one doing, and which word says it is the
// language's business, while which verbs a world happens to have is the
// world's.
//
// What the world does supply is which of its terms realizes a category the
// brain owns, and it says so through its anchors — the same bridge the brain
// already crosses for agent, target, source and destination.
export const TRANSFER = 'transfer';
export const PROPERTY_CHANGE = 'property-change';
export const HOLDING = 'holding';
export const PLACEMENT = 'placement';
export const COMPARISON = 'comparison';
export const ORDER = 'order';
export const PROPERTY = 'property';
export const KIND = 'kind';

// Which doing this is.
//
// A transfer is a thing coming to be, or ceasing to be, somewhere or with
// someone. Either end may be open — losing has no destination, building has no
// source — so it is the ends that say so, never the verb.
//
// A property change is a value taken and nothing moved. That is the whole
// difference between the two, and it is visible in the parts alone: one has
// somewhere it went, the other has only what it became.
function doing(roles, world) {
  const anchors = (world && world.anchors) || {};
  const played = (role) => role != null && Object.hasOwn(roles, role);
  if (played(anchors.source) || played(anchors.destination)) return TRANSFER;
  if (played(anchors.target) && isProperty(roles[anchors.target], world)) return PROPERTY_CHANGE;
  return null;
}

// What a transfer is made of: whoever did it, where it came from, where it
// went, and what moved. Either end may be open and says so with nothing in it.
// These are the brain's own parts. Which of its terms plays each one is the
// world's to say, through the anchors it already carries.
function transferring(roles, properties, world) {
  const anchors = (world && world.anchors) || {};
  const at = (role) => (role != null && Object.hasOwn(roles, role) ? roles[role] : null);
  return {
    parts: { doer: at(anchors.agent), from: at(anchors.source), to: at(anchors.destination) },
    properties: { entity: at(anchors.target), ...properties },
  };
}

// What a property change is made of: the thing, and the value it took.
function changing(roles, properties, world) {
  const anchors = (world && world.anchors) || {};
  const at = (role) => (role != null && Object.hasOwn(roles, role) ? roles[role] : null);
  return { parts: { thing: at(anchors.agent), took: at(anchors.target) }, properties };
}

// Which standing this is.
//
// The brain owns the categories; which of its terms realizes each one is the
// world's, and it says so with the links it already carries. Nothing here
// reads a word: a relation is a holding because the world put it under
// holding, a comparison because it compares on a scale, an ordering because it
// is a kind of order.
//
// The last two are told apart by what is on the other side rather than by the
// relation, because one relation says both: the sky *is* blue is a property,
// and a cat *is* an animal is a kind.
function standingOf(relation, object, world) {
  if (relation == null || !world) return null;
  const anchors = world.anchors || {};
  const realizes = (anchor) =>
    anchor != null &&
    (relation === anchor || world.isA(relation, anchor) || world.subrelationOf(relation, anchor));

  if (realizes(anchors.holding)) return HOLDING;
  if (realizes(anchors.placement)) return PLACEMENT;
  if (anchors.compares != null && (world.related(relation, anchors.compares) || []).length) return COMPARISON;
  if (realizes(anchors.order)) return ORDER;
  if (isProperty(object, world)) return PROPERTY;
  if (classifies(relation, world) && object != null && world.isA(object, anchors.thing)) return KIND;
  return null;
}

// What a comparing relation compares on.
const scaleOf = (relation, world) => {
  const on = world.related(relation, world.anchors.compares) || [];
  return on.length ? on[0] : null;
};

const isProperty = (id, world) =>
  id != null && world && world.anchors.property != null && world.isA(id, world.anchors.property);

const classifies = (relation, world) => {
  const anchors = world.anchors || {};
  return [anchors.subtype, anchors.instance, anchors.predication, world.baseRelation]
    .filter((one) => one != null)
    .some((one) => relation === one || world.subrelationOf(relation, one));
};

// What the world holds a thing under. Nothing said of it beyond its existing
// leaves it a thing and no more.
function kindOf(id, world) {
  const kinds = world.kinds(id) || [];
  return kinds.length ? kinds[0] : (world.anchors || {}).thing ?? null;
}

// What a thing is called where anything called it anything. A made individual
// carries the kind it was made from in its name, and that is not a word — it
// is what the world holds it under.
const named = (call) => call.state.name ?? String(call.state.id);

// How a term is reached from the graph: as one of its nodes, as the kind a
// quantity was of, or as a concept the world already had.
function reach(id) {
  if (id == null) return null;
  if (standing.has(id)) return standing.get(id);
  if (counting.has(id)) return counting.get(id);
  return id;
}

// One claim, said the one way, so the same claim reached twice is one fact.
const triple = (subject, relation, object) => `${subject}|${relation}|${object}`;

// Which concepts the signal spoke of in particular.
//
// A determiner says *which one* — this one, a new one, the one already
// spoken of. Which side of the word it stands on is the language's to declare,
// so nothing here assumes an order: the language says `after` or `before` and
// the marker is read off whichever neighbour that names.
function determined(roots, marking) {
  const spoken = [];
  const walk = (nodes) => {
    for (const one of nodes || []) {
      if (one.kind === 'thing') {
        const thought = (one.branch || []).find((branch) => branch.kind === 'thought');
        const said = (thought && thought.state && thought.state.thought) || {};
        // What the brain took to be a thing at all. `the red box` speaks of a
        // box; red is how it is, not what it is, so a determiner reaches past
        // it to the thing.
        const entity = (one.branch || []).find((branch) => branch.kind === 'entity');
        spoken.push({
          marks: said.marks ?? null,
          determiner: [].concat(said.functions || []).includes('determiner'),
          concept: entity && entity.state ? entity.state.concept : null,
        });
      }
      walk(one.branch);
    }
  };
  walk(roots);

  const found = new Set();
  const step = marking === 'before' ? -1 : 1;
  for (let i = 0; i < spoken.length; i++) {
    const one = spoken[i];
    if (!one.determiner || (one.marks !== 'known' && one.marks !== 'new')) continue;
    for (let at = i + step; at >= 0 && at < spoken.length; at += step) {
      if (spoken[at].concept == null) continue;
      found.add(spoken[at].concept);
      break;
    }
  }
  return found;
}

// Every term the signal reached, in the order it reached it. A thing is named
// where it is spoken of, and that is the order it belongs in.
function reached(roots, found = []) {
  for (const root of roots || []) {
    const state = root.state || {};
    const id = state.id ?? (state.thought && state.thought.concept) ?? state.concept;
    if (Number.isInteger(id) && !found.includes(id)) found.push(id);
    reached(root.branch, found);
  }
  return found;
}

// Everything of one kind in the tree, in the order it was reached.
function gather(roots, kind, found = []) {
  for (const root of roots || []) {
    if (root.kind === kind) found.push(root);
    gather(root.branch, kind, found);
  }
  return found;
}

// ---- saying what is in it --------------------------------------------------

// The graph, said back. Four headings, always, so an empty one says it is
// empty rather than going missing. How a concept is spelled is the world's,
// so it is handed in; told nothing, the graph says the id, which is still true.
export function serialize(world = against) {
  const spell = (id) => {
    if (id == null) return '—';
    if (typeof id === 'string') return id;
    const name = world && world.term(id) ? world.term(id).name : null;
    // A made individual is held under the kind it was made from and the id it
    // was given. The id is already said beside it, so it is not said twice.
    return name ? `${name.split('#')[0]}[${id}]` : String(id);
  };
  // A property whose value is a thing is said as one; a count is a number and
  // nothing goes looking for a word for it. Which is which is named here
  // rather than guessed at, because both are integers and they do not look
  // any different.
  const CONCEPTS = new Set(['entity', 'on']);
  const properties = (of) => {
    const said = Object.entries(of || {})
      .filter(([, value]) => value != null)
      .map(([name, value]) => `${name}: ${CONCEPTS.has(name) ? spell(value) : value}`);
    return said.length ? `  {${said.join(', ')}}` : '';
  };
  // The part a thing played in a doing is a role, not something said. It is
  // named and nothing more.
  const part = (id) => {
    const name = world && world.term(id) ? world.term(id).name : null;
    return name ?? String(id);
  };
  // Nothing is known of it beyond its being a thing at all.
  const bare = world && world.anchors ? world.anchors.thing : null;
  const type = (of) => (of == null ? 'entity -> ?' : of === bare ? 'entity -> thing' : spell(of));

  const lines = [];
  const section = (kind, rows) => {
    lines.push(`${kind}:`);
    for (const row of rows) lines.push(`  ${row}`);
    lines.push('');
  };

  section('nodes', held.nodes.map((one) => `${one.id}  ${one.said.split('#')[0]}  type: ${type(one.of)}`));
  section(
    'facts',
    held.facts.map(
      (one) =>
        `${one.id}  ${one.denied ? 'not ' : ''}${spell(one.of)}(${one.parts.map(spell).join(', ')})${properties(one.properties)}`,
    ),
  );
  section(
    'actions',
    held.actions.map((one) => {
      // A primitive says its parts by name and in its own order; whoever did
      // it stands first, because a doing is somebody's before it is anything
      // else. A doing the brain does not yet know says the roles it was given.
      const said = one.parts
        ? Object.entries(one.parts)
            // Whoever or whatever the doing is of stands first and unnamed: a
            // doing is something's before it is anything else.
            .map(([name, value], at) => (at === 0 ? spell(value) : `${name}: ${spell(value)}`))
            .join(', ')
        : Object.entries(one.roles)
            .map(([role, value]) => `${part(Number(role))}: ${spell(value)}`)
            .join(', ');
      return `${one.id}  ${one.denied ? 'not ' : ''}${spell(one.of)}(${said})${properties(one.properties)}`;
    }),
  );
  // A claim inside an instruction, said the way a fact is said.
  const claim = (side) =>
    side ? `${spell(side.relation)}(${spell(side.subject)}, ${spell(side.object)})` : '—';
  section('rules', held.rules.map((one) => `${one.id}  on ${claim(one.on)} -> ${claim(one.then)}`));
  section('context', inReach.length ? [`focus: [${inReach.map(spell).join(', ')}]`] : []);

  return lines.join('\n');
}
