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
      of: primitiveOf(relation, world),
      said: relation,
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
    put('actions', {
      of: primitiveOf(action, world),
      said: action,
      roles,
      properties,
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

// The primitive a concept falls under. `give` and `put` are both a transfer;
// which word a language spells them with is that language's, and the graph
// says the primitive. Which concepts are primitive is the world's to declare,
// not this module's to know.
function primitiveOf(concept, world) {
  const set = world && world.anchors ? world.anchors.primitive : null;
  if (set == null || concept == null) return concept;
  // Declared, not inferred. Being primitive is said of a concept directly, and
  // it is said with a link of its own rather than by putting the concept under
  // a parent: a parent would be inherited, and every kind of a transfer would
  // then call itself one.
  const declared = (id) => {
    const term = world.term(id);
    return !!term && (term.links || []).some((link) => !link.not && link.rel === set);
  };
  for (const kind of world.kinds(concept) || []) if (declared(kind)) return kind;
  return concept;
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
        const entity = (one.branch || []).find((branch) => branch.kind === 'entity');
        spoken.push({
          marks: said.marks ?? null,
          determiner: [].concat(said.functions || []).includes('determiner'),
          concept: said.concept ?? (entity && entity.state ? entity.state.concept : null),
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
  section('context', inReach.length ? [`focus: [${inReach.map(spell).join(', ')}]`] : []);

  return lines.join('\n');
}
