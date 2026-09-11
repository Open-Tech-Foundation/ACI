// The conversation graph, held in memory.
//
// The brain fills it once a signal has been understood, and `serialize` says
// what is in it. Nothing outside builds any of this: what is shown is what is
// held.
//
// Four kinds, and the difference between them is the whole point:
//
//   nodes    what this conversation brought in. A quantity of a kind is one
//            of them too: one book and a book are the same book, and either
//            can be pointed back at, so saying it with a number does not make
//            it less of a thing.
//   facts    what is so. Holding, being taller, being inside. It did not
//            happen, so it is not in the history.
//   actions  what occurred, with the part each thing played in it.
//   rules    what governs — a condition and what stands on it.
//
// The graph holds no words. A concept is an id in the world, and how it is
// spelled is the world's business, not this module's.

export const TRANSFER = 'transfer';
export const PROPERTY_CHANGE = 'property-change';
export const HOLDING = 'holding';
export const PLACEMENT = 'placement';
export const COMPARISON = 'comparison';
export const ORDER = 'order';
export const PROPERTY = 'property';
export const KIND = 'kind';
export const MEASURE = 'measure';

// One conversation, one graph. Two brains are two conversations over their own
// worlds, and what one was told is nothing to the other — held in one place
// they would answer each other's questions and forget together. The runtime
// makes one of these per brain and hands it in with the rest of what is known.
export function conversation() {
const held = { nodes: [], facts: [], actions: [], rules: [] };
const counted = { nodes: 0, facts: 0, actions: 0, rules: 0 };
const KINDS = ['nodes', 'facts', 'actions', 'rules'];

// Not one of the kinds. Context is what a word in the next signal lands on —
// what is still in reach, nearest first — and it is thrown away with the
// conversation rather than being part of what is so.
let inReach = [];
const PREFIX = { nodes: 'n', facts: 'f', actions: 'a', rules: 'r' };

// Which node stands for which term of the world, and how many of its kind
// each node that was said as a quantity stands for.
let standing = new Map();
let counting = new Map();
// The world the graph was filled against. Saying it back needs the same one,
// and asking the caller to find it again invites a different answer.
let against = null;

// A conversation at a time, not a signal at a time. What one signal put in is
// still there when the next arrives — that is what makes tom still tom three
// signals later, and what makes the facts and doings, in the order they were
// said, a history there is anything to look back through.
//
// Called when a conversation ends, and never between two signals of one.
function clear() {
  for (const kind of KINDS) {
    held[kind].length = 0;
    counted[kind] = 0;
  }
  standing = new Map();
  counting = new Map();
  inReach = [];
  against = null;
}

function graph() {
  return {
    ...Object.fromEntries(
      KINDS.map((kind) => [
        kind,
        held[kind].map((one) => (kind === 'nodes' ? { ...one, of: known(one, against) } : { ...one })),
      ]),
    ),
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
function fromUnderstood(roots, world, focus, marking, from) {
  against = world;
  const calls = gather(roots, 'call');
  const links = gather(roots, 'learn').filter((one) => one.name === 'link');
  const events = gather(roots, 'event');
  const instructions = gather(roots, 'instruction');
  // What was claimed, whether or not the world had it already. A signal saying
  // something the brain knew still said it, and the conversation holds it.
  const claims = gather(roots, 'standing');

  // Which quantity a measure was said to be of, where the signal said it. Two
  // metres tall is a height, and the unit could not have told us.
  const saidOf = new Map();
  for (const one of gather(roots, 'thought')) {
    const said = one.state && one.state.thought;
    if (said && said.measures != null && said.concept != null) saidOf.set(said.concept, said.measures);
  }

  // A quantity of a kind is still a thing this conversation brought in. One
  // book and a book are the same book, and either can be pointed back at, so
  // saying it with a number does not make it less of a thing — it makes it a
  // thing that many of its kind stand in.
  for (const link of links) {
    if (link.state.quantity == null) continue;
    const made = calls.find((call) => call.state.id === link.state.object);
    if (made && made.state.of != null) {
      counting.set(made.state.id, { of: made.state.of, count: link.state.quantity });
    }
  }

  // A thing spoken of in particular is a thing, whether or not the world holds
  // one. `the sky is blue` speaks of the sky, and the next signal may point
  // back at it, so it is a node and not merely a concept two facts joined.
  const { determined: particular, qualities } = determined(roots, marking, world);
  // Where the signal made one of a kind, that one is the thing spoken of. The
  // kind is not a second thing beside it.
  for (const call of calls) particular.delete(call.state.of);

  // `tom is a person` says which person no more than `all cats are animals`
  // does: what stands on the far side of a classification is the kind tom is
  // one of, not somebody standing beside him. Only tom is a thing here, and
  // being a person is what we come to know about him.
  for (const one of [...links, ...claims]) {
    if (classifies(one.state.relation, world)) particular.delete(one.state.object);
  }

  // Whose a thing is. The runtime says who is speaking and the brain records
  // whose the thing is; without a node for them, `my house` said a house was
  // red and nothing about whose it was.
  //
  // Nothing is assumed about them. They are a thing in this conversation and
  // no more than that — what the runtime named is what they are called, and
  // the brain never decides who it is talking to.
  const owned = [];
  for (const call of calls) {
    const whose = call.state.whose;
    if (whose == null || call.state.id == null) continue;
    owned.push([whose, call.state.id]);
  }
  // Whoever a thing belongs to was spoken of before it — `my house` says whose
  // before it says what — so they stand first.
  for (const [whose] of owned) {
    if (!standing.has(whose)) {
      const term = world && world.term(whose);
      standing.set(
        whose,
        put('nodes', {
          said: term ? term.name : String(whose),
          term: whose,
          made: world && world.anchors ? world.anchors.thing : null,
          bare: true,
        }),
      );
    }
  }

  // Things in the order the signal reached them, not in the order it happened
  // to introduce them. A thing an earlier signal brought in is mentioned
  // rather than called, and it is no less first for that.
  const made = new Map(calls.filter((call) => call.state.id != null).map((call) => [call.state.id, call]));
  // The collection a kind was counted into, where this conversation holds one.
  const drawnFrom = (kind) => {
    if (kind == null) return null;
    for (const one of held.nodes) {
      if (one.count == null) continue;
      if (one.term === kind || known(one, world) === kind) return one.id;
    }
    return null;
  };
  for (const id of reached(roots)) {
    if (standing.has(id)) continue;
    const call = made.get(id);
    // A thing, if this signal made one of it, if the world holds it as one, or
    // if the signal spoke of it in particular. A kind spoken of as a kind is
    // not a thing this conversation brought in.
    //
    // Whoever is speaking is a thing whatever else they are. The runtime says
    // no more than what they are — a person, a device — and the brain never
    // decides who it is talking to; but somebody said this, and what they said
    // is theirs, so they stand in the conversation like anything else spoken
    // of. Without this `i have a car` had the car belong to the kind `person`.
    if (!call && !(world && world.isIndividual(id)) && !particular.has(id) && id !== from) continue;
    // `the father of sam` says which one, but a father is what stands between
    // two people, not a third person beside them.
    if (!call && world && world.anchors.relation != null && world.isA(id, world.anchors.relation)) continue;
    const term = world && world.term(id);
    // What it is is not written down. A signal three turns later may say what
    // a thing is, and a kind fixed when the node was made would still be
    // calling it a thing. It is read off the world when it is asked for.
    //
    // What the call said is kept only to fall back on. A thing this very
    // signal made is not in the world yet — the change is written after the
    // brain has answered — so until it lands there is nowhere else to ask.
    const many = counting.get(id);
    standing.set(
      id,
      put('nodes', {
        said: call ? named(call) : term ? term.name : String(id),
        term: id,
        made: call ? call.state.of ?? null : null,
        // What it was called, where somebody called it something. A word given
        // as a name reaches this thing for the rest of the conversation, even
        // where the world calls something else by it.
        ...(call && !call.state.made && call.state.called != null
          ? { called: call.state.word ?? call.state.name }
          : {}),
        ...(many ? { count: many.count } : {}),
        // Where a thing was drawn from. One of two dogs is one of *those* two,
        // not a dog standing loose beside them, so the collection it came out
        // of is kept on it.
        ...(call && call.state.made && call.state.of != null && drawnFrom(call.state.of) != null
          ? { from: drawnFrom(call.state.of) }
          : {}),
        // How it is, where the signal said so beside it. Counted, the thing
        // this signal made has an identity of its own while the quality was
        // said of the kind standing there — `two red cars` says red of cars —
        // so what was said of the kind is said of the one made from it.
        ...(qualities.has(id)
          ? { how: qualities.get(id) }
          : call && call.state.of != null && qualities.has(call.state.of)
            ? { how: qualities.get(call.state.of) }
            : {}),
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

  // Measures taken from another thing, held until the fact that names both
  // turns up.
  const waiting = [];
  const said = new Set();
  const claimed = (subject, relation, object, quantity, denied) => {
    // A claim naming neither what it is about nor what it stands to says
    // nothing. Joining two things leaves one of these over the pair, and it is
    // not a third holding beside the two real ones.
    if (subject == null || object == null) return;
    const key = triple(reach(subject), relation, reach(object));
    if (said.has(key) || governed.has(triple(subject, relation, object))) return;
    said.add(key);
    // A part played in a doing belongs to the doing, not between two things.
    // `anu changed the destination to mumbai` says where the booking is now
    // for — the transfer already has a destination, and this is that one
    // changed. Where the doing is a transfer the brain already holds its ends
    // as its own, so the change goes there and what it was before stays behind
    // it.
    if (rolePlayed(relation, world) && shifted(relation, reach(object), world)) return;
    const primitive = standingOf(relation, reach(object), world);
    // How much of something a thing is, is the thing's own — it belongs on it
    // the way a colour does, not between it and the unit. Which quantity it is
    // of, the unit says.
    if (primitive === MEASURE && quantity != null) {
      const one = held.nodes.find((node) => node.id === reach(subject));
      if (one) {
        // A measure is a quantity, an amount and a unit — three, never two.
        // The unit answers which quantity only where it serves one: a degree
        // can be nothing but temperature, while a metre serves a height, a
        // length and a distance alike.
        const serves = world.related(object, world.anchors.measure) || [];
        const of = saidOf.get(object) ?? (serves.length === 1 ? serves[0] : null);
        // A quantity taken from another thing is between the two of them and
        // belongs to neither, so it waits for the fact that names both rather
        // than sitting on the one that happened to be said first.
        if (of != null && between(of, world)) {
          waiting.push({ subject: reach(subject), of, amount: quantity, unit: object });
          return;
        }
        one.measures = [...(one.measures || []), { of, amount: quantity, unit: object }];
        return;
      }
    }
    // How a thing is belongs to it. Said beside it — a red box — it was
    // already held on the thing; said of it — the sky is blue — it stood
    // between the two as a fact, so the same claim landed in two places and
    // which one depended on where English put the word. It goes on the thing
    // either way now, and there is one place to look.
    if (primitive === PROPERTY) {
      const one = held.nodes.find((node) => node.id === reach(subject));
      if (one) {
        one.how = { ...(one.how || {}), [qualityKind(object, world)]: object };
        return;
      }
    }
    // What is held is a thing of a kind, not a party to the fact: it is said
    // by the kind the world holds it under, the same way a doing says what
    // moved. Whoever holds it is a party, and that is a node.
    // A thing this signal picked out is still said by its kind here: what is
    // held is a kind and how many, never the thing itself.
    const of = made.get(object);
    const far = primitive === HOLDING ? (of ? of.state.of ?? object : object) : reach(object);
    // A comparison stands one thing above another on a quantity, and which is
    // above is said by the order of the two, never by a flag naming one of
    // them. Said the other way round — shorter rather than taller — the same
    // fact turns round with it.
    const parts =
      primitive === COMPARISON && !above(relation, world)
        ? [far, reach(subject)]
        : [reach(subject), far];
    put('facts', {
      key,
      of: primitive ?? relation,
      said: relation,
      parts,
      properties: {
        ...(quantity == null ? {} : { count: quantity }),
        // A comparison is made on something. Which scale is the world's to
        // say, and without it `taller` is only a word.
        ...(primitive === COMPARISON ? { on: scaleOf(relation, world) } : {}),
        // Which placement it is. Inside is not beside and neither is under, so
        // the primitive says a thing stands somewhere and the world says where.
        ...(primitive === PLACEMENT ? { as: relation } : {}),
      },
      denied: denied === true,
    });
  };

  // Only what the signal claimed is a fact. Where a doing follows from it, the
  // brain works out what everyone holds afterwards and writes that down — but
  // nobody said it, and it is not a second fact. Five books were said and two
  // were moved; how many are left follows from those and is worked out when it
  // is asked for, never stored, because storing it goes stale the moment
  // anything moves again.
  //
  // What was said carries a claim beside it. What was worked out carries none.
  // A claim names the kinds; what was written down names the things made of
  // them. Either side may be one or the other, so both are matched the same
  // way: the thing itself, or the kind it was made of.
  const same = (link, there, said) => {
    if (there === said) return true;
    // What was written down may name the thing the signal made of a kind,
    // where the claim names the kind. A record says which it made.
    if (link.state.made && link.state.made.id === there && link.state.made.of === said) return true;
    const one = made.get(there);
    if (one && (one.state.of === said || one.state.id === said)) return true;
    return counting.get(there)?.of === said;
  };
  const alongside = (claim) =>
    links.find(
      (link) =>
        same(link, link.state.subject, claim.subject) &&
        link.state.relation === claim.relation &&
        same(link, link.state.object, claim.object),
    ) || null;
  for (const claim of claims) {
    const { subject, relation, object, negated } = claim.state;
    const from = alongside(claim.state);
    // A counted thing is a node, so a later word can point back at it — but
    // what a fact reaches is the kind and how many, not that node. So many of
    // a kind cannot be handed to one thing until there is a way to say a group,
    // and until then the count says everything the fact knows.
    claimed(subject, relation, object, from ? from.state.quantity : null, negated);
  }

  for (const event of events) {
    const { action, parts, not, when } = event.state;
    const roles = {};
    const properties = {};
    // How many of a part there are belongs to that part. `split them into
    // three groups` counts the groups, `put two books into a box` counts the
    // books, and a count kept loose on the doing cannot say which.
    const counts = {};
    for (const part of parts || []) {
      roles[part.role] = reach(part.of);
      if (part.amount != null) counts[part.role] = part.amount;
    }
    const a2 = (world && world.anchors) || {};
    if (counts[a2.target] != null) properties.count = counts[a2.target];
    else if (Object.keys(counts).length === 1) properties.count = Object.values(counts)[0];
    const primitive = doing(roles, world);
    put('actions', {
      of: primitive ?? action,
      said: action,
      // When it happened, where the signal said so. A doing stands on the same
      // quantity as anything else that has a time, so two of them compare.
      ...(event.state.time ? { time: event.state.time } : {}),
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

    // Many of a kind on the far end of a doing are that many things. `split
    // them into three groups` makes three groups, and each is drawn from what
    // was split — how many went into each, nobody said, so nothing says it.
    const into = roles[a2.destination];
    const many = counts[a2.destination];
    // What kind the far end is: the term itself where the world holds one, and
    // otherwise the kind the signal made it from.
    const asKind = (part) => {
      if (part == null) return null;
      const one = held.nodes.find((n) => n.id === part);
      if (one) return known(one, world) ?? one.term;
      return termOf(part);
    };
    const of = asKind(into);
    if (of != null && many != null && many > 1) {
      const whole = drawnFrom(asKind(roles[a2.target]));
      const kind = world && world.term(of);
      if (kind) {
        for (let i = 0; i < many; i += 1) {
          put('nodes', {
            said: kind.name,
            term: of,
            made: of,
            ...(whole ? { from: whole } : {}),
          });
        }
      }
    }
  }

  // Whose a thing is, said as the holding it is.
  for (const [whose, of] of owned) {
    const key = triple(reach(whose), world.anchors.holding, reach(of));
    if (said.has(key)) continue;
    said.add(key);
    put('facts', {
      key,
      of: HOLDING,
      said: world.anchors.holding,
      parts: [reach(whose), reach(of)],
      properties: {},
      denied: false,
    });
  }

  // What is measured between two things goes on the standing between them.
  for (const one of waiting) {
    const on = held.facts.find(
      (fact) => fact.of === MEASURE && fact.parts[0] === one.subject && fact.properties.of == null,
    );
    if (!on) continue;
    on.properties = { ...on.properties, of: one.of, amount: one.amount, unit: one.unit };
  }

  for (const instruction of instructions) {
    put('rules', { on: instruction.state.on ?? null, then: instruction.state.then ?? null });
  }

  // What is still in reach, said as the graph says everything else: a thing it
  // holds where it holds one, and the concept itself where it does not.
  // What is in reach is replaced, never added to: it is where the brain's
  // attention is now, and the last signal settles that on its own.
  //
  // A flat list of what was just spoken of — things, doings, what was claimed
  // — so a word in the next signal has somewhere to land. What arrives as a
  // whole claim is opened up: the two things it stands between are what a
  // later word can point at, and a claim standing in reach with a subject
  // buried inside it is nothing to point at at all.
  const inSight = [];
  const bring = (one) => {
    if (one != null && !inSight.includes(one)) inSight.push(one);
  };
  // A doing that was recorded is in reach as the doing that was recorded, not
  // as the concept behind it; a claim is the fact it became. The graph already
  // gave both an id, and that id is what a later word points at.
  const recorded = (concept) => {
    const one = held.actions.find((doing) => doing.said === concept);
    return one ? one.id : concept;
  };
  const stated = (claim) => {
    const key = triple(reach(claim.subject), claim.relation, reach(claim.object));
    const one = held.facts.find((fact) => fact.key === key);
    return one ? one.id : null;
  };
  for (const one of focus || []) {
    if (Number.isInteger(one)) bring(recorded(one));
    else if (one && Number.isInteger(one.term)) bring(reach(one.term));
    else if (one && one.standing) bring(stated(one.standing) ?? reach(one.standing.subject));
  }
  // Two different terms may be one thing in the graph, so what is in reach is
  // settled after they are reached, not before.
  inReach = [];
  for (const one of inSight) {
    const found = typeof one === 'string' ? one : reach(one);
    if (found != null && !inReach.includes(found)) inReach.push(found);
  }

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

// Whether a relation names a part played in a doing rather than a fact between
// two things. Which parts there are the world says, through its anchors.
function rolePlayed(relation, world) {
  const a = (world && world.anchors) || {};
  return relation != null && [a.agent, a.target, a.source, a.destination].includes(relation);
}

// The latest doing this conversation holds that plays that part, given a new
// one to play it. What it was stays behind it, so the history keeps the rest.
function shifted(relation, to, world) {
  const a = (world && world.anchors) || {};
  const where = relation === a.destination
    ? 'to'
    : relation === a.source
      ? 'from'
      : relation === a.agent
        ? 'doer'
        : null;
  for (let i = held.actions.length - 1; i >= 0; i -= 1) {
    const one = held.actions[i];
    if (where != null && one.parts && one.parts[where] != null) {
      if (one.parts[where] === to) return true;
      one.was = [...(one.was || []), { part: where, of: one.parts[where] }];
      one.parts = { ...one.parts, [where]: to };
      return true;
    }
    if (one.roles && one.roles[relation] != null) {
      if (one.roles[relation] === to) return true;
      one.was = [...(one.was || []), { part: relation, of: one.roles[relation] }];
      one.roles = { ...one.roles, [relation]: to };
      return true;
    }
  }
  return false;
}

// What this conversation holds as the part played in the latest doing that
// plays it. Asked for the destination, it is the one the booking is for now.
function roleIn(relation, world) {
  const a = (world && world.anchors) || {};
  const where = relation === a.destination
    ? 'to'
    : relation === a.source
      ? 'from'
      : relation === a.agent
        ? 'doer'
        : null;
  for (let i = held.actions.length - 1; i >= 0; i -= 1) {
    const one = held.actions[i];
    if (where != null && one.parts && one.parts[where] != null) return termOf(one.parts[where]);
    if (one.roles && one.roles[relation] != null) return termOf(one.roles[relation]);
  }
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
    properties: { thing: at(anchors.target), ...properties },
  };
}

// What a property change is made of: the thing, and the value it took.
function changing(roles, properties, world) {
  const anchors = (world && world.anchors) || {};
  const at = (role) => (role != null && Object.hasOwn(roles, role) ? roles[role] : null);
  const took = at(anchors.target);
  // Which property took the value, not only the value. Turning red is a change
  // of colour, and the world says red is a colour before it is anything else.
  return {
    parts: { thing: at(anchors.agent) },
    properties: { ...(took == null ? {} : { [qualityKind(took, world)]: took }), ...properties },
  };
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

  // So much of something, in a unit. What the unit measures is the world's to
  // say — a kilogram measures weight, a metre size — so the brain knows only
  // that a thing has physical quantities and that a unit names which.
  if (realizes(anchors.measure)) return MEASURE;
  if (realizes(anchors.holding)) return HOLDING;
  if (realizes(anchors.placement)) return PLACEMENT;
  if (anchors.compares != null && (world.related(relation, anchors.compares) || []).length) return COMPARISON;
  if (realizes(anchors.order)) return ORDER;
  if (isProperty(object, world)) return PROPERTY;
  if (classifies(relation, world) && object != null && world.isA(object, anchors.thing)) return KIND;
  return null;
}

// What a comparing relation compares on: the quantity, not the state of it.
// `taller` compares on how tall a thing is, and how tall a thing is, is its
// height — so a thing said to be two metres and a thing said to be taller are
// speaking of one quantity and can be held together.
const scaleOf = (relation, world) => {
  const on = (world.related(relation, world.anchors.compares) || [])[0];
  return on == null ? null : quantityOn(on, world) ?? on;
};

// Whether the near side of a comparison is the one with more. The world says
// which way it runs — a comparison is a kind of more, or a kind of less — and
// one read from either end is one fact.
function above(relation, world) {
  const anchors = world.anchors || {};
  if (anchors.less != null && world.subrelationOf(relation, anchors.less)) return false;
  return true;
}

// The quantity a state is a state of. Measuring runs one way — a metre
// measures height, and height measures tall — so what a state is a state of is
// what measures it. The world says which; where it says nothing, the state is
// all there is.
const quantityOn = (state, world) => {
  const of = world.anchors && world.anchors.measure != null
    ? world.members(state, world.anchors.measure) || []
    : [];
  return of.length ? of[0] : null;
};

// How something is, and not how many of it there are.
// A quantity taken from another thing rather than from some one thing nobody
// names: it is between two and belongs to neither.
const between = (of, world) =>
  world.anchors.reference != null &&
  world.anchors.thing != null &&
  (world.related(of, world.anchors.reference) || []).includes(world.anchors.thing);

const isQuality = (id, world) =>
  isProperty(id, world) &&
  !(world.anchors.quantity != null && world.isA(id, world.anchors.quantity));

const isProperty = (id, world) =>
  id != null && world && world.anchors.property != null && world.isA(id, world.anchors.property);

const classifies = (relation, world) => {
  const anchors = world.anchors || {};
  return [anchors.subtype, anchors.instance, anchors.predication, world.baseRelation]
    .filter((one) => one != null)
    .some((one) => relation === one || world.subrelationOf(relation, one));
};

// What a node is: what the world holds it under, or what it was made as while
// the world has yet to hear of it.
function known(one, world) {
  if (!world) return one.made ?? null;
  // Told only that somebody is speaking, the brain holds them as a thing and
  // no more. What the world happens to call the term it was handed is not a
  // claim about who they are.
  if (one.bare) return one.made ?? (world.anchors ? world.anchors.thing : null);
  // A thing spoken of by its kind is that kind. Climbing a step would answer
  // with what it is a kind of — a box would come back a container — and throw
  // away the very thing that was said.
  if (world.term(one.term) && !world.isIndividual(one.term)) return one.term;
  const held = (world.kinds(one.term) || [])[0];
  if (held != null && held !== (world.anchors || {}).thing) return held;
  return one.made ?? held ?? (world.anchors ? world.anchors.thing : null);
}

// What the world holds a thing under. Nothing said of it beyond its existing
// leaves it a thing and no more.
function kindOf(id, world) {
  if (!world) return null;
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
  if (counting.has(id)) return counting.get(id).of;
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
function determined(roots, marking, world) {
  const spoken = [];
  const walk = (nodes) => {
    for (const one of nodes || []) {
      if (one.kind === 'thing') {
        const thought = (one.branch || []).find((branch) => branch.kind === 'thought');
        const said = (thought && thought.state && thought.state.thought) || {};
        // What the brain took to be a thing at all. `the red box` speaks of a
        // box; red is how it is, not what it is, so a marker beside it reaches
        // past it to the thing.
        const entity = (one.branch || []).find((branch) => branch.kind === 'entity');
        // A thing the signal made one of is that one, not its kind: two boxes
        // told apart by their colours are two things, and each quality belongs
        // to the box it was said beside.
        const call = (one.branch || []).find((branch) => branch.kind === 'call');
        spoken.push({
          marks: said.marks ?? null,
          determiner: [].concat(said.functions || []).includes('determiner'),
          concept: call ? call.state.id : entity && entity.state ? entity.state.concept : null,
          // A word standing beside a thing that says how it is, rather than
          // what it is.
          quality: isQuality(said.concept, world) ? said.concept : null,
        });
      }
      walk(one.branch);
    }
  };
  walk(roots);

  const step = marking === 'before' ? -1 : 1;
  // The thing a word beside it is about: the nearest one on the side the
  // language says its markers stand on.
  const about = (i) => {
    for (let at = i + step; at >= 0 && at < spoken.length; at += step) {
      if (spoken[at].concept != null) return spoken[at].concept;
    }
    return null;
  };

  const found = new Set();
  const how = new Map();
  for (let i = 0; i < spoken.length; i++) {
    const one = spoken[i];
    if (one.determiner && (one.marks === 'known' || one.marks === 'new')) {
      const thing = about(i);
      if (thing != null) found.add(thing);
    }
    // `a red box` is a box that is red. The quality is said of the thing it
    // stands beside, and it is held on the thing rather than put between two
    // things as a fact: how something is belongs to it.
    if (one.quality != null) {
      const thing = about(i);
      if (thing != null) {
        const held = how.get(thing) || {};
        held[qualityKind(one.quality, world)] = one.quality;
        how.set(thing, held);
      }
    }
  }
  return { determined: found, qualities: how };
}

// Which sort of quality it is: a colour, a size, a shape. The world says so —
// `red` is a colour before it is anything else — and where it says only that
// it is a quality, that is what it is called.
function qualityKind(quality, world) {
  const property = world && world.anchors ? world.anchors.property : null;
  // A quality that is a state of some quantity is filed under that quantity:
  // tall is how high a thing is, so it belongs with the height.
  const on = world ? quantityOn(quality, world) : null;
  if (on != null) return world.term(on)?.name ?? String(on);
  for (const kind of (world && world.kinds(quality)) || []) {
    if (kind !== quality && kind !== property) return world.term(kind)?.name ?? String(kind);
  }
  return world && world.term(property) ? world.term(property).name : 'quality';
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

// Whether a thing is in a state, worked out from what it measures.
//
// A state holds over a band of its quantity: hot is temperature from thirty
// degrees up, and a room at thirty-two is hot without anyone having said so.
// The band is the world's — what counts as hot is a fact about the world, not
// about any language — and where the world declares none, the brain says it
// does not know rather than deciding for itself.
//
// This is what makes `is it hot` answerable at all, and it is the same shape
// as one thing standing above another on a quantity.
function inState(thing, state, world = against, from) {
  const of = quantityOn(state, world);
  if (of == null) return null;
  const held = amounts(of, from).get(thing);
  if (held == null) return null;
  const band = bandOf(state, world);
  if (band.above == null && band.below == null) return null;
  if (band.above != null && held < band.above) return false;
  if (band.below != null && held >= band.below) return false;
  return true;
}

// Where a state begins and ends on its quantity, as the world declares it.
// The amount rides on the link and the unit is what it points at.
function bandOf(state, world) {
  const anchors = (world && world.anchors) || {};
  const bound = (rel) => {
    if (rel == null) return null;
    const term = world.term(state);
    const link = ((term && term.links) || []).find((one) => one.rel === rel && !one.not);
    return link ? link.quantity : null;
  };
  return { above: bound(anchors.above), below: bound(anchors.below) };
}

// What this conversation was told, asked of exactly. A question is answered
// from what was said here before the world is asked at all: the world is what
// the brain knows in general, and a conversation is what it has just been
// told.
//
// Exactly, and not nearly. A fact about one thing is not a fact about its kind
// or about anything like it, and reaching for one would answer a question
// nobody asked.
function told(subject, relation, object) {
  let found = null;
  for (const one of held.facts) {
    if (!same(one.parts[0], subject)) continue;
    // State is the latest of it and nothing earlier. Where a thing is, and how
    // it stands on one of its quantities, are both of them state: a drum put in
    // a box and then on a shelf is on the shelf, and what it was said to be
    // before is history rather than a second fact standing beside this one.
    // Everything else stands together — a thing holding a book still holds the
    // pen it was given first.
    if (state(one, against) && !same(one.parts[1], object)) {
      if (sameState(one, relation, object, against)) found = null;
      continue;
    }
    if (one.said !== relation || !same(one.parts[1], object)) continue;
    found = one.denied ? 'against' : 'held';
  }
  return found;
}

// Whether a fact is one that a later one supersedes.
function state(one, world) {
  if (!world) return false;
  if (one.of === PLACEMENT) return true;
  return one.of === PROPERTY && quantityOn(termOf(one.parts[1]), world) != null;
}

// Whether a later fact is about the same state — the same placement, or the
// same quantity — as the one being asked after.
function sameState(one, relation, object, world) {
  if (!world) return false;
  if (one.of === PLACEMENT) {
    return world.anchors.placement != null && world.isA(relation, world.anchors.placement);
  }
  const of = quantityOn(termOf(one.parts[1]), world);
  return of != null && of === quantityOn(object, world);
}

// Everything this conversation has put in a given ordering, either end of it.
// Which things are in question is the conversation's to say: asked who arrived
// first, nobody is asking about the days of the week, however plainly Monday
// comes before Tuesday.
function joinedBy(relation) {
  const found = [];
  for (const one of held.facts) {
    if (one.said !== relation || one.denied) continue;
    for (const part of one.parts) {
      const term = termOf(part);
      if (term != null && !found.includes(term)) found.push(term);
    }
  }
  return found;
}

// What this conversation calls by a word. Somebody may call a pet `river`, and
// the world goes on calling a river a river — but here, and until the
// conversation ends, the word reaches the pet.
function namedIn(word) {
  if (typeof word !== 'string') return null;
  const wanted = word.toLowerCase();
  for (let i = held.nodes.length - 1; i >= 0; i -= 1) {
    const one = held.nodes[i];
    if (typeof one.called === 'string' && one.called.toLowerCase() === wanted) return one.term;
  }
  return null;
}

// Everything this conversation put on the near side of a relation to a thing:
// who stands taller than sam, rather than who sam stands taller than.
function standingIn(object, relation) {
  const found = [];
  for (const one of held.facts) {
    if (one.said !== relation || one.denied) continue;
    if (!same(one.parts[1], object)) continue;
    const term = termOf(one.parts[0]);
    if (term != null && !found.includes(term)) found.push(term);
  }
  return found;
}

// A node stands for a term of the world, so a claim about that term is a claim
// about the node.
const same = (part, term) => part === term || termOf(part) === term;

const termOf = (part) => {
  if (typeof part !== 'string') return part;
  const one = held.nodes.find((node) => node.id === part);
  return one ? one.term : null;
};

// Where each thing stands on a quantity, worked out from what was said.
//
// Told one thing is above another and that one above a third, the brain is
// told an ordering and never a height. So a position is counted, not stored:
// a thing stands as high as the number of things it reaches down to. Say one
// more comparison and every position moves, which is exactly why none of them
// is written down.
//
// It is ordinal and says so. From `taller` comes an order and no heights, so
// how much taller is not answerable and the brain does not pretend it is.
// How much of a quantity each thing has, where the amounts were said. A
// quantity of a thing's own is read off the thing; one taken from another
// thing is read off the standing between them, and which thing it is taken
// from has to be named — there is no distance without saying from what.
function amounts(quantity, from) {
  const found = new Map();
  for (const one of held.nodes) {
    for (const measure of one.measures || []) {
      if (measure.of === quantity) found.set(one.id, measure.amount);
    }
  }
  for (const one of held.facts) {
    if (one.of !== MEASURE || one.denied) continue;
    if (one.properties.of !== quantity) continue;
    if (from != null && one.parts[1] !== from) continue;
    found.set(one.parts[0], one.properties.amount);
  }
  return found;
}

function ranking(quantity, moment) {
  const below = new Map();
  for (const one of held.facts) {
    if (one.of !== COMPARISON || one.properties.on !== quantity) continue;
    if (one.denied) continue;
    const [over, under] = one.parts;
    if (over == null || under == null) continue;
    if (!below.has(over)) below.set(over, new Set());
    if (!below.has(under)) below.set(under, new Set());
    below.get(over).add(under);
  }
  // Everything a thing reaches down to, not only what it was said to be above:
  // told tom is above sam and sam above john, tom is above john as well.
  const reaches = (one, seen = new Set()) => {
    for (const next of below.get(one) || []) {
      if (seen.has(next)) continue;
      seen.add(next);
      reaches(next, seen);
    }
    return seen;
  };
  const found = new Map();
  for (const one of below.keys()) found.set(one, reaches(one).size + 1);
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
function serialize(world = against) {
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
  const CONCEPTS = new Set(['thing', 'on', 'as', 'of', 'unit', 'colour', 'state', 'position', 'size', 'height', 'weight', 'temperature', 'speed', 'time', 'length', 'distance']);
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
  // What a thing is. Nothing said of it beyond its existing leaves it a thing
  // and no more, and `thing` is a concept of the world like any other — there
  // is no kind above it the brain keeps for itself.
  const type = (of) => (of == null ? '?' : spell(of));

  const lines = [];
  const section = (kind, rows) => {
    lines.push(`${kind}:`);
    for (const row of rows) lines.push(`  ${row}`);
    lines.push('');
  };

  section(
    'nodes',
    held.nodes.map(
      (one) =>
        `${one.id}  ${one.said.split('#')[0]}  type: ${type(known(one, world))}` +
        (one.from ? `  of ${one.from}` : '') +
        (one.count != null ? `  × ${one.count}` : '') +
        (one.how ? `  {${Object.entries(one.how).map(([name, value]) => `${name}: ${spell(value)}`).join(', ')}}` : '') +
        (one.measures
          ? `  {${one.measures
              .map((held) => `${held.of == null ? '?' : part(held.of)}: ${held.amount} ${spell(held.unit)}`)
              .join(', ')}}`
          : ''),
    ),
  );
  section(
    'facts',
    held.facts.map((one) => {
      // A bare name is one of the brain's own; a name with an id beside it is
      // the world's. So a fact the brain knows of itself says its own name,
      // and a fact standing on a relation the world holds says `relation` —
      // which is what the brain knows — with the relation itself as what it
      // stands on. Nothing of the world is ever spelled where a primitive goes.
      const own = typeof one.of === 'string';
      const ends = one.parts.map(spell).join(', ');
      const said = own
        ? `${one.of}(${ends})`
        : `relation(${ends}, type: ${spell(one.of)})`;
      return `${one.id}  ${one.denied ? 'not ' : ''}${said}${properties(one.properties)}`;
    }),
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
            // The same rule: whoever did it stands first and unnamed. Every
            // other end is named, since its place cannot say which it is.
            .sort(([role]) => (Number(role) === (world && world.anchors ? world.anchors.agent : null) ? -1 : 0))
            .map(([role, value], at) =>
              at === 0 && Number(role) === (world && world.anchors ? world.anchors.agent : null)
                ? spell(value)
                : `${part(Number(role))}: ${spell(value)}`,
            )
            .join(', ');
      const when = one.time ? `  at ${one.time.amount} ${spell(one.time.unit)}` : '';
      // The same rule the facts are said by: a doing the brain knows of itself
      // says its own name, and a doing the world holds says `action` — one of
      // the four ways anything exists — with the doing itself as what it
      // stands on.
      const own = typeof one.of === 'string';
      const does = own
        ? `${one.of}(${said})`
        : `action(${said}${said ? ', ' : ''}type: ${spell(one.of)})`;
      return `${one.id}  ${one.denied ? 'not ' : ''}${does}${when}${properties(one.properties)}`;
    }),
  );
  // A claim inside an instruction, said the way a fact is said.
  const claim = (side) =>
    side ? `${spell(side.relation)}(${spell(side.subject)}, ${spell(side.object)})` : '—';
  section('rules', held.rules.map((one) => `${one.id}  on ${claim(one.on)} -> ${claim(one.then)}`));
  section('context', inReach.length ? [`focus: [${inReach.map(spell).join(', ')}]`] : []);

  return lines.join('\n');
}

  return {
    clear,
    graph,
    fromUnderstood,
    serialize,
    inState,
    told,
    namedIn,
    standingIn,
    joinedBy,
    roleIn: (relation) => roleIn(relation, against),
    amounts,
    ranking,
  };
}
