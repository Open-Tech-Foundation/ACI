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
const PREFIX = { nodes: 'n', facts: 'f', actions: 'a', rules: 'r' };

// Which node stands for which term of the world, and which terms turned out to
// be a quantity of a kind rather than a thing.
let standing = new Map();
let counting = new Map();

export function clear() {
  for (const kind of KINDS) {
    held[kind].length = 0;
    counted[kind] = 0;
  }
  standing = new Map();
  counting = new Map();
}

export function graph() {
  return Object.fromEntries(KINDS.map((kind) => [kind, held[kind].map((one) => ({ ...one }))]));
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
export function fromUnderstood(roots, world) {
  clear();
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

  // Things in the order the signal reached them, not in the order it happened
  // to introduce them. A thing an earlier signal brought in is mentioned
  // rather than called, and it is no less first for that.
  const made = new Map(calls.filter((call) => call.state.id != null).map((call) => [call.state.id, call]));
  for (const id of reached(roots)) {
    if (standing.has(id) || counting.has(id)) continue;
    const call = made.get(id);
    // A thing, if this signal made one of it, or if the world holds it as one.
    // A kind is not a thing this conversation brought in.
    if (!call && !(world && world.isIndividual(id))) continue;
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
    put('facts', {
      of: relation,
      parts: [reach(subject), reach(object)],
      properties: quantity == null ? {} : { count: quantity },
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
    put('actions', { of: action, roles, properties, denied: not === true, when: when ?? null });
  }

  for (const instruction of instructions) {
    put('rules', { on: instruction.state.on ?? null, then: instruction.state.then ?? null });
  }

  return graph();
}

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
export function serialize(world) {
  const spell = (id) => {
    if (id == null) return '—';
    if (typeof id === 'string') return id;
    const name = world && world.term(id) ? world.term(id).name : null;
    // A made individual is held under the kind it was made from and the id it
    // was given. The id is already said beside it, so it is not said twice.
    return name ? `${name.split('#')[0]}[${id}]` : String(id);
  };
  const properties = (of) => {
    const said = Object.entries(of || {}).map(([name, value]) => `${name}: ${value}`);
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
      const roles = Object.entries(one.roles)
        .map(([role, value]) => `${part(Number(role))}: ${spell(value)}`)
        .join(', ');
      return `${one.id}  ${one.denied ? 'not ' : ''}${spell(one.of)}(${roles})${properties(one.properties)}`;
    }),
  );
  // A claim inside an instruction, said the way a fact is said.
  const claim = (side) =>
    side ? `${spell(side.relation)}(${spell(side.subject)}, ${spell(side.object)})` : '—';
  section('rules', held.rules.map((one) => `${one.id}  on ${claim(one.on)} -> ${claim(one.then)}`));

  return lines.join('\n');
}
