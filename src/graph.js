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

import { grownBy } from './world.js';
import { unitsIn } from './calendar.js';
import { working } from './working.js';

export const TRANSFER = 'transfer';
export const PROPERTY_CHANGE = 'property-change';
export const STATE_CHANGE = 'state-change';
export const HOLDING = 'holding';
export const PLACEMENT = 'placement';
export const COMPARISON = 'comparison';
export const ORDER = 'order';
export const PROPERTY = 'property';
export const KIND = 'kind';
export const MEASURE = 'measure';
export const MEMBER = 'member';

// One conversation, one graph. Two brains are two conversations over their own
// worlds, and what one was told is nothing to the other — held in one place
// they would answer each other's questions and forget together. The runtime
// makes one of these per brain and hands it in with the rest of what is known.
export function conversation() {
// The stages of working something out. A conversation has two memories and
// they hold different things: this one holds what it was told, and that one
// holds what the brain worked out from it. Neither is written into the other.
const worked = working();
const held = { nodes: [], groups: [], facts: [], actions: [], rules: [], moments: [] };
const counted = { nodes: 0, groups: 0, facts: 0, actions: 0, rules: 0, moments: 0 };
const KINDS = ['nodes', 'groups', 'facts', 'actions', 'rules', 'moments'];

// Not one of the kinds. Context is what a word in the next signal lands on —
// what is still in reach, nearest first — and it is thrown away with the
// conversation rather than being part of what is so.
let inReach = [];
const PREFIX = { nodes: 'n', groups: 'g', facts: 'f', actions: 'a', rules: 'r', moments: 'm' };

// Which node stands for which term of the world, and how many of its kind
// each node that was said as a quantity stands for.
let standing = new Map();
let counting = new Map();
// The world the graph was filled against. Saying it back needs the same one,
// and asking the caller to find it again invites a different answer.
let against = null;

// What this conversation was told, in the shape the brain reasons over. The
// same facts as the rows above and not a second set of them: the rows are what
// was said, this is the world to somebody who was told it. Both are the
// conversation's, kept together and kept nowhere else — the authored world
// never moves, so a session that was told something holds it here or not at
// all.
let taken = { terms: [] };
let grown = null;

// A conversation at a time, not a signal at a time. What one signal put in is
// still there when the next arrives — that is what makes tom still tom three
// signals later, and what makes the facts and doings, in the order they were
// said, a history there is anything to look back through.
//
// Called when a conversation ends, and never between two signals of one.
function clear() {
  worked.clear();
  for (const kind of KINDS) {
    held[kind].length = 0;
    counted[kind] = 0;
  }
  standing = new Map();
  counting = new Map();
  happenings.clear();
  inReach = [];
  against = null;
  taken = { terms: [] };
  grown = null;
}

// A fact this conversation took in. The world it reasons over grows by that
// fact and no other, so what one session was told is nothing to the next.
function took(fact, authored) {
  if (!fact || !(fact.terms || []).length) return;
  taken = { terms: [...taken.terms, ...fact.terms] };
  grown = grownBy(grown ?? authored, fact);
}

// The world this conversation reasons over: the authored world, and what it
// has been told standing in it.
function worldOf(authored) {
  if (grown) return grown;
  if (!taken.terms.length) return authored;
  grown = grownBy(authored, taken);
  return grown;
}

// What the conversation holds, as plain data. Everything here was put in by a
// signal; nothing derived from the world is kept, so the world it is read back
// against may have grown in the meantime and the graph still says the same.
//
// This is what a conversation is. Keeping it is what lets one be picked up
// again without every signal being said a second time.
function dump() {
  return {
    held: Object.fromEntries(KINDS.map((kind) => [kind, held[kind].map((one) => ({ ...one }))])),
    counted: { ...counted },
    taken,
    inReach: [...inReach],
    standing: [...standing],
    counting: [...counting],
    happenings: [...happenings],
  };
}

// A conversation picked up where it was left. What comes back stands in for
// everything said before, so whatever was here is dropped first.
function restore(state) {
  clear();
  if (!state) return;
  for (const kind of KINDS) {
    for (const one of state.held?.[kind] ?? []) held[kind].push({ ...one });
    counted[kind] = state.counted?.[kind] ?? held[kind].length;
  }
  inReach = [...(state.inReach ?? [])];
  // Grown again from the authored world when it is next asked for: the world
  // a session was picked up in may not be the world it was left in.
  taken = state.taken ?? { terms: [] };
  grown = null;
  standing = new Map(state.standing ?? []);
  counting = new Map(state.counting ?? []);
  for (const [kind, row] of state.happenings ?? []) happenings.set(kind, row);
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
function fromUnderstood(roots, world, focus, marking, from, mood) {
  against = world;
  const calls = gather(roots, 'call');
  const links = gather(roots, 'learn').filter((one) => one.name === 'link');
  const events = gather(roots, 'event');
  const instructions = gather(roots, 'instruction');
  // One occurrence being the reason another happened. The brain works out
  // which is which; the graph only has to hang the one off the other.
  const causes = gather(roots, 'cause');
  const moments = gather(roots, 'moment');
  // What was claimed, whether or not the world had it already. A signal saying
  // something the brain knew still said it, and the conversation holds it.
  const claims = gather(roots, 'standing');

  // Whether what the signal said stands. A signal the brain refuses as
  // inconsistent still said what it said, and the conversation holds that it
  // was said — but it does not stand, and nothing answers out of it. Three
  // standings and no fourth: held, against, and said but not standing.
  const refused = gather(roots, 'refuse').length > 0;
  const stands = (denied) => (refused ? 'conflict' : denied === true ? 'against' : 'held');

  // Asking is not saying. A question brings in whatever it speaks of — a
  // pointer in the next signal must have somewhere to land — but it claims
  // nothing, and nothing it names becomes a fact of this conversation.
  const asking = mood === 'ask';

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

  // A part of a doing may be counted too, and is several of a kind the same
  // way. `bought 3 apples from 2 shops` counts both its ends, and a doing that
  // said only one of them would drop the other's number on the floor.
  for (const event of events) {
    for (const part of event.state.parts || []) {
      if (part.amount == null || part.of == null) continue;
      // A part names a kind where the signal singled out none of them, so the
      // kind itself is what several of them are several of.
      const made = calls.find((call) => call.state.id === part.of);
      const of = made && made.state.of != null ? made.state.of : part.of;
      // Where the signal already counted these — a giving counts what it gives
      // once — there is nothing to count again.
      const already = [...counting.values()].some(
        (one) => one.of === of && one.count === part.amount,
      );
      if (part.amount < 2 || counting.has(part.of) || already) continue;
      counting.set(part.of, { of, count: part.amount });
    }
  }

  // A thing spoken of in particular is a thing, whether or not the world holds
  // one. `the sky is blue` speaks of the sky, and the next signal may point
  // back at it, so it is a node and not merely a concept two facts joined.
  // What an instruction is built out of stays inside the instruction: a claim
  // put as a condition is not a claim made, and neither is what stands on it.
  // Said of a thing, a quality is how that thing is — so a quality a rule only
  // supposes is not how anything is yet, and is left where the rule holds it.
  const supposed = new Set();
  for (const one of instructions) {
    for (const side of [one.state.on, one.state.then]) {
      if (side) supposed.add(`${side.subject}:${side.object}`);
    }
  }
  const { determined: particular, known: spokenBefore, qualities } = determined(roots, marking, world, supposed);
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
    for (const one of held.groups) {
      if (one.term === kind || known(one, world) === kind) return one.id;
    }
    return null;
  };
  // How each thing is, where the signal said so beside it. Held until claiming
  // is under way, so that a quality said beside a thing and one said of it
  // leave the very same fact.
  const besides = [];
  for (const id of reached(roots)) {
    if (standing.has(id)) continue;
    // Spoken of as the one already met, where this conversation made exactly
    // one thing of that kind: that is the thing meant. A doing makes a thing
    // of its own — `a road became wet` makes a road — and without this the
    // next signal's `the road` made a second one and asked about nothing.
    if (spokenBefore.has(id)) {
      const mine = brought().filter((one) => one.made === id);
      if (mine.length === 1) {
        standing.set(id, mine[0].id);
        continue;
      }
    }
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
    // Several of a kind are something this conversation brought in, whether or
    // not any one of them was singled out: three apples are three apples.
    if (!call && !counting.has(id) && !(world && world.isIndividual(id)) && !particular.has(id) && id !== from) continue;
    // A kind of event is not a thing beside the other things. It is something
    // that happened, and it stands among what happened.
    if (isHappening(id)) continue;
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
    // Several of a kind, none of them singled out, is a group and not a thing.
    // A thing can be named and can carry what is true of it alone; a group has
    // a count instead, and what is drawn out of it becomes a thing of its own.
    // One of a kind is a thing, however it was counted. A group is several of
    // them with none singled out, and one singled out is exactly what a thing
    // is — so the count has to be more than one before it is a group at all.
    const several = many && many.count > 1;
    standing.set(
      id,
      put(several ? 'groups' : 'nodes', {
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
        // Where it was drawn from, where the signal drew it. Being of a kind
        // something else was counted in is no reason: mira's one kettle is not
        // one of dev's three, and saying so would put her kettle among his.
        // Where it was drawn from. What somebody is said to hold is theirs and
        // is drawn from nobody — mira's one kettle is not one of dev's three,
        // however alike they are.
        ...(() => {
          if (!call || !call.state.made || call.state.of == null) return {};
          // Said outright that somebody holds them. A holding that follows
          // from a doing is another matter: what was given came out of what
          // the giver had, and that is exactly a drawing.
          const a2 = (world && world.anchors) || {};
          const fresh = events.length === 0 && links.some(
            (link) =>
              link.state.quantity != null &&
              link.state.object === id &&
              a2.holding != null &&
              (link.state.relation === a2.holding ||
                world.isA(link.state.relation, a2.holding) ||
                world.subrelationOf(link.state.relation, a2.holding)),
          );
          // Told outright that somebody holds them, a group came out of
          // nobody: arun's four ropes are not four of meera's seven, however
          // alike the two are. Said so, `from` stands at nothing and stays
          // there — which is not the same as its never having been settled.
          if (several) return fresh ? { from: null } : {};
          const group = fresh ? null : drawnFrom(call.state.of);
          return group == null ? {} : { from: group };
        })(),
        // How it is, where the signal said so beside it. Counted, the thing
        // this signal made has an identity of its own while the quality was
        // said of the kind standing there — `two red cars` says red of cars —
        // so what was said of the kind is said of the one made from it.
      }),
    );
    // How it is, where the signal said so beside it — `a red box`. Said of it
    // instead — `the box is red` — it is the same claim, so it leaves the same
    // fact and there is one place to look for it. Counted, the thing this
    // signal made has an identity of its own while the quality was said of the
    // kind standing there — `two red cars` says red of cars — so what was said
    // of the kind is said of the one made from it.
    const beside = qualities.has(id)
      ? qualities.get(id)
      : call && call.state.of != null && qualities.has(call.state.of)
        ? qualities.get(call.state.of)
        : null;
    if (beside) besides.push([id, Object.values(beside)]);
  }

  // Which group a smaller one came out of, settled once they are all in rather
  // than as each arrives: three apples come out of five, never five out of
  // three, and the order they were said in says nothing about which. A group
  // is drawn from the smallest one of its kind that is bigger than it.
  for (const one of held.groups) {
    // Settled already, either at a group it came out of or at nothing.
    if (one.from !== undefined) continue;
    let bigger = null;
    for (const other of held.groups) {
      if (other === one || other.count <= one.count) continue;
      if (known(other, world) !== known(one, world)) continue;
      if (bigger == null || other.count < bigger.count) bigger = other;
    }
    if (bigger) one.from = bigger.id;
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
    if (asking) return;
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
    if (!denied && rolePlayed(relation, world) && shifted(relation, reach(object), world)) return;
    const primitive = standingOf(relation, reach(object), world);
    // How much of something a thing is, is the thing's own — it belongs on it
    // the way a colour does, not between it and the unit. Which quantity it is
    // of, the unit says.
    //
    // A denial is not how a thing is. `the sky is not blue` said nothing about
    // the sky that stands; what was said was that blue does not stand between
    // the sky and the world, so it is written as a fact against — never on the
    // thing as if it were blue.
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
        // A denial is not how much a thing is: `tom is not 2 metre tall` said
        // nothing that stands on tom. What was said was that the measure does
        // not stand, and it is written below as a fact against — never on the
        // thing as if it did. Where the thing carried that measure before, the
        // denial takes it off.
        // How much of a quantity a thing has is a fact about it, kept where
        // every other fact is kept. Written onto the thing instead, it had no
        // place in the order things were said in, and a reading that walked
        // the facts never found it.
        // Denied or held, the amount is what was said. The row says which it
        // is; losing the amount would leave a denial of nothing in particular.
        waiting.push({ subject: reach(subject), of, amount: quantity, unit: object });
      }
    }
    // How a thing is belongs to it. Said beside it — a red box — it was
    // already held on the thing; said of it — the sky is blue — it stood
    // between the two as a fact, so the same claim landed in two places and
    // which one depended on where English put the word. It goes on the thing
    // either way now, and there is one place to look.
    // A denial is not how a thing is. `the sky is not blue` said nothing about
    // the sky that stands; what was said was that blue does not stand between
    // the sky and the world, so it stands below as a fact against — never on
    // the thing as if it were blue. Where the thing carried that colour from
    // a claim that stood before, the denial takes it off.

    // A kind claim that runs the wrong way, about a kind this conversation
    // holds several of, is a claim about one of them. `a basket has five
    // fruits` then `one fruit is an apple` cannot mean that fruit is a sort of
    // apple — the world has it the other way round — and does mean that one of
    // those five is. So one is drawn out of the group and the claim is about
    // that one, which is what a thing is: a member singled out.
    if (primitive === KIND && !denied && !world.isIndividual(subject)) {
      const group = drawnFrom(subject);
      if (group != null && world.isA(object, subject) && object !== subject) {
        const term = world.term(subject);
        // A thing this signal already made of that kind is the one drawn; only
        // where it made none is another put in.
        const standing_ = [...held.nodes].reverse().find(
          (one) => (one.made === subject || one.term === subject) && one.from == null,
        );
        const drawn = standing_ ? ((standing_.from = group), standing_.id) : put('nodes', {
          said: term ? term.name : String(subject),
          term: subject,
          made: subject,
          from: group,
        });
        put('facts', {
          key: triple(drawn, relation, object),
          of: KIND,
          said: relation,
          parts: [drawn, object],
          properties: {},
          stands: stands(false),
        });
        return;
      }
    }
    // What is held is a thing of a kind, not a party to the fact: it is said
    // by the kind the world holds it under, the same way a doing says what
    // moved. Whoever holds it is a party, and that is a node.
    // What is held, where several of a kind are held, is the group the signal
    // made of them — it says both the kind and how many, and saying the kind
    // and a count beside it would be saying the same thing twice.
    const of = made.get(object);
    const kind = primitive === HOLDING ? (of ? of.state.of ?? object : object) : reach(object);
    const group =
      primitive === HOLDING && quantity != null
        ? held.groups.find(
            (one) => one.count === quantity && (one.term === object || one.made === kind),
          )
        : null;
    const far = group ? group.id : kind;
    // A comparison stands one thing above another on a quantity, and which is
    // above is said by the order of the two, never by a flag naming one of
    // them. Said the other way round — shorter rather than taller — the same
    // fact turns round with it.
    // A happening said to be at a time is a happening that was then. It was
    // not placed inside the evening the way a chair is placed inside a hall.
    const anchors = world.anchors || {};
    const here = held.actions.find((row) => row.id === reach(subject));
    if (here && primitive === PLACEMENT && anchors.time != null && world.isA(object, anchors.time)) {
      here.properties = {
        ...(here.properties || {}),
        times: [...new Set([...((here.properties || {}).times || []), object])],
      };
      return;
    }

    // A number is no place. `the train arrived at ten hours` reads a clock, and
    // the clock is already on the doing — the train was never put anywhere, and
    // a row saying it stood at the number ten is both wrong and a second copy
    // of what the doing already holds.
    if (primitive === PLACEMENT && anchors.number != null && world.isA(object, anchors.number)) return;

    // An ordering claim that stands is remembered as a chain of moments, not
    // a pairwise fact row. The chrono is the single store; an `order` row is
    // not left beside it, and every ordering read walks the chain instead.
    // A denial leaves no mark on the timeline — it falls through to the row
    // path below, which is how a said-but-against claim is held.
    if (primitive === ORDER && !denied) {
      // A refused offering claimed nothing that stands — neither the fact nor
      // a place on the timeline.
      if (!refused) {
        const left = reach(subject);
        const right = reach(object);
        // What each end stands for here: a thing this conversation holds, or a
        // doing that happened in it. A doing is no node, so asking it for a
        // term turned it away and `a plank fell after a meeting` ordered
        // nothing at all — both doings on the record and no chain between
        // them.
        const placed = (part) =>
          termOf(part) ?? (held.actions.some((row) => row.id === part) ? part : null);
        if (placed(left) != null && placed(right) != null && placed(left) !== placed(right)) {
          // The relation runs forward or backward; whichever way, the earlier
          // term is the one placed before the later on the chain.
          const a2 = world.anchors || {};
          const ways = new Set(world.symmetric(relation) ? [relation] : []);
          if (a2.converse != null) {
            for (const other of world.linked(relation, a2.converse)) ways.add(other);
            for (const other of world.members(relation, a2.converse)) ways.add(other);
          }
          const reverse = ways.size > 0 && world.linked(relation, a2.converse).length === 0;
          orderTerms(reverse ? right : left, reverse ? left : right, null);
        }
      }
      return;
    }

    // Being in something that happened is being one of the people it happened
    // to, not standing inside a place. The world says which kinds are events;
    // that being in one is membership is the brain's.
    const into = happenings.get(kindHappened(object));
    if (into != null && primitive === PLACEMENT) {
      const one = held.actions.find((row) => row.id === into);
      const fact = put('facts', {
        key,
        of: MEMBER,
        said: relation,
        parts: [reach(subject), into],
        properties: {},
        stands: stands(denied),
      });
      if (one) {
        const who = reach(subject);
        if (!(one.members || []).includes(who)) one.members = [...(one.members || []), who];
      }
      return;
    }

    const parts =
      primitive === COMPARISON && !above(relation, world)
        ? [far, reach(subject)]
        : [reach(subject), far];
    // A comparison that already stood is the one fact, however many words said
    // it: `sam is shorter than tom` after `tom is taller than sam` is not a
    // second row — it is that row's other end. The words are kept on it so a
    // fact asked for in either still answers out of it, and the ordering reads
    // the parts, which run the same way either way. A denial is still written
    // below it, and answered against.
    if (primitive === COMPARISON && !denied) {
      const probe = held.facts.find(
        (row) =>
          row.stands === 'held' &&
          row.of === COMPARISON &&
          row.parts &&
          row.parts[0] === parts[0] &&
          row.parts[1] === parts[1] &&
          row.properties &&
          row.properties.on === scaleOf(relation, world),
      );
      if (probe) {
        if (probe.said !== relation && !(probe.saidOther || []).includes(relation)) {
          probe.saidOther = [...(probe.saidOther || []), relation];
        }
        return;
      }
    }
    const wrote = put('facts', {
      key,
      of: primitive ?? relation,
      said: relation,
      parts,
      properties: {
        // How many, where the fact counts. A measure says how much instead,
        // and says it as an amount of a quantity — one number, not two.
        ...(quantity == null || primitive === MEASURE || group ? {} : { count: quantity }),
        // A comparison is made on something. Which scale is the world's to
        // say, and without it `taller` is only a word.
        ...(primitive === COMPARISON ? { on: scaleOf(relation, world) } : {}),
        // Which placement it is. Inside is not beside and neither is under, so
        // the primitive says a thing stands somewhere and the world says where.
        ...(primitive === PLACEMENT ? { as: relation } : {}),
      },
      stands: stands(denied),
    });

    // Said of something that happened — where it was, when it was — the fact
    // already names the doing on its near side. Pointing back at it from the
    // doing would be the same edge written twice, and a reader would have two
    // places to look and no way to know they agree.
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

  // A quality said beside a thing is claimed of it, so that `a red box` and
  // `the box is red` leave one fact and not two shapes to look in. Said both
  // ways in one signal it is still one claim, so what was said of the thing
  // outright is not written down a second time.
  const predicates = world && world.anchors ? world.anchors.predication : null;
  if (predicates != null) {
    // A state a change reached is the change's and not a fact beside it. `the
    // porch became wet` says the becoming happened; that the porch is wet
    // follows from it, and writing it down would say one thing twice.
    const reached = new Set(
      events.flatMap((event) =>
        (event.state.parts || [])
          .filter((part) => part.role === (world.anchors || {}).target)
          .map((part) => part.of),
      ),
    );
    for (const [id, values] of besides) {
      for (const value of values) {
        if (reached.has(value)) continue;
        const already = held.facts.some(
          (one) =>
            one.of === PROPERTY &&
            (one.parts[0] === id || termOf(one.parts[0]) === id) &&
            (one.parts[1] === value || termOf(one.parts[1]) === value),
        );
        if (!already) claimed(id, predicates, value, null, false);
      }
    }
  }

  // What the brain worked out is as much a part of the conversation as what it
  // was told. A fact a standing instruction reached arrives as something
  // learned and never stood in the signal, so nothing else here would see it —
  // and the bell would stay the colour it was before the rule fired.
  for (const link of links) {
    if (!link.state.following) continue;
    const { subject, relation, object, quantity, not } = link.state;
    claimed(subject, relation, object, quantity ?? null, Boolean(not));
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
      // Several playing one part are a list, not the last of them. Two people
      // who spoke are two who spoke, and a doing said of both is one doing
      // with both in it.
      roles[part.role] =
        roles[part.role] == null
          ? reach(part.of)
          : [...(Array.isArray(roles[part.role]) ? roles[part.role] : [roles[part.role]]), reach(part.of)];
      if (part.amount != null) counts[part.role] = part.amount;
    }
    const a2 = (world && world.anchors) || {};
    const anchors2 = a2;
    if (counts[a2.target] != null) properties.count = counts[a2.target];
    else if (Object.keys(counts).length === 1) properties.count = Object.values(counts)[0];
    const primitive = doing(roles, world, action);
    // A doing that is itself a kind of event is that event happening, not a
    // second row beside it: `a robbery was in a shop` and `a shopkeeper was in
    // the robbery` speak of one robbery.
    const row = {
      of: primitive ?? action,
      said: action,
      // Which occurrence this is. A cause names the occurrences it joins, and
      // without this there is no way back from one of those to its row.
      did: event.state.id,
      // A primitive of the brain's own carries the brain's own parts. A doing
      // it does not yet know keeps the roles the world gave it, rather than
      // being forced into a shape that is not its.
      ...(primitive === TRANSFER
        ? transferring(roles, properties, world)
        : primitive === PROPERTY_CHANGE
          ? changing(roles, properties, world)
          : primitive === STATE_CHANGE
            ? stateChanging(roles, properties, world)
            : { roles, properties }),
      stands: stands(not),
    };
    // Every doing says which time it is: the one it is set for, or the one it
    // happened at. Told neither way round, it happened — that is what saying a
    // doing plainly is. The clock reading rides in the same place, so what a
    // doing holds about its time is in one object and nowhere else.
    const a3 = (world && world.anchors) || {};
    const clock = event.state.time;
    row.properties = {
      // When it was, said as a time of its own rather than a reading of a
      // clock: in the evening is an evening, not an hour.
      ...(event.state.times ? { times: event.state.times } : {}),
      ...(clock == null
        ? {}
        : clock.after
          ? { after: { amount: clock.amount, unit: clock.unit } }
          : { at: { amount: clock.amount, unit: clock.unit } }),
      time: when != null && a3.future != null && when === a3.future ? 'scheduled' : 'done',
      ...(row.properties || {}),
    };
    // A change leaves no fact behind it. What was told stands and never moves;
    // what happened is the doing; and how a thing is now follows from the two
    // — the way what somebody holds after a giving follows from what they were
    // told to hold and what was given away. Writing the state the change
    // reached would be saying the same thing twice, in a fact nobody was told.
    //
    // The world this conversation reasons over is another matter: a reading
    // that asks it must find the thing as it now is, so the standing goes
    // there, where it is not a second record but the surface the readings walk.
    if (primitive === STATE_CHANGE && predicates != null && not !== true) {
      const thing = row.parts ? row.parts.thing : null;
      const gained = anchors2.target != null ? only(roles[anchors2.target]) : null;
      const term = thing == null ? null : termOf(thing) ?? thing;
      if (term != null && gained != null) {
        took({ terms: [{ id: term, links: [{ rel: predicates, to: gained }] }] }, world);
      }
    }
    const already = isHappening(action) ? happening(action) : null;
    const id = already ?? put('actions', row);
    if (already) {
      // What this signal added, kept beside what was already known of it.
      const one = held.actions.find((r) => r.id === already);
      for (const [name, value] of Object.entries(row)) {
        if (value == null || (Array.isArray(value) && value.length === 0)) continue;
        if (name === 'roles' || name === 'properties') one[name] = { ...(one[name] || {}), ...value };
        else if (name === 'properties' && value.times)
          one.properties = {
            ...(one.properties || {}),
            ...value,
            times: [...new Set([...((one.properties || {}).times || []), ...value.times])],
          };
        else if (one[name] == null || name === 'of' || name === 'said') one[name] = value;
      }
    }

    // What was said of the doing itself — where it was, when it was — is an
    // ordinary fact with the doing at the near end, and the doing holds it.
    // Nothing new is needed for that: an action can be pointed at like
    // anything else, and being held is where it is pointed from.
    // Where a doing stood is where whoever did it stood: a tree that fell on
    // the road is on the road. One fact, claimed of the doer — and the doing
    // holds that same fact rather than a second copy of it.
    const byRole = (role) => (parts || []).filter((p) => p.role === role && p.of != null);
    const doers = byRole(a2.agent).length > 0 ? byRole(a2.agent) : byRole(a2.target);
    for (const joint of event.state.joints || []) {
      // A doing said to be in something that happened is a doing that happened
      // inside it: the meeting holds the speaking, and whoever spoke was in
      // the meeting. It is not a speaking placed inside an object.
      const inside = happenings.get(kindHappened(joint.of));
      if (inside != null) {
        const whole = held.actions.find((row) => row.id === inside);
        if (whole) {
          // A doing inside a happening is in it the way anybody in it is, and
          // it is said the same way — one shape for being part of something
          // that happened, whether what is in it is a person or a doing.
          const key = triple(id, a2.member, inside);
          if (!said.has(key)) {
            said.add(key);
            put('facts', {
              key,
              of: MEMBER,
              said: a2.member,
              parts: [id, inside],
              properties: {},
              stands: stands(false),
            });
          }
          for (const doer of doers) {
            const who = reach(doer.of);
            if (!(whole.members || []).includes(who)) whole.members = [...(whole.members || []), who];
          }
        }
        continue;
      }
      for (const doer of doers) {
        claimed(doer.of, joint.relation, joint.of, null, not === true);
        const one = held.actions.find((row) => row.id === id);
        const fact = held.facts.find(
          (row) =>
            row.said === joint.relation &&
            row.parts &&
            row.parts[0] === reach(doer.of) &&
            row.parts[1] === reach(joint.of),
        );
        // What came of the doing carries which doing it came of. The question
        // is always asked from this end — why is the road wet — so the answer
        // is on the row the question starts at.
        if (fact && fact.reason == null) fact.reason = id;
      }
    }

    // Many of a kind on the far end of a doing are that many things. `split
    // them into three groups` makes three groups, and each is drawn from what
    // was split — how many went into each, nobody said, so nothing says it.
    const into = only(roles[a2.destination]);
    const many = counts[a2.destination];
    // What kind the far end is: the term itself where the world holds one, and
    // otherwise the kind the signal made it from.
    const asKind = (part) => {
      if (part == null) return null;
      const one = brought().find((n) => n.id === part);
      if (one) return known(one, world) ?? one.term;
      return termOf(part);
    };
    const of = asKind(into);
    if (of != null && many != null && many > 1) {
      const whole = drawnFrom(asKind(only(roles[a2.target])));
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

  // What came of it. A doing that caused something holds what it caused —
  // another doing, a change, or a fact that came to stand — the same way it
  // holds where it was. Nothing is copied: the row is already there, and being
  // held is a doing pointing at it.
  for (const cause of causes) {
    const { reason, effect } = cause.state;
    if (reason == null || reason.done == null) continue;
    const one = held.actions.find((row) => row.did === reason.done);
    if (!one) continue;
    const came =
      effect.done != null
        ? (held.actions.find((row) => row.did === effect.done) || {}).id
        : effect.claim
          ? (held.facts.find((row) => row.key === triple(reach(effect.claim.subject), effect.claim.relation, reach(effect.claim.object))) || {}).id
          : null;
    const effectRow =
      (held.actions.find((row) => row.id === came) || held.facts.find((row) => row.id === came)) ?? null;
    if (effectRow && effectRow.reason == null) effectRow.reason = one.id;
  }

  // A doing told with a time stands on the timeline at that time. Until now the
  // reading sat on the row and the chrono filled only where somebody declared
  // an order, so the brain could be told two doings and both their clocks and
  // still not know which came first.
  for (const one of held.actions) {
    if (one.stands === 'conflict') continue;
    const at = clockAt(one.properties && one.properties.at, world);
    if (at == null) continue;
    const already = held.moments.some((m) => m.members.includes(one.id));
    if (!already) placeByClock(one.id, at);
  }

  // Two things said to have stood at one time stand in one moment. The chrono
  // is where the order of things is kept, and being at the same time is an
  // order like being before or after — one moment holding both, rather than
  // either of them pointing at the other.
  for (const one of moments) {
    const rowOf = (side) => {
      if (!side) return null;
      if (side.done != null) return (held.actions.find((row) => row.did === side.done) || {}).id ?? null;
      if (!side.claim) return null;
      const key = triple(reach(side.claim.subject), side.claim.relation, reach(side.claim.object));
      const row = held.facts.find((f) => f.key === key);
      return row ? row.id : null;
    };
    const both = (one.state.sides || []).map(rowOf).filter((id) => id != null);
    if (both.length < 2) continue;
    const last = chronoChain();
    putMoment(both, last.length ? last[last.length - 1].id : null, null);
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
      stands: stands(false),
    });
  }

  // What is measured between two things goes on the standing between them.
  for (const one of waiting) {
    const on = held.facts.find(
      (fact) => fact.of === MEASURE && fact.parts[0] === one.subject && fact.properties.of == null,
    );
    if (!on) continue;
    on.properties = { ...on.properties, of: one.of, amount: one.amount };
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
  // How something in reach is reached, where the signal only *spoke of* it.
  // Most of what reaches is reached the usual way — as one of the graph's
  // happenings, nodes or counts — but a happening is never made here. A
  // question speaks of a robbery without claiming one, and making a happening
  // out of it would write `a robbery was held` into a conversation that only
  // asked. Where the graph already holds that happening it is reached as it;
  // where it holds none, the concept itself is what was spoken of.
  const focusReach = (id) => {
    if (id == null) return null;
    if (isHappening(id)) return happenings.get(kindHappened(id) ?? id) ?? id;
    if (standing.has(id)) return standing.get(id);
    if (counting.has(id)) return counting.get(id).of;
    return id;
  };
  for (const one of focus || []) {
    if (Number.isInteger(one)) bring(recorded(one));
    else if (one && Number.isInteger(one.term)) bring(focusReach(one.term));
    else if (one && one.standing) bring(stated(one.standing) ?? focusReach(one.standing.subject));
  }
  // Two different terms may be one thing in the graph, so what is in reach is
  // settled after they are reached, not before. The same focus-reaching is
  // re-applied here: how a term was reached the first time is how it is
  // reached again, so the reaching can never call a happening into being.
  inReach = [];
  for (const one of inSight) {
    const found = typeof one === 'string' ? one : focusReach(one);
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
// One of whatever plays a part, where several play it. The arithmetic of a
// transfer runs on one end at a time; who else stood there is still in the
// list.
const only = (value) => (Array.isArray(value) ? value[0] : value);

function doing(roles, world, action) {
  const anchors = (world && world.anchors) || {};
  const played = (role) => role != null && Object.hasOwn(roles, role);
  if (played(anchors.source) || played(anchors.destination)) return TRANSFER;
  // A value in the far part does not make the doing a changing. `arun woke
  // late` says when he woke, not what he became, and reading it as a change
  // threw the waking away — the row took the change's name and the verb was
  // gone. Which of its doings are changings is the world's to say: a changing
  // is the coming-to-be itself, and what it is said of is the value taken.
  const changing =
    action != null &&
    anchors.becoming != null &&
    (action === anchors.becoming || world.isA(action, anchors.becoming));
  if (!changing) return null;
  // A state change and a property change are both a value taken and nothing
  // moved, and they are not the same thing. A property is what a thing is —
  // its colour, its size — and it seldom changes. A state is how it is now,
  // and changing is what a state is for: it has a value it left as surely as
  // one it took, and what it left is worth keeping.
  if (played(anchors.target) && isState(only(roles[anchors.target]), world)) return STATE_CHANGE;
  if (played(anchors.target) && isProperty(only(roles[anchors.target]), world)) return PROPERTY_CHANGE;
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
      if (only(one.roles[relation]) === to) return true;
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
    if (one.roles && one.roles[relation] != null) return termOf(only(one.roles[relation]));
  }
  return null;
}

// What a transfer is made of: whoever did it, where it came from, where it
// went, and what moved. Either end may be open and says so with nothing in it.
// These are the brain's own parts. Which of its terms plays each one is the
// world's to say, through the anchors it already carries.
function transferring(roles, properties, world) {
  const anchors = (world && world.anchors) || {};
  const at = (role) => (role != null && Object.hasOwn(roles, role) ? only(roles[role]) : null);
  const moved = at(anchors.target);
  // Several of a kind that moved are the group the signal made of them, not
  // the kind and a number said over again. The group carries how many, so the
  // doing says which group and stops there.
  const group =
    held.groups.find((one) => one.id === moved) ??
    (properties.count == null
      ? null
      : held.groups.find(
          (one) =>
            one.count === properties.count &&
            (one.term === moved || one.made === moved || one.of === moved),
        ));
  const { count, ...rest } = properties;
  return {
    parts: { doer: at(anchors.agent), from: at(anchors.source), to: at(anchors.destination) },
    properties: group ? { thing: group.id, ...rest } : { thing: moved, ...properties },
  };
}

// What a property change is made of: the thing, and the value it took.
function changing(roles, properties, world) {
  const anchors = (world && world.anchors) || {};
  const at = (role) => (role != null && Object.hasOwn(roles, role) ? only(roles[role]) : null);
  const took = at(anchors.target);
  // Which property took the value, not only the value. Turning red is a change
  // of colour, and the world says red is a colour before it is anything else.
  return {
    parts: { thing: at(anchors.agent) },
    properties: { ...(took == null ? {} : { [qualityKind(took, world)]: took }), ...properties },
  };
}

// What a state change is made of: the thing, the state it took, and the state
// it left. The one it left is not worked out later from the history — by then
// the thing has moved on — it is read off the thing at the moment it changes
// and kept here. The thing itself then stands in the new state, so what it is
// now is asked of the thing and what it was is asked of this.
function stateChanging(roles, properties, world) {
  const anchors = (world && world.anchors) || {};
  const at = (role) => (role != null && Object.hasOwn(roles, role) ? only(roles[role]) : null);
  const gained = at(anchors.target);
  const on = gained == null ? null : qualityKind(gained, world);
  return {
    parts: { thing: at(anchors.agent) },
    properties: { ...(on == null ? {} : { [on]: gained }), ...properties },
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
  if (on == null) return null;
  // An ordering names its scale outright; a comparison the world put on no
  // scale names the state, and the state's quantity is what it is compared on.
  // A scale is what measures states — being a property tells it from nothing,
  // since a state is a property too.
  if (world.linked(on, world.anchors.measure).length > 0) return on;
  return quantityOn(on, world) ?? on;
};

// Whether the near side of a comparison is the one with more. The world says
// which way it runs — a comparison is a kind of more, or a kind of less — and
// one read from either end is one fact.
function above(relation, world) {
  const anchors = world.anchors || {};
  // An ordering runs one way and carries no end of its own; a fact written on
  // it already runs upward. Only a comparison named by a state reads from the
  // end that state lies at.
  if (anchors.less != null && world.subrelationOf(relation, anchors.less)) return false;
  if (anchors.compares == null || anchors.toward == null) return true;
  const state = world.linked(relation, anchors.compares)[0];
  if (state == null) return true;
  return world.linked(state, anchors.toward)[0] !== anchors.less;
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

const isState = (id, world) =>
  id != null && world && world.anchors.state != null && world.isA(id, world.anchors.state);

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

// A kind of event spoken of is an occurrence of it. `a meeting` is not a
// thing standing somewhere the way a hall is — it is something that happened,
// and where it was, when it was and who was in it all hang off the happening
// rather than off a thing. Which kinds are events is the world's to say.
const happenings = new Map();

// Which happening a term names. A kind of event names one, and so does a thing
// made of that kind — `the robbery` said a turn later is the robbery already
// spoken of, not a second one beside it.
function kindHappened(id) {
  const anchors = (against && against.anchors) || {};
  if (!against || anchors.event == null || id == null) return null;
  if (!against.isA(id, anchors.event)) return null;
  if (!against.isIndividual(id)) return id;
  return against.linked(id, against.baseRelation).find((k) => against.isA(k, anchors.event)) ?? null;
}

function happening(id) {
  const kind = kindHappened(id) ?? id;
  if (happenings.has(kind)) return happenings.get(kind);
  // A happening the signal spoke of has happened, like any doing said plainly.
  const row = put('actions', {
    of: kind, said: kind, roles: {}, properties: { time: 'done' }, stands: 'held',
  });
  happenings.set(kind, row);
  return row;
}

function isHappening(id) {
  return kindHappened(id) != null;
}

// How a term is reached from the graph: as the happening it is, as one of its
// nodes, as the kind a quantity was of, or as a concept the world already had.
function reach(id) {
  if (id == null) return null;
  if (isHappening(id)) return happening(id);
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
function determined(roots, marking, world, supposed = new Set()) {
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
          // A time is no way for a thing to be. `at night` says when, and a
          // shop is not night-coloured for standing in one.
          quality:
            isQuality(said.concept, world) &&
            !(world.anchors.time != null && world.isA(said.concept, world.anchors.time))
              ? said.concept
              : null,
          // A word that holds between two things rather than standing beside
          // one. A quality on the far side of one was said *of* what is on the
          // near side, and describes nothing beyond it.
          joins:
            said.concept != null &&
            world.anchors.relation != null &&
            world.isA(said.concept, world.anchors.relation),
          // A doing stands between two things the same way a relation does:
          // what follows it was said of what came before it.
          acts:
            said.concept != null &&
            world.anchors.action != null &&
            world.isA(said.concept, world.anchors.action),
          // But only a changing hands what follows it back to what came
          // before. `the gate became open` says the gate is open; `arun woke
          // late` does not say arun is late — late is how the waking was, and
          // reading it back onto arun claims something nobody said. Which of
          // its doings are changings the world says.
          changes:
            said.concept != null &&
            world.anchors.becoming != null &&
            (said.concept === world.anchors.becoming ||
              world.isA(said.concept, world.anchors.becoming)),
        });
      }
      walk(one.branch);
    }
  };
  walk(roots);

  const step = marking === 'before' ? -1 : 1;
  // The thing a word beside it is about: the nearest one on the side the
  // language says its markers stand on.
  const nearest = (i, way) => {
    for (let at = i + way; at >= 0 && at < spoken.length; at += way) {
      if (spoken[at].joins || spoken[at].acts) continue;
      if (spoken[at].concept != null) return spoken[at].concept;
    }
    return null;
  };
  const about = (i) => nearest(i, step);

  const found = new Set();
  const already = new Set();
  const how = new Map();
  for (let i = 0; i < spoken.length; i++) {
    const one = spoken[i];
    if (one.determiner && (one.marks === 'known' || one.marks === 'new')) {
      const thing = about(i);
      if (thing != null) found.add(thing);
      // Spoken of as the one already spoken of, rather than as one of a kind.
      // `the road` is a road this conversation has met; `a road` is another.
      if (one.marks === 'known' && thing != null) already.add(thing);
    }
    // `a red box` is a box that is red. The quality is said of the thing it
    // stands beside, and it is held on the thing rather than put between two
    // things as a fact: how something is belongs to it.
    if (one.quality != null) {
      // Said across a joint, the quality belongs to what stands on the other
      // side of it — `a drum is cold` is about the drum, and cannot be about
      // whatever the next clause goes on to name. Said with no joint between,
      // it describes the thing it stands beside.
      const across =
        spoken[i - 1] && (spoken[i - 1].joins || spoken[i - 1].changes) ? nearest(i, -1) : null;
      const thing = across ?? about(i);
      if (thing != null && !supposed.has(`${thing}:${one.quality}`)) {
        const held = how.get(thing) || {};
        held[qualityKind(one.quality, world)] = one.quality;
        how.set(thing, held);
      }
    }
  }
  return { determined: found, known: already, qualities: how };
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
  // Asked of a world term or of the node this conversation gave it; either way
  // it is the same thing standing there.
  const all = amounts(of, from);
  const held = all.get(thing) ?? all.get(standing.get(thing));
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
function told(subject, relation, object, here) {
  const of = here ? hereOf(subject) : null;
  // What a change since has made of it. A fact stays as it was told; what
  // happened afterwards is the doing, and how the thing stands now follows
  // from the two — the way what somebody holds after a giving follows from
  // what they were told to hold and what was given away. Nothing about the
  // state the change reached is written down, so it is read from the change.
  const changed = changedInto(subject, of, object);
  if (changed != null) return changed;
  let found = null;
  for (const one of held.facts) {
    if (!same(one.parts[0], subject) && one.parts[0] !== of) continue;
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
    if (!says(one, relation) || !same(one.parts[1], object)) continue;
    // Said and not standing is not an answer either way.
    if (one.stands === 'conflict') continue;
    found = one.stands;
  }
  return found;
}

// The doings this conversation holds, latest last. When something happened is
// the timeline's to say — it holds what was declared and what the clock said —
// and the order a conversation happened to mention things in is not that. Only
// where the timeline places neither of two doings does the order they were
// said in stand for it, there being nothing else to go on.
function inOrder() {
  // The moments themselves, not what stood at them. Asked who was first, a
  // moment answers with whoever did it; asked which doing came first, the
  // doing is what is wanted, and it is what the moment holds.
  const chain = [];
  for (const moment of chronoChain()) for (const one of moment.members) chain.push(one);
  const at = (row) => {
    const where = chain.indexOf(row.id);
    return where < 0 ? null : where;
  };
  return [...held.actions].sort((one, other) => {
    const a = at(one);
    const b = at(other);
    if (a == null || b == null) return 0;
    return a - b;
  });
}

// Whether a change has put this thing into the state asked after, or out of
// it. Read backwards, because the latest is what stands: the first change
// touching the dimension in question settles it, and older ones are history.
function changedInto(subject, here, object) {
  const dim = dimension(object, against);
  if (dim == null) return null;
  const a = (against && against.anchors) || {};
  // What a doing left the thing in. A change says the state outright; any
  // other doing says it through the world — an opening brings about being
  // open, and which of its doings bring about what is the world's to declare.
  const states = (one) => {
    if (one.of === STATE_CHANGE) {
      return Object.values(one.properties || {}).filter((v) => typeof v === 'number');
    }
    if (typeof one.of !== 'number' || a.brings == null) return [];
    return against.linked(one.of, a.brings) || [];
  };
  // Whom it was done to, wherever the doing keeps them.
  const whom = (one) => {
    if (one.parts) return [one.parts.thing, one.parts.to, one.parts.doer].filter((p) => p != null);
    const played = [a.target, a.agent]
      .filter((role) => role != null && one.roles)
      .map((role) => one.roles[role]);
    return played.flatMap((p) => (Array.isArray(p) ? p : [p])).filter((p) => p != null);
  };
  const ordered = inOrder();
  for (let i = ordered.length - 1; i >= 0; i -= 1) {
    const one = ordered[i];
    if (one.stands !== 'held') continue;
    if (!whom(one).some((p) => same(p, subject) || p === here)) continue;
    for (const value of states(one)) {
      if (dimension(value, against) !== dim) continue;
      return value === object ? 'held' : 'against';
    }
  }
  return null;
}

// Whether a fact is one that a later one supersedes.
function state(one, world) {
  if (!world) return false;
  if (one.of === PLACEMENT) return true;
  // A quality that lies on a dimension is a state of it, and a thing is in one
  // state of a dimension at a time. Which dimension is the world's to say, and
  // it says so the same way everywhere — by what measures the value, or by
  // what the value is a kind of. A quality on no dimension of its own is not a
  // state and stands beside whatever else was said.
  return one.of === PROPERTY && dimension(termOf(one.parts[1]), world) != null;
}

// The dimension a quality lies on: what measures it, or what it is a kind of.
// The bare root is no dimension — being a property is not being a colour.
function dimension(quality, world) {
  if (quality == null || !world) return null;
  const property = (world.anchors || {}).property ?? null;
  if (property == null || !world.isA(quality, property)) return null;
  const on = quantityOn(quality, world);
  if (on != null) return on;
  for (const kind of world.kinds(quality) || []) {
    if (kind !== quality && kind !== property) return kind;
  }
  return null;
}

// Whether a later fact is about the same state — the same placement, or the
// same quantity — as the one being asked after.
function sameState(one, relation, object, world) {
  if (!world) return false;
  if (one.of === PLACEMENT) {
    return world.anchors.placement != null && world.isA(relation, world.anchors.placement);
  }
  const of = dimension(termOf(one.parts[1]), world);
  return of != null && of === dimension(object, world);
}

// Everything this conversation has put in a given ordering, either end of it.
// Which things are in question is the conversation's to say: asked who arrived
// first, nobody is asking about the days of the week, however plainly Monday
// comes before Tuesday.
function joinedBy(relation) {
  // An ordering the conversation held is the timeline: every term the chain
  // holds is in that ordering, and none beside it is.
  const a = against && against.anchors ? against.anchors : {};
  if (a.order != null && relation != null &&
      (relation === a.order || against.isA(relation, a.order) ||
       against.subrelationOf(relation, a.order))) {
    return chronoTerms();
  }
  const found = [];
  for (const one of held.facts) {
    if (!says(one, relation) || one.stands !== 'held') continue;
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
  const all = brought();
  for (let i = all.length - 1; i >= 0; i -= 1) {
    const one = all[i];
    if (typeof one.called === 'string' && one.called.toLowerCase() === wanted) return one.term;
  }
  return null;
}

// A comparison the conversation made on a scale, as an ordered pair: the thing
// standing above, and the thing standing below. The parts were put that way
// round when the fact was written, so which way the fact was said — taller
// rather than shorter — makes no difference here.
function orderedOn(scale) {
  const found = [];
  for (const one of held.facts) {
    if (one.stands !== 'held' || !one.properties || one.properties.on !== scale) continue;
    if (one.parts.length < 2) continue;
    const above = termOf(one.parts[0]);
    const below = termOf(one.parts[1]);
    if (above == null || below == null) continue;
    found.push([above, below]);
  }
  return found;
}

// Everything this conversation put on the near side of a relation to a thing:
// who stands taller than sam, rather than who sam stands taller than.
function standingIn(object, relation) {
  const found = [];
  // Something that happened stands as a row of its own, not as a term, so a
  // question naming the happening has to be met at the row. Asked who was in
  // the accident, the accident is that row and what stands to it is the answer.
  const asRow = isHappening(object) ? happening(object) : null;
  // Several of a kind answer for that kind. Held five books, sam holds books,
  // and a question after who holds books must find him beside anybody holding
  // one — the group stands for its kind and is met there.
  const ofKind = (part) => {
    const group = held.groups.find((row) => row.id === part);
    return group != null && (group.made === object || known(group, against) === object);
  };
  for (const one of held.facts) {
    if (!says(one, relation) || one.stands !== 'held') continue;
    if (!same(one.parts[1], object) && one.parts[1] !== asRow && !ofKind(one.parts[1])) continue;
    const term = termOf(one.parts[0]);
    if (term != null && !found.includes(term)) found.push(term);
  }
  return found;
}

// What measures so much in a unit. `what is 2 metres long` asks which thing
// stands at that amount, and the measures this conversation was told are where
// it is written — the same walk a quality's holder gets, over an amount rather
// than a value.
function measuring(unit, amount) {
  const found = [];
  for (const one of held.facts) {
    if (one.of !== MEASURE || one.stands !== 'held') continue;
    if (termOf(one.parts[1]) !== unit && one.parts[1] !== unit) continue;
    if (amount != null && Number(one.properties.amount) !== Number(amount)) continue;
    const term = termOf(one.parts[0]);
    if (term != null && !found.includes(term)) found.push(term);
  }
  return found;
}

// Which of several readings this conversation has already met. A word that
// stands for two things stands for the one already spoken of, where only one of
// them has been — what came before is what settles it, and nothing is guessed
// from what has not.
function metBefore(concepts) {
  const seen = new Set();
  for (const one of held.nodes) {
    for (const of of [one.term, one.made, one.of]) if (of != null) seen.add(of);
  }
  for (const one of held.facts) {
    if (one.stands !== 'held') continue;
    for (const part of one.parts) {
      const term = termOf(part) ?? part;
      if (typeof term === 'number') seen.add(term);
    }
    for (const value of Object.values(one.properties || {})) {
      if (typeof value === 'number') seen.add(value);
    }
  }
  return (concepts || []).filter((one) => seen.has(one));
}

// Who and what stood in something that happened. The happening keeps them as it
// is told them — a person in an accident, a doing inside a robbery — so being
// asked who was in it is reading back what it already holds.
function membersOf(kind) {
  const id = isHappening(kind) ? happening(kind) : null;
  const row = id == null ? null : held.actions.find((one) => one.id === id);
  if (!row) return [];
  const found = [];
  for (const one of row.members || []) {
    const term = termOf(one) ?? one;
    if (term != null && !found.includes(term)) found.push(term);
  }
  return found;
}

// A node stands for a term of the world, so a claim about that term is a claim
// about the node.
const same = (part, term) => part === term || termOf(part) === term;

// Everything this conversation brought in, whether one thing or several of a
// kind. A reading that means `anything spoken of` walks both; one that means
// `one thing` walks the nodes alone.
const brought = () => [...held.nodes, ...held.groups];

// The one thing this conversation made of a kind, where it made exactly one.
// `a road became wet` makes a road, and `the road` in a later signal is that
// road. Said of the kind at large it is no answer — one spoon being nice says
// nothing about spoons — so only a reading that knows it was asked of the one
// already met may use this.
function hereOf(term) {
  if (term == null) return null;
  if (standing.has(term)) return standing.get(term);
  const mine = brought().filter((one) => one.made === term);
  return mine.length === 1 ? mine[0].id : null;
}

const termOf = (part) => {
  if (typeof part !== 'string') return part;
  const one = brought().find((node) => node.id === part);
  return one ? one.term : null;
};

// Whether a fact was said with a word. A comparison folded into the fact that
// already stood keeps every word it was said with, so a fact asked for in
// either direction — taller as well as shorter — answers out of the one row.
const says = (row, relation) => {
  if (row.said === relation) return true;
  if (Array.isArray(row.saidOther) && row.saidOther.includes(relation)) return true;
  // Asked with the broader word, a narrower one answers: the world declares
  // predication a kind of being, so a thing said to be blue answers a question
  // about what it is. The narrowing is the world's; that one covers the other
  // is the brain's.
  return against != null && relation != null && against.subrelationOf(row.said, relation);
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
  const a = (against && against.anchors) || {};
  // How far past the moment it was set for a thing stood. Nobody is ever told
  // this: a doing the brain expected and the doing that came are both on the
  // timeline, and the gap between them is the whole of it. Being before the
  // moment it was set for counts below nought, so one quantity says early and
  // late alike.
  if (a.lateness != null && quantity === a.lateness) {
    for (const [who, gap] of lateness()) found.set(who, gap);
  }
  for (const one of held.nodes) {
    for (const measure of one.measures || []) {
      if (measure.of === quantity) found.set(one.id, measure.amount);
    }
  }
  for (const one of held.facts) {
    if (one.of !== MEASURE || one.stands !== 'held') continue;
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
    if (one.stands !== 'held') continue;
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

// How much of each quantity a thing has, read off what was said about it. The
// latest standing measure on each quantity is what it has now, the same way the
// latest quality on each dimension is how it is.
function muchOf(node) {
  const out = {};
  for (const one of held.facts) {
    if (one.of !== MEASURE || one.stands !== 'held') continue;
    if (!same(one.parts[0], node)) continue;
    const of = one.properties.of;
    if (of == null || one.properties.amount == null) continue;
    const name = (against && against.term(of) ? against.term(of).name : null) ?? String(of);
    out[name] = { amount: one.properties.amount, unit: termOf(one.parts[1]) ?? one.parts[1] };
  }
  return out;
}

// How a thing is, read off what was said about it. Nothing is written down
// twice: a quality is a fact like any other, and what a thing is like now is
// the latest standing one of them on each dimension. A denial takes the
// dimension back off — said not to be blue, it has no colour anybody gave it.
function howOf(node) {
  const out = {};
  // What a change since has made of it, laid over what was told. The facts say
  // what the conversation was told and never move; how the thing is now is the
  // told facts with what happened to them applied.
  const since = {};
  for (const one of held.actions) {
    if (one.of !== STATE_CHANGE || one.stands !== 'held') continue;
    const thing = one.parts ? one.parts.thing : null;
    if (thing == null || !same(thing, node)) continue;
    for (const value of Object.values(one.properties || {})) {
      if (typeof value !== 'number') continue;
      const on = qualityKind(value, against);
      if (on != null) since[on] = value;
    }
  }
  for (const one of held.facts) {
    if (one.of !== PROPERTY || one.stands === 'conflict') continue;
    if (!same(one.parts[0], node)) continue;
    const value = termOf(one.parts[1]) ?? one.parts[1];
    const on = qualityKind(value, against);
    if (on == null) continue;
    if (one.stands === 'against') delete out[on];
    else out[on] = value;
  }
  return { ...out, ...since };
}

// ---- the chrono: moments as a strict total order --------------------------
//
// One timeline and no duplicate store. An ordering claim that stands is
// accepted by placing two terms into the chain; the pairwise order fact row it
// would otherwise have left is never written, and every ordering read walks
// the chain instead.

function putMoment(members, beforeId, at) {
  const id = PREFIX.moments + ++counted.moments;
  held.moments.push({
    id,
    members: [...members],
    before: beforeId ?? null,
    ...(at == null ? {} : { at }),
  });
  return id;
}

function termMoment(term) {
  // A member may stand as the world term or as the node this conversation
  // gave it; either way it is the same thing standing there.
  const both = new Set([term, standing.get(term) ?? term]);
  for (let i = held.moments.length - 1; i >= 0; i -= 1) {
    if (held.moments[i].members.some((m) => both.has(m))) return held.moments[i];
  }
  return null;
}

// A clock reading as one number, so two of them can be told apart. Which unit
// is which the world says; how many of one make another the brain knows of
// itself, because there is one time scale and every brain shares it.
function clockAt(time, world) {
  if (!time || time.amount == null || time.unit == null || !world) return null;
  const named = (id) => (world.term(id) ? world.term(id).name : null);
  const unit = named(time.unit);
  if (unit == null) return null;
  const second = world.anchors && world.anchors.second != null ? named(world.anchors.second) : 'second';
  const steps = unitsIn(unit, second);
  return steps == null ? null : Number(time.amount) * steps;
}

// Put a thing on the timeline at the moment its clock says, rather than where
// it happened to be mentioned. Two doings told with their times are ordered by
// the clock and nobody has to declare it; told the same time, they stand in one
// moment, because that is what being at the same time is.
function placeByClock(member, at) {
  const chain = chronoChain();
  for (const one of chain) {
    if (one.at == null) continue;
    if (one.at === at) {
      if (!one.members.includes(member)) one.members.push(member);
      return one.id;
    }
  }
  const later = chain.find((one) => one.at != null && one.at > at);
  if (!later) {
    const last = chain.length ? chain[chain.length - 1] : null;
    return putMoment([member], last ? last.id : null, at);
  }
  const id = putMoment([member], later.before, at);
  later.before = id;
  return id;
}

// The moment immediately before `m` in the chain (the one whose id is `m.before`).
function momentBefore(m) {
  return held.moments.find((x) => x.id === m.before) ?? null;
}

// The moment immediately after `m` (the first one whose `before` points at `m`).
function momentAfter(m) {
  return held.moments.find((x) => x.before === m.id) ?? null;
}

// The zero-based position of a moment in the chain, head = 0.
function momentPosition(id) {
  let cur = held.moments.find((m) => m.before === null) ?? null;
  let pos = 0;
  const seen = new Set();
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    if (cur.id === id) return pos;
    cur = momentAfter(cur);
    pos += 1;
  }
  return null;
}

// The full chain, head first.
function chronoChain() {
  const out = [];
  let cur = held.moments.find((m) => m.before === null) ?? null;
  const seen = new Set();
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    out.push(cur);
    cur = momentAfter(cur);
  }
  return out;
}

// Unique terms in chain order.
//
// A moment holds what stood at it, which may be a thing or a doing. Asked who
// was first, a doing answers with whoever did it: being at a moment is what
// the doer and the doing share, and the doer is what the question is after.
function chronoTerms() {
  const seen = new Set();
  const out = [];
  const whoDid = (id) => {
    const row = held.actions.find((one) => one.id === id);
    if (!row) return null;
    const doer = row.parts ? row.parts.thing ?? row.parts.doer : null;
    if (doer != null) return termOf(doer) ?? doer;
    const agent = against && against.anchors ? against.anchors.agent : null;
    const played = agent != null && row.roles ? row.roles[agent] : null;
    const one = Array.isArray(played) ? played[0] : played;
    if (one != null) return termOf(one) ?? one;
    // A doing with nobody doing it stands there as itself. `a plank fell after
    // a meeting` puts the meeting at the head of the chain, and asked what
    // happened first the answer is the meeting — not the row it is kept in,
    // which is no word and says nothing.
    return row.of ?? null;
  };
  for (const m of chronoChain()) {
    for (const t of m.members) {
      const term = whoDid(t) ?? termOf(t) ?? t;
      if (!seen.has(term)) { seen.add(term); out.push(term); }
    }
  }
  return out;
}

// How late each thing this conversation holds stood, in minutes.
//
// A doing set for a moment and a doing that happened are two rows of the same
// kind by the same doer — that pairing is the expectation and what became of
// it, and nothing else has to be written down to say so. Where several were
// set, the last one told is the one in force: an expectation moved is the
// expectation now.
function lateness() {
  const out = new Map();
  const a = (against && against.anchors) || {};
  if (a.minute == null) return out;
  const minutes = (row) => {
    const at = (row.properties || {}).at;
    if (at == null || at.amount == null || at.unit == null) return null;
    const named = (id) => (against.term(id) ? against.term(id).name : null);
    const steps = unitsIn(named(at.unit), named(a.minute));
    return steps == null ? null : Number(at.amount) * steps;
  };
  const doerOf = (row) => {
    if (row.parts && row.parts.thing != null) return row.parts.thing;
    const played = a.agent != null && row.roles ? row.roles[a.agent] : null;
    const one = Array.isArray(played) ? played[0] : played;
    return one ?? null;
  };
  for (const done of held.actions) {
    if (done.stands !== 'held') continue;
    if ((done.properties || {}).time !== 'done') continue;
    const came = minutes(done);
    const who = doerOf(done);
    if (came == null || who == null) continue;
    let set = null;
    for (const row of held.actions) {
      if (row.stands !== 'held' || (row.properties || {}).time !== 'scheduled') continue;
      if (row.of !== done.of || doerOf(row) !== who) continue;
      const meant = minutes(row);
      if (meant != null) set = meant;
    }
    if (set == null) continue;
    out.set(who, came - set);
  }
  return out;
}

// The group this conversation holds several of a kind in, where it holds one.
function drawnGroup(kind) {
  if (kind == null) return null;
  const one = held.groups.find((row) => row.term === kind || row.made === kind);
  return one ? one.id : null;
}

// Whether a claim ever stood, rather than whether it stands now. State is the
// latest of it and nothing earlier — that is what makes `is the coffee hot`
// answer from the last thing said — but asked of the past, the earlier ones are
// exactly what is being asked after, and they are still on the record.
function stood(subject, relation, object, here) {
  const of = here ? hereOf(subject) : null;
  for (const one of held.facts) {
    if (one.stands !== 'held') continue;
    if (!same(one.parts[0], subject) && one.parts[0] !== of) continue;
    if (!says(one, relation) || !same(one.parts[1], object)) continue;
    return true;
  }
  return false;
}

// What a claim this conversation holds came of. The row that stands for the
// claim carries which row brought it about, and that row is the answer — a
// doing where a doing did it, a claim where a claim did.
function reasonOf(subject, relation, object) {
  const of = hereOf(subject);
  // Asked why something happened rather than why something is so. The doing is
  // the row, and what it came of is on it.
  for (let i = held.actions.length - 1; i >= 0; i -= 1) {
    const row = held.actions[i];
    if (row.stands !== 'held' || row.reason == null) continue;
    if (row.of !== object && row.said !== object) continue;
    const doer = row.parts ? row.parts.thing ?? row.parts.doer : null;
    const played = against && against.anchors && against.anchors.agent != null && row.roles
      ? row.roles[against.anchors.agent]
      : null;
    const who = doer ?? (Array.isArray(played) ? played[0] : played);
    if (who != null && !same(who, subject) && who !== of) continue;
    const came = held.actions.find((r) => r.id === row.reason) ?? held.facts.find((r) => r.id === row.reason);
    if (came) return came;
  }
  for (const one of held.facts) {
    if (one.stands !== 'held') continue;
    if (!same(one.parts[0], subject) && one.parts[0] !== of) continue;
    if (!says(one, relation) || !same(one.parts[1], object)) continue;
    const came = one.reason ?? broughtAbout(one.parts[0], object);
    if (came == null) continue;
    const row = held.actions.find((r) => r.id === came) ?? held.facts.find((r) => r.id === came);
    if (row) return row;
  }
  // Nobody was told it, and it came of a change. The state a change reached is
  // the change's own, so the change is where the asking arrives.
  for (const node of [of, subject]) {
    if (node == null) continue;
    const came = broughtAbout(node, object);
    if (came == null) continue;
    const row = held.actions.find((r) => r.id === came) ?? held.facts.find((r) => r.id === came);
    if (row) return row;
  }
  return null;
}

// What a change that put a thing in this state came of. A doing leaves a fact
// behind it, and the fact says what is so while the doing says how it came to
// be — so a claim with nothing behind it of its own is asked of the change
// that made it.
function broughtAbout(thing, value) {
  const ordered = inOrder();
  for (let i = ordered.length - 1; i >= 0; i -= 1) {
    const row = ordered[i];
    if (row.stands !== 'held' || row.reason == null) continue;
    if (!row.parts || row.parts.thing !== thing) continue;
    if (!Object.values(row.properties || {}).includes(value)) continue;
    return row.reason;
  }
  return null;
}

// Whether one thing stands before another on the timeline. The chain is the
// order — built from what was declared and from what the clock said — so two
// things told only their clocks are ordered here and nowhere else.
function chronoBefore(one, other) {
  const terms = chronoTerms();
  const at = terms.indexOf(one);
  const to = terms.indexOf(other);
  if (at < 0 || to < 0 || at === to) return null;
  return at < to;
}

// Which end of the timeline a thing stands at. The chain is the order — it was
// built from what was declared and from what the clock said — so the end is
// read off it rather than worked out again from links that may never have been
// written. Told two doings and both their times, nobody declared anything and
// the answer is still there.
function chronoEnd(fromBelow) {
  const terms = chronoTerms();
  if (terms.length === 0) return [];
  return [fromBelow ? terms[0] : terms[terms.length - 1]];
}

// Place `beforeTerm` strictly before `afterTerm` in the chain, merging into
// existing positions where possible and refusing cycles.
function orderTerms(beforeTerm, afterTerm, at) {
  if (beforeTerm === afterTerm) return 'refuse';
  let mb = termMoment(beforeTerm);
  let ma = termMoment(afterTerm);
  // Both already in the same moment → simultaneous; strict before is a cycle.
  if (mb && ma && mb.id === ma.id) return 'refuse';
  // Neither exists yet → create a two-link chain.
  if (!mb && !ma) {
    const left = putMoment([beforeTerm], null, at);
    putMoment([afterTerm], left, null);
    return 'ok';
  }
  // Only the earlier exists.
  if (mb && !ma) {
    putMoment([afterTerm], mb.id, at);
    return 'ok';
  }
  if (!mb && ma) {
    // Place the new moment just before `ma`.
    const pred = momentBefore(ma);
    const mid = putMoment([beforeTerm], pred ? pred.id : null, at);
    ma.before = mid;
    return 'ok';
  }
  // Both already present — accept only if `mb` is already strictly before `ma`.
  const pb = momentPosition(mb.id);
  const pa = momentPosition(ma.id);
  return pb < pa ? 'ok' : 'refuse';
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
    // Several of them, said as the list they are.
    if (Array.isArray(id)) return `[${id.map(spell).join(', ')}]`;
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
  const SLOTS = new Set(['thing', 'on', 'as', 'of', 'unit']);
  // A property's value is a term and is said as one; a count is a number and
  // nothing goes looking for a word for it. Both are integers, so which is
  // which is not guessed at: a slot named for a property the world holds —
  // colour, temperature, openness — carries a term, and the world says which
  // names those are rather than a list here going stale as it grows.
  const named = (name) => {
    if (SLOTS.has(name)) return true;
    const term = world && world.named ? world.named(name) : null;
    return term != null && world.anchors.property != null && world.isA(term, world.anchors.property);
  };
  const properties = (of) => {
    const said = Object.entries(of || {})
      .filter(([, value]) => value != null)
      .map(([name, value]) =>
        Array.isArray(value)
          ? `${name}: ${value.map(spell).join(', ')}`
          : value && typeof value === 'object' && value.unit != null
          ? `${name}: ${value.amount} ${spell(value.unit)}`
          : `${name}: ${named(name) ? spell(value) : value}`,
      );
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

  const saidAs = (one) =>
    `${one.said.split('#')[0]}  type: ${type(known(one, world))}` +
    (one.from ? `  of ${one.from}` : '') +
    (Object.keys(howOf(one.id)).length
      ? `  {${Object.entries(howOf(one.id)).map(([name, value]) => `${name}: ${spell(value)}`).join(', ')}}`
      : '') +
    (Object.keys(muchOf(one.id)).length
      ? `  {${Object.entries(muchOf(one.id))
          .map(([name, held]) => `${name}: ${held.amount} ${spell(held.unit)}`)
          .join(', ')}}`
      : '');
  // Several of a kind, and how many. What is drawn out of one says which it
  // came from, so the two are read together and neither is counted twice.
  section(
    'groups',
    held.groups.map((one) => `${one.id}  ${saidAs(one)}  × ${one.count}`),
  );
  section(
    'nodes',
    held.nodes.map(
      (one) =>
        `${one.id}  ${one.said.split('#')[0]}  type: ${type(known(one, world))}` +
        (one.from ? `  of ${one.from}` : '') +
        (Object.keys(howOf(one.id)).length
          ? `  {${Object.entries(howOf(one.id)).map(([name, value]) => `${name}: ${spell(value)}`).join(', ')}}`
          : '') +
        (Object.keys(muchOf(one.id)).length
          ? `  {${Object.entries(muchOf(one.id))
              .map(([name, held]) => `${name}: ${held.amount} ${spell(held.unit)}`)
              .join(', ')}}`
          : ''),
    ),
  );
  // A row that was said and does not stand says so. It is not a denial: a
  // denial says what was said is false, and this says two things were said
  // that cannot both stand, so neither was taken in.
  const aside = (one) => (one.stands === 'conflict' ? '  (said, not standing)' : '');
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
      // What it came of, where a doing brought it about. Read from this end,
      // because this is the end the question is asked from.
      const why = one.reason ? `  reason ${one.reason}` : '';
      return `${one.id}  ${one.stands === 'against' ? 'not ' : ''}${said}${properties(one.properties)}${why}${aside(one)}`;
    }),
  );
  section(
    'actions',
    held.actions.map((one) => {
      // A primitive says its parts by name and in its own order; whoever did
      // it stands first, because a doing is somebody's before it is anything
      // else. A doing the brain does not yet know says the roles it was given.
      // Whoever was in it stands first, the way whoever did it does.
      const members = one.members ? `[${one.members.map(spell).join(', ')}]` : '';
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
      // A clock reading says when it was; an amount of time says how long after
      // whatever came before it. They are not the same and are not said alike.
      // A doing the brain knows of itself says its own name. Anything else is
      // an event: whatever happened, of a type the world holds, with whoever
      // took part in it, where and when it was, and what came of it hanging
      // off it. There is no narrower thing to call it and no reason to.
      const own = typeof one.of === 'string';
      const inside = members && said ? `${members}, ${said}` : members || said;
      const does = own
        ? `${one.of}(${said})`
        : `event(${inside}${inside ? ', ' : ''}type: ${spell(one.of)})`;
      const holds = one.reason ? `  reason ${one.reason}` : '';
      return `${one.id}  ${one.stands === 'against' ? 'not ' : ''}${does}${properties(one.properties)}${holds}${aside(one)}`;
    }),
  );
  // A claim inside an instruction, said the way a fact is said.
  const claim = (side) =>
    side ? `${spell(side.relation)}(${spell(side.subject)}, ${spell(side.object)})` : '—';
  section('rules', held.rules.map((one) => `${one.id}  on ${claim(one.on)} -> ${claim(one.then)}`));
  section('chrono', chronoChain().map((one) => {
    const members = `[${one.members.map(spell).join(', ')}]`;
    return `${one.id}  members: ${members}  before: ${one.before ?? 'null'}`;
  }));
  section('context', inReach.length ? [`focus: [${inReach.map(spell).join(', ')}]`] : []);

  return lines.join('\n');
}

  return {
    clear,
    dump,
    restore,
    took,
    worldOf,
    graph,
    fromUnderstood,
    serialize,
    inState,
    told,
    namedIn,
    standingIn,
    joinedBy,
    orderedOn,
    roleIn: (relation) => roleIn(relation, against),
    amounts,
    ranking,
    // The timeline: the chain, its positions and its membership surface, for
    // any reader that reasons over it directly.
    chronoChain,
    chronoTerms,
    chronoEnd,
    chronoBefore,
    reasonOf,
    worked,
    // How a thing is now, by dimension: what it was told, with what has
    // happened to it since laid over.
    howOf: (node) => {
      const one = held.nodes.find((row) => row.id === node) ?? { id: hereOf(node) ?? node };
      return Object.values(howOf(one.id));
    },
    drawnGroup,
    metBefore,
    measuring,
    membersOf,
    stood,
    momentPosition,
    termMoment,
    orderTerms,
  };
}
