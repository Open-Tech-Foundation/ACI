// judge — what the signal comes to, weighed against what is known.
//
// The phase that reads a question and answers it, and reads a telling and
// takes it in. Every reading the brain has lives here: a verdict on a claim, a
// hole to be filled, a doing to be looked for, an amount to be counted.
//
// It knows the node's shape (node.js), the world it reasons over, and the
// conversation's graph. The phases before it — understanding, thinking,
// solving, structuring — hand it what they made; the phase after it says what
// it found in words.

import { Decimal, unique } from '@opentf/std';
import { grownBy, addAmounts, multiplyAmounts } from './world.js';
import { UNITS, unitsIn as stepsInTime } from './calendar.js';
import { contextual } from './reading.js';
import {
  $, node, taken, instead, numberOf, conceptOf, markOn, thoughtOf, functionsOf,
  withBranch, findBranch, toString, quote, functionList, VERDICT,
  negatesOn, reaches,
} from './node.js';
import { TOLD, NONE, MOVED } from './working.js';
import {
  among,
  below,
  bringsRelation,
  brought,
  claimSaid,
  compared,
  concluded,
  describing,
  express,
  following,
  given,
  givings,
  greeting,
  greetsHere,
  held,
  joinIn,
  joinedWhole,
  markerFor,
  markingSide,
  measuring,
  named,
  nearestOver,
  numberSaid,
  numericCompare,
  onlyGreetings,
  partsSide,
  priorEvent,
  quality,
  quantityOn,
  reached,
  roleOn,
  spoken,
  stands,
  termWord,
  thing,
  walk,
  whole,
  worldNode,
  signalLanguage,
} from './brain.js';


export function senseVisual(raw) {
  if (raw === '') return null;
  return node('quality', 'visual', []);
}

export function senseSound(raw, langs) {
  const chars = Array.from(String(raw));
  const heard = (langs || []).filter((l) => chars.some((ch) => l.isLetterSymbol(ch)));
  if (heard.length === 0) return null;
  return node('quality', 'sound', [], { phonetics: structurePhonetics(chars, heard) });
}

// Phonetics is read off the symbol sequence. Which symbols are vowels is not
// something the brain can know by itself — it comes from the loaded symbol sets.
function structurePhonetics(chars, langs) {
  return chars.map((ch) => {
    const c = ch.toLowerCase();
    return { char: c, isVowel: langs.some((l) => l.isVowelSymbol(c)) };
  });
}

// Every quantity a state stands on. One state may stand on more than one — a
// rope is long and a meeting is long, and the two are not the same longness —
// and which of them is meant is settled by what else the signal said.
export function quantitiesOn(state, world) {
  const a = world.anchors || {};
  if (state == null || a.measure == null) return [];
  return world.members(state, a.measure) || [];
}

// A word whose ending makes a comparison names a state, and comparing is made
// on that state. The language says only that the ending compares; which
// comparison that is, is the world's, and it names one for every state a scale
// measures.
//
// Nothing is ranked. Hot does not stand above cool — they are two states of one
// scale, and a signal comparing on one is not the same fact as one comparing on
// the other, any more than taller is heavier. That the two are one fact read
// from either end is said by the world as a converse, the same way it says a
// part and what it is made of are one fact.
//
// This is why a comparison need not be listed word by word: any state a scale
// measures can be compared the moment the world names the comparison on it.
// Where a thing stands in a sequence: how many steps back to the one nothing
// stands before, and which one that is. Two things compare only where they
// stand in the same sequence — the days of the week and the numbers are two
// orderings, and nothing is asked across them.
//
// A sequence that comes round has no first, and so no places to compare: after
// sunday is monday again, and neither is before the other. That is said by
// coming back to where the walk began, and the walk says nothing rather than
// counting for ever.
function placeIn(term, world) {
  const a = world.anchors || {};
  if (a.order == null || term == null) return null;
  const seen = new Set([term]);
  let at = 0;
  let here = term;
  for (;;) {
    const before = world.pointing(here, a.order).filter((one) => world.term(one) != null);
    if (before.length !== 1) break;
    if (seen.has(before[0])) return null;
    seen.add(before[0]);
    here = before[0];
    at += 1;
  }
  return { head: here, at };
}

// Whether one thing stands before another in the sequence they share. Which
// way round the relation runs is the world's — before and after are one
// ordering read from either end — and the comparison itself is arithmetic.
function placedAgainst(holder, object, rel, world) {
  const a = world.anchors || {};
  if (a.order == null || rel == null || holder == null || object == null) return null;
  if (rel === a.order || !world.isA(rel, a.order)) return null;
  const left = placeIn(holder, world);
  const right = placeIn(object, world);
  if (left == null || right == null || left.head !== right.head) return null;
  if (left.at === right.at) return null;
  // Read from the far end, the same ordering runs the other way.
  const back = bothWays(rel, world).length > 0 && world.linked(rel, a.converse).length === 0;
  return back ? left.at > right.at : left.at < right.at;
}

// The far end of an ordering, where a word asks for one. The quality is the
// word's own; the comparison made on it is the world's, and so is which way it
// runs. Among everything that comparison joins, the far end is the one nothing
// stands beyond — and where several are unbeaten there is no one far end, so
// the brain names none rather than choosing.
function farEnd(term, world, graph) {
  const a = world.anchors || {};
  if (a.compares == null || !functionsOf(term).includes('extreme')) return undefined;
  const state = conceptOf(term);
  if (state == null) return undefined;
  // The ordering the extreme is of: the one a state declares it compares by,
  // or the word itself where it already names an ordering. `first` is the far
  // end of `before` the way `biggest` is the far end of size.
  const ordering = orderingOf(state, world);
  const comparison =
    (ordering && ordering.relation) ??
    (a.relation != null && world.isA(state, a.relation) ? state : null);
  if (comparison == null) return undefined;
  // Read from the end the state lies at. The ordering runs one way, so the
  // furthest along it is the oldest and the least far the youngest — one
  // ordering, and which end is asked for is what the word says.
  const fromBelow = ordering != null && ordering.toward === a.less;
  // Read through any converse the world declares, so a thing said to be older
  // than another stands in the ordering of youth as well — one fact, either
  // end. Reading only what was written down would find nothing at the end
  // nobody happened to speak from.
  // Who is in question. This conversation says so where it has put anybody in
  // that ordering — asked who arrived first, nobody is asking after the days
  // of the week, however plainly Monday comes before Tuesday. Where the
  // conversation has put nobody there, the world's own are all there is.
  // The conversation's own ordering on the scale, where it holds one: told
  // outright, or following from where things stand on it. Asked which of them
  // is furthest along, that is the whole of the question.
  const on = ordering && ordering.scale != null ? ordering.scale : null;
  const ends = endOfScale(on, fromBelow, graph);
  if (ends !== undefined && ends.length > 0) return ends;
  const spoken = graph ? [comparison, ...bothWays(comparison, world)].flatMap((rel) => graph.joinedBy(rel)) : [];
  // Where the ordering asked after is the timeline, the timeline answers. It
  // holds the order itself, so there is nothing to work out a second time from
  // links the clock never wrote.
  const timeline =
    graph != null &&
    a.order != null &&
    comparison != null &&
    (comparison === a.order || world.isA(comparison, a.order) || world.subrelationOf(comparison, a.order));
  if (timeline) {
    // Which end the word asks for is which way its ordering runs against the
    // chain. `first` is the far end of before and reads the head; `last` is
    // the same ordering read through its converse, and reads the tail.
    const back =
      bothWays(comparison, world).length > 0 && world.linked(comparison, a.converse).length === 0;
    const end = graph.chronoEnd(!back);
    if (end.length > 0) return end;
  }
  const joined = new Set();
  for (const t of spoken.length > 0 ? spoken.map((id) => ({ id })) : world.data.terms) {
    const beyond = world.related(t.id, comparison);
    if (beyond.length === 0 && !spoken.includes(t.id)) continue;
    joined.add(t.id);
    for (const other of beyond) if (spoken.length === 0 || spoken.includes(other)) joined.add(other);
  }
  const unbeaten = [...joined].filter((id) => (fromBelow
    ? world.related(id, comparison)
    : world.members(id, comparison)
  ).filter((of) => joined.has(of)).length === 0);
  return unbeaten.length === 1 ? unbeaten : [];
}

// A comparison word with nobody named on the other end asks which of those the
// ordering joins stands at the end the word reads from: asked who is shorter
// after only `tom is taller than sam` was said, the answer is the one the
// ordering puts below — sam. The word's own direction says which end it reads,
// short reading the low end and tall the high one. Like a far end, this is the
// whole of the question; unlike one it never needs the word to be an extreme.
// A comparison is only ever made in this conversation, so where the ordering
// holds nobody nobody answers.
function bareEnd(term, world, graph) {
  const a = world.anchors || {};
  const thought = thoughtOf(term);
  if (thought == null || thought.compares == null) return undefined;
  const direction = directionOf(conceptOf(term), world, term);
  if (direction == null) return undefined;
  const scale = thought.on != null
    ? thought.on
    : (orderingOf(thought.compares, world) || {}).scale ?? null;
  if (scale == null) return undefined;
  return endOfScale(scale, direction === a.less, graph);
}

// Which of them stands at one end of a scale the conversation holds an
// ordering on. The ordering is the conversation's — told outright, or following
// from where things stand on it — and the graph works it out in one place, so
// `who is taller`, `who is taller than kumar` and `who is tallest` are one
// question put three ways and cannot answer differently.
function endOfScale(scale, fromBelow, graph) {
  if (scale == null || !graph) return undefined;
  const edges = graph.orderedOn(scale);
  if (edges.length === 0) return undefined;
  // The parts were already put the way the ordering runs — higher first — and
  // the word chooses which end of that ordering is the answer.
  const up = new Set(edges.map(([t]) => t));
  const down = new Set(edges.map(([, b]) => b));
  const faces = edges.map((e) => (fromBelow ? e[1] : e[0]));
  return unique(faces).filter((id) => !(fromBelow ? up.has(id) : down.has(id)));
}

// Whether a relation compares at all, and which way it runs. A comparison made
// on a state is declared narrower than `more` or than `less`, so asking the
// broader relation answers for every one of them without naming any.
// Comparing is being further along something. A signal may say so bare — more,
// less — or say it through a state, and a relation that compares a state is
// comparing just as much.
export function isComparing(relation, world) {
  const a = world.anchors || {};
  if (relation == null) return false;
  if (toward(relation, a.more, world) || toward(relation, a.less, world)) return true;
  return a.compares != null && world.linked(relation, a.compares).length > 0;
}

// Which way along its ordering a comparison reads. An ordering runs one way —
// up height, up temperature — and the word chooses the end to read it from:
// tall from the top, short from the bottom. The word said is what knows, so
// the signal carries it; the relation is the ordering and has no end of its
// own. Said bare, more and less are the direction themselves.
function directionOf(relation, world, said) {
  const a = world.anchors || {};
  if (relation == null) return null;
  if (toward(relation, a.less, world)) return a.less;
  if (toward(relation, a.more, world)) return a.more;
  const thought = said ? thoughtOf(said) : null;
  if (thought && thought.toward != null) return thought.toward;
  if (a.compares == null || a.toward == null) return null;
  const state = world.linked(relation, a.compares)[0];
  return state == null ? null : world.linked(state, a.toward)[0] ?? null;
}

// Which ordering a state is compared on, and which end it reads from. The
// world says a state is measured on a scale and lies at one end of it; the
// ordering is the scale's, so hotter and warmer are one ordering read from
// one end, and cooler the same ordering read from the other. A state the
// world puts on no scale is its own ordering and nothing else's.
export function orderingsOf(state, world) {
  const a = world.anchors || {};
  if (state == null || a.compares == null) return [];
  const toward = a.toward == null ? null : world.linked(state, a.toward)[0] ?? null;
  // A state may be measured on more than one scale — a rope is long and so is
  // a wait — and each scale that carries an ordering is one way of reading the
  // word. A scale nothing compares along has no further and no nearer, so
  // nothing is said by standing on it and it is no reading at all. Which of
  // the rest is meant is settled by what is being compared, not here.
  const scales = a.measure == null ? [] : world.members(state, a.measure);
  const found = [];
  for (const scale of scales) {
    const along = world.members(scale, a.compares)[0] ?? null;
    if (along != null) found.push({ relation: along, scale, toward });
  }
  if (found.length > 0) return found;
  // A state the world puts on no ordered scale is its own ordering and
  // nothing else's.
  const own = world.members(state, a.compares)[0] ?? null;
  return own == null ? [] : [{ relation: own, scale: scales[0] ?? null, toward }];
}

export function orderingOf(state, world) {
  return orderingsOf(state, world)[0] ?? null;
}

export function toward(relation, broader, world) {
  if (relation == null || broader == null) return false;
  return relation === broader || world.subrelationOf(relation, broader);
}

// A word that says where one part of a signal ends and another begins. It
// names nothing of the world, and a walk that steps over words naming nothing
// would go straight past it — but what stands on the far side of one was never
// beside what stands on this side. `if z > 10 then wool` counts no wool: the
// ten is in the condition and the wool is in what follows it. Which words mark
// a part is the language's to say; that a reach stops at one is the brain's.
const PART_MARKS = ['condition', 'consequence', 'otherwise'];
export function opensPart(n) {
  return n.kind === 'thing' && functionsOf(n).some((f) => PART_MARKS.includes(f));
}

// Whether the signal says how much of something rather than how many of it. A
// number standing beside a property is a measure, and the brain has no measure
// to hold: how many is a count of things, and a property is not a thing to be
// counted.
export function measured(said, world) {
  const a = world.anchors || {};
  if (a.property == null) return false;
  const named = (n) => conceptOf(n) != null;
  return said.some((n, at) => {
    if (!n.state.exists || !world.isA(conceptOf(n), a.number)) return false;
    const beside = nearestOver(said, at, 1, named) ?? nearestOver(said, at, -1, named);
    if (beside == null) return false;
    // A unit is the one thing a number beside it does say how much of: ten
    // hours is a measure, and an hour is a period of time for all that.
    if (a.unit != null && world.isA(conceptOf(beside), a.unit)) return false;
    // A number may stand before words that say what the thing it counts is
    // like — four big balls are four balls, not four bignesses. Looking past
    // what describes to what is described is the same walk the count itself
    // makes, so the two cannot disagree about which it is.
    const past = describing(world);
    const isThing = (other) =>
      a.thing != null && conceptOf(other) != null && world.isA(conceptOf(other), a.thing);
    if (
      nearestOver(said, at, 1, isThing, past) != null ||
      nearestOver(said, at, -1, isThing, past) != null
    ) {
      return false;
    }
    return world.isA(conceptOf(beside), a.property);
  });
}

// How many of a kind a claim is about, where a word beside it says so. That a
// claim may be about all of a kind, some of it, or none, is the brain's; which
// words say which is the language's, and which term each is, is the world's.
function manyOf(said, at, world) {
  const a = world.anchors || {};
  if (at < 0) return null;
  // A word may carry how many of its kind it speaks of rather than have one
  // standing beside it: `something` is `some thing` said in one word.
  const own = thoughtOf(said[at]);
  if (own && own.quantifies != null) return own.quantifies;
  const isMany = (n) =>
    n && n.state.exists && [a.all, a.some, a.none].includes(conceptOf(n));
  const found = nearestOver(said, at, -1, isMany) || nearestOver(said, at, 1, isMany);
  return found ? conceptOf(found) : null;
}

// How much of one unit a thing measures, whatever unit it was measured in. A
// crate weighed in kilograms weighs so many grams, and the world says how many
// grams make a kilogram: the brain walks the steps and multiplies, the same
// arithmetic that lets five kilograms and ten grams compare. Nothing is
// written down — one more way of saying it would be one more fact to keep.
function measuredIn(bearer, unit, world) {
  const a = world.anchors || {};
  if (bearer == null || unit == null || a.unit == null || !world.isA(unit, a.unit)) return null;
  for (const held of valuesOn(bearer, world)) {
    if (held.unit === unit) return held.amount;
    const steps = unitsIn(held.unit, unit, world);
    if (steps != null) return exactly((x, y) => x.multiply(y))(held.amount, steps);
  }
  return null;
}

// How many of a kind a thing holds, counting everything it holds that is one
// of that kind. Nothing says a thing holds `things`; it holds bats and balls,
// and those are things.
function heldUnder(bearer, kind, world, under = null, parts = null) {
  const a = world.anchors || {};
  let total = null;
  // The word the question used, and any word the world declares says the same
  // thing the other way round — being in a thing and its holding you are one
  // fact. Never a word merely beside it under something broader: what a basket
  // holds is not what it has.
  const ways = under == null ? [a.holding] : [under, ...bothWays(under, world)];
  for (const relation of ways) {
    if (relation == null) continue;
    for (const of of world.linked(bearer, relation)) {
      if (of === kind || !world.isA(of, kind)) continue;
      const many = world.held(bearer, relation, of);
      if (many != null) {
        total = total == null ? many : addAmounts(total, many);
        // What the total was made of, where somebody wants to see it. Five
        // apples and eight mangoes are thirteen fruits, and which five and
        // which eight is the whole of why.
        if (parts) parts.push({ of, value: many });
      }
    }
  }
  if (total != null || under == null || a.holding == null) return total;
  // Only for what a thing measures, never for what it holds. How many pears a
  // basket holds is not answered by looking inside the apples it holds.
  if (toward(under, a.holding, world)) return total;
  // Nothing was measured of the thing itself, so what it holds is measured
  // instead: three crates of two kilograms each is six kilograms. Worked out
  // when it is asked for and never written down — one more crate and the
  // answer moves with it.
  for (const of of world.linked(bearer, a.holding)) {
    const many = world.held(bearer, a.holding, of);
    if (many == null) continue;
    const each = measureOf(of, kind, world, under);
    if (each != null) total = total == null ? multiplyAmounts(many, each) : addAmounts(total, multiplyAmounts(many, each));
  }
  return total;
}

// What one of a kind measures, wherever the world put it: on the thing, on a
// kind it is one of, or on some one of that kind that was measured.
function measureOf(of, kind, world, under) {
  const seen = new Set();
  const rungs = [of, ...upward(of, world)];
  for (const rung of rungs) {
    if (seen.has(rung)) continue;
    seen.add(rung);
    for (const bearer of [rung, ...world.individualsOf(rung)]) {
      for (const measure of world.linked(bearer, under)) {
        if (!world.isA(measure, kind)) continue;
        const each = world.held(bearer, under, measure);
        if (each != null) return each;
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// judge — a signal that names a relation between two terms makes a claim, and
// the brain checks it against the world. It reads the claim off the order of
// the things it perceived, never off a grammar symbol: phrase names come from
// data and mean nothing to the brain.
// ---------------------------------------------------------------------------
export function judge(roots, world, mood, langs, sent, graph) {
  if (!world || roots.length !== 1) return roots;
  const root = roots[0];
  // Somebody is greeting me, and these are the words they said.
  //
  // That is the whole of it. Nothing is being said about the world, so nothing
  // goes into the world; what happened is a doing this conversation holds, by
  // whoever sent it. Who that is may not have been said — then it is a thing
  // like any other thing nobody has described. Two greetings are two doings.
  const greetings = mood === 'tell' ? onlyGreetings(root, world) : null;
  if (greetings) {
    const when = world.now();
    // Where nothing says who sent it, somebody did. A signal is something
    // said, and saying is a person's until the runtime says otherwise — it
    // may say a device, another brain, anything the world holds.
    const { agent, person } = world.anchors || {};
    // Somebody did it, so somebody is in this conversation: one of them, not
    // the kind they are. Where the runtime says who sent it, that is who; where
    // it says nothing, a person, since saying is a person's until it says
    // otherwise.
    const kind = sent.from != null ? sent.from : person;
    const who = kind == null ? null : sent.allocate();
    const named = who == null
      ? []
      : [node('call', `${world.term(kind).name}#${who}`, [], {
          name: `${world.term(kind).name}#${who}`,
          id: who,
          of: kind,
          made: true,
        })];
    return greetings.map((one, i) => {
      const id = sent.allocate();
      return withBranch(one, [
        ...(one.branch || []),
        ...(i === 0 ? named : []),
        node('event', `${world.term(conceptOf(one)).name}#${id}`, [], {
          id,
          action: conceptOf(one),
          at: when,
          when: null,
          not: false,
          parts: who == null || agent == null ? [] : [{ role: agent, of: who, amount: null }],
        }),
      ]);
    });
  }

  if (root.kind === 'thing' || root.kind === 'void') return roots;

  // A signal joining whole clauses is read one at a time, not folded into one
  // long list of things: each clause is judged completely on its own, and what
  // it came to is kept, nested, under the clause it came from — a togetherness
  // of verdicts, not a blur of everyone's words at once.
  // A signal may speak *of* a claim rather than make one: `i know that a cat is
  // an animal` says something about the claim, and does not say the claim. The
  // brain checks it — that is what it is being told about — and takes nothing
  // in, which is exactly what being asked does. Asserting it would be putting
  // words in the sender's mouth.
  // A signal may say that one claim follows from another. Neither is made: the
  // brain checks the one put as the condition, and only where that already
  // stands does what follows stand too. Where it does not, nothing follows,
  // and the brain says what it found rather than taking either claim in.
  const rule = conditionIn(root);
  if (rule) {
    const [when, so, otherwise] = rule;
    const [asked] = judge([when], world, 'ask', langs, sent, graph);
    const stood = (asked.branch || []).find((n) => n.kind === 'standing');
    // Where the condition stands, what follows stands; where something stands
    // against it, what the signal put on the other side stands instead. A
    // condition the brain cannot work out is neither: it did not fail, it was
    // never reached, and nothing follows from it either way.
    const next = !stood ? null : stood.name === 'held' ? so : stood.name === 'against' ? otherwise : null;
    if (!next) {
      // A condition put on something to *do* is an instruction, not a question.
      // The brain has understood it and cannot reach the condition yet, so what
      // it answers is whether it will follow it — not that it knows nothing.
      if ([so, otherwise].some((part) => part && asksToAct(part, root, world))) {
        return [withBranch(root, [...root.branch, ...following(world)])];
      }
      const found = (asked.branch || []).filter(taken);
      const nothing = node('standing', 'absent', [], {
        subject: null,
        relation: null,
        object: null,
        negated: false,
      });
      // A condition the brain cannot reach yet is not a dead end: what was
      // said still governs, and keeps governing whatever turns up later. It is
      // kept as a standing instruction — never as the fact it speaks of — so
      // that when the condition does come to stand, what stands on it follows.
      // A condition the world stands against will never come to stand, and
      // nothing is kept for it.
      const kept =
        mood === 'tell' && stood && stood.name === 'absent'
          ? instructionFrom(when, so, world, langs, sent, graph)
          : [];
      return [
        withBranch(root, [...root.branch, ...kept, ...(found.length ? found : [nothing])]),
      ];
    }
    // A thing standing where a claim would stand is the thing to say.
    if (!joinedWhole(next, root)) {
      const of = named(next);
      if (of == null) return [withBranch(root, [...root.branch, ...(asked.branch || []).filter(taken)])];
      return [
        withBranch(root, [
          ...root.branch,
          node('answer', 'link', [], { subject: null, relation: null, found: [of] }),
        ]),
      ];
    }
    const [followed] = judge([next], world, mood, langs, sent, graph);
    return [withBranch(root, [...root.branch, ...(followed.branch || []).filter(taken)])];
  }

  // A word may hold a claim at arm's length rather than make it: `a cat might
  // be an animal` says nothing is so, it says what might be. The brain checks
  // it, which is what being asked does, and takes nothing in. It cannot tell
  // might from does-not-know — it has no notion of what could be, only of what
  // it holds — so what it says is what it found.
  if (mood === 'tell' && hasFunctionAnywhere(root, 'modal')) {
    const [asked] = judge([root], world, 'ask', langs, sent, graph);
    return [asked];
  }

  const spoken = claimWithin(root);
  if (spoken) {
    const [checked] = judge([spoken], world, 'ask', langs, sent, graph);
    const verdict = (checked.branch || []).filter(taken);
    // Asked, the question is about whoever holds the claim and not about what
    // the claim says. Where the signal names nobody holding it, the claim
    // itself is all that was asked after.
    const asked = mood === 'ask' ? askedAbout(root, spoken, verdict, world) : [];
    if (asked.length > 0) return [withBranch(root, [...root.branch, ...asked])];
    return [withBranch(root, [
      ...root.branch,
      ...verdict,
      ...aboutClaim(root, spoken, verdict, world, mood, sent),
    ])];
  }

  const join = joinIn(root);
  if (join) {
    // An alternative is not a claim. `a drum is red or a drum is blue` says one
    // of them is so and does not say which, and taking both in would leave the
    // brain holding what it was never told — that the drum is red, and blue.
    // So each side is checked, the way a claim the signal only speaks *of* is
    // checked, and nothing is taken in until something says which.
    const offered = mood === 'tell' && (join.branch || []).some(choiceOn);
    const judged = withBranch(
      join,
      join.branch.map((b) =>
        joinedWhole(b, join) ? judge([b], world, offered ? 'ask' : mood, langs, sent, graph)[0] : b,
      ),
    );
    // One claim standing as why another is so joins the two of them. Both are
    // still said — a drum is cold, and it is wet — and on top of that the
    // second is the reason for the first, which is a fact about the two
    // claims rather than about either drum. Which side is the reason the
    // language says: English puts it after the word.
    return [instead(root, join, withBranch(judged, [
      ...judged.branch,
      ...because(judged, world, mood, sent),
      ...atOneMoment(judged, world, mood, sent),
    ]))];
  }

  const greeted = greeting(root, world);
  if (greeted) {
    const [, rest] = greeted;
    return [instead(root, rest, judge([rest], world, mood, langs, sent, graph)[0])];
  }

  const said = [];
  const collect = (n) => {
    if (n.kind === 'thing') said.push(n);
    (n.branch || []).forEach(collect);
  };
  collect(root);

  const a = world.anchors || {};

  // A word that says it compares, and that the world puts on no ordering,
  // leaves the signal holding a word that neither asks nor constrains. Any
  // reading that answers past it answers from a word it never read — the plain
  // state the comparison was made from — and a denial reached that way says no
  // to a question the brain never worked out. Nothing answers.
  if (said.some((n) => (thoughtOf(n) || {}).unplaced)) {
    return [withBranch(root, [...root.branch, node('standing', 'absent', [], {
      subject: null,
      relation: null,
      object: null,
      negated: false,
    })])];
  }

  // A choice can ask which primitive refinement the current topic has. The
  // language labels the offered alternatives; the world-derived entity node
  // decides between them. No word, part of speech or term id is built in.
  const classified = classificationChoice(said, world, sent);
  if (classified) return [withBranch(root, [...root.branch, classified])];

  // A primitive entity refinement may also predicate a normal claim: `dog is
  // a living thing`. Language data marks the refinement; the brain derives
  // whether it holds from the same world node used by a classification choice.
  // No word or grammar symbol is inspected here.
  const classClaim = classificationClaim(said, world, mood);
  if (classClaim) return [withBranch(root, [...root.branch, ...classClaim])];

  // A signal may give a name rather than make a claim: `x is 5` says what x
  // stands for from here on. A name belongs to the conversation, not to the
  // world, so nothing is written down — it is handed back like anything else.
  const gave = givings(said, world, mood);
  if (gave.length > 0) {
    return [withBranch(root, [...root.branch, node('named', 'name', [], { gave })])];
  }

  // A name this conversation gave may be asked back for what it was given:
  // after `sam is three`, `is sam three?` affirms and `is sam nine?` denies.
  // The binding belongs to the conversation, so nothing stands behind it in
  // the world — the runtime handed the binding back, and it answers on its
  // own, the same read the signal that gave it made. Only a number read is
  // answered: a name given a term is a thing to be introduced, not a value
  // to be compared.
  const askedBack = namedBack(root, world, mood, sent);
  if (askedBack) return [withBranch(root, [...root.branch, askedBack])];

  // A hole is a word standing for what the signal does not say — not merely a
  // word with no term behind it, which every article and preposition is. The
  // language marks which of its words do that.
  const holes = said.filter((n) => markOn(n) === 'unknown');
  // A hole may stand beside a term saying what kind the answer must be: `what
  // colour is the car` asks after the car, and will take only a colour for an
  // answer. The term saying so is not one of the things asked about.
  const wanted = holes
    .map((hole) => nearestOver(said, said.indexOf(hole), 1, (n) => conceptOf(n) != null))
    .filter((n) => n != null && reaches(n, (world.anchors || {}).property, world));
  const asking = new Set(wanted.map((n) => conceptOf(n)));

  // Asked how long stood between two doings — `how many minutes after the
  // server started did the crash happen` — the gap between their clocks is the
  // answer, and the record each holds is where that clock is read. The word
  // the question asks on, before or after, is the signal itself; where the
  // record holds a clock for the doing on each side of it, the two are enough
  // and nothing is looked up in the world — the world links no part of a day
  // to a thing.
  if (mood === 'ask' && a.measure != null) {
    const order = said
      .map((n) => conceptOf(n))
      .find((c) => {
        const name = c == null ? null : world.term(c)?.name;
        return name === 'before' || name === 'after';
      });
    const doings = [];
    for (const n of said) {
      const c = conceptOf(n);
      if (c == null || c === order || c === a.measure || c === a.time) continue;
      const clock = clockAt(c, said, a, world, graph);
      if (clock == null) continue;
      if (!doings.some((d) => d.concept === c)) doings.push({ concept: c, clock });
    }
    if (order != null && doings.length >= 2) {
      const toMinutes = (cl) => {
        const factor = unitsIn(cl.unit, a.minute, world);
        return factor == null ? null : factor * cl.amount;
      };
      const at = doings.map((d) => toMinutes(d.clock));
      const askedUnit = said
        .map((n) => conceptOf(n))
        .find((c) => c != null && (c === a.hour || c === a.minute || c === a.second));
      // Saying the gap stands in a band — `did the crash happen more than two
      // hours after the server started` — asks whether it does, and the answer
      // is whether it does, never how wide the band is.
      const band = (() => {
        if (a.more == null || a.less == null) return null;
        const compared = said.find((n) => conceptOf(n) === a.more || conceptOf(n) === a.less);
        if (compared == null) return null;
        const unit = said.find((n) => {
          const c = conceptOf(n);
          return c != null && (c === a.hour || c === a.minute || c === a.second);
        });
        const amountOfOr = (n) => {
          const got = amountOf(n, world);
          if (got != null) return got;
          return (findBranch(n, 'quantity') || { state: {} }).state.value ?? null;
        };
        let many = unit == null ? null : amountOfOr(unit);
        if (many == null && unit != null) {
          const atUnit = said.indexOf(unit);
          for (let i = atUnit - 1; i >= 0; i--) {
            const m = amountOfOr(said[i]);
            if (m != null) {
              many = m;
              break;
            }
            const c = conceptOf(said[i]);
            if (c == null || c === a.more || c === a.less || c === a.measure || c === a.time) continue;
            break;
          }
        }
        const per = unit == null ? null : unitsIn(conceptOf(unit), a.minute, world);
        if (many == null || per == null) return null;
        return { more: conceptOf(compared) === a.more, minutes: many * per };
      })();
      if (band != null) {
        if (at.every((v) => v != null)) {
          const gap = Math.abs(at[0] - at[1]);
          const held = band.more ? gap > band.minutes : gap < band.minutes;
          return [
            withBranch(root, [
              ...root.branch,
              node('standing', held ? 'held' : 'against', [], {
                subject: null,
                relation: null,
                object: null,
                negated: false,
              }),
            ]),
          ];
        }
        return [
          withBranch(root, [
            ...root.branch,
            node('standing', 'absent', [], {
              subject: null,
              relation: null,
              object: null,
              negated: false,
            }),
          ]),
        ];
      }
      // Asked *when* one of the two was — `when did the crash happen after
      // the server started` — the clock of the one the question names is the
      // answer, not the gap between them: the word before/after only places it
      // against the other. The question asks about the doing in the sentence's
      // own subject — not the one inside the before/after clause — and the
      // walk `said` puts the conversation's focus first, so the subject is
      // read off the tree the walk came from.
      if (
        a.when != null &&
        band == null &&
        said.some((n) => conceptOf(n) === a.when) &&
        at.every((v) => v != null)
      ) {
        const inSubject = ((node, out = []) => {
          if (node.kind === 'thing') out.push(conceptOf(node));
          for (const child of node.branch || []) inSubject(child, out);
          return out;
        });
        const sentence = (root.branch || []).find((b) => b.kind === 'sentence');
        const subject = sentence ? (sentence.branch || []).find((b) => b.kind === 'subject') : null;
        const subjects = subject ? inSubject(subject) : [];
        const ask = doings.find((d) => subjects.includes(d.concept)) ?? doings[0];
        const clock = { amount: at[doings.indexOf(ask)], unit: a.minute };
        return [
          withBranch(root, [
            ...root.branch,
            node('answer', 'clock', [], {
              subject: ask.concept,
              relation: a.when,
              found: [clock],
              clock,
            }),
          ]),
        ];
      }
      // The question must ask in a clock's units — `how many minutes between
      // them` — for the gap to be the answer. The gap between them is a
      // different question from the clock of either.
      if (askedUnit != null && at.every((v) => v != null)) {
        let members = Math.abs(at[0] - at[1]);
        let unit = a.minute;
        if (askedUnit !== a.minute) {
          const per = unitsIn(askedUnit, a.minute, world);
          if (per != null && Number.isInteger(per) && members % per === 0) {
            members /= per;
            unit = askedUnit;
          }
        }
        const total = world.termFor(members);
        return [
          withBranch(root, [
            ...root.branch,
            node('count', total == null ? 'beyond' : 'counted', [], {
              of: unit,
              held: doings[1].concept,
              members,
              total,
              when: a.now,
            }),
          ]),
        ];
      }
    }
  }

  // Asked *why* something is so, the question is about the claim and not about
  // the thing in it: it is not asking whether a drum is cold — that was said —
  // but what stands behind its being so. So the claim is looked for, and
  // whatever was said to be the reason for it is the answer.
  //
  // Finding nothing, it does not know. What the thing is, or is one of, is an
  // answer to a question nobody asked: asked why a lamp is broken with nothing
  // said about it, `a tool` is true and is not a reason, and offering it would
  // be answering something else.
  if (a.cause != null && holes.some((n) => onOf(n) === a.cause)) {
    const parts = said
      .filter(
        (n) =>
          markOn(n) !== 'unknown' &&
          // A word marking the past points back at a doing already spoken of.
          // It says when, not what the question is about: `why did the fence
          // fall` asks after the fence and the falling, and the doing `did`
          // reached back to is neither of them.
          markOn(n) !== 'prior' &&
          conceptOf(n) != null &&
          conceptOf(n) !== world.baseRelation,
      )
      .map((n) => conceptOf(n));
    let behind = parts.length >= 2
      ? reasonFor(parts[0], parts[parts.length - 1], world)
      : [];
    // What the conversation was told came of what. A reason the world holds is
    // a claim reified; a reason this conversation was given may be a doing,
    // and a doing is a row of the graph and no term of the world. So where the
    // world says nothing, the graph is asked, and what it answers is the
    // occurrence — which is a thing the world holds, once something happened.
    if (behind.length === 0 && graph != null && parts.length >= 2) {
      const row = graph.reasonOf(parts[0], world.baseRelation, parts[parts.length - 1]);
      const of = row == null ? null : row.did ?? null;
      if (of != null) behind = [of];
    }
    // And what was done to a thing was done by somebody: asked why the ferry
    // was delayed, the storm that delayed it is what it came of. Nothing had
    // to be said to be a reason for that — the doing is on the record with
    // both of them in it.
    if (behind.length === 0 && graph != null && parts.length >= 2) {
      const doer = graph.didTo(parts[parts.length - 1], parts[0]);
      if (doer != null) behind = [doer];
    }
    // And what a rule concluded stands on the claim that met its condition.
    // Nothing was written down for it — what follows from a rule is worked out
    // when it is asked for — so the rules are asked again here, and what they
    // answer with is what the claim was worked from.
    const worked = behind.length > 0 || parts.length < 2
      ? null
      : concluded(
        { subject: parts[0], relation: world.baseRelation, object: parts[parts.length - 1], not: false },
        world,
      );
    return [
      withBranch(root, [
        ...root.branch,
        worked != null
          ? node('answer', 'link', [], { subject: parts[0], relation: a.cause, claim: worked })
          : behind.length > 0
          ? node('answer', 'link', [], { subject: parts[0], relation: a.cause, found: behind })
          : node('standing', 'absent', [], {
              subject: parts[0] ?? null,
              relation: a.cause,
              object: null,
              negated: false,
            }),
      ]),
    ];
  }
  // A hole may carry the kind it asks after rather than stand beside it: `how`
  // asks after the way a thing is, and there is no word beside it saying so.
  for (const hole of holes) {
    const on = onOf(hole);
    if (on != null) asking.add(on);
  }
  // A number spent saying how many of something there are is not itself one of
  // the things being spoken about.
  const spent = new Set(
    said.map((n) => quantityTerm(n)).filter((c) => c != null),
  );
  const spentSaying = new Set(
    said.map((n) => (findBranch(n, 'quantity') || { state: {} }).state.value).filter((v) => v != null),
  );
  // A number beside a thing says how many of it there are. Beside a property
  // it says how *much* — an apple does not have three weights, it weighs some
  // amount — and the brain counts but cannot measure. So it says it does not
  // know, rather than taking the number for a thing the apple has three of.
  if (measured(said, world)) {
    return [
      withBranch(root, [
        ...root.branch,
        node('standing', 'absent', [], { subject: null, relation: null, object: null, negated: false }),
      ]),
    ];
  }

  // A description before an ellipsis head restricts which one is meant; it
  // never offers a fact of its own — `the blue one is warm` says the kind is
  // warm, not blueness. Determiner-headed phrases only; togetherness (`a cow
  // and a dog`) still offers every side.
  const restricted = restrictedIn(root, world);

  // A claim may be about anything that exists, not only about a thing: gravity
  // is a force, and neither of them is a thing.
  const claims = (n) =>
    !restricted.has(n) &&
    (conceptOf(n) != null || numberOf(n, world) != null) &&
    // The weakest relation is the signal's joint, never one of the things being
    // joined: "what is your name" is about a name, not about `is`.
    conceptOf(n) !== world.baseRelation &&
    !reaches(n, a.quantity, world) &&
    !spent.has(conceptOf(n)) &&
    !asking.has(conceptOf(n)) &&
    // A number the world never named is spent all the same.
    !(conceptOf(n) == null && spentSaying.has(numberOf(n, world)));

    // What the signal offered — the other fact, where the signal denies. Read
    // once: every fact in one offering was denied alike.
    const negated = said.some(negatesOn);

    // One thing spoken of is one thing, however many facts are offered about
    // it. The one that bears a state is made once for the thing that was
    // spoken of, not once per fact — otherwise a cupboard told it has cups and
    // plates would be two cupboards, one of each.
    const bearers = new Map();
    // Ids handed out earlier in this signal are not the world's yet, so the
    // world cannot say they are taken. A thing made here must not be given one
    // another thing here already has.
    const takenIds = new Set();
    const gatherTaken = (n) => {
      if (n.kind === 'call') takenIds.add(n.state.id);
      (n.branch || []).forEach(gatherTaken);
    };
    gatherTaken(root);
    const bearerFor = (left, subject) => {
      if (!bearers.has(left)) {
        // A thing named in this very signal is the one that bears what is said
        // of it. The world does not know it yet — it is being made — so there
        // is nothing to look up and nothing to make twice.
        const named = findBranch(left, 'call');
        let made = named
          ? { id: named.state.id, made: false }
          : bearerOf(subject, world, markAt(left), sent.allocate);
        while (made && made.made && takenIds.has(made.id)) made = { ...made, id: made.id + 1 };
        if (made && made.made) takenIds.add(made.id);
        bearers.set(left, made);
      }
      return bearers.get(left);
    };

    const factFor = (left, right, denied, rel) => {
      const subject = conceptOf(left);
      const object = conceptOf(right);
      if (subject == null) return [];
      // How many of the kind the claim is about. Told nothing, a claim is
      // about the kind itself, which is every one of it.
      const howMany = manyOf(said, said.indexOf(left), world);
      const counted = quantityAmount(right, world);
      // A fact about how many is about the thing that bears it, not about its
      // kind.
      const existential = mood === 'tell' && howMany === a.some && !world.isIndividual(subject);
      // Where a state begins or ends is said of the state, not of anything in
      // it. `hot is above thirty degrees` says what hot is; making a hot thing
      // to hold the thirty would put the band on one warm afternoon and leave
      // hot itself meaning nothing.
      const bounding = (rel === a.above || rel === a.below) && rel != null;
      const bearer = (counted == null && !existential) || bounding
        ? null
        : existential
          ? bearerOf(subject, world, 'new', sent.allocate)
          : bearerFor(left, subject);
      if (counted != null && bearer == null && !bounding) return [];
      const holder = bearer ? bearer.id : subject;


      // A claim whose object stands at a pole — good or bad — is not the
      // world's to hold: it is what one sender says of one thing. It is kept
      // as an individual, of what was said, by whoever sent it, about what
      // they said it of, so that no one's verdict becomes everyone's fact.
      // With nobody to hold it there is nobody whose it is, and the brain
      // does not take it.
      if (mood === 'tell' && valenced(object, world)) {
        const from = sent ? sent.from : null;
        if (from == null) return [node('refuse', 'unheld', [], { subject, object })];
        // Criticism of the one holding this conversation is not taken at its
        // word: told it is bad, the brain looks for something it is on record
        // as ever having done at all. Finding nothing, there is no fault of
        // its own to own, and it says so rather than accepting one it cannot
        // find; finding something, the claim stands the same as any other.
        if (object === a.bad && subject === a.self && world.members(subject, a.agent).length === 0) {
          return [node('refuse', 'unwarranted', [], { subject, object })];
        }
        return [held(from, subject, object, negated, whenIn(said, world), world, sent.allocate)];
      }

      // A thing holds what its kinds hold: the fact is among what the brain
      // holds if any rung the thing stands on reaches the object by the
      // rel named — or by the other end of it, where the world says one
      // rel is another the other way round. Being in a thing and its
      // holding you are one fact, and the brain has it either way it is told.
      const joins = (from, to, rel) => joinsOn(from, to, rel, world);
      const knownCount = counted == null ? null : world.held(holder, rel, object);
      // How many of a kind a thing holds answers whether it holds one at all:
      // three apples is an apple, and none of them is not.
      const heldMany = counted == null ? world.held(holder, rel, object) : null;
      // The nearest rung that speaks, wins.
      //
      // A bird is warm and a penguin is not. Both stand on the ladder, and
      // gathering every rung leaves the two side by side with the far one
      // winning, so the penguin came out warm. What is said of the penguin is
      // said of penguins, and the bird is not consulted: the walk climbs from
      // the thing itself and stops at the first rung with anything to say.
      // What a rung says of its own accord, without climbing any further: a
      // rung that only inherits has said nothing, and the walk goes past it.
      const saysHere = (rung) =>
        world.linked(rung, rel).includes(object) ||
        (rel === world.baseRelation &&
          a.predication != null &&
          world.linked(rung, a.predication).includes(object));
      const nearestDenies = (() => {
        for (const rung of upward(holder, world)) {
          if (world.denies(rung, object, rel)) return true;
          if (saysHere(rung)) return false;
        }
        return false;
      })();
      // Where in a sequence each of them stands. An ordering is places, and
      // what is asked of it is arithmetic on those: monday comes before
      // tuesday because it stands first of the two, and nobody has to have
      // said so of that pair.
      // A state a thing is in by how much of its quantity it has. The world
      // says where the state begins and ends — what counts as hot, how far
      // past the moment it was set for counts as late — and the quantity is
      // read off the thing. Nobody has to have said the state itself.
      const banded =
        graph != null && rel === world.baseRelation ? graph.inState(holder, object, world) : null;
      // What this conversation was told. The graph is where a signal settles,
      // and a reading that asks only the world it reasons over will miss
      // whatever the conversation put somewhere the world never heard of —
      // a thing it made of a kind, and everything since said about that one.
      // Asked of the one already met, rather than of the kind at large. `is
      // the road wet` is about a road this conversation has met; `a spoon is
      // nice` asks after spoons, and what somebody said of one spoon is no
      // answer to it.
      // Which one is said by the word that marks it — `the` — and that word
      // stands beside the thing rather than being it, so the signal is asked
      // and not the thing.
      const theOne = said.some((n) => markOn(n) === 'known');
      // Only such an ask reads them. What was said of one thing is no answer
      // about the kind: a spoon somebody called nice leaves spoons as they
      // were, and some crows being white is not all of them.
      const inTalk = graph && theOne ? graph.told(holder, rel, object, theOne) : null;
      // Asked of the past, what is being asked after is what stood then, and
      // the earlier facts are still on the record. `was the coffee hot` is a
      // question about the coffee that was, and answering it from the coffee
      // that is answers something nobody asked.
      const before =
        graph != null && theOne && a.past != null && whenIn(said, world) === a.past
          ? graph.stood(holder, rel, object, theOne)
          : false;
      // Where the world holds no ordering between the two, the timeline may.
      // Told two doings and both their clocks, nobody declared an order and
      // there is still one — the chain is it.
      const declared = placedAgainst(holder, object, rel, world);
      const onChain =
        declared == null && graph != null && a.order != null && rel != null &&
        (rel === a.order || world.isA(rel, a.order) || world.subrelationOf(rel, a.order))
          ? graph.chronoBefore(holder, object)
          : null;
      const back = bothWays(rel, world).length > 0 && world.linked(rel, a.converse).length === 0;
      const ordered = declared ?? (onChain == null ? null : back ? !onChain : onChain);
      // What this conversation holds outranks what the world holds in general.
      // The world says a door that was closed is closed; the conversation says
      // somebody opened it since, and that is the later word on it.
      const holds = inTalk === 'against' && !before ? false
        : banded === true || inTalk === 'held' || before ? true : nearestDenies
        ? false
        : counted != null
        ? knownCount === counted
        : ordered != null
        ? ordered
        // Counted at none, the claim is denied by the count itself: whoever
        // gave away the only key they had has no key, and a link saying so is
        // what says they have not.
        : heldMany === 0
          ? false
          : heldMany > 0 ||
            joins(holder, object, rel) ||
            bothWays(rel, world).some((back) => joins(object, holder, back)) ||
            forced(holder, object, rel, world);
      const reverseHolds =
        joins(object, holder, rel) ||
        bothWays(rel, world).some((back) => joins(holder, object, back));
      // Something the brain holds stands against the fact where it says the
      // two are not so joined, where the two terms exclude each other and the
      // fact is about kind, or where it holds them joined by a rel it
      // says is a different one — a thing on a table is not under it. Failing
      // to find a path is none of those: not having reached a thing is not
      // holding anything against it.
      const kindFact = rel === world.baseRelation;
      const heldDenied = nearestDenies;
      const functionalObjects = new Set();
      if (world.functional(rel)) {
        for (const rung of upward(holder, world)) {
          for (const found of world.related(rung, rel)) functionalObjects.add(found);
        }
      }
      const functionalAgainst = [...functionalObjects].some((found) => found !== object);
      const typeAgainst = (candidate, required) => required.some((kind) =>
        world.excludes(candidate, kind) ||
        upward(candidate, world).some((rung) => world.denies(rung, kind, world.baseRelation))
      );
      const constrainedAgainst =
        typeAgainst(holder, world.domains(rel)) || typeAgainst(object, world.ranges(rel));
      const predicateAgainst = rel === world.baseRelation && upward(holder, world).some(
        (rung) => world.predicates(rung).some((found) => world.excludes(found, object)),
      );
      // Two kinds standing under one kind are not thereby different: a person
      // and a man are both human, and one may well be the other. What makes
      // them differ is what they hold. Where one is male and the other female
      // — two states of one property, which the world holds apart — neither
      // can be the other, and nobody has to say so pair by pair.
      const heldApart = kindFact && upward(holder, world).some((rung) =>
        world.predicates(rung).some((mine) =>
          upward(object, world).some((theirs) =>
            world.predicates(theirs).some((of) => world.excludes(mine, of)),
          ),
        ),
      );
      // Told there are none of a kind is not silence about them. A count of
      // zero stands against the claim that there is one, the way any other
      // count stands against a claim of a different one.
      const heldNone = heldMany === 0;
      // Read off its quantity and found outside the state's band, the thing is
      // not in it: a room at ten degrees is not hot, and nobody said so.
      const bandAgainst = !before && (banded === false || inTalk === 'against');
      const opposed = bandAgainst || ordered === false || functionalAgainst || constrainedAgainst || predicateAgainst || heldApart || (counted != null
        ? knownCount != null && knownCount !== counted
        : heldNone ||
          heldDenied ||
          (kindFact && world.excludes(subject, object)) ||
          (world.irreflexive(rel) && world.same(holder, object)) ||
          (world.asymmetric(rel) && reverseHolds) ||
          apartFrom(rel, world).some((other) => joins(holder, object, other)));
      // Some of a kind is not the kind. What the kind reaches, some of it
      // reaches; what it does not, some of it may still — one crow being
      // white is not crows being white, and nothing about crows says no.
      // A word saying how many, that the brain can read no amount out of,
      // leaves the claim unsettled. Many books is not a book: the world says
      // `many` is a quantity and says no more, so whether she holds any at all
      // answers a question nobody asked. Which words say how many is the
      // language's; that one it cannot read settles nothing is the brain's.
      const unread = said.some((n) => {
        const of = conceptOf(n);
        return (
          of != null &&
          a.quantity != null &&
          world.isA(of, a.quantity) &&
          world.valueOf(of) == null &&
          ![a.all, a.some, a.none, a.neither, a.zero].includes(of)
        );
      });
      // Nothing said, and a rule that says it. What follows from a rule is
      // worked out here and written nowhere, so a condition that stops
      // standing takes what stood on it with it.
      const byRule = () =>
        concluded({ subject, relation: rel, object, not: false }, world) != null
          ? 'held'
          : concluded({ subject, relation: rel, object, not: true }, world) != null
            ? 'against'
            : 'absent';
      const found = unread
        ? 'absent'
        : howMany === a.some
          ? holds || world.members(subject, world.baseRelation).some((one) => joins(one, object, rel))
            ? 'held'
            : 'absent'
          : holds
            ? 'held'
            : opposed
              ? 'against'
              : byRule();
      // None of a kind denies the claim of every one of it: `no crow is a fish`
      // says of crows what `a crow is not a fish` says.
      const isDenied = denied || howMany === a.none;
      // Denied, the fact offered is the other one: what the brain holds stands
      // against a denial of it, and what it holds against, a denial is among.
      const stands = !isDenied
        ? found
        : found === 'held'
          ? 'against'
          : found === 'against'
            ? 'held'
            : 'absent';
      // What is held is a thing, not a kind with a number written beside it.
      // Four balls in a box are four balls: one thing of their own, which is a
      // ball and is however many it is. A count written on the link from the
      // box to the kind `ball` is not a thing at all, so there is nowhere to
      // say those four are big, and no telling them from another four.
      //
      // Only what is held. Weighing five hundred grams is not holding five
      // hundred of anything: the count says how much against a unit, and there
      // is no thing there to describe or to tell from another.
      const gathered = [];
      let holdsWhat = object;
      const holdingSomething =
        a.holding != null && (rel === a.holding || world.subrelationOf(rel, a.holding));
      // A count of a thing is never negative: holding five is holding five,
      // and minus five of them is not a state the world holds — nothing holds
      // a negative number of things. A transfer may leave a holder with less
      // than it began, but a static count below zero is refused where it is
      // told. Measures may read below zero — a temperature is no count — and
      // are untouched among these.
      if (mood === 'tell' && counted != null && counted < 0 && !isDenied && holdingSomething) {
        return [node('refuse', 'countless', [], { subject, object })];
      }
      if (
        mood === 'tell' &&
        counted != null &&
        !isDenied &&
        holdingSomething &&
        world.term(object) &&
        !world.isIndividual(object)
      ) {
        // The one already there, or a new one. A box told twice how many balls
        // it holds holds the same balls, counted again — not another lot of
        // them beside the first.
        const standing = world
          .linked(holder, rel)
          .find((one) => world.isIndividual(one) && world.isA(one, object));
        if (standing != null) {
          holdsWhat = standing;
        } else {
          const id = sent.allocate();
          const name = `${world.term(object).name}#${id}`;
          gathered.push(node('call', name, [], { name, id, of: object, made: true }));
          holdsWhat = id;
        }
      }
      // A measure the brain cannot say the quantity of is not taken in. A
      // metre serves a height, a length and a size alike, and nothing said
      // which: choosing one and writing it down would be a guess kept as
      // fact, and this brain holds only what it was told.
      if (
        a.measure != null &&
        a.unit != null &&
        rel === a.measure &&
        counted != null &&
        world.isA(object, a.unit) &&
        (world.related(object, a.measure) || []).length > 1 &&
        !said.some((n) => {
          const t = thoughtOf(n);
          return t && t.measures != null;
        })
      ) {
        return [node('refuse', 'unmeasured', [], { subject, object })];
      }
      // The word the signal compared with, and whether reading it turned the
      // two things round. The fact is written the way the ordering runs; said
      // back, it is said the way it was asked.
      const wording = isComparing(rel, world) ? thoughtOf(said[at]) : null;
      const asked = wording && wording.compares != null
        ? { compares: wording.compares, turned: directionOf(rel, world, said[at]) === a.less }
        : {};
      // How many of the kind the claim was about, where the signal said. Told
      // nothing, nothing is added: a claim says what it says, and a field
      // saying `nobody mentioned` is not part of it.
      const scoped = howMany == null ? {} : { many: howMany };
      const added = [node('standing', stands, [], { subject, relation: rel, object, negated: isDenied, ...scoped, ...asked })];

      // Offered a fact nothing it holds bears on, the brain takes it in unless
      // something stands against it. A reverse edge is contradictory only
      // when the relation declares asymmetry (accounted for in `opposed`
      // above); ordinary relations may hold independently in both directions.
      // Classification and longer asymmetric cycles are checked atomically at
      // the knowledge door.
      // How many is state: telling the brain a different count is not standing
      // against what it holds, it is saying the world has moved on.
      // How many is state: telling the brain a different count is not standing
      // against what it holds, it is saying the world has moved on. So is how
      // a thing stands on one of its quantities — a drum that was cold and is
      // now hot did not contradict itself, it changed — and which qualities
      // are states of a quantity is the world's to say.
      const revises =
        (counted != null && world.held(holder, rel, object) !== counted) ||
        (stands === 'against' && quantityOn(object, world) != null);

      if (mood === 'tell') {
        if (!revises && stands === 'against') {
          added.push(
            node('refuse', 'contradiction', [], {
              subject,
              relation: rel,
              object,
            }),
          );
        } else if (stands === 'absent' || revises) {
          added.push(
            node('learn', 'link', [], {
              subject: holder,
              relation: rel,
              object: holdsWhat,
              quantity: counted,
              made: bearer && bearer.made ? bearer : null,
              not: isDenied,
              // Which side of now the signal put it on, where it said. How
              // many a thing had is not how many it has, and what stands is
              // settled by when each was so, not by which was said last.
              ...(whenIn(said, world) == null ? {} : { when: whenIn(said, world) }),
            }),
          );
        }
      }
      // A word that narrowed which one was meant is still true of the one that
      // was meant. `tilly is a big cat` says she is a cat and says she is big:
      // the narrowing picks out which cat, and for a particular cat that is a
      // thing it is. Only where the claim is what a thing *is* — narrowing the
      // one a claim is merely about (`the blue one is warm`) says nothing new
      // about blue.
      const narrowed = rel === world.baseRelation ? holder : null;
      if (mood === 'tell' && !isDenied && narrowed != null) {
        for (const narrower of restricted.narrowing.get(right) || []) {
          const quality = conceptOf(narrower);
          if (quality == null || quality === object) continue;
          if (world.isA(narrowed, quality)) continue;
          added.push(
            node('learn', 'link', [], {
              subject: narrowed,
              relation: world.classificationRelation(narrowed, quality),
              object: quality,
              quantity: null,
              made: null,
              not: false,
            }),
          );
        }
      }
      return [...gathered, ...added];
    };

    // Told agreement (`i think so`): the last idea goes back in as fact, with
    // the denial it was denied with rather than this signal's (which has
    // none). Nothing new where it holds; contradiction is refused, never
    // picked. The think-doing itself goes unrecorded: agreeing says what was
    // said, not that thinking happened.
    if (mood === 'tell' && said.some((n) => markOn(n) === 'idea') && said.some((n) => reaches(n, a.action, world))) {
      const prior = sent && Array.isArray(sent.focus) ? sent.focus : [];
      const idea = prior.find((e) => e && typeof e === 'object' && e.standing);
      const triple = idea ? idea.standing : null;
      if (triple && triple.subject != null && triple.relation != null) {
        const offered = [
          factFor(pseudoTerm(triple.subject, world), pseudoTerm(triple.object, world), triple.negated ?? false, triple.relation),
        ].filter((ns) => ns.length > 0);
        if (offered.length > 0) {
          return [withBranch(root, [...root.branch, ...asOneOffering(offered)])];
        }
      }
      return roots;
    }

  // Counting what was done (`how many dates am i carrying?`): a quantity
  // word with an action and a kind reads the amount off the matching
  // occurrence — same agent, kind carried — latest stamped first. The kind is
  // what stands beside the quantity word; whoever else stands before the
  // doing is the agent. No agent, no kind, or no occurrence: nothing to
  // count, and the normal paths below say so.
  if (holes.length > 0 && said.some((n) => reaches(n, a.quantity, world))) {
    const acting = doingIn(said, world);
    if (acting >= 0) {
      const action = conceptOf(said[acting]);
      const parts = rolesIn(
        said,
        acting,
        claims,
        world,
        markingSide(said, langs),
        partsSide(said, langs),
      );
      const qIdx = said.findIndex((n) => reaches(n, a.quantity, world));
      const thingClaim = (n) =>
        claims(n) && world.isA(conceptOf(n), a.thing) && !world.isA(conceptOf(n), a.action);
      const kindNode = nearestOver(said, qIdx, 1, thingClaim) ?? nearestOver(said, qIdx, -1, thingClaim);
      const agents = parts.filter(
        (p) => p.role === a.agent && p.of != null && (kindNode == null || conceptOf(kindNode) !== p.of),
      );
      // A full action-question answers a count or nothing: asked after what
      // was carried, kind answers would misread the question.
      if (agents.length > 0 && kindNode != null) {
        const kind = conceptOf(kindNode);
        const amount = occurrenceAmount(world, action, parts, kind);
        const total = amount == null ? null : world.termFor(amount);
        return [
          withBranch(root, [
            ...root.branch,
            node('count', total == null ? 'beyond' : 'counted', [], {
              of: kind,
              held: agents[0].of,
              members: amount,
              total,
              when: a.now,
            }),
          ]),
        ];
      }
    }
  }

  // An action can be spoken about as much as it can be carried out. A relation
  // named between two things is what the signal is about, and the joint is never one
  // of the things joined — so this is a claim about the action, not one of it
  // happening.
  // When one doing is placed by how far it stands from another — `two hours
  // after the server started` — a clock may be read for it from the clock of
  // the other, and never anywhere else: what is read is off the record, and
  // what is not on the record is not guessed.
  const temporalOffset = (said, a, world, graph) => {
    const unit = said.find((n) => {
      const c = conceptOf(n);
      return c != null && (c === a.hour || c === a.minute || c === a.second);
    });
    if (unit == null || a.minute == null) return null;
    const many = amountOf(unit, world);
    const per = unitsIn(conceptOf(unit), a.minute, world);
    if (many == null || per == null) return null;
    const span = many * per;
    const order = said.find((n) => {
      const c = conceptOf(n);
      const name = c == null ? null : world.term(c)?.name;
      return name === 'before' || name === 'after';
    });
    if (order == null) return null;
    const at = said.indexOf(order);
    const far = said
      .slice(at + 1)
      .map((n) => conceptOf(n))
      .find((c) => c != null && c !== order && c !== a.measure && c !== a.time);
    if (far == null) return null;
    const clock = clockAt(far, said, a, world, graph);
    if (clock == null) return null;
    const base = clock.amount * unitsIn(clock.unit, a.minute, world);
    const after = world.term(conceptOf(order))?.name === 'after';
    return { amount: after ? base + span : base - span, unit: a.minute };
  };
  if (mood === 'tell') {
    const offset = temporalOffset(said, a, world, graph);
    if (offset != null) {
      const done = act(
        said,
        claims,
        world,
        markingSide(said, langs),
        partsSide(said, langs),
        sent.allocate,
        graph,
      );
      if (done) {
        const event = done.find((n) => n.kind === 'event');
        if (event) event.state.time = offset;
        return [withBranch(root, [...root.branch, ...done])];
      }
    }
  }

  const joint = namedRelation(said, world, claims, holes.length > 0);
  const joined = said.filter((n, i) => i !== joint && claims(n)).length;

  // A hole standing where something played a part in what happened is asking
  // which thing played it: `who kicked the ball` asks after the one who did
  // it. The brain looks through what it was told happened, and answers with
  // whatever played the part the hole stands in.
  // Repair (`what did you say?`): asking what was said repeats the topic in
  // mind — never its kind, and never a guess. Any communication doing with a
  // hole asks it, asked or told; with nothing in mind there is nothing to
  // repeat. Runs before holes are answered one apiece, which would otherwise
  // report on the words instead of repeating the topic.
  //
  // With nothing in mind this reading has nothing to say, and a reading with
  // nothing to say does not stand in the way of the ones after it: `who
  // spoke?` is a speaking with a hole in it and is asking who, and used to
  // come back unread because this one had taken the signal and let it go.
  const repaired = holes.length > 0 && said.some((n) => reaches(n, a.communication, world))
    ? (() => {
      const focus = sent && Array.isArray(sent.focus) ? sent.focus : [];
      const thing = world ? (world.anchors || {}).thing : null;
      return focus.find(
        (id) => typeof id === 'number' && (thing == null || world.isA(id, thing)),
      ) ?? null;
    })()
    : null;
  if (repaired != null) {
    const topic = repaired;
    return [
      withBranch(root, [
        ...root.branch,
        node('answer', 'link', [], { subject: null, relation: null, found: [topic] }),
      ]),
    ];
  }

  const asked = holes.length > 0
    ? partAsked(said, world, claims, markingSide(said, langs), partsSide(said, langs), graph)
    : null;
  if (asked) return [withBranch(root, [...root.branch, asked])];

  // An idea asked about again (`is it so?`): the last verdict is laid against
  // the world afresh — the world may have moved since — and answered like any
  // other question. Asking only; telling an idea says nothing new. Where no
  // idea is in mind, there is nothing to check. Runs before joint logic: an
  // idea-word joins nothing, so a fronted joint with one claim beside it
  // would otherwise exit as jointless before ever reaching the check below.
  if (mood === 'ask' && said.some((n) => markOn(n) === 'idea')) {
    const prior = sent && Array.isArray(sent.focus) ? sent.focus : [];
    const idea = prior.find((e) => e && typeof e === 'object' && e.standing);
    const triple = idea ? idea.standing : null;
    if (triple && triple.subject != null && triple.relation != null) {
      const { subject, relation: rel, object } = triple;
      const joins = (from, to, r) => joinsOn(from, to, r, world);
      const holds =
        joins(subject, object, rel) ||
        bothWays(rel, world).some((back) => joins(object, subject, back)) ||
        forced(subject, object, rel, world);
      const kindFact = rel === world.baseRelation;
      const opposed =
        world.denies(subject, object, rel) ||
        (kindFact && world.excludes(subject, object)) ||
        (world.irreflexive(rel) && world.same(subject, object)) ||
        apartFrom(rel, world).some((other) => joins(subject, object, other));
      const name = holds ? 'held' : opposed ? 'against' : 'absent';
      return [
        withBranch(root, [
          ...root.branch,
          node('standing', name, [], { subject, relation: rel, object, negated: false }),
        ]),
      ];
    }
    return roots;
  }

  // A relation already joining two things is what the signal is about, and a
  // word that could also be read as a doing is not one here.
  // Unless a doing stands before it. `a tree fell on the road` is a falling
  // that happened on the road, not a tree that is on one: what follows the
  // doing qualifies the doing. The relation still joins two things — it is
  // the doing that is the near end of it, and the doing has to exist first.
  // Except where the doing is one the world says brings a relation about:
  // `put it on the shelf` is the shelf it ends on, and the placement is the
  // whole of what was said. A doing that brings a way to stand about — opening
  // leaves the gate open — ends nowhere, and what follows qualifies it.
  // Where and when, and nothing else: those are what any doing may carry. A
  // relation that joins two occurrences — one arrival before another — is the
  // signal itself, not a word about one of them.
  const qualified =
    joint >= 0 &&
    a.action != null &&
    a.placement != null &&
    world.isA(conceptOf(said[joint]), a.placement) &&
    said
      .slice(0, joint)
      .some(
        (n) =>
          reaches(n, a.action, world) &&
          bringsRelation(conceptOf(n), world) == null,
      );

  if (!(joint >= 0 && joined >= 2) || qualified) {
    // Asked whether something happened, the brain looks through what it was
    // told happened. It does not put another one on the record: being asked is
    // not being told, and answering is not doing.
    if (mood === 'ask') {
      const ever = happened(said, world, claims, markingSide(said, langs), partsSide(said, langs), graph);
      if (ever) return [withBranch(root, [...root.branch, ever])];
    }

    // An action the world says causes an operation, worked on what a thing
    // holds. What taking does is the world's to say; the arithmetic is the
    // brain's.
    const done = act(
      said,
      claims,
      world,
      markingSide(said, langs),
      partsSide(said, langs),
      sent.allocate,
      graph,
    );
    if (done) return [withBranch(root, [...root.branch, ...done])];
  }

  const quantity = said.find((n) => reaches(n, a.quantity, world));
  if (quantity && holes.length > 0) {
    const rel = namedRelation(said, world, claims, holes.length > 0);
    // A plural pointer stands for every topic in focus here as it does in a
    // claim: asked how many ropes *they* have after two people were each told
    // to hold some, the question names both of them. The count behind it adds
    // over as many holders as it is given.
    const things = said
      .filter((n, i) => i !== rel && claims(n))
      .flatMap((n) => membersFor(n, world, sent));

    // Asked how many of something a thing holds, the brain reads its state.
    if (rel >= 0 && things.length >= 2) {
      const subject = conceptOf(things[0]);
      const object = conceptOf(things[things.length - 1]);
      const one = (term) => world.oneOf(term) ?? term;
      // A relation may be another the other way round, and the count sits on
      // whichever end holds it: asked how many stones are *in* a pond, it is
      // the pond that holds them, and that is the same fact from the far end.
      const named = conceptOf(said[rel]);
      const ways = [
        { bearer: one(subject), of: object, relation: named },
        // Which end was said first is the language's word order and not the
        // fact: `how many crayons do i have` puts the counted thing first and
        // the one holding them last, and it is the same question either way.
        { bearer: one(object), of: subject, relation: named },
        ...bothWays(named, world).map((back) => ({
          bearer: one(object),
          of: subject,
          relation: back,
        })),
      ];
      // Two units of one scale stand in a fixed number to each other, and the
      // brain walks the steps between them and multiplies — the same
      // arithmetic that lets five kilograms and ten grams compare. A day is
      // twenty-four hours and an hour sixty minutes, so a day is what the two
      // come to together, and nobody has to write the third down.
      const stepped = (w) =>
        a.unit != null && world.isA(w.bearer, a.unit) && world.isA(w.of, a.unit)
          ? unitsIn(w.bearer, w.of, world)
          : null;
      const counts = (w) =>
        world.held(w.bearer, w.relation, w.of) != null ||
        // Measured in one unit and asked for in another. The world says how
        // many of the one make the other, and the brain multiplies — the same
        // steps it walks to compare five kilograms against ten grams.
        measuredIn(w.bearer, w.of, world) != null ||
        heldUnder(w.bearer, w.of, world) != null ||
        // What a thing measures may be carried by what it holds rather than
        // written of the thing, and that end is the one that answers.
        heldUnder(w.bearer, w.of, world, w.relation) != null ||
        // Or one end steps down to the other. Which end holds is settled by
        // which end answers, and a walk of the steps answers.
        stepped(w) != null;
      // Asked how many *kinds* a thing holds, rather than how many things.
      // The brain counts what it already gathers to add them up: five apples
      // and eight mangoes are thirteen fruits and two kinds, and the two
      // answers come off one walk. What the kinds are of is whatever else the
      // question named, and where it named nothing else, whatever is held.
      if (a.kind != null && (subject === a.kind || object === a.kind)) {
        const bearer = one(subject === a.kind ? object : subject);
        // Which kinds are asked after, where the signal narrowed them: `how
        // many kinds of book` counts the kinds of book and not every kind
        // there is.
        const among_ = onOf(said.find((n) => conceptOf(n) === a.kind));
        const sorts = [];
        for (const relation of [named, ...bothWays(named, world)]) {
          if (relation == null) continue;
          for (const held of world.linked(bearer, relation)) {
            const of = world.kinds(held)[0] ?? held;
            if (among_ != null && !world.isA(of, among_)) continue;
            if (!sorts.includes(of)) sorts.push(of);
          }
        }
        if (sorts.length > 0) {
          const total = world.termFor(sorts.length);
          return [
            withBranch(root, [
              ...root.branch,
              node('count', total == null ? 'beyond' : 'counted', [], {
                of: a.kind,
                held: bearer,
                members: sorts.length,
                total,
                made: sorts.map((sort) => ({ of: sort, value: 1 })),
                named: true,
                when: a.now,
              }),
            ]),
          ];
        }
      }
      const way = ways.find(counts) ?? ways[0];
      // Asked after a kind it holds none of by name, but several kinds under
      // it, the count is all of those together: a shop of five bats and two
      // balls holds seven things.
      // Under the word the question used. What a basket holds is not what it
      // has: reading through the broad relation here answers one question with
      // the other.
      const parts = [];
      const under = heldUnder(way.bearer, way.of, world, way.relation, parts);
      // Asked on the past side of now, the brain reads what was so then. What
      // a thing held is kept in order and never written over, so stepping back
      // one stamp is all it takes: it does not have to have remembered
      // anything on purpose.
      const over = world.heldOver(way.bearer, way.relation, way.of);
      const back = whenIn(said, world) === a.past;
      const howMany = back
        ? over.length > 1
          ? over[over.length - 2].quantity
          : null
        : world.held(way.bearer, way.relation, way.of)
          ?? under
          ?? measuredIn(way.bearer, way.of, world)
          ?? stepped(way);
      // Everyone the question named on the bearer's side is a bearer. Asked
      // how many ropes meera and arun have, the question is one count over two
      // holders and the answer is what each of them holds, added up. Reading
      // one of them and dropping the other answers a question nobody asked —
      // and answers it with a number that looks like an answer. The same walk
      // already adds across a togetherness on the other side, where one holder
      // holds two kinds; this is that walk from the other end.
      const others = back
        ? []
        : things
            .map((n) => one(conceptOf(n)))
            .filter(
              (of, i, all) =>
                of != null &&
                of !== way.bearer &&
                of !== way.of &&
                all.indexOf(of) === i &&
                counts({ bearer: of, of: way.of, relation: way.relation }),
            );
      const eachBearer = others.length > 0 && howMany != null
        ? [
            ...others.map((of) => ({ of, value: world.held(of, way.relation, way.of) })),
            { of: way.bearer, value: howMany },
          ]
        : null;
      const summed = eachBearer == null
        ? howMany
        : eachBearer.reduce((sum, one_) => sum + one_.value, 0);
      const total = summed == null ? null : world.termFor(summed);
      return [
        withBranch(root, [
          ...root.branch,
          node('count', total == null ? 'beyond' : 'counted', [], {
            of: way.of,
            held: eachBearer == null ? way.bearer : null,
            members: summed,
            total,
            ...(eachBearer != null
              ? { made: eachBearer }
              : parts.length > 1
                ? { made: parts }
                : {}),
            // The question said what it wanted counted, so the answer does not
            // say it again: asked how many hours make a day, twenty-four is
            // the whole of it.
            named: true,
            when: back ? a.past : a.now,
          }),
        ]),
      ];
    }

    // Partitive: `how many of them` counts the one kind named against whoever
    // was spoken of holding it. The relation says possession (`of` is having);
    // the bearer is the first individual in focus, else whoever was spoken
    // of — never guessed. The kind is what its bearer holds where one, else
    // what was named (a bare pointer names nothing on its own). Nothing held
    // answers nothing, falling through to the kind-alone case below.
    if (rel >= 0 && things.length <= 1 && sent && (sent.spoken != null || (sent.focus || []).length > 0)) {
      const named = conceptOf(said[rel]);
      if (named === a.has || named === a.hold) {
        const pool = Array.isArray(sent.focus) ? sent.focus : [];
        const inFocus = pool.find((id) => typeof id === 'number' && world.isIndividual(id));
        const one = (term) => (world.isIndividual(term) ? term : (world.oneOf(term) ?? term));
        const bearer = inFocus ?? (sent.spoken != null ? one(sent.spoken) : null);
        const heldHere = [];
        if (bearer != null) {
          // Under the word the question used. What a basket holds is not what
          // it has, and gathering under the broad relation would answer one
          // question with the other.
          for (const of of world.linked(bearer, named)) {
            if (!heldHere.includes(of)) heldHere.push(of);
          }
        }
        const of = (heldHere.length === 1 ? heldHere[0] : null) ?? (things.length === 1 ? conceptOf(things[0]) : null);
        // Asked under one word for holding, answered under that word. What a
        // basket holds is not what it has, and reading through the broad
        // relation here would make them the same question.
        const howMany = bearer == null || of == null
          ? null
          : (world.held(bearer, named, of) ?? heldUnder(bearer, of, world, named));
        if (howMany != null) {
          const total = world.termFor(howMany);
          return [
            withBranch(root, [
              ...root.branch,
              node('count', total == null ? 'beyond' : 'counted', [], {
                of,
                held: bearer,
                members: howMany,
                total,
                when: a.now,
              }),
            ]),
          ];
        }
      }
    }

    // Asked how many of a kind there are, with nothing said of whose, the
    // thing last spoken of is whose — where it holds any of them. `a pond has
    // a thousand stones` then `how many stones?` is asking after the pond, and
    // not after how many kinds of stone the world holds.
    if (things.length >= 1 && rel < 0 && sent && sent.spoken != null) {
      const of = world.oneOf(sent.spoken);
      const bearer = of == null ? sent.spoken : of;
      // Asked after several kinds at once, the count is all of them together:
      // how many brothers and sisters is how many of each, added.
      // Asked how many of a kind there are, the answer is how many there are:
      // every count anything holds of it, added. Two boxes of four balls are
      // eight balls, and which box was spoken of last does not change that.
      // What one thing in particular holds is asked for by saying so, and is
      // answered above.
      const each = things.map((n) => {
        const kind = conceptOf(n);
        return (
          world.heldAll(kind, a.holding) ??
          world.held(bearer, a.holding, kind) ??
          heldUnder(bearer, kind, world)
        );
      });
      const kind = conceptOf(things[0]);
      const howMany = each.some((many) => many == null)
        ? null
        : each.reduce((sum, many) => (sum == null ? many : addAmounts(sum, many)), null);
      // Something is being spoken of, so the question is about it. Where it
      // holds none of what was asked after, the brain does not know — it does
      // not go and count what it holds of its own instead. Whoever is talking
      // to it knows nothing of that, and never asked.
      // Where it holds none of what was asked after, the brain does not go and
      // count the world instead. Individuals are not the world, though — they
      // are what it was told about — so where it has been told of any, they
      // are the answer, and it falls through to counting them below.
      if (howMany == null && !(things.length === 1 && world.individualsOf(kind).length > 0)) {
        return [
          withBranch(root, [
            ...root.branch,
            node('count', 'beyond', [], { of: conceptOf(things[0]), held: bearer, members: null, total: null }),
          ]),
        ];
      }
      if (howMany != null) {
        return [
          withBranch(root, [
            ...root.branch,
            node('count', world.termFor(howMany) == null ? 'beyond' : 'counted', [], {
              of: kind,
              held: bearer,
              members: howMany,
              total: world.termFor(howMany),
            }),
          ]),
        ];
      }
    }

    // Asked how many of a kind there are, with nothing being spoken of, the
    // world is not counted out. The world is for understanding — what a kind
    // is, and how it stands — not an inventory to read back in public.
    //
    // Its individuals are another matter. A kind is the world's; an individual
    // is only ever something the brain was told about, since the world as
    // authored holds none at all. So counting them reads back what someone
    // said to it, which is exactly what it was asked for. A kind it has been
    // told of none of is still not counted out.
    if (things.length === 1) {
      const kind = conceptOf(things[0]);
      const known = world.individualsOf(kind);
      if (known.length > 0) {
        return [
          withBranch(root, [
            ...root.branch,
            node('count', world.termFor(known.length) == null ? 'beyond' : 'counted', [], {
              of: kind,
              held: null,
              members: known.length,
              total: world.termFor(known.length),
            }),
          ]),
        ];
      }
      return [
        withBranch(root, [
          ...root.branch,
          node('count', 'beyond', [], { of: kind, members: null, total: null }),
        ]),
      ];
    }
  }

  const at = joint;
  if (at < 0) {
    // Nothing joins two things, but an operation may still stand before one —
    // a root takes a single number — and a group may hold one and come to it.
    const alone = said.some((n) => groupOn(n) || operates(conceptOf(n), world));
    // A doing in the signal is not a sum to be worked out. `the shop sold
    // one-fourth of the apples` says something happened, and the fraction says
    // how many it happened to — answering thirty would answer a question
    // nobody asked and take nothing in.
    const happening = said.some((n) => reaches(n, a.action, world));
    if (!alone || happening) return roots;
    const held = working(said, world, true, graph);
    // Asked to work something out and unable to, it says so rather than
    // falling silent — the same as any other sum it cannot reach.
    if (held == null) {
      return [
        withBranch(root, [
          ...root.branch,
          node('sum', 'beyond', [], { left: null, right: null, value: null, term: null }),
        ]),
      ];
    }
    return [
      withBranch(root, [
        ...root.branch,
        node('sum', 'worked', [], {
          left: held.left,
          right: held.right,
          value: held.value,
          term: world.termFor(held.value),
        }),
      ]),
    ];
  }

  const relation = conceptOf(said[at]);

  const worked = calculate(said, at, relation, world, graph);
  if (worked) return [withBranch(root, [...root.branch, worked])];
  // `of` straight after a word that names a relation is that relation's
  // syntax, not a side of it: `the father of sam` is one relation with two
  // ends. The same reading a bare operation already gets. A hole before it
  // names no relation of its own — `who has the telescope` asks by holding.
  const ofSyntax = (n, i) => {
    if (conceptOf(n) !== a.has && conceptOf(n) !== a.hold) return false;
    if (a.relation == null || i === 0) return false;
    const before = conceptOf(said[i - 1]);
    return (
      before != null &&
      before !== a.has &&
      before !== a.hold &&
      markOn(said[i - 1]) !== 'unknown' &&
      world.isA(before, a.relation)
    );
  };
  // A quality standing beside a thing says which one is meant, and is not a
  // thing the question is about: `the small ball` names one ball, not a
  // smallness and a ball. Which side of the thing it stands on is the
  // language's — the same reading a signal gets when it says `a red box` — and
  // what stands between them, an article or another quality, is stepped over.
  const spokenIn = signalLanguage(said, langs);
  const step = spokenIn && spokenIn.data.marking === 'before' ? -1 : 1;
  const qualifies = new Map();
  said.forEach((n, i) => {
    const of = conceptOf(n);
    if (i === at || of == null || markOn(n) === 'unknown') return;
    if (!(a.property != null && world.isA(of, a.property))) return;
    for (let k = i + step; k >= 0 && k < said.length; k += step) {
      const beside = said[k];
      const thing = conceptOf(beside);
      if (thing == null) continue;
      if (markOn(beside) === 'unknown') return;
      if (a.property != null && world.isA(thing, a.property)) continue;
      if (a.thing != null && world.isA(thing, a.thing)) qualifies.set(i, thing);
      return;
    }
  });
  const terms = said.filter(
    (n, i) => i !== at && claims(n) && !ofSyntax(n, i) && !qualifies.has(i),
  );

  // A choice between things joined as one or the other: `which is smaller, 8
  // or 0` asks for the one the comparison comes out for, not for each. Every
  // pairing is worked the way any comparison is; where one of them holds
  // against all the rest, that one is the answer, and the brain takes nothing
  // in. Where every pairing works out and none does, it is a tie — neither of
  // them. Told nothing it could not work, the parts are answered one apiece,
  // as before.
  if (holes.length > 0 && terms.length >= 2 && said.some(choiceOn) && !said.some(negatesOn)) {
  if (isComparing(relation, world)) {
      const op = said[at];
      const stood = (x, y) => calculate([x, op, y], 1, relation, world, graph);
      const beats = (x, y) => {
        const s = stood(x, y);
        return s != null && s.name === 'held';
      };
      const winner = terms.find((x) => terms.every((y) => x === y || beats(x, y)));
      if (winner != null) {
        // The one that came out on top, said. No world names every number, so
        // where it has no term of its own the amount itself is the answer —
        // the brain worked it out and can say it.
        const value = conceptOf(winner) == null ? numberOf(winner, world) : null;
        return [
          withBranch(root, [
            ...root.branch,
            value == null
              ? node('answer', 'link', [], { subject: null, relation, found: [conceptOf(winner)] })
              : node('sum', 'worked', [], {
                  left: null,
                  right: null,
                  value,
                  term: world.termFor(value),
                }),
          ]),
        ];
      }
      const all = [];
      for (const x of terms) for (const y of terms) {
        if (x !== y) all.push(stood(x, y));
      }
      if (all.every((s) => s != null)) {
        return [
          withBranch(root, [
            ...root.branch,
            node('answer', 'link', [], { subject: null, relation, found: [a.neither] }),
          ]),
        ];
      }
    }
  }

  // A question with a hole answers every term it was given, each in full — a
  // togetherness of things asked about is not one blurred question, it is one
  // question asked of each, same as "1 and 2 and 3 are what" is three answers
  // held together, not one. The term nearest the hole is not privileged: a
  // question puts its hole wherever its language likes.
  // A why-hole over a full predication asks across causes, and the brain
  // keeps no causal memory: the signal is unanswered rather than answered
  // about kinds. Bare `why is a cat` still asks like what does.
  if (
    holes.some((n) => onOf(n) != null && onOf(n) === a.cause) &&
    (completing(root)?.branch || []).some((n) => conceptOf(n) != null)
  ) {
    return [
      withBranch(root, [
        ...root.branch,
        node('standing', 'absent', [], { subject: null, relation: null, object: null, negated: false }),
      ]),
    ];
  }
  // A word pointing back at a bare amount stands for the amount itself and
  // names no term — nothing in the world is called twelve thousand three
  // hundred and forty-five. Asked what it is, the answer is the amount: it is
  // what the conversation has, and saying it does not know would be forgetting
  // what it was just told.
  if (holes.length > 0) {
    const pointing = said.find(
      (n) => markOn(n) === 'spoken' && conceptOf(n) == null && numberOf(n, world) != null,
    );
    if (pointing && terms.every((n) => conceptOf(n) == null)) {
      return [
        withBranch(root, [
          ...root.branch,
          node('sum', 'worked', [], {
            left: null,
            right: null,
            value: numberOf(pointing, world),
            term: world.termFor(numberOf(pointing, world)),
          }),
        ]),
      ];
    }
  }

  // A question asking for the far end of an ordering and naming nobody to walk
  // from is asking after the far end itself: `who arrived first` says only that
  // somebody did, and which of them is first is the whole question. Nothing is
  // said about arriving that the ordering does not already hold.
  // A comparison word standing alone asks the same way: `who is shorter?` names
  // no one to compare against, and the end the word reads from is the answer.
  if (holes.length > 0 && terms.length === 0) {
    for (const n of said) {
      const far = farEnd(n, world, graph);
      const bare = far === undefined ? bareEnd(n, world, graph) : undefined;
      const found = far !== undefined ? far : bare !== undefined ? bare : undefined;
      if (found === undefined || found.length === 0) continue;
      return [
        withBranch(root, [
          ...root.branch,
          node('answer', 'link', [], { subject: null, relation: conceptOf(n), found }),
        ]),
      ];
    }
  }

  // Asked after a part played in a doing — the destination, the source — what
  // answers is the doing this conversation holds that plays it. A part belongs
  // to the doing, so there is nothing to look up in the world: it is what was
  // said here, and the latest of it.
  if (holes.length > 0 && graph) {
    const a2 = world.anchors || {};
    const roles = [a2.destination, a2.source, a2.agent, a2.target].filter((of) => of != null);
    for (const n of said) {
      const of = conceptOf(n);
      if (of == null || !roles.includes(of) || markOn(n) === 'unknown') continue;
      const played = graph.roleIn(of);
      if (played == null) continue;
      return [
        withBranch(root, [
          ...root.branch,
          node('answer', 'link', [], { subject: null, relation: of, found: [played] }),
        ]),
      ];
    }
  }

  // Two things standing at one place on a scale. Asked whether the apple and
  // the mango are the same colour, the brain is not being asked what colour
  // either of them is: it reads where each one stands on the scale the question
  // named, and lays the two against each other. Nothing is stored — the answer
  // is the two states compared — and where one of them stands nowhere the brain
  // knows of, there is nothing to compare and it says so.
  //
  // That two things may be level on a scale is the brain's; which scale they
  // are level on is the world's, and which word says sameness the language's.
  if (a.same != null && a.measure != null && graph != null && terms.length >= 2) {
    const scaleHere = (of) =>
      of != null &&
      a.property != null &&
      world.isA(of, a.property) &&
      world.linked(of, a.measure).length > 0
        ? of
        : null;
    // The scale may not be one of the things the claim is between — said as
    // `the same colour as`, it qualifies the sameness rather than standing at
    // an end of it — so it is looked for among everything said.
    const scales = [...new Set(said.map((n) => scaleHere(conceptOf(n))).filter((one) => one != null))];
    if (scales.length === 1 && said.some((n) => conceptOf(n) === a.same)) {
      const [scale] = scales;
      const sides = [...new Set(
        terms.map((t) => conceptOf(t)).filter((of) => of != null && of !== scale && of !== a.same),
      )];
      const stood = sides.map((one) => {
        const how = graph.howOf(one) || [];
        return [...new Set(how)].filter((state) => (quantityOn(state, world) ?? null) === scale);
      });
      if (sides.length >= 2 && stood.every((one) => one.length === 1)) {
        const first = stood[0][0];
        const alike = stood.every((one) => one[0] === first);
        return [
          withBranch(root, [
            ...root.branch,
            node('standing', alike ? 'held' : 'against', [], {
              subject: sides[0],
              relation: a.same,
              object: sides[1],
              worked: true,
              // Level on this scale, and nothing more: an apple is not a
              // mango, and what the two are alike in has to be said with them.
              on: scale,
            }),
          ]),
        ];
      }
    }
  }

  // Asked how a thing stands on a scale, what answers is what it was measured
  // at. A property says which scale it is of — long is of length — and so does
  // a unit, so two metres answers a question asked with long. Both links are
  // the world's; the brain walks them and measures nothing itself.
  //
  // Where the scale is asked after and nothing stands on it, the question is
  // unanswered. What the thing *is* is a different question, and answering
  // that one instead — a rope is a tool — is answering something nobody asked.
  if (
    holes.length > 0 &&
    terms.length >= 1 &&
    a.measure != null &&
    // A word marking an extreme is asking which of them is furthest along the
    // scale, not how far along one of them is. `who is the oldest` is a
    // question about an ordering, and the ordering answers it.
    !said.some((n) => functionsOf(n).includes('extreme'))
  ) {
    // Which scale the question asks on. A state is measured on one — what
    // measures it is the scale — and a unit measures several, so a signal
    // naming either says which. Measuring runs one way, so the two are asked
    // for the opposite way round.
    const scalesNamed = (of) => {
      const measured = world.members(of, a.measure)
        .filter((scale) => a.property != null && world.isA(scale, a.property));
      if (measured.length > 0) return measured;
      // A scale named outright is the scale, not the states it ranges over.
      if (a.property != null && world.isA(of, a.property) && world.linked(of, a.measure).length > 0) {
        return [of];
      }
      return world.linked(of, a.measure);
    };
    // Only a scale something can be measured *on*. A scale with units is one
    // a thing stands some amount along — how long, how heavy. One with none is
    // a set of states a thing is in, and asking after it asks which state, not
    // how much: what colour a car is, not how much colour it has.
    const inUnits = (scale) =>
      a.unit != null && world.standing(scale, a.measure).some((one) => world.isA(one, a.unit));
    // A word that says which thing is meant says nothing about what is asked
    // after it: `the small ball` is a ball, and the question is still about
    // its colour and not about its size.
    const on = new Set(
      said.flatMap((n, i) => {
        const of = conceptOf(n);
        if (of == null || markOn(n) === 'unknown' || qualifies.has(i)) return [];
        return scalesNamed(of).filter(inUnits);
      }),
    );
    // Asked what scale a thing stands on, where it stands in a state of that
    // scale and at no amount along it. A ball told it is small stands at no
    // size anybody measured, and small is the size it is — the same answer a
    // colour gives, which only reads because nothing measures colour in units.
    // Which scale a state belongs to is the world's; that a state is an answer
    // about its scale is the brain's.
    const named = new Set(
      said.flatMap((n, i) => {
        const of = conceptOf(n);
        if (of == null || markOn(n) === 'unknown' || qualifies.has(i)) return [];
        return scalesNamed(of);
      }),
    );
    // Whose thing is asked after is part of what was asked: my cat is not
    // yours, and answering about mine answers a question nobody asked. Where
    // the signal says whose, this reading leaves it to the one that knows.
    const whoseAsked = said.some((n) => functionsOf(n).includes('possessor'));
    if (holes.length > 0 && named.size > 0 && graph != null && !whoseAsked) {
      for (const term of terms) {
        const subject = conceptOf(term);
        if (subject == null || named.has(subject)) continue;
        // What it stands at, if anything: a thing measured answers with the
        // amount, and this reading is for one that was never measured.
        const bearer = world.oneOf(subject) ?? subject;
        if ([...named].some((scale) => heldUnder(bearer, scale, world) != null)) continue;
        const how = graph.howOf(subject) || [];
        const held = [...new Set(how)].filter((state) =>
          [...named].some((scale) => (quantityOn(state, world) ?? null) === scale),
        );
        if (held.length > 0) {
          return [
            withBranch(root, [
              ...root.branch,
              node('answer', 'link', [], { subject: null, relation: null, found: held }),
            ]),
          ];
        }
      }
    }
    // A who or what asked of a property this conversation told answers the
    // thing that holds it, not the scale the property measures on: after
    // `sara is tall`, `who is tall?` answers sara. The measure reading is for
    // how far along a scale a thing stands; handed a holder question there is
    // nothing to read it on, and the walk answers instead.
    // A hole asking after a thing, said in whatever language and however it is
    // spelled. It says nothing about what kind of answer it wants, or it asks
    // after whoever bears a name; a hole that asks on something else — a
    // place, a time, a cause, a state — is asking another question. Matching
    // the three English words themselves put one language into the brain, and
    // put one spelling of it there too: a capital first letter is how English
    // opens a sentence, not a different word, and `Which fruit is yellow?`
    // stopped being this question at all.
    const holderAsk = said.find((n) => {
      if (markOn(n) !== 'unknown') return false;
      const asks = conceptOf(n) ?? onOf(n);
      return asks == null || (a.name != null && asks === a.name);
    });
    const one = terms.length === 1 ? conceptOf(terms[0]) : null;
    // Asked who or what stood in something that happened. A happening is a row
    // of the graph and no term of the world, so the walk that finds what stands
    // to a thing has to be pointed at it by name — and the readers this
    // question is otherwise given look for parts played in a doing, which is
    // not what somebody merely in an accident played.
    if (holderAsk && graph != null && a.member != null) {
      const inside = terms
        .map((t) => conceptOf(t))
        .filter((t) => t != null)
        .flatMap((t) => graph.standingIn(t, a.member));
      if (inside.length > 0) {
        return [
          withBranch(root, [
            ...root.branch,
            node('answer', 'link', [], { subject: null, relation: null, found: inside }),
          ]),
        ];
      }
    }
    // Asked for a thing, with a property to know it by and a kind to narrow it
    // to: `which fruit is yellow?` wants the thing that is yellow and is a
    // fruit. Which word does which is not said by the word — a kind answers
    // `what is a wren?` and narrows here — it is said by the hole: asked for a
    // thing, a property identifies and a kind restricts.
    if (holderAsk && one == null && graph != null && a.property != null && a.thing != null) {
      const byProperty = terms
        .map((t) => conceptOf(t))
        .filter((of) => of != null && world.isA(of, a.property));
      const byKind = terms
        .map((t) => conceptOf(t))
        .filter((of) => of != null && !world.isA(of, a.property) && world.isA(of, a.thing));
      if (byProperty.length === 1 && byKind.length >= 1) {
        const holders = graph.standingIn(byProperty[0], world.baseRelation);
        const of = holders.filter((held) => byKind.every((kind) => world.isA(held, kind)));
        // The question was read whole — every word either asked or narrowed —
        // so what it found is the answer, and finding nothing is knowing of
        // none. Climbing the ladder instead would answer what the question
        // asked by, which is not an answer to it.
        return [
          withBranch(root, [
            ...root.branch,
            of.length > 0
              ? node('answer', 'link', [], { subject: null, relation: null, found: of })
              : node('standing', 'absent', [], {
                  subject: null, relation: null, object: null, negated: false,
                }),
          ]),
        ];
      }
    }
    if (holderAsk && one != null && a.property != null && world.isA(one, a.property)) {
      // A predication stands one way in the graph, whether the thing was
      // already there (`the fire is red`) or the signal named it (`sara is
      // tall`): a fact about the thing, kept where every other fact is kept.
      const beside = graph ? graph.standingIn(one, world.baseRelation) : [];
      if (beside.length > 0) {
        return [
          withBranch(root, [
            ...root.branch,
            node('answer', 'link', [], { subject: null, relation: null, found: beside }),
          ]),
        ];
      }
    }
    // Asked which thing stands at an amount, rather than how much a thing
    // stands at. The words are nearly the same — `how long is the rope` and
    // `what is 2 metres long` — and only one of them names a hole where the
    // thing goes. Answered by what measures it, the way a quality is answered
    // by what holds it.
    if (holderAsk && graph != null) {
      const unit = said
        .map((n) => conceptOf(n))
        .find((t) => t != null && a.unit != null && world.isA(t, a.unit));
      const amount = said
        .map((n) => (conceptOf(n) == null ? null : world.valueOf(conceptOf(n))))
        .find((v) => v != null);
      // Asked with an amount, only a thing standing at that amount answers.
      // Nothing standing there is not knowing, never the amount back — that
      // would answer a question nobody asked.
      if (unit != null && amount != null) {
        const holders = graph.measuring(unit, amount);
        return [
          withBranch(root, [
            ...root.branch,
            holders.length > 0
              ? node('answer', 'link', [], { subject: null, relation: null, found: holders })
              : node('standing', 'absent', [], {
                  subject: null, relation: null, object: null, negated: false,
                }),
          ]),
        ];
      }
    }
    if (on.size > 0) {
      for (const term of terms) {
        const subject = conceptOf(term);
        if (subject == null || on.has(subject)) continue;
        const bearer = world.oneOf(subject) ?? subject;
        for (const { unit, amount } of valuesOn(subject, world)) {
          if (!world.linked(unit, a.measure).some((scale) => on.has(scale))) continue;
          const total = world.termFor(amount);
          return [
            withBranch(root, [
              ...root.branch,
              node('count', total == null ? 'beyond' : 'counted', [], {
                of: unit,
                held: bearer,
                members: amount,
                total,
                when: a.now,
              }),
            ]),
          ];
        }
        // A doing the record held for some time — the backup ran for thirty-five
        // minutes — is not measured on a scale; its duration is kept under the
        // word it was told with. Asked how long it went on, the amount it was
        // held for answers, on the scale that names time.
        if (a.for != null && on.has(a.time)) {
          for (const unit of world.standing(a.time, a.measure)) {
            if (a.unit != null && !world.isA(unit, a.unit)) continue;
            const mount = world.held(bearer, a.for, unit);
            if (mount == null) continue;
            const total = world.termFor(mount);
            return [
              withBranch(root, [
                ...root.branch,
                node('count', total == null ? 'beyond' : 'counted', [], {
                  of: unit,
                  held: bearer,
                  members: mount,
                  total,
                  when: a.now,
                }),
              ]),
            ];
          }
        }
      }
      return [
        withBranch(root, [
          ...root.branch,
          node('standing', 'absent', [], {
            subject: conceptOf(terms[0]),
            relation: a.measure,
            object: null,
            negated: false,
          }),
        ]),
      ];
    }
  }

  if (holes.length > 0 && terms.length >= 1) {
    // A word marking an extreme asks after the far end of an ordering, and
    // that is the whole question. Whatever else the signal names says who is
    // in question, not another question to be answered beside it: asked what
    // happened first with nothing said to have happened, the answer is none —
    // never what a happening is.
    const extreme = said.find((n) => farEnd(n, world, graph) !== undefined);
    if (extreme) {
      return [
        withBranch(root, [
          ...root.branch,
          node('answer', 'link', [], {
            subject: null,
            relation: conceptOf(extreme),
            found: farEnd(extreme, world, graph),
          }),
        ]),
      ];
    }
    // A comparison word over a counted hold ranks the holders and asks for the
    // end. `who has more apples` — who being asked, has heard, and a counted
    // kind on it — is answered by the holder standing at the end the word
    // reads from, never by the bare comparison word, which no one holds. Where
    // several hold the same end amount, all of them answer; where nothing is
    // held by anyone, there is no end and no answer.
    const countedEnd = (() => {
      const head = said.find((n) => {
        const of = conceptOf(n);
        return of === a.more || of === a.less;
      });
      if (a.holding == null || head == null || relation !== a.has) return undefined;
      const kindOf = terms.find((n) => {
        const of = conceptOf(n);
        return (
          of != null &&
          of !== a.more &&
          of !== a.less &&
          world.isA(of, a.thing) &&
          world.isA(of, a.relation) === false
        );
      });
      if (kindOf == null) return undefined;
      const kind = conceptOf(kindOf);
      const heldOnes = [
        ...(graph ? graph.standingIn(kind, a.has) : []),
        ...world.standing(kind, a.holding),
        ...world.individualsOf(kind).flatMap((one) => world.standing(one, a.holding)),
      ];
      const holders = [...new Set(heldOnes)];
      if (holders.length === 0) return undefined;
      const fromLess = conceptOf(head) === a.less;
      const ranked = holders.map((one) => ({ one, n: world.held(one, a.holding, kind) ?? 0 }));
      const end = fromLess
        ? Math.min(...ranked.map((r) => r.n))
        : Math.max(...ranked.map((r) => r.n));
      const winner = ranked.filter((r) => r.n === end).map((r) => r.one);
      return [
        withBranch(root, [
          ...root.branch,
          node('answer', 'link', [], { subject: null, relation, found: winner }),
        ]),
      ];
    })();
    if (countedEnd != null) return countedEnd;
    const nodes = [];
    // A word the signal left standing for two things is asked after both. What
    // a cricket is, is what each cricket is — an insect and a sport — and
    // answering from one of them would leave out something the brain holds.
    // Nothing is chosen here: where the signal or the conversation settled it,
    // there is only the one reading left to ask after.
    const bothWaysOf = (t) => {
      const thought = findBranch(t, 'thought');
      const mine = thought && thought.state.ways ? thought.state.ways : null;
      const now = thought && thought.state.thought ? thought.state.thought.concept : null;
      // Settled, there is one reading and asking after the other would answer
      // about something the signal said it did not mean.
      if (!mine || mine.length < 2 || (thought && thought.state.settled)) return [t];
      // Asked what a thing is, only a reading that names a thing is an answer.
      // A word that is also a doing is not a second thing it might be.
      return mine
        .filter(
          (w) =>
            w &&
            w.concept != null &&
            w.concept !== now &&
            a.thing != null &&
            world.isA(w.concept, a.thing),
        )
        .map((w) => withBranch(t, t.branch.map((b) => (b.kind === 'thought'
          ? withBranch(b, b.branch, { ...b.state, thought: w })
          : b))))
        .concat([t]);
    };
    const asked = terms.flatMap(bothWaysOf).flatMap((t) => membersFor(t, world, sent));
    for (const [i, term] of asked.entries()) {
      let subject = conceptOf(term);
      // A bare third-person pointer on speaker-side focus stands for what is
      // held, not who holds it: `I have 3 chocolates / what is it?` is about
      // the chocolates.
      const focused = focusFor(term, world, sent);
      if (focused !== undefined) subject = focused;
      // A name is a fact like any other: what the term links to by the name
      // relation, read out of memory. Nothing about it is special to the engine.
      // Where the hole said what kind of answer it wants, only that kind is an
      // answer. Everything else the thing is remains true and is not the reply.
      // A hole seeking how, when or across what scale never takes a pointer
      // for an answer: `when is it` is none, not the topic's kind. Kinds
      // answer as ever.
      // A word marking an extreme asks for the far end of an ordering: among
      // everything the comparison on that quality joins, the one nothing
      // stands beyond. The world holds the comparison and holds it as an
      // ordering; the brain walks it and ranks nothing itself.
      // A word spent saying which thing — `the capital of france`, `the father
      // of sam` — stands for the thing it picked out, and that thing is what
      // was asked for. What it is besides is another question.
      if ((thoughtOf(term) || {}).stands) {
        nodes.push(node('answer', 'link', [], { subject, relation, found: [subject] }));
        continue;
      }
      // A word that says which one narrows what is asked after. `who has the
      // red ball?` asks after the ball that is red, and the colour was left
      // doing nothing — every holder of a ball answered, and `who has the blue
      // ball?` answered the same two.
      const narrowing = [...qualifies.entries()].find(([, thing]) => thing === subject);
      if (narrowing && graph != null && relation != null) {
        const wanted = conceptOf(said[narrowing[0]]);
        const ones = graph
          .graph()
          .nodes.filter((row) => row.term === subject || row.of === subject)
          .filter((row) => (graph.howOf(row.id) || []).includes(wanted))
          .map((row) => row.id);
        const holders = [...new Set(ones.flatMap((one) => graph.standingIn(one, relation)))];
        // Narrowed, this is the whole question. Nobody holding a green ball is
        // nobody — falling through to the wider walk answers whoever holds a
        // ball of any colour, which is the question with the word left out.
        nodes.push(node('answer', 'link', [], { subject, relation, found: holders }));
        continue;
      }
      const far = farEnd(term, world, graph);
      if (far !== undefined) {
        nodes.push(node('answer', 'link', [], { subject, relation, found: far }));
        continue;
      }
      const seeksOn = holes.some((n) => onOf(n) != null);
      const pointed =
        markOn(term) === 'spoken' || markOn(term) === 'from' || markOn(term) === 'to';
      const of = asking.size === 1 && ![...asking].includes(a.cause) ? [...asking][0] : null;
      // A fact has two ends, and a question names one of them. Which end the
      // hole asks after is settled by what is actually there: walking out from
      // the thing finds what it stands to, walking back finds what stands to
      // it, and for most questions only one of the two comes back with
      // anything. `who has kettles` finds a holder walking back and nothing
      // walking out, because kettles hold nothing; `what is mira` is the
      // other way round. Neither reading is the language's to give.
      // Where both ends answer, the thing named is the near end, as it is in a
      // statement — asked what a heron is, the answer is a bird, not whoever
      // happens to be one. Only a relation the world says runs one way reads
      // from either end by where the thing stands: `mira is taller than dev`
      // puts the taller one before the joint, so `who is taller than dev` asks
      // after the end dev is not.
      // A hole that is itself the joint names no side — `where is the lamp`
      // asks by placement and says nothing about ends — so the thing stays
      // the near end.
      // Where both ends are alike there is nothing else to ask after.
      const jointSide =
        world.asymmetric(relation) &&
        said.indexOf(term) > at &&
        holes.some((hole) => said.indexOf(hole) !== at);
      // A hole that sits before a joint that is not the barest `is` names the
      // near end, and the near end is what is asked after: `what is on the
      // crate` asks what stands on it, and `what is in the drawer` what stands
      // in it, never what the crate or the drawer itself stands on or in. A
      // hole that is the joint (a `where`) names no side, and a hole before
      // the barest `is` asks what the thing is — the far end.
      const holeBefore =
        relation !== world.baseRelation &&
        relation != null &&
        holes.some((hole) => {
          const i = said.indexOf(hole);
          return i !== at && i < at;
        });
      const twoEnded = relation != null && !world.symmetric(relation);
      // Asked after something by name, what answers is whatever has one.
      // Being called something is a fact a thing holds, never a kind it is,
      // so asking whether it *is* a name turns every named thing away.
      const fits = (t) =>
        a.name != null && of === a.name
          ? world.related(t, a.name).length > 0 || world.symbolOf(t) != null
          : world.isA(t, of);
      // A hole says what kind of answer it will take, and the walk is narrowed
      // to it. Asked after somebody by name, and what was named is already
      // somebody, there is nothing left to narrow: the brain has been told who
      // mira is, and what is wanted is what it knows of her, where asked who a
      // heron is it has not been told and only somebody answers. Nothing else
      // is like that — a red cat is not a colour, it has one.
      const narrows = of != null && !(a.name != null && of === a.name && fits(subject));
      const wants = (t) => !narrows || fits(t);
      // Asked why something is so, what answers is what was said to be the
      // reason for it. The question is about the claim — that a drum is cold —
      // and not about the drum, so the claim itself is what is looked for, and
      // what is joined to it as its cause is what the answer is about.
      const outward = seeksOn && pointed ? [] : reached(subject, relation, world).filter(wants);
      // Asked what the barest is-sentence leaves open, nothing that stands in
      // the thing is what it is: `what is existence` answers nothing, and
      // thing and property answer to it rather than it to them. The backward
      // walk answers other relations — holding, placement — and for the barest
      // is what it would hand back is whoever stands inside, never what the
      // thing itself is.
      // Asked what the barest is-sentence leaves open, nothing that stands in
      // the thing is what it is: `what is existence` answers nothing, and
      // thing and property answer to it rather than it to them. The backward
      // walk answers other relations — holding, placement — and for the barest
      // is what it would hand back is whoever stands inside, never what the
      // thing itself is. Where what stands inside are individuals — someone
      // told to be a heron — the question is who-asking, and they answer.
      const barestRoot =
        relation === world.baseRelation &&
        outward.length === 0 &&
        world.standing(subject, relation).some((t) => !world.isIndividual(t));
      // What this conversation was told comes first, and the world answers
      // where it is silent. Somebody named a moment ago is in the conversation
      // and not yet in the world, so a question about them reaches nothing
      // there. Walked only where the walk out leaves the question open, or
      // where the joint says the near end is what was asked for.
      // Which end the thing named stands at, the signal says by where it put
      // it. Before the joint it is the near end and the question is the walk
      // out — `what does the cart have?` is what the cart has. After it, it is
      // the far end and the question is the walk back — `what is in the cart?`
      // is what stands in the cart. Read only as `a hole, then a joint`, the
      // two came out the same, and the cart was answered with what it is part
      // of as well as with what it has.
      const nearSide =
        holeBefore && at >= 0 && said.indexOf(term) >= 0 && said.indexOf(term) < at;
      const backward =
        !barestRoot && !(seeksOn && pointed) && twoEnded && !nearSide
        && (outward.length === 0 || jointSide || holeBefore)
          ? [...new Set([
              ...(graph ? graph.standingIn(subject, relation) : []),
              ...world.standing(subject, relation),
              // Asked after a kind, anyone standing to one of that kind
              // answers: whoever holds a key holds a key, and what they were
              // handed was one key and not the kind.
              ...world.individualsOf(subject).flatMap((one) => world.standing(one, relation)),
            ])].filter(wants).filter((one) => {
              // Holding none of a thing is not holding it. Whoever gave away
              // the only key they had has no key, and answering that they do
              // would say what the count itself denies.
              if (a.holding == null || !world.subrelationOf(relation, a.holding)) return true;
              const many = world.held(one, relation, subject)
                ?? world.individualsOf(subject)
                  .map((of) => world.held(one, relation, of))
                  .find((held) => held != null);
              return many !== 0;
            })
          : [];
      // Where the signal says which end the hole asks after, that stands, and
      // a walk that comes back with nothing is an empty answer rather than a
      // reason to read the fact from the other end. Asked who the father of
      // arun is, nobody is, and saying the one arun is the father of answers
      // the question turned round — `what is in the coin?` answered `jar`, and
      // `who is taller than omar?` answered the one he is taller than.
      // Only where the thing named stands on the far side of the joint. `what
      // is in the coin?` puts the coin there and asks what stands in it; `what
      // is the film's name?` puts the film on this side and asks what the film
      // has, which is the walk out. A hole before the joint alone does not
      // tell the two apart.
      const decided = jointSide || (holeBefore && said.indexOf(term) > at);
      const asksBack = backward.length > 0;
      let found = asksBack ? backward : decided ? [] : outward;
      // A hold this conversation told of sits on the thing it made for whoever
      // holds — never on the authored kind: `the basket has three apples` was
      // read from the basket's bearer and the authored basket links nothing.
      // The bearer — the one of the kind, or any one of it — is what was told,
      // and reading its links answers the hole. Where the bearer holds
      // specifics, they take the place of a generic kind off the world's
      // ladder (`container holds thing`), which is no answer to what it was
      // told to hold.
      if (
        a.holding != null &&
        (relation === a.has || relation === a.hold || world.subrelationOf(relation, a.holding))
      ) {
        const specific = [];
        for (const bearer of [
          subject,
          ...(world.oneOf(subject) == null ? [] : [world.oneOf(subject)]),
          ...world.individualsOf(subject),
        ]) {
          for (const t of world.linked(bearer, relation)) {
            if (t !== subject && !specific.includes(t)) specific.push(t);
          }
        }
        if (specific.length > 0) {
          found = [
            ...specific,
            ...found.filter((t) => !specific.some((s) => world.isA(s, t))),
          ];
        }
      }
      // A predication this conversation told stands to a thing at the being
      // word, and asked who or what holds it, that thing answers: after `the
      // fire is red`, `what is red?` answers the fire. Only a property is read
      // this way — the far end of a kind is what it is, and a conversation
      // holding it is not the answer. The conversation's own facts sit in
      // front of the nature the world's ladder walks (`colour` for red), and a
      // fresh question, where nobody holds it, keeps the nature: the authored
      // world never answers for a thing this conversation told.
      if (
        !asksBack &&
        graph != null &&
        relation === world.baseRelation &&
        a.property != null &&
        world.isA(subject, a.property)
      ) {
        const beside = graph.standingIn(subject, relation);
        if (beside.length > 0) {
          found = [...beside, ...found.filter((t) => !beside.includes(t))];
        }
      }
      // The walk came back with nothing but the most generic kind: say the
      // thing itself instead — `chocolates`, known only as a thing, is answered
      // with its own name rather than `thing`. Specific answers (`animal` for a
      // cat) and kind-restricted or empty walks are untouched.
      const anchors = world.anchors || {};
      if (
        of == null &&
        found.length > 0 &&
        found.every((t) => t === anchors.thing) &&
        world.linked(subject, anchors.name).length > 0
      ) {
        found = [subject];
      }
      // Asked after somebody, and what was named is already somebody: where
      // the walk comes back with nothing, they are the answer. `who is the
      // grandfather of maya` found him by walking the relation, and what is
      // left to say is who he is.
      // Not where the signal already said which end the hole asks after. Asked
      // who the father of arun is and finding nobody, arun is not the answer:
      // the question was about somebody else, and he is the one it was asked
      // from.
      // A relation the signal named and this reading did not walk is a word
      // left doing nothing, and a reading that leaves one doing nothing is no
      // answer. `whose father is arun?` is not `who is arun?`: the father is
      // right there in the question, and answering from the bare `is` beside
      // it answers something nobody asked.
      const relationLeft = said.some(
        (n) =>
          n !== term &&
          a.relation != null &&
          conceptOf(n) != null &&
          conceptOf(n) !== relation &&
          world.isA(conceptOf(n), a.relation),
      );
      if (
        !decided &&
        !relationLeft &&
        found.length === 0 &&
        of != null &&
        a.name != null &&
        of === a.name &&
        fits(subject)
      ) {
        found = [subject];
      }
      // A place is where something stands to something else, so the way it
      // stands is half of it: asked where the dog is, `a table` is not the
      // place — `under a table` is. Only a place. What a thing holds, or is
      // one of, is answered by the far end alone.
      const asksPlace =
        relation != null &&
        a.placement != null &&
        (relation === a.placement || world.subrelationOf(relation, a.placement));
      const ways = asksPlace ? world.narrower(relation).filter((w) => w !== relation) : [];
      const through =
        ways.length > 0 && found.length > 0
          ? ways.find((way) =>
              upward(subject, world).some((rung) => world.linked(rung, way).includes(found[0])),
            ) ?? null
          : null;
      const mine = [node('answer', 'link', [], { subject, relation, found, ...(through == null ? {} : { through }) })];
      // A possessive determining its head never answers for it (`what colour
      // is my cat` is about the cat); standing as head it still speaks
      // (`what is your name`). Where its walk comes back empty it stays
      // silent rather than voicing none.
      if (found.length === 0 && functionsOf(term).includes('possessor')) continue;
      if (isDeterminer(said, said.indexOf(term), world)) continue;
      // The brain looked, and what it found stays on the tree. Saying it is
      // another act, and one it will not perform where any of the answer harms.
      const harmed = found.find((t) => harms(t, world));
      if (harmed != null) mine.push(node('refuse', 'harm', [], { said: harmed }));
      nodes.push(...among(mine, i, asked.length > 1));
    }
    // The readings of one word are alternatives, not a list. Where the signal
    // settles which one is meant, the one it settled answers and the other has
    // nothing to add — saying both put `ankara` and `I don't know` side by side
    // over one question. Where none of them found anything, that is the answer
    // and it is said once.
    const found = nodes.some((n) => n.kind === 'answer' && (n.state.found || []).length > 0);
    const spoke = found
      ? nodes.filter((n) => n.kind !== 'answer' || (n.state.found || []).length > 0)
      : nodes;
    return [withBranch(root, [...root.branch, ...spoke])];
  }

  // A question that names nothing the brain knows is still a question, and it
  // is answered. `who has the telescope` is understood whole — a hole, a
  // joint and a thing — and `telescope` is no word and no term, so there is
  // nothing to walk out from and nothing to find. Not knowing is not the same
  // as not having understood, and the brain says which. A hole is what makes
  // it a question; whether the signal carried a mark saying so is nothing to
  // this. Only where a word was met that is no word at all: a pointer that
  // landed on nothing leaves no thing in the signal to be asking about, and
  // that signal names nothing rather than asking something unanswerable.
  const neverHeard = said.some((n) => {
    const heard = thoughtOf(n);
    return heard != null && heard.wordKnown === false;
  });
  if (holes.length > 0 && terms.length === 0 && neverHeard) {
    return [
      withBranch(root, [
        ...root.branch,
        node('answer', 'link', [], { subject: null, relation: null, found: [] }),
      ]),
    ];
  }

  // Two terms and a relation offer the brain a fact, and the brain lays it
  // against the many it holds already. Either side may be several things
  // joined, and then as many facts are offered as the sides pair into: "a cow
  // and a dog are animals" offers two, and so does "a cow is an animal and a
  // mammal". They are offered together and answered together — what is offered
  // as one thing is taken or turned down as one thing.
  if (terms.length >= 2) {
    const headed = (n, i) => !isDeterminer(said, i, world);
    let lefts = said.filter((n, i) => i < at && claims(n) && headed(n, i));
    let rights = said.filter(
      (n, i) => i > at && claims(n) && conceptOf(n) != null && headed(n, i) && !ofSyntax(n, i),
    );
    // A signal that turns its joint to the front says both sides after it, and
    // the first of them is the one the rest is said of.
    if (lefts.length === 0 && rights.length >= 2 && operates(relation, world) == null) {
      // The first of them is the one the rest is said of — unless more than
      // one is joined there. `are the plum and the pear ripe?` asks the
      // ripeness of two, and taking only the plum leaves the pear standing
      // where what it is said to be goes: the brain asked whether a plum is a
      // pear, found it is not, and denied the whole question. A word that
      // joins says they are one side; which word joins is the language's.
      let side = 1;
      while (side < rights.length) {
        const from = said.indexOf(rights[side - 1]);
        const to = said.indexOf(rights[side]);
        if (from < 0 || to < 0) break;
        if (!said.slice(from + 1, to).some((n) => functionsOf(n).includes('join'))) break;
        side += 1;
      }
      // All of them joined leaves nothing for the rest to be said of.
      if (side >= rights.length) side = 1;
      lefts = rights.slice(0, side);
      rights = rights.slice(side);
    }
    // Where a side has more than one word, a doing among them is how the fact
    // was said, not one of the things it holds between: `sara arrived before
    // john` relates sara and john, and the arriving is not a third party to
    // it. A side that is only a doing still stands — walking is faster than
    // running.
    // A doing among the things on one side is how the fact was said, not one of
    // the things it holds between. And it splits that side: whoever stands
    // before it did it, and whatever stands after is what it was done to, so
    // `nila put the lamp on the table` puts the lamp there and not nila.
    // Where nothing stands after the doing, whoever did it is what the fact is
    // about — sara arrived before john relates sara and john, and the arriving
    // is not a third party to it.
    const notDoing = (list) => {
      if (list.length < 2) return list;
      const doing = list.findIndex((n) => reaches(n, a.action, world));
      if (doing < 0) return list;
      const after = list.slice(doing + 1).filter((n) => !reaches(n, a.action, world));
      if (after.length > 0) return after;
      const things = list.filter((n) => !reaches(n, a.action, world));
      return things.length > 0 ? things : list;
    };
    const hadDoing = (list) => list.some((n) => reaches(n, a.action, world));
    const preLefts = lefts;
    const preRights = rights;
    // An ordering over what happened: `sara arrived before john` says the two
    // arrivals stood one before the other. The ordering keeps ordering the two
    // of them, but each arrival itself goes on the record too — a happening of
    // the word's own, holding who did it and somewhere, and at a time when one
    // was said. Asked who arrived first, or whether anyone arrived at all, there
    // is a happening to read. Everything else an ordering joins stays as it was:
    // only where the ordering's word sat on a doing does the doing happen here.
    // So long after a thing is not a second thing that happened. `a plank fell
    // after five minutes` orders the falling against no other doing: the
    // minutes are how long, never who, and a unit that measures time cannot
    // arrive or fall or be ordered against. A day of the week can — it is a
    // time and not a unit of one.
    const saysHowLong = (n) => {
      const concept = conceptOf(n);
      return (
        concept != null &&
        a.unit != null &&
        a.measure != null &&
        a.time != null &&
        world.isA(concept, a.unit) &&
        world.linked(concept, a.measure).includes(a.time)
      );
    };
    // Only an ordering can be mistaken for one. `ran for thirty-five minutes`
    // says how long it went on and orders it against nothing, and that reading
    // is already whole.
    const ordering =
      a.order != null &&
      (relation === a.order || world.isA(relation, a.order) || world.subrelationOf(relation, a.order));
    // And only where the ordering has nothing else to order against. `the crash
    // happened two hours after the server started` orders two doings and says
    // how far apart they were; there the amount is a gap between them, not when
    // the one of them was. One doing and an amount of time is the other case.
    const howLong =
      ordering &&
      [...preLefts, ...preRights].some(saysHowLong) &&
      [...preLefts, ...preRights].filter((n) => reaches(n, a.action, world)).length === 1;
    // Said how long after, there is one doing and not two standing in an order.
    // The falling happened, and how long after is when it happened — so the
    // happening is recorded on its own and the amount rides on it, and nothing
    // is ordered against a unit.
    if (howLong) {
      const both = [...preLefts, ...preRights];
      const act = both.find((n) => reaches(n, a.action, world));
      const unit = both.find(saysHowLong);
      const amount = amountIn(root);
      if (act == null || unit == null || amount == null) return roots;
      // Whoever or whatever it happened to, and what it became: a thing plays
      // the doer, anything else the doing was said of plays the far part. The
      // concepts stand as they are — a thing the conversation already holds is
      // the same thing, and making a new one of it would lose which coffee is
      // meant.
      const parts = [];
      for (const n of both) {
        if (n === act || n === unit) continue;
        const of = conceptOf(n);
        if (of == null) continue;
        const role = a.thing != null && world.isA(of, a.thing) ? a.agent : a.target;
        if (role != null) parts.push({ role, of, amount: null });
      }
      if (parts.length === 0) return roots;
      const doing = conceptOf(act);
      const id = sent.allocate();
      return [withBranch(root, [
        ...root.branch,
        node('event', `${world.term(doing).name}#${id}`, [], {
          id,
          action: doing,
          at: sent.at ?? null,
          when: whenIn(said, world),
          not: false,
          parts,
          time: { amount, unit: conceptOf(unit), after: true },
        }),
      ])];
    }
    lefts = notDoing(lefts);
    rights = notDoing(rights);
    const orderingDoing =
      mood === 'tell' &&
      ordering &&
      lefts.length === 1 &&
      rights.length === 1 &&
      a.agent != null &&
      !said.some(negatesOn) &&
      (hadDoing(preLefts) || hadDoing(preRights));
    // Each side's own doing, where it said one. `a man arrived before a boy`
    // says one doing and both sides share it; `nila arrived after the plank
    // fell` says two, and giving the plank nila's arriving throws away the
    // falling the signal was told and puts a doing on the record nobody said.
    const doneLeft = orderingDoing
      ? preLefts.find((n) => reaches(n, a.action, world)) ?? null
      : null;
    const doneRight = orderingDoing
      ? preRights.find((n) => reaches(n, a.action, world)) ?? null
      : null;
    const done = doneLeft ?? doneRight;
    const arrivals = [];
    if (done != null) {
      const allocate = sent.allocate;
      const act = conceptOf(done);
      const when = whenIn(said, world);
      const atNow = world.now();
      // A thing spoken of as one of its kind is that one, made like any doing
      // would make it: `a man arrived before a boy` makes the man and the boy,
      // and the happening is theirs.
      const calls = [];
      const who = (n) => {
        const concept = conceptOf(n);
        if (concept == null) return null;
        if (!world.isA(concept, a.thing) || world.isIndividual(concept)) return concept;
        const id = allocate();
        const name = `${world.term(concept).name}#${id}`;
        calls.push(node('call', name, [], { name, id, of: concept, made: true }));
        return id;
      };
      const event = (concept, said_) => {
        const id = allocate();
        const of = conceptOf(said_) ?? act;
        return node('event', `${world.term(of).name}#${id}`, [], {
          id,
          action: of,
          at: atNow,
          when,
          not: false,
          // A side that is a doing itself is the happening, and nobody in the
          // signal did it: `a plank fell after a meeting` says a meeting
          // happened, not that the meeting met.
          parts: concept == null ? [] : [{ role: a.agent, of: concept, amount: null }],
        });
      };
      // A side that names a doing is that doing, and there is nobody to make
      // one of.
      const itself = (n) => reaches(n, a.action, world);
      const lWho = itself(lefts[0]) ? null : who(lefts[0]);
      const rWho = itself(rights[0]) ? null : who(rights[0]);
      if ((lWho != null || itself(lefts[0])) && (rWho != null || itself(rights[0]))) {
        const lDone = event(lWho, itself(lefts[0]) ? lefts[0] : doneLeft ?? done);
        const rDone = event(rWho, itself(rights[0]) ? rights[0] : doneRight ?? done);
        arrivals.push(
          ...calls,
          lDone,
          rDone,
          // Where it happened. Told no place, the happening is somewhere — a
          // shared term of the brain's own, so the record of where each one
          // stood reads back somewhere rather than nothing.
          ...(a.placement != null && a.somewhere != null
            ? [lWho, rWho].filter((of) => of != null).map((of) =>
                node('learn', 'link', [], {
                  subject: of,
                  relation: a.placement,
                  object: a.somewhere,
                  quantity: null,
                  made: null,
                  not: false,
                }),
              )
            : []),
        );
        // The ordering is about the two the doings are about. `a man arrived
        // before a boy` makes a man and a boy and the happenings are theirs,
        // so putting the chain on `man` and `boy` records one sentence about
        // two different subjects, and a question reaching for both ends at
        // once finds neither beaten and answers with everybody.
        const asOne = (n, id) =>
          id == null || conceptOf(n) === id
            ? n
            : withBranch(
                n,
                (n.branch || []).map((b) =>
                  b.kind === 'thought'
                    ? withBranch(b, b.branch, {
                        ...b.state,
                        thought: { ...b.state.thought, concept: id },
                      })
                    : b,
                ),
              );
        // Only where the signal spoke of it as new. A thing spoken of as
        // known is one the conversation already holds, and the one this
        // signal made of it is not yet joined to it — so the ordering stays
        // on the kind, where a later signal saying the same thing again can
        // still meet it.
        const spokenNew = (n) => {
          const i = said.indexOf(n);
          return (
            i >= 0 && markOn(markerFor(said, i, markingSide(said, langs), markOn)) === 'new'
          );
        };
        lefts = [spokenNew(lefts[0]) ? asOne(lefts[0], lWho) : lefts[0], ...lefts.slice(1)];
        rights = [spokenNew(rights[0]) ? asOne(rights[0], rWho) : rights[0], ...rights.slice(1)];
      }
    }
    // A plural pointer stands for every topic in focus, one apiece.
    lefts = lefts.flatMap((n) => membersFor(n, world, sent));
    rights = rights.flatMap((n) => membersFor(n, world, sent));
    // An ordering runs one way and the word chooses the end it is read from.
    // Read from the lower end, the two things stand the other way round in it:
    // `dev is shorter than mira` and `mira is taller than dev` are one fact,
    // so the fact is written the way the ordering runs and the signal is what
    // is turned round, never the ordering.
    if (isComparing(relation, world) && directionOf(relation, world, said[at]) === a.less) {
      const turned = lefts;
      lefts = rights;
      rights = turned;
    }
    if (lefts.length === 0 || rights.length === 0) return roots;
    // What the signal offered — the other fact, where the signal denies. Read
    // once: every fact in one offering was denied alike.
    const negated = said.some(negatesOn);

    // `nila is my friend` says friendship, and says it stands between nila and
    // me. The joint the signal used is the weakest there is; the word standing
    // after it is the relation itself, and whoever it belongs to is its other
    // end. Which word says whose is the language's; that a relation has two
    // ends is the brain's.
    let joint = relation;
    if (rights.length === 1 && a.relation != null && relation === world.baseRelation) {
      const of = conceptOf(rights[0]);
      const owner = said.find(
        (n) => functionsOf(n).includes('possessor') && conceptOf(n) != null,
      );
      if (of != null && owner != null && world.isA(of, a.relation)) {
        joint = of;
        rights = [owner];
      }
    }

    // A joint is never one of the things it joins. A second one after the
    // first opens a phrase of its own — `in a hall in the evening` is a hall
    // and an evening, not a hall, an `in` and an evening.
    const things = rights.filter((n) => !(a.relation != null && reaches(n, a.relation, world)));
    if (things.length > 0) rights = things;

    // Every fact the signal offered, in the order it offered them.
    const pairs = lefts.flatMap((left) => rights.map((right) => [left, right]));
    const offered = pairs.map(([left, right]) => factFor(left, right, negated, joint)).filter((ns) => ns.length > 0);
    if (offered.length === 0 && arrivals.length === 0) return roots;
    // The ordering itself stands as it always did, and beside it the happenings
    // the doing placed in that ordering — the ordering still reads the two ends,
    // and the happenings are where the doing is remembered.
    const besides = arrivals.length > 0 ? arrivals : [];
    return [withBranch(root, [...root.branch, ...besides, ...asOneOffering(offered)])];
  }

  return roots;
}

// What a signal put as a condition, and what it put on the other side, held as
// one thing the brain can come back to. Both sides are checked the way a
// question is — neither is made — and what is kept is the pair, not the facts.
function instructionFrom(when, so, world, langs, sent, graph) {
  const a = world.anchors || {};
  if (a.instructing == null || a.condition == null || a.consequence == null) return [];
  if (a.subject == null || a.object == null || sent == null || sent.allocate == null) return [];
  const sideOf = (part) => {
    if (!part) return null;
    const [seen] = judge([part], world, 'ask', langs, sent, graph);
    const stood = (seen.branch || []).find((n) => n.kind === 'standing');
    if (!stood) return null;
    const { subject, relation, object, negated, many } = stood.state;
    return subject == null || relation == null || object == null
      ? null
      : { subject, relation, object, negated: Boolean(negated), many: many ?? null };
  };
  const on = sideOf(when);
  const then = sideOf(so);
  if (!on || !then) return [];
  // A condition about every one of a kind is one the brain cannot tell has
  // been met. It would have to know there is no other, and it never does: not
  // being told of one is not being told there is none. `if something is busy`
  // is met by anything busy; `if everyone is busy` is met by nothing it can
  // check, so the rule is not one it can keep.
  if (a.all != null && on.many === a.all) return [];
  return [
    node('instruction', 'kept', [], {
      id: sent.allocate(),
      onId: sent.allocate(),
      thenId: sent.allocate(),
      on,
      then,
    }),
  ];
}

// What one claim being so is why another is.
//
// The two claims are written down as things — the same way the two sides of a
// standing instruction are — and the reason is joined to what it is the reason
// for. Nothing here is the fact either claim speaks of: a claim is a thing that
// says something, not the saying of it.
// A claim asked about. `do i know that a mango is a fruit` is not asking
// whether a mango is a fruit — it is asking whether somebody knows it, which
// is a fact about them and the claim. So the claim is looked for among the
// claims the world holds, and whoever the signal names is looked for standing
// to it. A claim nobody has written down is one nobody holds.
//
// The hole may stand where the holder does: `who knows that a mango is a
// fruit` asks after whoever stands there, and the same fact is walked back.
function askedAbout(root, spoken, verdict, world) {
  const a = world.anchors || {};
  if (a.subject == null || a.object == null) return [];
  const stood = verdict.find((n) => n.kind === 'standing');
  if (!stood || stood.state.subject == null || stood.state.relation == null) return [];
  const held = holdingOf(root, spoken, world);
  if (held == null) return [];
  const { joint, holder } = held;
  const { subject, object, relation, negated } = stood.state;
  // Asked whether the brain itself holds a claim, nothing has to have been
  // written down: it holds what it holds, and it can see that it does not hold
  // this. So the claim's own standing answers, and not holding it is a no
  // rather than a not-knowing — which is the one thing the brain is never
  // unsure of.
  if (a.self != null && conceptOf(holder) === a.self) {
    return [
      node('standing', stood.name === 'held' ? 'held' : 'against', [], {
        subject: a.self,
        relation: joint,
        object: null,
        negated: false,
      }),
    ];
  }
  // The claim the signal spoke of, where the world already wrote one down.
  const written = world.standing(subject, a.subject).filter((claim) => {
    if (!world.linked(claim, a.object).includes(object)) return false;
    const of = world.claimOf(claim);
    return of != null && of.relation === relation && of.not === Boolean(negated);
  });
  if (markOn(holder) === 'unknown') {
    const found = written.flatMap((claim) => world.standing(claim, joint));
    return [node('answer', 'link', [], { subject: null, relation: joint, found: [...new Set(found)] })];
  }
  const of = conceptOf(holder);
  const ones = of == null ? [] : [of, ...world.individualsOf(of)];
  const stands = written.some((claim) => ones.some((one) => world.linked(one, joint).includes(claim)));
  return [
    node('standing', stands ? 'held' : 'absent', [], {
      subject: ones[0] ?? null,
      relation: joint,
      object: written[0] ?? null,
      negated: false,
    }),
  ];
}

// Who a signal joins to a claim, and what joins them. Everything outside the
// claim is the outer clause: the joint is the relation it names, and whoever
// stands before it is the one holding the claim.
function holdingOf(root, spoken, world) {
  const a = world.anchors || {};
  const outside = [];
  const gather = (n) => {
    if (n === spoken) return;
    if (n.kind === 'thing') outside.push(n);
    (n.branch || []).forEach(gather);
  };
  gather(root);
  const at = outside.findIndex(
    (n) => reaches(n, a.relation, world) && conceptOf(n) !== world.baseRelation,
  );
  if (at < 0) return null;
  const holder = nearest(outside, at, -1, (n) => conceptOf(n) != null || markOn(n) === 'unknown');
  if (holder == null) return null;
  return { joint: conceptOf(outside[at]), holder };
}

// A claim somebody holds. `i know that ice is a solid` says two things: that
// ice is a solid, which the brain checks and does not take in — saying you
// know something is not telling the brain it is so — and that the sender
// knows it, which is a fact about the sender and the claim, and is the
// brain's to keep.
//
// The claim is written down as a thing, the way one standing behind another
// already is, and whoever holds it is joined to it by whatever the signal
// joined them with. Which words join somebody to a claim is the language's;
// that a claim is something a relation can reach is the brain's.
function aboutClaim(root, spoken, verdict, world, mood, sent) {
  if (mood !== 'tell' || !world || sent == null || sent.allocate == null) return [];
  const a = world.anchors || {};
  if (a.subject == null || a.object == null) return [];
  const stood = verdict.find((n) => n.kind === 'standing');
  if (!stood || stood.state.subject == null || stood.state.relation == null) return [];
  // Knowing something is knowing something that is so. Where the brain stands
  // against the claim it says so, and there is nothing about the sender to
  // keep: they did not know it. Where it merely has not been told, what the
  // sender said is a fact about the sender all the same.
  if (stood.name === 'against') return [];
  const held = holdingOf(root, spoken, world);
  if (held == null) return [];
  const { joint, holder } = held;
  const of = conceptOf(holder);
  // A thing this very signal made is already the one it is. The world does not
  // hold it yet, so nothing but the making says so — and asking for a bearer
  // of it makes a second thing standing for the first, which is then joined to
  // the claim while the first keeps the name.
  const call = findBranch(holder, 'call');
  const bearer = call && call.state.id != null
    ? { id: call.state.id, made: false, named: call.state.name }
    : bearerOf(of, world, markAt(holder), sent.allocate);
  if (bearer == null) return [];
  return [
    node('about', 'claim', [], {
      holder: bearer.id,
      of: bearer.made ? of : null,
      // What it is called, where this signal is the one calling it that: the
      // record must not rename what it is only joining to a claim.
      named: bearer.named ?? null,
      relation: joint,
      claimId: sent.allocate(),
      claim: {
        subject: stood.state.subject,
        relation: stood.state.relation,
        object: stood.state.object,
        negated: Boolean(stood.state.negated),
      },
    }),
  ];
}

// The clock a doing stood at, read off the record the conversation keeps —
// never off the world, which links no part of a day to a thing. The beginning
// answers as it was told; where the signal asks after its end, the time it
// went on is put forward from there. `null` where no row says the doing.
function clockAt(term, said, a, world, graph) {
  const rows = graph ? graph.graph().actions : [];
  const nodes = graph ? graph.graph().nodes : null;
  const nodeConcept = (v) => {
    if (typeof v === 'number') return v;
    if (typeof v === 'string' && nodes) {
      const found = nodes.find((n) => n.id === v);
      return found ? (found.of ?? found.term) ?? null : null;
    }
    return null;
  };
  const actKind = (t) => t != null && a.action != null && world.isA(t, a.action) && !world.isIndividual(t);
  const hits = (x, y) => (actKind(x) || actKind(y) ? x === y : world.isA(x, y));
  let clock = null;
  let holder = null;
  for (const r of rows) {
    const did = r.did;
    if (did == null) continue;
    const kindRow = r.of != null && actKind(r.of);
    const does = (v) => {
      const c = nodeConcept(v);
      if (c == null) return false;
      // The kind of doing a row is names no row over another — every starting
      // is a starting. One the conversation brought in and is speaking of does
      // name one: the backup that started is this backup.
      const brought = typeof v === 'string' && nodes && nodes.some((n) => n.id === v);
      if (!brought && actKind(c)) return false;
      // A happening the question names in particular is the one on the record,
      // whatever kind of doing it was: `after the backup` is that backup, and
      // the row's own part is it. Asked by the bare kind it is no row over
      // another, which is what the equality above holds to.
      if (term != null && world.isIndividual(term) && world.isA(term, c)) return true;
      return hits(c, term) || (term != null && hits(term, c));
    };
    const matches =
      does(did) ||
      (!kindRow && r.of != null && does(r.of)) ||
      Object.values(r.roles ?? {}).some((v) => does(v));
    if (!matches) continue;
    const at = (r.properties || {}).at;
    if (at == null || at.amount == null || !UNITS.some((name) => a[name] === at.unit)) continue;
    clock = { amount: Number(at.amount), unit: at.unit };
    // How long it went on is held on the doing, or on what the doing was of:
    // the update that started is one happening, and it is the update that ran
    // for thirty-five minutes, not the starting. Who took what part is the
    // world's to say, and it says which one of them it was.
    holder = [did, ...tookPartIn(did, world)];
    break;
  }
  if (clock == null) return null;
  const wantedEnd = a.finish != null && said.some((n) => n != null && conceptOf(n) === a.finish);
  if (wantedEnd) {
    let length = 0;
    for (const unit of world.standing(a.time, a.measure)) {
      const held = holder.map((one) => world.held(one, a.for, unit)).find((v) => v != null);
      if (held == null) continue;
      length += held * unitsIn(unit, clock.unit, world);
    }
    if (length > 0) clock = { amount: clock.amount + length, unit: clock.unit };
  }
  return clock;
}

function because(joined, world, mood, sent) {
  if (mood !== 'tell' || !world || sent == null || sent.allocate == null) return [];
  const a = world.anchors || {};
  if (a.cause == null || a.subject == null || a.object == null) return [];
  // Which side the reason is on is the word's, and the language says so. Some
  // words put the reason after them — `because a plank fell` — and some put
  // what came of it — `so a road is wet`. One joining either way is the same
  // joining: a reason and what came of it, told in the order the word chose.
  const branch = joined.branch || [];
  const at = branch.findIndex((n) => {
    const fns = functionsOf(n);
    return fns.includes('reason') || fns.includes('result');
  });
  if (at < 0) return [];
  const reasonFollows = functionsOf(branch[at]).includes('reason');
  // Either side may be something being so or something happening. A claim is
  // written down as a thing when the cause is; a doing already is one, so what
  // is wanted from it is which one it was.
  const sideOf = (n) => {
    const stood = n && (n.branch || []).find((b) => b.kind === 'standing');
    if (stood) {
      const { subject, relation, object, negated } = stood.state;
      return subject == null || relation == null || object == null
        ? null
        : { claim: { subject, relation, object, negated: Boolean(negated) } };
    }
    const done = n && (n.branch || []).find((b) => b.kind === 'event');
    return done && done.state.id != null ? { done: done.state.id } : null;
  };
  const wholes = (joined.branch || []).filter((b) => joinedWhole(b, joined));
  const before = wholes.filter((b) => (joined.branch || []).indexOf(b) < at);
  const after = wholes.filter((b) => (joined.branch || []).indexOf(b) > at);
  const near = sideOf(before[before.length - 1]);
  const far = sideOf(after[0]);
  const effect = reasonFollows ? near : far;
  const reason = reasonFollows ? far : near;
  if (!effect || !reason) return [];
  return [
    node('cause', 'because', [], {
      reason,
      effect,
      reasonId: sent.allocate(),
      effectId: sent.allocate(),
    }),
  ];
}

// Two things said to have stood at one time. `the coffee was hot when it
// arrived` says both — it was hot, and it arrived — and on top of that says
// they were so together. That togetherness is a fact about the two of them and
// about neither one alone, so it is kept where the order of things is kept,
// as one moment holding both.
function atOneMoment(joined, world, mood, sent) {
  if (mood !== 'tell' || !world || sent == null || sent.allocate == null) return [];
  const at = (joined.branch || []).findIndex((n) => functionsOf(n).includes('moment'));
  if (at < 0) return [];
  // Either side may be something being so or something happening, and which
  // it is decides what there is to point at afterwards.
  const sideOf = (n) => {
    const stood = n && (n.branch || []).find((b) => b.kind === 'standing');
    if (stood) {
      const { subject, relation, object, negated } = stood.state;
      return subject == null || relation == null || object == null
        ? null
        : { claim: { subject, relation, object, negated: Boolean(negated) } };
    }
    const done = n && (n.branch || []).find((b) => b.kind === 'event');
    return done && done.state.id != null ? { done: done.state.id } : null;
  };
  const wholes = (joined.branch || []).filter((b) => joinedWhole(b, joined));
  const before = wholes.filter((b) => (joined.branch || []).indexOf(b) < at);
  const after = wholes.filter((b) => (joined.branch || []).indexOf(b) > at);
  const one = sideOf(before[before.length - 1]);
  const other = sideOf(after[0]);
  if (!one || !other) return [];
  return [node('moment', 'when', [], { sides: [one, other] })];
}


// Whether this part of a signal asks for something to be done rather than says
// something is so. A doing named in it does; and so does a thing standing on
// its own where a claim would go, since that is a thing to say.
function asksToAct(part, whole, world) {
  const a = world.anchors || {};
  if (!joinedWhole(part, whole)) return true;
  let found = false;
  const walk = (n) => {
    if (n.kind === 'thing' && world.isA(conceptOf(n), a.action)) found = true;
    (n.branch || []).forEach(walk);
  };
  walk(part);
  return found;
}

// The two claims of a signal that says one follows from another: what is put
// as the condition, and what follows it. That a signal may do this is the
// brain's; which words say so is the language's.
function conditionIn(root) {
  if (!hasFunction(root, 'condition')) return null;
  // What stands on either side of the words that mark a condition. A whole
  // signal, or a thing on its own — a thing put where a claim would go is the
  // thing to say, which is what `else small` says.
  const parts = (root.branch || []).filter((b) => b.kind !== 'thing');
  return parts.length >= 2 && parts.length <= 3 ? parts : null;
}

// Whether a word carrying one language-declared cognitive function stands
// anywhere in the signal. Parts of speech remain parser symbols only.
function hasFunctionAnywhere(n, wanted) {
  if (n.kind === 'thing' && functionsOf(n).includes(wanted)) return true;
  return (n.branch || []).some((b) => hasFunctionAnywhere(b, wanted));
}

// Whether one of the words standing directly here carries that function.
export function hasFunction(n, wanted) {
  return (n.branch || []).some(
    (b) => b.kind === 'thing' && functionsOf(b).includes(wanted),
  );
}

// A claim the signal speaks of rather than makes. A word may say that what
// follows is a claim and not a thing — English says `that` — and what follows
// it stands whole, the way a joined clause does.
function claimWithin(n, whole) {
  const held = whole ?? n;
  for (const b of n.branch || []) {
    if (encloses(n) && joinedWhole(b, held)) return b;
    const found = claimWithin(b, held);
    if (found) return found;
  }
  return null;
}

// Whether one of the words here says a claim follows. That a word may do that
// is the brain's; which word does it is the language's.
function encloses(n) {
  return hasFunction(n, 'encloses');
}

// The greetings in something that greets and says nothing else. A greeting may
// stand as a word among the rest, or a language may set a word between it and
// what follows and make a whole of it; neither changes that it only greets.
// What comes back is the greeting words themselves, since the wrapping a
// language put round them says nothing of its own.
export function greetsOnly(n, world, communication) {
  if (n.kind === 'thing') {
    return world.isA(conceptOf(n), communication) ? [n] : null;
  }
  if (!n.state || !n.state.whole) return null;
  const found = [];
  for (const b of n.branch || []) {
    const only = greetsOnly(b, world, communication);
    if (!only) return null;
    found.push(...only);
  }
  return found.length > 0 ? found : null;
}

// Facts offered together are one offering. The brain laid every one of them
// against the many it holds and that work stays underneath, but what it was
// handed was one thing, and one thing is what it answers: it looks through
// what it found for something standing against any of them, and finding one,
// the offering is one it will not take — no part of it, since no part of it
// was offered on its own. Finding none, it takes in the ones nothing bore on;
// finding all of them already among its facts, there was nothing to take.
function asOneOffering(offered) {
  if (offered.length === 1) return offered[0];
  const stood = offered.map((ns) => ns.find((n) => n.kind === 'standing')).filter(Boolean);
  // Something that came to no fact at all — an opinion held for whoever sent
  // it, or a refusal to hold one — was never part of an offering, and stands
  // as it was reached.
  if (stood.length !== offered.length) return offered.flat();

  const against = stood.find((n) => n.name === 'against');
  const absent = stood.find((n) => n.name === 'absent');
  // The offering is about all of them, and no one of them is what it is about.
  const { relation, negated } = stood[0].state;
  const whole = node('standing', against ? 'against' : absent ? 'absent' : 'held', stood, {
    subject: null,
    relation,
    object: null,
    negated,
  });

  const refused = offered.flatMap((ns) => ns.filter((n) => n.kind === 'refuse'));
  if (refused.length > 0) return [whole, refused[0]];
  if (against) return [whole];
  // What each fact is about comes with it. A thing made to bear one of them is
  // part of that fact, not a verdict of its own, and dropping it would leave
  // the fact pointing at nothing.
  return [
    whole,
    ...offered.flatMap((ns) => ns.filter((n) => n.kind === 'call' || n.kind === 'learn')),
  ];
}

// How many of one unit make another, where the world says so.
//
// An hour is sixty minutes and a minute sixty seconds, so an hour is what the
// two of them come to together — worked out, and never a third fact somebody
// had to write down. The world says only the steps it knows; the brain does
// the arithmetic, the same arithmetic it does for anything else.
export function unitsIn(from, to, world, seen = new Set()) {
  if (from === to) return 1;
  const a = world.anchors || {};
  // Time the brain does not have to be told. It owns the steps between the
  // units of the one scale every brain shares, and the world says only which
  // of its terms each unit is.
  const named = (id) => UNITS.find((unit) => a[unit] === id) ?? null;
  const here = named(from);
  const there = named(to);
  const ours = here != null && there != null ? stepsInTime(here, there) : null;
  if (ours != null) return ours;
  if (a.has == null || a.unit == null || seen.has(from)) return null;
  seen.add(from);
  for (const next of world.linked(from, a.has)) {
    if (!world.isA(next, a.unit)) continue;
    const many = world.held(from, a.has, next);
    if (many == null) continue;
    const rest = unitsIn(next, to, world, seen);
    if (rest == null) continue;
    return exactly((x, y) => x.multiply(y))(many, rest);
  }
  return null;
}

// Which of two amounts on one scale is the further along, whatever units they
// were told in. Put in the same unit they compare like any other two numbers;
// with no way between the units there is nothing to say.
function furtherAlong(l, r, world) {
  if (l.unit === r.unit) return numericCompare(l.amount, r.amount);
  const up = unitsIn(l.unit, r.unit, world);
  if (up != null) return numericCompare(exactly((x, y) => x.multiply(y))(l.amount, up), r.amount);
  const down = unitsIn(r.unit, l.unit, world);
  if (down != null) return numericCompare(l.amount, exactly((x, y) => x.multiply(y))(r.amount, down));
  return null;
}

// A scale is what a property takes its values on, and a value is an amount of
// a unit. Two things stand on one scale by both having been measured on it,
// and which is further along is what their amounts say — not what either of
// them has been called. An apple of ten grams is heavier than a stone of five,
// whatever anyone called either of them.
function alongScale(left, right, relation, world, on, said, graph) {
  const a = world.anchors || {};
  if (a.measure == null || left == null || right == null) return null;
  // A word may say which scale it compares on — heavier is more, on weight —
  // and then only what is measured on that scale counts.
  // A unit that measures a quantity measures anything that is one of it: a
  // second measures time, and an age is a time, so a second reads an age.
  const reads = (v) =>
    on == null ||
    world.linked(v.unit, a.measure).some((of) => of === on || world.isA(on, of));
  const lefts = valuesOn(conceptOf(left), world).filter(reads);
  const rights = valuesOn(conceptOf(right), world).filter(reads);

  const found = [];
  for (const l of lefts) {
    for (const r of rights) {
      // Five grams and five metres are not two readings of one thing. Grams
      // and kilograms are, once the world says how one stands to the other —
      // and what that comes to the brain works out rather than looks up.
      const side = furtherAlong(l, r, world);
      if (side == null || side === 0) continue;
      found.push(side > 0);
    }
  }
  // Nothing measured, and still comparable. A thing may stand on a scale in a
  // state rather than at an amount — ravi is tall, kumar is short — and the
  // world says which end of the scale each state lies at. Two at opposite ends
  // are one further along than the other, and nobody had to measure either.
  // Two at the same end say nothing: two tall people are not one taller.
  if (found.length === 0 && graph != null && on != null && a.toward != null) {
    const endOf = (of) => {
      const one = world.oneOf(of) ?? of;
      const states = unique([...(graph.howOf(of) || []), ...(graph.howOf(one) || [])])
        .filter((state) => (quantityOn(state, world) ?? null) === on);
      const ends = unique(states.map((state) => world.linked(state, a.toward)[0] ?? null));
      return ends.length === 1 ? ends[0] : null;
    };
    const near = endOf(conceptOf(left));
    const far = endOf(conceptOf(right));
    if (near != null && far != null && near !== far) found.push(near === a.more);
  }

  // Nothing measured in common, or two scales that disagree — a thing may be
  // heavier and cooler at once, and neither of those is the comparison.
  if (found.length === 0 || found.some((x) => x !== found[0])) return null;

  const holds = directionOf(relation, world, said) === a.less ? !found[0] : found[0];
  return node('standing', holds ? 'held' : 'against', [], {
    subject: conceptOf(left),
    relation,
    object: conceptOf(right),
    worked: true,
    on,
    ...wordUsed(said),
  });
}

// What was said to be the reason a claim is so.
//
// A claim is a thing the world holds, with what it is about on one side and
// what it says on the other, and one claim may be joined to another as its
// cause. Asked why a drum is cold, the brain looks for the claim that a drum
// is cold, then for whatever stands behind it, and answers with what that one
// says.
function reasonFor(subject, object, world) {
  const a = world.anchors || {};
  if (a.cause == null || a.subject == null || a.object == null) return [];
  if (subject == null || object == null) return [];
  const found = [];
  // What stands behind something that happened. A doing is already a thing the
  // world holds, so there is no claim to look for: the occurrence is looked
  // for instead, by what was done and who did it, and what causes it answers.
  if (a.agent != null && a.cause != null) {
    for (const one of world.individualsOf(object)) {
      const did = [...world.linked(one, a.agent), ...(a.target == null ? [] : world.linked(one, a.target))];
      if (!did.includes(subject)) continue;
      for (const behind of world.standing(one, a.cause)) {
        if (!found.includes(behind)) found.push(behind);
      }
    }
  }
  for (const claim of world.standing(subject, a.subject)) {
    if (!(world.related(claim, a.object) || []).includes(object)) continue;
    // What stands behind a claim is a claim, not a thing. Asked why the door
    // is open, what answers is that the wind is strong — the whole of it, and
    // not the strength on its own, which was never what was said.
    // What a claim stands on: what was said to cause it, and what it followed
    // from where the brain worked it out. Both are claims, and either answers
    // why.
    const under = [
      ...world.standing(claim, a.cause),
      ...(a.follows == null ? [] : world.linked(claim, a.follows)),
    ];
    for (const behind of under) {
      if (!found.includes(behind)) found.push(behind);
    }
  }
  return found;
}

// Which scale a word compares on, where it says so.
function onOf(n) {
  const thought = n ? thoughtOf(n) : null;
  return thought ? thought.on ?? null : null;
}

// What a thing has been measured at: an amount, and the unit it was taken in.
// A kind is measured through the one of it there is, the way any state is.
function valuesOn(term, world) {
  const a = world.anchors || {};
  if (term == null) return [];
  const one = world.oneOf(term);
  const bearer = one == null ? term : one;
  const out = [];
  // A unit is one of itself. An hour is not measured — it is what measuring is
  // done in — and it still stands on its scale, at one, which is how an hour
  // and a minute come to be comparable at all.
  if (a.unit != null && world.isA(term, a.unit)) out.push({ unit: term, amount: 1 });
  for (const unit of world.linked(bearer, a.measure)) {
    const amount = world.held(bearer, a.measure, unit);
    if (amount != null) out.push({ unit, amount });
  }
  return out;
}

// What the universe's forces do, everything physical has. Nobody has to say a
// stone is heavy for the brain to know a stone has weight: a stone is a
// physical thing, the universe holds the kind force, gravity is one, and what
// gravity causes is weight. This does not come down the ladder the way a
// kind's facts do — it comes from the universe inward.
//
// That a force reaches the physical and nothing else is the brain's: a number
// has no weight, and no world has to say so. Which forces there are, and what
// each one causes, is the world's.
function forced(thing, had, relation, world) {
  const a = world.anchors || {};
  if (
    relation !== a.has ||
    a.has == null ||
    a.universe == null ||
    a.force == null ||
    a.physical == null ||
    a.cause == null
  ) return false;
  if (!world.isA(thing, a.physical)) return false;
  // Classification alone activates nothing. The universe must hold either
  // this force itself or a kind the force belongs to. Thus `universe has
  // force` admits every declared force, while `universe has gravity` admits
  // gravity alone. Removing both removes the physical consequence.
  const held = reached(a.universe, a.has, world);
  const forces = [];
  const collect = (kind) => {
    if (forces.includes(kind)) return;
    forces.push(kind);
    for (const member of world.members(kind, world.baseRelation)) collect(member);
  };
  collect(a.force);
  return forces.some(
    (force) =>
      held.some(
        (kind) =>
          world.isA(kind, a.force, world.baseRelation) &&
          world.isA(force, kind, world.baseRelation),
      ) &&
      world.isA(force, had, a.cause),
  );
}

// The other end of a relation, where the world says one is another the other
// way round. Said once and read both ways, the way the world says two terms
// stand `different` and the brain reads that pair either way about.
function bothWays(relation, world) {
  const a = world.anchors || {};
  if (relation == null) return [];
  const ways = new Set(world.symmetric(relation) ? [relation] : []);
  if (a.converse != null) {
    for (const other of world.linked(relation, a.converse)) ways.add(other);
    for (const other of world.members(relation, a.converse)) ways.add(other);
  }
  return [...ways];
}

// Whether one thing joins another by a relation, the way a joining is read: up
// the kinds of the first, then — where the relation is a holding — on the
// bearer the brain made for whoever holds. `the basket has three apples` was
// read from the basket's bearer and the authored basket links nothing, so asks
// of the kind only answer from the bearer. A thing the bearer holds that is
// one of the object is the object itself, the same climb the count reads.
function joinsOn(from, to, rel, world) {
  const a = world.anchors || {};
  if (rel == null) return false;
  if (rel === world.baseRelation) return world.isA(from, to, rel);
  if (upward(from, world).some((rung) => world.isA(rung, to, rel))) return true;
  if (a.holding != null && (rel === a.holding || world.subrelationOf(rel, a.holding))) {
    for (const bearer of [
      from,
      ...(world.oneOf(from) == null ? [] : [world.oneOf(from)]),
      ...world.individualsOf(from),
    ]) {
      if (world.linked(bearer, rel).some((x) => world.isA(x, to))) return true;
      if (world.held(bearer, rel, to) != null) return true;
    }
  }
  return false;
}

// The relations the world says are a different one from this. Two things
// joined by one of those are not joined by this: a thing on a table is not
// under it, and that is the world's to say, not the brain's.
function apartFrom(relation, world) {
  const a = world.anchors || {};
  if (a.different == null || relation == null) return [];
  return [...world.linked(relation, a.different), ...world.members(relation, a.different)];
}

// The rungs a thing stands on: itself, then everything it is a kind of.
export function upward(id, world) {
  const seen = new Set();
  const out = [];
  const climb = (x) => {
    if (x == null || seen.has(x)) return;
    seen.add(x);
    out.push(x);
    for (const up of world.kinds(x)) climb(up);
  };
  climb(id);
  return out;
}

// Arithmetic is innate. The world says only which term names which number; what
// follows from two numbers is the brain's own, and would be the same in any
// language and any world. So this computes — it does not look anything up.
function calculate(said, at, relation, world, graph) {
  const a = world.anchors || {};

  // Two sides asked to be the same: each is worked out on its own, and what
  // the brain compares is what each came to.
  const between = said.findIndex((n) => conceptOf(n) === a.same);
  if (between >= 0) {
    const left = working(said.slice(0, between), world, true, graph);
    const right = working(said.slice(between + 1), world, true, graph);
    if (!left || !right) return null;
    return node('standing', numericEqual(left.value, right.value) ? 'held' : 'against', [], {
      subject: world.termFor(left.value),
      relation: a.same,
      object: world.termFor(right.value),
      worked: true,
    });
  }

  // A comparison put in a copular question — `is thirty minutes more than
  // ten minutes?` — does not rest on the verb that asks it: the `is` does
  // not compare, and the more or less inside does. Where the word the claim
  // rests on does not compare but a comparing word stands inside, the
  // comparison is that inner word, made the same way it would be bare.
  if (!isComparing(relation, world)) {
    const inner = said.findIndex((n) => isComparing(conceptOf(n), world));
    if (inner >= 0) {
      at = inner;
      relation = conceptOf(said[inner]);
    }
  }

  if (isComparing(relation, world)) {
    // Each side is worked out on its own, the way two sides asked to be the
    // same are: what is compared is what each side comes to, not the nearest
    // number standing in it.
    const before = working(said.slice(0, at), world, true, graph);
    const after = working(said.slice(at + 1), world, true, graph);
    const left = before ? before.value : valueBeside(said, at, -1, world);
    const right = after ? after.value : valueBeside(said, at, 1, world);
    if (left == null || right == null) {
      // The things compared, not the words joining them: `a cow is heavier than
      // a goat` names two relations and neither is one of the things.
      const thing = (n) => conceptOf(n) != null && !world.isA(conceptOf(n), a.relation);
      const leftThing = nearest(said, at, -1, thing);
      const rightThing = nearest(said, at, 1, thing);
      // A word read on several scales alike is placed by what it is said of.
      // `longer` is length and it is time; the wall and the fence stand on one
      // of those and the meeting and the concert on the other, and the two
      // things asked about are what says which was meant. Where they stand on
      // none of them, or on two that disagree, nothing is said.
      const among = (thoughtOf(said[at]) || {}).among;
      if (among && among.length > 1) {
        const placed = among
          .map((one) => alongScale(leftThing, rightThing, one.relation, world, one.on, said[at], graph))
          .filter((one) => one != null);
        // Two scales that both answer, and answer alike, are one answer; two
        // that disagree are no answer, the same way one scale's own readings
        // are. Nothing is placed by counting the readings — only by whether
        // what they come to is one thing.
        if (placed.length === 0 || placed.some((one) => one.name !== placed[0].name)) return null;
        return placed[0];
      }
      return alongScale(
        leftThing,
        rightThing,
        relation,
        world,
        onOf(said[at]),
        said[at],
        graph,
      );
    }
    // Two measures on one scale compare along it: `two hours is more than one
    // hundred minutes` is the same as saying 120 > 100, but the comparison
    // must read the unit and not just the number to get there. Where each
    // side has a unit the world can convert, furtherAlong does the work.
    const readMeasure = (slice) => {
      let unit = null;
      for (const n of slice) {
        const c = conceptOf(n);
        if (c != null && (c === a.hour || c === a.minute || c === a.second)) { unit = c; break; }
      }
      if (unit == null || a.measure == null) return null;
      if (!world.linked(unit, a.measure).length) return null;
      const value = working(slice, world, true, graph);
      if (value == null) return null;
      return { amount: value.value, unit };
    };
    const leftMeasure = readMeasure(said.slice(0, at));
    const rightMeasure = readMeasure(said.slice(at + 1));
    if (leftMeasure != null && rightMeasure != null) {
      const cmp = furtherAlong(leftMeasure, rightMeasure, world);
      if (cmp == null || cmp === 0) return null;
      const holds = directionOf(relation, world, said[at]) === a.less ? cmp < 0 : cmp > 0;
      return node('standing', holds ? 'held' : 'against', [], {
        subject: world.termFor(leftMeasure.amount),
        relation,
        object: world.termFor(rightMeasure.amount),
        worked: true,
        ...wordUsed(said[at]),
      });
    }
    const compared = numericCompare(left, right);
    if (Number.isNaN(compared)) return null;
    const holds = directionOf(relation, world, said[at]) === a.less ? compared < 0 : compared > 0;
    // The terms compared, not the numbers they name: a standing joins terms
    // wherever it comes from, and what is said back is said in words.
    return node('standing', holds ? 'held' : 'against', [], {
      subject: world.termFor(left),
      relation,
      object: world.termFor(right),
      worked: true,
      ...wordUsed(said[at]),
    });
  }

  // A doing in the signal is not a sum. `the shop sold one-fourth of the
  // apples` says something happened and says how many it happened to; working
  // the fraction out and saying thirty answers a question nobody asked, and
  // takes nothing in.
  if (said.some((n) => reaches(n, a.action, world))) return null;
  const run = working(said, world, undefined, graph);
  // An operation the brain can perform and cannot complete — nothing divides
  // seven into two whole halves — is not a claim about the two numbers. It is
  // a sum it cannot reach.
  if (run == null) {
    return operates(relation, world) == null
      ? null
      : node('sum', 'beyond', [], { left: null, right: null, value: null, term: null });
  }
  const { value, left, right } = run;
  const term = world.termFor(value);
  return node('sum', term == null ? 'beyond' : 'worked', [], { left, right, value, term });
}

// Every number and every operation in the signal, worked out.
//
// A signal may name more than one — `1 + 2 × 3` names two — and which of them
// is worked first is not the brain's to decide: the world says one operation
// comes before another, by the same `order` it puts numbers in, and where it
// says nothing they are worked from the left. What each operation does to two
// numbers is the brain's own, and would be the same in any world.
function working(said, world, alone, graph) {
  const steps = [];
  // How many of a kind this conversation holds, where it holds exactly one
  // lot of it. The graph is asked, never the world: a hundred and twenty
  // apples are this conversation's, not every apple there is.
  const countHeld = (kind) => {
    if (graph == null) return null;
    const groups = graph.graph().groups.filter(
      (one) => one.term === kind || one.made === kind || one.of === kind,
    );
    if (groups.length !== 1) return null;
    return groups[0].count ?? null;
  };
  for (const n of said) {
    const c = conceptOf(n);
    const value = numberOf(n, world);
    const group = groupOn(n);
    if (value != null) steps.push({ value });
    else if (group) steps.push({ group });
    else if (c != null && operates(c, world) != null) steps.push({ op: c });
    // A kind this conversation holds so many of stands for how many: told a
    // shop has a hundred and twenty apples, `the apples` is a hundred and
    // twenty. Only where it holds one such lot — several and there is no *the*
    // to mean — and only where something was asked to be worked, so a kind
    // named in a plain claim is still a kind.
    else if (c != null) {
      const many = countHeld(c);
      if (many != null) steps.push({ value: many, of: c });
    }
  }
  // Nothing is worked out where nothing was asked to be: a number on its own
  // is a number, not a sum.
  if (steps.length === 0) return null;
  const numbers = steps.filter((s) => s.value !== undefined).length;
  const asked = steps.some((s) => s.op !== undefined);
  // An operation may stand before what it takes as well as between — `add 1
  // with 8` is the same act as `1 + 8`. It is worked when its numbers are
  // there, and where they never come there is no sum to reach.
  if (numbers === 0) return null;
  // A number on its own is a number, not a sum — unless it is one side of
  // something asked to be the same, where what it comes to is itself.
  if (!asked) {
    const only = steps.find((s) => s.value !== undefined);
    return alone && numbers === 1 ? { value: only.value, left: only.value, right: only.value } : null;
  }

  // Worked out with what is waiting kept on one side and what is finished on
  // the other: an operation waits while a tighter one is still to come, and a
  // group holds everything until it closes.
  const done = [];
  const waiting = [];
  const fold = () => {
    const op = waiting.pop();
    if (op == null || op.group) return false;
    const { takes, work } = operates(op.op, world);
    const args = done.splice(done.length - takes, takes);
    if (args.length !== takes || args.some((v) => v === undefined)) return false;
    const worked = work(...args);
    if (worked == null) return false;
    done.push(worked);
    return true;
  };

  for (const step of steps) {
    if (step.value !== undefined) done.push(step.value);
    else if (step.group === 'open') waiting.push(step);
    else if (step.group === 'close') {
      while (waiting.length > 0 && !waiting[waiting.length - 1].group) if (!fold()) return null;
      if (waiting.pop() === undefined) return null;
    } else {
      while (waiting.length > 0 && binds(waiting[waiting.length - 1], step, world)) {
        if (!fold()) return null;
      }
      waiting.push(step);
    }
  }
  while (waiting.length > 0) if (!fold()) return null;
  if (done.length !== 1) return null;

  const values = steps.filter((s) => s.value !== undefined).map((s) => s.value);
  return { value: done[0], left: values[0], right: values[values.length - 1] };
}

// Whether the one already waiting is worked before the one just read. An
// operation does not come before itself, so equals bind left to right; a group
// waits for nothing.
function binds(waiting, step, world) {
  if (waiting.group) return false;
  // The one already waiting is worked first unless the one just read binds
  // tighter — so where the world puts neither before the other, they are
  // worked from the left.
  // Two of the same meet: the world may put an operation before itself, which
  // is how it says the one just read is worked first — `2 ^ 3 ^ 2` is 2 to the
  // ninth, not eight squared.
  const tighter =
    step.op === waiting.op
      ? world.linked(step.op, world.anchors.order).includes(step.op)
      : world.isA(step.op, waiting.op, world.anchors.order);
  return !tighter;
}

function groupOn(n) {
  const thought = n ? findBranch(n, 'thought') : null;
  return thought && thought.state.thought ? thought.state.thought.groups : null;
}

// What an operation does to the numbers it takes, and how many it takes. This
// is the brain's own and the whole of it: the world says only which term names
// which operation, and which of them is worked first.
//
// Nothing here is weighed or chosen. Each is one arithmetic act, exact for the
// numbers it is given, and where there is no answer at all — nothing over
// nothing, the root of less than nothing, the logarithm of nothing — it says
// so rather than reaching for one.
// A machine that counts in halves cannot hold a tenth, so the four operations
// that have an exact answer are worked in whole parts and not in halves: a
// tenth and two tenths make three tenths, and not something a hair beside it.
// What has no exact answer — a root, a logarithm, an angle — is worked as
// closely as the machine can and no closer.
const exactly = (work) => (x, y) => {
  try {
    return exactValue(work(new Decimal(x), new Decimal(y)));
  } catch {
    return null;
  }
};

const OPERATIONS = [
  ['plus', 2, exactly((x, y) => x.add(y))],
  ['minus', 2, exactly((x, y) => x.subtract(y))],
  ['times', 2, exactly((x, y) => x.multiply(y))],
  ['divide', 2, (x, y) => (numericEqual(y, 0) ? null : exactly((a, b) => a.divide(b))(x, y))],
  ['power', 2, (x, y) => finite(Number(x) ** Number(y))],
  ['remainder', 2, (x, y) => (numericEqual(y, 0) ? null : exactly((a, b) => a.modulo(b))(x, y))],
  ['root', 1, (x) => (numericCompare(x, 0) < 0 ? null : Math.sqrt(Number(x)))],
  ['logarithm', 1, (x) => (numericCompare(x, 0) > 0 ? Math.log10(Number(x)) : null)],
  ['natural-logarithm', 1, (x) => (numericCompare(x, 0) > 0 ? Math.log(Number(x)) : null)],
  ['sine', 1, (x) => Math.sin(Number(x))],
  ['cosine', 1, (x) => Math.cos(Number(x))],
  ['tangent', 1, (x) => finite(Math.tan(Number(x)))],
  ['magnitude', 1, (x) => whole((d) => d.abs(), x)],
  ['double', 1, (x) => whole((d) => d.multiply(2), x)],
  ['halve', 1, (x) => whole((d) => d.divide(2), x)],
];

export function exactValue(value) {
  const text = value.toString();
  if (!text.includes('.')) {
    // Not every decimal is an integer the machine can reach: something read
    // off a chained operation may be so large it falls back to exponent
    // notation, and that is no integer at all. Where there is no integer
    // there is no exact value, so it is refused rather than raised.
    let integer;
    try {
      integer = BigInt(text);
    } catch {
      return null;
    }
    if (integer >= BigInt(Number.MIN_SAFE_INTEGER) && integer <= BigInt(Number.MAX_SAFE_INTEGER)) {
      return Number(integer);
    }
  }
  return text;
}

function numericEqual(left, right) {
  try { return new Decimal(left).equals(new Decimal(right)); } catch { return false; }
}

function finite(value) {
  return Number.isFinite(value) ? value : null;
}

function operates(term, world) {
  const a = world.anchors || {};
  for (const [name, takes, work] of OPERATIONS) {
    if (term != null && term === a[name]) return { takes, work };
  }
  // So many parts of so many. Which fractions a world names is its own — a
  // half, a quarter, three-fifths — and what a fraction *is* is the brain's:
  // the parts it takes over the whole it takes them from. Nothing here knows
  // any fraction by name, and one the world has not named is not one.
  const over = fractionOf(term, world);
  if (over != null) {
    return { takes: 1, work: (x) => exactly((v) => v.multiply(over.parts).divide(over.whole))(x, x) };
  }
  return null;
}

// The parts and the whole of a fraction, where the world holds the term as one
// and says both as numbers it can read.
function fractionOf(term, world) {
  const a = world.anchors || {};
  if (term == null || a.fraction == null || a.parts == null || a.whole == null) return null;
  if (!world.isA(term, a.fraction)) return null;
  const parts = world.valueOf(world.linked(term, a.parts)[0]);
  const whole = world.valueOf(world.linked(term, a.whole)[0]);
  if (parts == null || whole == null || numericEqual(whole, 0)) return null;
  return { parts, whole };
}

function valueBeside(said, from, step, world) {
  const n = nearest(said, from, step, (t) => numberOf(t, world) != null);
  return n ? numberOf(n, world) : null;
}

// The thing that bears the state: the one of this kind already spoken of, or a
// new one. A kind holds nothing — only something that exists once does.
// `the` accommodates where nothing is yet: making one is not picking, where
// there is nothing to pick between. Several, and there is no *the* to mean.
function bearerOf(kind, world, mark, allocate) {
  if (world.isIndividual(kind)) return { id: kind, made: false };
  if (mark === 'new') return { id: allocate(), of: kind, made: true };
  const one = world.oneOf(kind);
  if (mark === 'known') {
    if (one != null) return { id: one, made: false };
    if (world.individualsOf(kind).length === 0) return { id: allocate(), of: kind, made: true };
    return null;
  }
  if (one != null) return { id: one, made: false };
  return { id: allocate(), of: kind, made: true };
}

// Whatever else fits, the brain does not hand back what the world calls bad.
// It owns the walk and the veto; the world owns what is bad — a world that says
// nothing is bad has nothing here to refuse. Nothing is weighed and nothing is
// compared: a term either reaches the pole or it does not, so this is a filter
// and never a preference. There is no walk toward `good`, because a brain that
// went looking for it would be choosing.
function harms(term, world, seen = new Set()) {
  const bad = world && world.anchors ? world.anchors.bad : null;
  if (term == null || bad == null || seen.has(term)) return false;
  seen.add(term);
  if (world.isA(term, bad)) return true;
  const cause = world.anchors.cause;
  return world.linked(term, cause).some((c) => harms(c, world, seen));
}

// Whether a term stands at a pole. Which terms do is the world's to say, and a
// world that puts nothing at either pole holds no opinions.
function valenced(term, world) {
  const a = world.anchors || {};
  return world.isA(term, a.good) || world.isA(term, a.bad);
}

// The `neither` term is never a doer: it drops from the parts, and a lone
// target left agentless by inversion (`neither did theo`) is the new agent.
function demoteNeither(stood, a) {
  const fallen = stood.filter((p) => p.of !== a.neither);
  if (fallen.some((p) => p.role === a.agent)) return fallen;
  const alone = fallen.filter((p) => p.role === a.target);
  if (alone.length === 1) return [{ ...alone[0], role: a.agent }];
  return fallen;
}

function missingFrom(event, stood, world) {
  if (event == null || !world) return [];
  const a = world.anchors || {};
  const has = new Set(stood.map((p) => p.role));
  const out = [];
  for (const role of [a.agent, a.target, a.source, a.destination, a.instrument]) {
    if (role == null || has.has(role)) continue;
    const [of] = world.linked(event, role);
    if (of != null) out.push({ role, of, amount: null });
  }
  return out;
}

// Carrying out an action on what a thing holds. The world links an action to
// the operation it causes; the brain works the operation and keeps the result.
function act(said, claims, world, side, sides, allocate, graph) {
  const a = world.anchors || {};
  const acting = doingIn(said, world);
  // A signal may name what was done, or name the operation itself: `give one
  // spoon to it` and `add one spoon into it` come to the same change in what a
  // thing holds, and only one of them has anyone doing it.
  const named = acting >= 0 ? acting : said.findIndex((n) => operated(conceptOf(n), world));
  if (named < 0) return null;

  const joints = [];
  const stood = rolesIn(said, named, claims, world, side, sides, joints, graph);
  // Agreement with a denial (`neither did theo`): the `neither` term is never
  // a doer — it drops out, and a lone target left without an agent is the new
  // agent by inversion. Elsewhere the term claims like any other.
  const echo = a.neither != null && said.some((n, i) => i !== named && conceptOf(n) === a.neither);
  const parties = echo ? demoteNeither(stood, a) : stood;
  if (parties.length === 0 && markOn(said[named]) !== 'prior') return null;
  // Doing again takes what the last doing took, all but who newly does it:
  // unspoken parts ride over from the latest occurrence of the same action,
  // and only what the signal names is its own.
  const stoodWith =
    markOn(said[named]) === 'prior'
      ? [...parties, ...missingFrom(priorEvent(conceptOf(said[named]), world), parties, world)]
      : parties;
  if (stoodWith.length === 0) return null;

  // A thing spoken of as one of its kind — `a movie` — is one movie and not
  // movies. Where someone did something to it, that one is made: what happened
  // happened to it and not to the kind, and the signal after this one has
  // something to point back at. Told only that an operation was worked, nobody
  // did anything to anyone, and nothing is made.
  const called = [];
  const parts = (acting < 0
    ? stoodWith
    : stoodWith.map((p) => {
        if (p.of == null || world.isIndividual(p.of)) return p;
        // A doing brought in as a thing is one that happened, and one that
        // happened is one occurrence. `the backup started` is that backup and
        // not backups, so it is made the same way a thing spoken of as one of
        // its kind is — and what was said of it before is said of the same
        // one, so a backup this conversation has already met is reached rather
        // than made twice.
        const happening =
          (p.mark === 'new' || p.mark === 'known') &&
          a.action != null &&
          world.isA(p.of, a.action) &&
          p.of !== conceptOf(said[named]);
        if (!happening && (p.mark !== 'new' || !world.isA(p.of, a.thing))) return p;
        const met = happening && p.mark === 'known' ? world.oneOf(p.of) : null;
        if (met != null) return { ...p, of: met, kind: p.of };
        const id = allocate();
        const name = `${world.term(p.of).name}#${id}`;
        called.push(node('call', name, [], { name, id, of: p.of, made: true }));
        // What kind the one made is one of. The world does not hold it yet —
        // it is being made here — so the only place to read it off is the
        // making, and one of a kind handed over is one of that kind.
        return { ...p, of: id, kind: p.of };
      })
  // How a thing was marked is a fact about the word, not about the part it
  // played: what is kept is the role, the thing, how much of it, and what it
  // is one of where the signal made it.
  ).map(({ role, of, amount, kind }) => ({ role, of, amount, kind }));

  const action = conceptOf(said[named]);
  // Refused before anything is worked out: what harms did not happen, and it
  // does not go on the record as having happened.
  if (harms(action, world)) return [node('refuse', 'harm', [], { action })];

  // An act of saying says what it was given to say. Nothing is worked out and
  // nothing is looked up: what the brain answers with is the thing it was told
  // to say.
  if (world.isA(action, a.communication) && !parts.some((p) => p.role === a.agent)) {
    const said = parts.find((p) => p.role === a.target && !world.isA(p.of, a.action));
    if (said) {
      return [node('answer', 'link', [], { subject: null, relation: null, found: [said.of] })];
    }
  }

  const at = world.now();
  const worked = work(action, parts, at, world, allocate, graph);
  const left = brought(action, parts, world);
  // Nobody did an operation a signal named outright. Nothing happened to
  // anyone — only what a thing holds coming to something else — so there is
  // nothing that happened to put on the record.
  if (acting < 0) return worked;

  const happened = allocate();

  // What happened is a thing that happened once: it is of its kind, it has the
  // parts things played in it, and it has a moment. Nothing new was needed to
  // hold it — an event is an individual like any other. Denied or echoed, it
  // goes on the record as not having happened: agreement with a denial is a
  // denial of its own.
  const denied = said.some(negatesOn) || (a.neither != null && said.some((n, i) => i !== named && conceptOf(n) === a.neither));
  // A measure of time standing with a doing is *when* it happened, never what
  // it happened to. Arriving at eight hours is not arriving at an hour the way
  // one arrives at a station, and holding it as a part left two arrivals with
  // nothing to compare and no way to say which came first.
  //
  // The brain reads no word for it: the world says an hour measures time, and
  // that is the whole of how it knows.
  // Unless the doing is itself a measuring. A clock reading ten hours has the
  // ten hours as what it read, not as when it read it.
  const measuring = a.measure != null && (action === a.measure || world.isA(action, a.measure));
  const timely = (part) =>
    !measuring &&
    a.time != null &&
    // A measure of time standing with a doing — eight hours — or a time
    // itself: yesterday is when somebody arrived, never what they arrived at.
    ((a.unit != null &&
      part.amount != null &&
      world.isA(part.of, a.unit) &&
      (world.related(part.of, a.measure) || []).includes(a.time)) ||
      world.isA(part.of, a.time));
  // How much of a time — eight hours — is a reading of the clock. A time
  // itself — yesterday — is when it happened, and the doing holds it the same
  // way it holds which side of now it was on.
  //
  // Where a doing carries more than one amount of time — ten hours and
  // fifteen minutes — it is one reading, not two: both are the same scale, the
  // smaller subdivided, so they join into the smallest of them, the way the
  // clock's reading is said. A single amount stands as it was said.
  const clockParts = parts.filter((p) => timely(p) && p.amount != null);
  const time = (() => {
    if (clockParts.length === 0) return null;
    if (clockParts.length === 1) {
      const one = clockParts[0];
      return { amount: Number(one.amount), unit: one.of };
    }
    const scale = (term) => {
      const unit = UNITS.find((name) => a[name] === term);
      const at = unit == null ? -1 : UNITS.indexOf(unit);
      return at < 0 ? -1 : at;
    };
    const target = clockParts.reduce((w, p) => (scale(p.of) < scale(w.of) ? p : w), clockParts[0]);
    const halves = clockParts.map((p) => {
      const many = unitsIn(p.of, target.of, world);
      return many == null ? null : Number(many) * Number(p.amount);
    });
    // A scale with no way between two of its units never joins; the first of
    // them is all there is to say.
    if (halves.some((v) => v == null)) {
      const one = clockParts[0];
      return { amount: Number(one.amount), unit: one.of };
    }
    return { amount: halves.reduce((sum, v) => sum + v, 0), unit: target.of };
  })();
  // A phrase pointing at a time says when the doing was, whatever word opened
  // it: in the evening and on monday are both whens, and the preposition is
  // the language's business. So a joint whose far end is a time is not a place
  // the doing stood in.
  const whenJoint = (j) => !measuring && a.time != null && world.isA(j.of, a.time);
  const times = [
    ...parts.filter((p) => timely(p) && p.amount == null).map((p) => p.of),
    ...joints.filter(whenJoint).map((j) => j.of),
  ];
  const event = node('event', `${world.term(action).name}#${happened}`, [], {
    id: happened,
    action,
    at,
    when: whenIn(said, world),
    ...(time ? { time } : {}),
    ...(times.length > 0 ? { times } : {}),
    not: denied,
    parts: parts.filter((part) => !timely(part)),
    // Where it was, when it was, whatever else was said of it. Each of these
    // is an ordinary fact with the doing itself at the near end — the doing
    // holds them, and holding them is all an event is.
    ...(joints.some((j) => !whenJoint(j)) ? { joints: joints.filter((j) => !whenJoint(j)) } : {}),
  });

  // Where a doing stood is where whoever did it stood: a tree that fell on the
  // road is on the road, and somebody who lives in a city is in it. The doing
  // holds the same fact rather than a second copy of it.
  const playing = (role) => parts.filter((p) => p.role === role && p.of != null);
  const doers = playing(a.agent).length > 0 ? playing(a.agent) : playing(a.target);
  // A doing inside something that happened is not a doing somewhere: nobody
  // stands inside a meeting. Whoever took part is a member of it, and that is
  // the graph's to write.
  const inHappening = (j) => a.event != null && world.isA(j.of, a.event);
  const placed = joints
    .filter((j) => !whenJoint(j) && !inHappening(j))
    .flatMap((j) =>
      doers.map((doer) =>
        node('learn', 'link', [], {
          subject: doer.of,
          relation: j.relation,
          object: j.of,
          quantity: null,
          made: null,
          not: denied,
        }),
      ),
    );

  // What the brain refuses did not happen, and it does not go on the record as
  // having happened. Where it simply cannot tell what followed, the event
  // stands: it was told something occurred, and that much is so.
  if (worked && worked.some((n) => n.kind === 'refuse')) return worked;
  return [...called, event, ...placed, ...(worked || []), ...left];
}

// The operation a term is, where it is one at all. The world says which
// actions cause which; this is the operation named outright.
function operated(term, world) {
  const a = world.anchors || {};
  return term != null && (term === a.plus || term === a.minus) ? term : null;
}

// Which thing played which part. A word may say so — `from` makes a source —
// and that is the language's to decide. What it does not say, the brain reads
// off the order things were perceived in: before the action is who did it,
// after it is what was done.
function rolesIn(said, acting, claims, world, side, sides, joints, graph) {
  const a = world.anchors || {};
  // How many of them there are stands between the word saying which part this
  // is and the thing itself — `into three pieces` — and a count is not another
  // part. Nor is a word saying how they are, so the reach steps over both.
  const between = (n) =>
    amountOf(n, world) != null ||
    numberOf(n, world) != null ||
    describing(world)(n);
  const of = (i) => markerFor(said, i, side, roleOn, between);
  const parts = [];
  const taken = new Set();

  said.forEach((n, i) => {
    if (i === acting || !claims(n) || isDeterminer(said, i, world)) return;
    // A word marking an extreme plays no part in the doing: it says which of
    // them is being asked after, not who did it. Nor does a greeting: an act
    // of communication is no thing, so there is nothing there for a doing to
    // be done to — `hi hi` is two greetings, not one greeting greeting the
    // other.
    if (functionsOf(n).includes('extreme') || greetsHere(n, world)) return;
    if (i !== acting && bareHappening(n, world)) return;
    const named = roleOn(of(i));
    if (!named || a[named] == null) return;
    parts.push({
      role: a[named],
      of: conceptOf(n),
      amount: amountOf(n, world) ?? fractionAmount(said, i, world, graph),
      mark: markAt(n),
      at: i,
    });
    taken.add(i);
  });

  // A relation word standing after the doing plays no part in it. It opens a
  // phrase — on the road, in the evening — and what follows is that phrase's
  // far end, not the doing's. The doing carries the phrase; the phrase does
  // not stand in place of the doing. A word already spoken for names a part
  // and is left alone.
  // A doing the world says brings a relation about ends somewhere: `put it on
  // the table` says where the thing came to rest, not where the putting was.
  // There the phrase is the doing's own far end and not a word about it. A
  // doing that brings a way to stand about — opening brings being opened —
  // ends nowhere, and the phrase qualifies it like any other.
  const brings = acting >= 0 && bringsRelation(conceptOf(said[acting]), world) != null;

  const jointed = new Set();
  if (joints && a.relation != null && !brings) {
    said.forEach((n, i) => {
      if (i <= acting || taken.has(i) || !reaches(n, a.relation, world)) return;
      // The nearest thing after it, and no further: the phrase ends where the
      // next one begins, so two phrases in a row do not both reach the last
      // thing said.
      let far = -1;
      for (let j = i + 1; j < said.length && far < 0; j += 1) {
        if (reaches(said[j], a.relation, world)) break;
        if (conceptOf(said[j]) == null) continue;
        if (isDeterminer(said, j, world) || taken.has(j) || jointed.has(j)) continue;
        far = j;
      }
      if (far < 0) return;
      jointed.add(i);
      jointed.add(far);
      joints.push({ relation: conceptOf(n), of: conceptOf(said[far]), at: i });
    });
  }

  // What no word says, the brain reads off the order things were perceived in —
  // but which side of the action is the doer is word order, and word order is
  // the language's. Told nothing, the brain assigns no part by order at all.
  said.forEach((n, i) => {
    if (jointed.has(i)) return;
    if (i === acting || taken.has(i) || !claims(n) || isDeterminer(said, i, world) || !sides) return;
    if (functionsOf(n).includes('extreme') || greetsHere(n, world)) return;
    if (i !== acting && bareHappening(n, world)) return;
    const role = a[i < acting ? sides.before : sides.after];
    if (role != null) parts.push({ role, of: conceptOf(n), amount: amountOf(n, world), mark: markAt(n), at: i });
  });

  return parts.sort((x, y) => x.at - y.at).map(({ role, of, amount, mark }) => ({ role, of, amount, mark }));
}

// How many of this thing the signal counted, as a number.
function amountOf(n, world) {
  return world.valueOf(quantityTerm(n));
}

// How many a part names, where a fraction says it: `one-fourth of the apples`
// is a quarter of however many apples this conversation holds. The fraction
// says which part of a whole, the conversation says what the whole is, and
// neither is guessed.
function fractionAmount(said, at, world, graph) {
  const a = world.anchors || {};
  if (graph == null || a.fraction == null) return null;
  const thing = conceptOf(said[at]);
  if (thing == null) return null;
  for (let i = at - 1; i >= 0; i -= 1) {
    const of = conceptOf(said[i]);
    if (of == null) continue;
    const over = fractionOf(of, world);
    if (over == null) {
      // Only what stands between a fraction and its thing may be stepped over
      // — the word that joins them, and nothing that names another thing.
      if (a.relation != null && world.isA(of, a.relation)) continue;
      return null;
    }
    const groups = graph.graph().groups.filter(
      (one) => one.term === thing || one.made === thing || one.of === thing,
    );
    if (groups.length !== 1 || groups[0].count == null) return null;
    return exactly((v) => v.multiply(over.parts).divide(over.whole))(groups[0].count, 0);
  }
  return null;
}

// An action the world says causes an operation, worked on what a thing holds.
// Which thing that is comes from the parts: taking draws from its source,
// giving adds to its destination, and the amount is what the target counted.
export function work(action, parts, at, world, allocate, graph) {
  const a = world.anchors || {};
  // The world says which action causes which operation; where the signal named
  // the operation itself there is nothing to look up.
  const causes = world.linked(action, a.cause);
  const stated = causes.filter((c) => c === a.plus || c === a.minus);
  // One thing passing between two is two changes, not one: it leaves where it
  // came from and arrives where it went. The world says which operations an
  // action causes and the brain works every one of them, each at the end its
  // operation belongs to — what is added arrives at a destination, what is
  // taken away leaves a source. Nothing here knows what giving is.
  const operations = stated.length > 0 ? stated : [operated(action, world)].filter(Boolean);
  if (operations.length === 0) return null;

  const target = parts.find((p) => p.role === a.target);
  if (!target) return null;
  // A thing handed over with no number said is one thing. `a key` is one key,
  // and the one made to stand for it is one of its kind — so what passes is
  // one of that kind, counted the way any other count is.
  const one = target.amount != null
    ? null
    : target.kind ?? (world.isIndividual(target.of)
      ? world.linked(target.of, world.baseRelation)[0] ?? null
      // Spoken of as the one of its kind — `the key` — it is still one key,
      // and one of a kind is what passes.
      : target.of);
  const passed = one ?? target.of;
  const amount = target.amount ?? (one == null ? null : 1);
  if (amount == null) return null;
  // A part spoken of as one of its kind is answered by the one of it there is.
  const bearerOf = (part) => world.oneOf(part.of) ?? part.of;

  // One kind of holding passes. What Ravi *had*, Sam now *has* — the thing
  // moved, not the way of speaking about it — so whichever narrower word the
  // count was already written under at either end is the word it is written
  // under at both. Where neither end has been spoken of, what passed between
  // two of them is had: a key handed over is one the other has, and writing it
  // under a word nobody asks by would be keeping it where it cannot be found.
  const ways = world.narrower(a.holding).filter((rel) => rel !== a.holding);
  const kept =
    ways.find((rel) => parts.some((p) => world.held(bearerOf(p), rel, passed) != null)) ?? a.has;

  const out = [];
  for (const op of operations) {
    const wanted = op === a.plus ? a.destination : a.source;
    // An action may say that the part it goes to, or comes from, is one already
    // named: what a get goes to is whoever did it, and what a give comes from
    // is whoever gives it. No signal has to say that twice, and which actions
    // are like that is the world's to say, not the brain's — it reads the role
    // off the action the same way it reads the operation off it.
    const also = world.linked(action, wanted);
    const place =
      parts.find((p) => p.role === wanted) ?? parts.find((p) => also.includes(p.role));
    if (!place) continue;

    const bearer = bearerOf(place);
    const before = world.held(bearer, kept, passed);
    // What passes between two ends is watched passing, so what arrived is what
    // this end holds even though nothing said what it held before — the way
    // anyone follows a thing going from one hand to another. Told later that
    // it held more all along, the count is revised like any other.
    //
    // A lone adding is not that. Nothing left anywhere, so nothing was watched
    // arriving, and a holding nobody has said anything about stays unsaid.
    // Nor can anything be taken from one, whichever way the action runs.
    const passing = operations.length > 1;
    const from = before ?? (op === a.plus && passing ? 0 : null);
    if (from == null) continue;

    const after = op === a.plus ? from + amount : from - amount;
    const term = world.termFor(after);
    const done = node('did', world.term(action).name, [], {
      action,
      operation: op,
      holder: bearer,
      thing: passed,
      before: from,
      amount,
      after,
      term,
    });
    // The step, kept where the steps are kept. What it came to was never told
    // — nobody said ninety — so it is no fact, and it still has to stand
    // somewhere while the next question asks about it. A step says what it was
    // worked from, so the chain reads back to what was actually said.
    if (graph != null && graph.worked && term != null) {
      const started = graph.worked.latest(bearer, passed);
      if (started == null && from != null) {
        // Told how many, or none because nobody said any: the two are not the
        // same and the step says which it was.
        const how = world.held(bearer, kept, passed) == null ? NONE : TOLD;
        graph.worked.put(how, { holder: bearer, thing: passed, value: from, from: [] });
      }
      const was = graph.worked.latest(bearer, passed);
      graph.worked.put(MOVED, {
        holder: bearer,
        thing: passed,
        value: after,
        amount,
        by: action,
        from: was ? [was.id] : [],
      });
    }
    // A state the world cannot name is not a state the brain will hold. Taking
    // more than is there leaves what was there untouched.
    if (term == null) {
      out.push(done, node('refuse', 'beyond', [], { after }));
      continue;
    }
    // What it holds is a thing of its own, so the new count goes on that
    // thing — the one it already holds where there is one, and a new one where
    // what arrived is the first of its kind here.
    const madeHere = [];
    let of = world
      .linked(bearer, kept)
      .find((held) => world.isIndividual(held) && world.isA(held, passed));
    if (of == null) {
      if (allocate == null) continue;
      const id = allocate();
      const name = `${world.term(passed).name}#${id}`;
      madeHere.push(node('call', name, [], { name, id, of: passed, made: true }));
      of = id;
    }
    out.push(
      done,
      ...madeHere,
      node('learn', 'link', [], {
        subject: bearer,
        relation: kept,
        object: of,
        quantity: after,
        not: false,
      }),
    );
  }
  return out.length > 0 ? out : null;
}

// Which thing in the signal names the relation being spoken of.
//
// A term may be a relation and still be what a claim is *about* — "gravity is a
// force" names three relations and only one of them is the claim. So a relation
// only counts as the claim when there is something on each side of it for it to
// hold between. Where the signal has a hole, that requirement is dropped: a
// question may put its hole anywhere, including before everything else.
//
// `is` is the weakest claim a signal can make, so any other relation named takes
// it.
function namedRelation(said, world, claims, asking) {
  const a = world.anchors || {};
  let fallback = -1;
  let worked = -1;
  for (let i = 0; i < said.length; i += 1) {
    if (!reaches(said[i], a.relation, world)) continue;
    // A word that names a kind of thing as well as a relation is the thing,
    // unless `of` after it says which of the two is meant: `two sisters`
    // counts sisters, `the sister of maya` names sisterhood.
    // A word marking an extreme names an ordering but never joins on it: it
    // asks for the far end of that ordering instead.
    if (functionsOf(said[i]).includes('extreme')) continue;
    const kindToo = a.thing != null && world.isA(conceptOf(said[i]), a.thing);
    const ofAfter =
      said[i + 1] != null &&
      (conceptOf(said[i + 1]) === a.has || conceptOf(said[i + 1]) === a.hold);
    if (kindToo && !ofAfter) continue;
    // An operation is worked out, not joined across: in `1+1 > 1` the joint is
    // the comparing, and the adding is one of the sides being compared. Where
    // nothing else joins, the operation is all there is — and standing before
    // everything it takes, it is not a joint at all but a thing being done.
    if (operates(conceptOf(said[i]), world) != null) {
      if (worked < 0 && nearest(said, i, -1, claims)) worked = i;
      continue;
    }
    // `of` after a bare operation is its syntax, not a joint: `half of 10`
    // works the operation out rather than joining the operation to ten.
    // Anything else standing before the `of` keeps it a joint.
    if (conceptOf(said[i]) === a.has || conceptOf(said[i]) === a.hold) {
      const back = nearest(said, i, -1, claims);
      if (back && operates(conceptOf(back), world) != null && !nearest(said, said.indexOf(back), -1, claims)) {
        continue;
      }
    }
    // Something on each side for it to hold between — or, where a signal turns
    // its joint to the front, two things after it and none before, which is
    // the same claim said the other way round. The weakest claim never joins
    // where a doing stands after it: `i will go` is going, not being.
    const ahead = said.filter((n, j) => j > i && claims(n)).length;
    const behind = nearest(said, i, -1, claims);
    if (!asking && !(behind && nearest(said, i, 1, claims)) && !(!behind && ahead >= 2)) continue;

    if (conceptOf(said[i]) !== world.baseRelation) return i;
    // A tensed `be` never joins where a doing stands after it: `i will go`
    // is going, not being. Plain `be` still joins. Which words carry time
    // is the language's (`when`); that time decides joints is the brain's.
    const tensed = (() => {
      const t = findBranch(said[i], 'thought');
      return t && t.state.thought ? t.state.thought.when : null;
    })();
    const doingAfter =
      tensed != null && said.slice(i + 1).some((n) => claims(n) && reaches(n, a.action, world));
    if (doingAfter) continue;
    if (fallback < 0) fallback = i;
  }
  return fallback >= 0 ? fallback : worked;
}

// The nearest thing to one side that answers to a test.
function nearest(said, from, step, wanted) {
  for (let i = from + step; i >= 0 && i < said.length; i += step) {
    if (wanted(said[i])) return said[i];
  }
  return null;
}

// A stand-in thing for re-offering a focused idea as fact: what the idea was
// about, thinking-shaped, so the fact machinery reads it exactly as told.
function pseudoTerm(concept) {
  const n = node('thing', 'ellipsis', [], { exists: true });
  return withBranch(n, [
    node('thought', 'understood', [], {
      thought: {
        language: null,
        wordKnown: true,
        pos: null,
        meaning: null,
        concept,
        value: null,
        marks: null,
        negates: false,
        choice: false,
        role: null,
        when: null,
        names: null,
        figures: false,
        on: null,
        groups: null,
        person: null,
        number: null,
        functions: null,
      },
    }),
  ]);
}

// Which leaves of a determiner-headed phrase only restrict its head (`the`
// and `blue` in `the blue one is warm`, `the` and `biggest` in `the biggest
// wren eats trout`). The head is an ellipsis pronoun settled from several
// readings, or a plain referent. Middles must all carry the language-declared
// modifier function — a join between them is togetherness, and each joined
// side still claims on its own.
function restrictedIn(root, world) {
  const restricted = new Set();
  const narrowing = new Map();
  const a = (world && world.anchors) || {};
  // A phrase headed by a word saying which one, or by one saying how many:
  // both leave what follows narrowing the head rather than claiming for
  // itself — `the blue one`, `four big balls`. That a number does this is the
  // world's to say; the brain asks whether the word names a number and never
  // how it is spelled.
  const headsPhrase = (n) =>
    functionsOf(n).includes('determiner') ||
    (world != null && a.number != null && world.isA(conceptOf(n), a.number));
  const walk = (n) => {
    if (n.state && n.state.referent) {
      const kids = (n.branch || []).filter((b) => b.kind === 'thing');
      if (kids.length > 2 && headsPhrase(kids[0])) {
        const head = kids[kids.length - 1];
        const t = head ? findBranch(head, 'thought') : null;
        const thought = t ? t.state.thought : null;
        const isContextualPointer =
          thought &&
          thought.marks === 'spoken' &&
          t.state.contextual === true;
        const middles = kids.slice(1, -1);
        const headConcept = conceptOf(head);
        // Neither a time nor a joint is a thing to be described. `a hall in
        // the evening` is not a kind of evening with a hall about it, nor a
        // kind of `in`: the phrase ends at the joint, and the evening says
        // when.
        const timely =
          world != null &&
          ((a.time != null && world.isA(headConcept, a.time)) ||
            (a.relation != null && world.isA(headConcept, a.relation)));
        const isReferent = headConcept != null || findBranch(head, 'call') != null;
        const describing = middles.every((k) => functionsOf(k).includes('modifier'));
        if (!timely && (isContextualPointer || isReferent) && describing) {
          middles.forEach((k) => restricted.add(k));
          if (middles.length > 0) narrowing.set(head, middles);
        }
      }
    }
    (n.branch || []).forEach(walk);
  };
  walk(root);
  restricted.narrowing = narrowing;
  return restricted;
}

// How much of a kind one occurrence carried: the latest stamped amount on a
// matching target link. Individuals pin the occurrence down (who did it must
// have done it); kinds only say what was carried. Only whole numbers count;
// anything else is nothing to count.
function occurrenceAmount(world, action, parts, kind) {
  if (action == null || !world) return null;
  const a = world.anchors || {};
  const pins = parts.filter((p) => p.of != null && world.isIndividual(p.of));
  const plays = (one, p) =>
    world.linked(one, p.role).some((t) => t === p.of || world.isA(t, p.of));
  let amount = null;
  for (const one of world.members(action, world.baseRelation)) {
    if (!world.isIndividual(one)) continue;
    if (world.denies(one, action, world.baseRelation)) continue;
    if (!pins.every((p) => plays(one, p))) continue;
    for (const t of world.linked(one, a.target)) {
      if (!world.isA(t, kind)) continue;
      const over = world
        .heldOver(one, a.target, t)
        .filter((h) => Number.isInteger(h.quantity))
        .map((h) => h.quantity);
      if (over.length > 0) amount = over[over.length - 1];
    }
  }
  return amount;
}

// A possessive determining a head noun (`my` before `cat`) marks whose and
// never offers, answers, or plays alongside — its head speaks for it.
// Standing as the phrase's own head (`its`, `the film's` before the joint)
// it stays: something must say whose the telling is about.
// A doing-word may say what is happening, or name a happening. `happen` says
// something took place; `the meeting` is one that did, spoken of as a thing.
// What tells them apart is whether the signal points at it: a word a
// determiner brings in is one this conversation is speaking of, and what is
// said *of* it is the doing.
// A word that says only that something took place. It names no part of what
// happened and plays none: `the crash happened` is one crash and nobody else
// in it.
function bareHappening(n, world) {
  const a = world.anchors || {};
  return a.happen != null && conceptOf(n) === a.happen;
}

function broughtInAsThing(said, i) {
  const before = said[i - 1];
  return before != null && functionsOf(before).includes('determiner');
}

// Which word says what happened. Every reading that looks for a doing asks
// here, so a happening spoken of is never mistaken for the doing in one
// reading and not another. Where the signal names nothing but happenings
// spoken of, the first of them stands as it always did.
export function doingIn(said, world) {
  const a = world.anchors || {};
  let spoken = -1;
  let bare = -1;
  for (let i = 0; i < said.length; i += 1) {
    if (!reaches(said[i], a.action, world)) continue;
    // A word that says only that something took place leaves what took place
    // still to be named. `the crash happened` is the crash; `what happened
    // first` has nothing else it could be, and then it stands as the doing.
    if (a.happen != null && conceptOf(said[i]) === a.happen) {
      // And it hands the doing to what took place, whatever the signal goes on
      // to name: `the crash happened two hours after the server started` is
      // the crash, and the starting is what the phrase after it counts from.
      if (spoken >= 0) return spoken;
      if (bare < 0) bare = i;
      continue;
    }
    if (broughtInAsThing(said, i)) {
      if (spoken < 0) spoken = i;
      continue;
    }
    return i;
  }
  return spoken >= 0 ? spoken : bare;
}

export function isDeterminer(said, i, world) {
  if (!said || i < 0 || !said[i]) return false;
  if (!functionsOf(said[i]).includes('possessor')) return false;
  const a = world ? world.anchors || {} : {};
  return said.slice(i + 1).some((m) => {
    const c = conceptOf(m);
    if (c != null && world && world.isA(c, a.thing)) return true;
    // Made in this very signal, the world does not know it yet: its call
    // node says what kind it was made as — anything but the bare fallback,
    // which names rather than heads.
    const call = findBranch(m, 'call');
    const of = call ? call.state.of : null;
    return of != null && of !== a.thing && world && world.isA(of, a.thing);
  });
}

// Whether something a signal names ever happened. Every part it names must be
// played by the same one occurrence — one played by a thing of a kind answers
// to the kind, the same way a hole's does. A signal naming no part at all asks
// nothing the brain can look for.
function happened(said, world, claims, side, sides, graph) {
  const a = world.anchors || {};
  const acting = doingIn(said, world);
  if (acting < 0) return null;
  const parts = rolesIn(said, acting, claims, world, side, sides, null, graph).filter((p) => p.of != null);
  const action = conceptOf(said[acting]);
  // A happening the signal speaks of is asked after by name, and names no part
  // of itself: `did the meeting happen?` is about the meeting and nobody in
  // it. One on the record and not denied is the whole of the answer.
  if (parts.length === 0) {
    if (!broughtInAsThing(said, acting)) return null;
    // Only where the signal asks nothing else. `how long is the backup?` names
    // the same backup and asks after its length, and answering that it
    // happened answers past the question.
    if (said.some((n) => markOn(n) === 'unknown')) return null;
    // Said by its kind it is any one of that kind; said as the one already
    // met, it is that one.
    const ones = world.isIndividual(action)
      ? [action]
      : world.members(action, world.baseRelation).filter((one) => world.isIndividual(one));
    const ever = ones.some((one) =>
      world
        .linked(one, world.baseRelation)
        .every((kind) => !world.denies(one, kind, world.baseRelation)));
    return node('standing', ever ? 'held' : 'absent', [], {
      subject: null,
      relation: null,
      object: null,
      negated: false,
    });
  }

  const expectedWhen = whenIn(said, world);
  const plays = (one, p) =>
    world.linked(one, p.role).some((t) => t === p.of || world.isA(t, p.of));
  // A denied occurrence never answers as if it happened: what was recorded
  // as not having happened is skipped, and only what did counts.
  const found = world
    .members(action, world.baseRelation)
    .some(
      (one) =>
        world.isIndividual(one) &&
        !world.denies(one, action, world.baseRelation) &&
        // Asked whether something happened, what answers is that it did. A
        // doing told plainly carries no time of its own, and refusing it for
        // want of a mark nobody wrote answers from bookkeeping rather than
        // from the record. One told at another time is a different matter and
        // still says so.
        (expectedWhen == null ||
          world.linked(one, a.when).length === 0 ||
          world.linked(one, a.when).includes(expectedWhen)) &&
        parts.every((p) => plays(one, p)),
    );
  // The standing is what was found, and nothing is said back: the claim frame
  // joins two things by a relation, and what happened is not that shape — it
  // is a doing with parts. Answering it is yes or no until there is a frame
  // that says a doing back.
  return node('standing', found ? 'held' : 'absent', [], {
    subject: null,
    relation: null,
    object: null,
    negated: false,
  });
}

// The parts a thing may play in a doing. The world says which term each is;
// that a doing has parts, and that a question may name the one it asks after,
// is the brain's.
const ROLES = ['agent', 'target', 'source', 'destination', 'when', 'instrument'];

// What played the part a hole stands in. Everything the signal names has a
// part in what happened, the hole included; the brain looks through what it
// was told happened for one where the named parts match, and answers with what
// played the hole's part.
// Who took what part in one occurrence. What is true of a doing may be true of
// whoever or whatever was in it instead — the update that started is what ran
// for thirty-five minutes, and the starting is not.
function tookPartIn(did, world) {
  const a = world.anchors || {};
  return [a.agent, a.target, a.source, a.destination, a.instrument]
    .filter((role) => role != null)
    .flatMap((role) => world.linked(did, role));
}

function partAsked(said, world, claims, side, sides, graph) {
  const a = world.anchors || {};
  const acting = doingIn(said, world);
  if (acting < 0) return null;

  // A hole plays a part the same way anything else does, and is known by its
  // mark rather than by naming nothing — a word may both stand for what is not
  // said and name the relation it asks across.
  const asking = (n) => claims(n) || markOn(n) === 'unknown';
  const of = (i) => markerFor(said, i, side, roleOn);
  const played = [];
  said.forEach((n, i) => {
    // A word marking an extreme plays no part in the doing. It says which of
    // them is asked after — `who arrived first` names one arrival, not two —
    // and taking it for a participant makes a doing nobody described.
    if (i === acting || !asking(n) || functionsOf(n).includes('extreme')) return;
    if (greetsHere(n, world)) return;
    if (i !== acting && bareHappening(n, world)) return;
    // A hole may name the part it asks after rather than stand where that part
    // stands: `when did nila arrive` asks after when, and says so.
    const asked = markOn(n) === 'unknown' ? conceptOf(n) : null;
    const own = asked != null && ROLES.some((of) => a[of] === asked) ? asked : null;
    const named = roleOn(of(i));
    const role =
      own ??
      (named && a[named] != null
        ? a[named]
        : sides
          ? a[i < acting ? sides.before : sides.after]
          : null);
    if (role == null) return;
    played.push({ role, of: markOn(n) === 'unknown' ? null : conceptOf(n), at: i, own, named });
  });
  const hole = played.find((p) => p.of == null);
  const known = played.filter((p) => p.of != null);
  // A hole that names no part plays the part nothing else in the doing plays.
  // `what does mira give` asks what was given, never mira — the fronted hole
  // reads the other side of the doing when an agent already stands before it.
  if (hole != null && hole.own == null && hole.named == null) {
    const before = sides ? a[sides.before] : null;
    if (before != null && hole.role === before && hole.at < acting && known.some((p) => p.role === before)) {
      const after = sides && a[sides.after] != null ? a[sides.after] : null;
      if (after != null) hole.role = after;
    }
  }
  // A question marking an extreme names one doing and asks which of them it
  // was: `who arrived first` says only that somebody arrived, and nothing else
  // in it has to name a part for the question to stand.
  const marksExtreme = said.some((n) => farEnd(n, world, graph) !== undefined);
  if (!hole) return null;
  // A who-word alone before an intransitive doing asks after its doer
  // (`who arrived?`): nothing else in it names a part, yet the doing itself
  // holds one. How-long and when asks name the part they ask after
  // (hole.own) and are answered by their own readers; so is any other word.
  const alone = known.length === 0 && !marksExtreme;
  const asksDoer = hole.own == null && said[hole.at].name === 'who';
  // A hole that names the part it asks after is not alone in the signal: the
  // doing is named, and the part asked for is named beside it. `when did the
  // crash happen?` says which happening and says it asks after when, and
  // nothing else needs to stand there.
  if (alone && !asksDoer && hole.own == null) return null;

  const action = conceptOf(said[acting]);
  // Somebody merely in something that happened played no part in it: hema was
  // in the accident and did not accident anybody. Asked who was in it, what
  // the happening holds is the answer, and looking for parts played would find
  // nothing and say so — which is not the same as nothing being there.
  if (graph != null && hole.own == null) {
    const inside = graph.membersOf(action);
    if (inside.length > 0) {
      return node('answer', 'link', [], { subject: null, relation: null, found: inside });
    }
  }
  const found = [];
  for (const one of world.members(action, world.baseRelation)) {
    if (!world.isIndividual(one)) continue;
    if (world.denies(one, action, world.baseRelation)) continue;
    // A part played by one of a kind answers to the kind: what the boy kicked
    // is what one boy kicked, and the signal need not say which one.
    const plays = (p) =>
      world.linked(one, p.role).some((t) => t === p.of || world.isA(t, p.of));
    if (!known.every(plays)) continue;
    for (const t of world.linked(one, hole.role)) if (!found.includes(t)) found.push(t);
  }
  // A question marking an extreme asks after one of them: `who arrived first`
  // among several who did it is the far end of the ordering the word marks,
  // and the rest of the doing held nobody there. Where the ordering holds
  // nothing up there — several unbeaten, or the ones who did it never spoken
  // of in it — every one of them stands, as it did before the ordering read.
  for (const n of said) {
    const far = farEnd(n, world, graph);
    if (far == null || far.length === 0) continue;
    const farIn = found.filter((id) => far.includes(id));
    if (farIn.length > 0) {
      found.length = 0;
      found.push(...farIn);
    }
    break;
  }
  // Nobody is on record as having done it, and the question may still name an
  // ordering: `who arrived first` asks after the first of them, and being told
  // sara arrived before john says both that they arrived and which came first.
  // So where the doing left nothing behind, the far end answers.
  if (found.length === 0) {
    for (const n of said) {
      const far = farEnd(n, world, graph);
      // Even where the ordering holds nobody. Asked what happened first with
      // nothing said to have happened, the answer is none — the question is
      // not then asked again some other way, which is how a happening itself
      // came back as the answer.
      //
      // And a doing is asked after among what this conversation holds. Where
      // it has put nobody in that ordering, what the world orders of its own
      // accord is no answer: the past comes before the present, and nobody
      // asking what happened first is asking after the past.
if (far !== undefined) {
        const spoken = graph
          ? [conceptOf(n), ...bothWays(conceptOf(n), world)].flatMap((rel) => graph.joinedBy(rel))
          : [];
        const fr = far.filter((t) => spoken.includes(t));
        return node('answer', 'link', [], {
          subject: action,
          relation: hole.role,
          found: fr,
        });
      }
    }
  }
  // A time said of a doing is kept on the doing, never linked to the kind it
  // is on the world's side, so no walk finds it. What was said of the very
  // thing the question names reads off the record the conversation keeps, and
  // only the thing the question names: asked when the backup started, what the
  // server was told does not answer. A clock reading — a measure of the day —
  // sits on the record whole and answers the same way a time does.
  let clock = null;
  // Asked when, the time a doing was told at answers over the coarse side of
  // now it falls on: `past` is true of everything that has happened and tells
  // nobody anything. The walk out is not consulted first — it is what falls
  // back to, where nothing was told.
  if (hole.role === a.when) {
    const rows = graph ? graph.graph().actions : [];
    const nodes = graph ? graph.graph().nodes : null;
    // What a node answers to. A thing spoken of by its kind answers to the
    // kind; one the conversation named answers to the name it was given, which
    // is no term of the world and reaches nothing by climbing. Both are asked,
    // because a question may name either.
    const nodeConcepts = (v) => {
      if (typeof v === 'number') return [v];
      if (typeof v === 'string' && nodes) {
        const found = nodes.find((n) => n.id === v);
        if (!found) return [];
        return [...new Set([found.of, found.term].filter((one) => one != null))];
      }
      return [];
    };
    const nodeConcept = (v) => nodeConcepts(v)[0] ?? null;
    // The doing the question names may be the row's own and no part of it:
    // `when did the crash happen?` names the crash, and the row that says the
    // crash happened is the one to read.
    const named = (r) => action != null && r.did === action;
    const mine = rows.filter((r) =>
      named(r) ||
      known.some((p) => {
        // The doing is the row's: its own entity names it as well as the thing
        // it was done to. A row whose `of` is the act itself — a doing kept as
        // one of its kind — names only the kind of doing it was, and the act a
        // doing was is every doing's kind and no question's key: the starts
        // and backups are all one kind, and a question asks after one thing
        // done, never after the kind of doing it was.
        const actKind = (t) =>
          t != null && a.action != null && world.isA(t, a.action) && !world.isIndividual(t);
        const hits = (a, b) => (actKind(a) || actKind(b) ? a === b : world.isA(a, b));
        const kindRow = actKind(r.of);
        if (r.did != null && hits(r.did, p.of)) return true;
        if (r.did != null && p.of != null && hits(p.of, r.did)) return true;
        if (!kindRow && r.of != null && hits(r.of, p.of)) return true;
        if (!kindRow && r.of != null && p.of != null && hits(p.of, r.of)) return true;
        // A change is a happening like any other, and what changed names it.
        // `the coffee got cold at ten hours` leaves the clock on the change,
        // and asked when, nothing reached it: the walk knew a doing by who did
        // it and a change has no doer, only the thing it happened to.
        for (const c of nodeConcepts(r.parts ? r.parts.thing : null)) {
          if (c === p.of) return true;
          if (p.of != null && (hits(c, p.of) || hits(p.of, c))) return true;
        }
        // The parts a doing was done among name it too: the row says who its
        // parts were in its own words, and the question's named thing is one
        // of them. Only the parts are asked for — the act every row shares
        // names no row over another. Except where the part is itself a
        // happening this conversation holds: the backup the starting started
        // is one particular backup, and it names the row as much as a thing
        // standing there would.
        for (const v of Object.values(r.roles ?? {})) {
          const part = typeof v === 'string' ? rows.find((one) => one.id === v) : null;
          const brought = typeof v === 'string' && nodes && nodes.some((one) => one.id === v);
          const concepts = part
            ? [...new Set([part.of, part.said].filter((one) => one != null))]
            : nodeConcepts(v);
          for (const c of concepts) {
            if (!part && !brought && actKind(c)) continue;
            if (c === p.of) return true;
            if (hits(c, p.of) || (p.of != null && hits(p.of, c))) return true;
          }
        }
        return false;
      }),
    );
    const times = [...new Set(mine.flatMap((r) => (r.properties || {}).times ?? []))];
    // What was told stands in place of the coarse side of now, not beside it.
    if (times.length > 0) found.length = 0;
    found.push(...times);
    // A time-word told outright answers first — the morning it was started in
    // says where on the day it stands, where a reading says only how far. The
    // clock is read where no time was ever told, and over the coarse side of
    // now the walk may have come back with: `past` is true of everything that
    // has happened, and a doing told at nine o'clock has an answer.
    const coarse = found.length > 0 && found.every((t) => [a.past, a.now, a.future].includes(t));
    if (found.length === 0 || coarse) {
      clock =
        mine
          .map((r) => (r.properties || {}).at)
          .find(
            (t) =>
              t != null &&
              t.amount != null &&
              t.unit != null &&
              // A reading stands on the clock: the seconds, minutes and hours
              // the world's units hold are one scale, and that is what a clock
              // reads — not a week, which is a length nothing tells the clock.
              UNITS.some((name) => a[name] === t.unit),
          ) ?? null;
      // What the clock says stands in place of the coarse answer, not beside it.
      if (clock != null && coarse) found.length = 0;
    }
    // A doing's end asked for before any end is on the record is its
    // beginning, put forward by the time it went on: `when did the backup
    // finish?` where a backup that started at nine forty ran for thirty-five
    // minutes answers ten fifteen. The record holds the reading it began with
    // and how long it went on, and the day it began, moved on by what it
    // took, is the day it ended.
    if (a.finish != null && said.some((n) => conceptOf(n) === a.finish) && clock != null) {
      for (const r of mine) {
        const at = (r.properties || {}).at;
        if (at == null || at.amount == null) continue;
        // How long it went on is held on the doing, or on what the doing was
        // of: the backup that started is one happening, and it is the backup
        // that ran for thirty-five minutes, not the starting.
        const ran = r.did == null ? [] : [r.did, ...tookPartIn(r.did, world)];
        if (ran.length === 0) continue;
        let length = 0;
        for (const unit of world.standing(a.time, a.measure)) {
          const held = ran.map((one) => world.held(one, a.for, unit)).find((v) => v != null);
          if (held == null) continue;
          length += held * unitsIn(unit, at.unit, world);
        }
        if (length === 0) continue;
        clock = { amount: at.amount + length, unit: at.unit };
        break;
      }
    }
  }
  return node('answer', 'link', [], { subject: action, relation: hole.role, found, clock });
}

// Which side of now the signal put what it says on. That there are sides is the
// brain's — past, now, future, and nothing between them to weigh; which word
// says so is the language's, and which term each side is, is the world's.
// The number a signal counted with, wherever in it the counting was said.
function amountIn(root) {
  const found = [];
  const walk = (n) => {
    if (!n) return;
    if (n.kind === 'quantity' && n.state && n.state.value != null) found.push(n.state.value);
    for (const c of n.branch || []) walk(c);
  };
  walk(root);
  return found.length ? found[0] : null;
}

function whenIn(said, world) {
  const a = world.anchors || {};
  for (const n of said) {
    const thought = n ? findBranch(n, 'thought') : null;
    const when = thought && thought.state.thought ? thought.state.thought.when : null;
    if (when && a[when] != null) return a[when];
  }
  return null;
}

// Whether this word joins what it joins as a choice rather than a
// togetherness: one of them is the answer, not each. Which word does it is the
// language's; that joining can be either is the brain's.
function choiceOn(n) {
  const t = n ? findBranch(n, 'thought') : null;
  return Boolean(t && t.state.thought && t.state.thought.choice);
}

// Select exactly one offered entity refinement for the established topic.
// An alternative is only a label for a closed primitive; classification itself
// is recomputed from the world every time, so language data cannot dictate it.
function classificationChoice(said, world, sent) {
  if (!said.some(choiceOn)) return null;
  const offered = said.map(classificationOn).filter((kind) => kind != null);
  if (new Set(offered).size < 2) return null;
  // The alternatives are understood, but without one established subject
  // there is no fact to decide and no assertion to learn by accident.
  if (!sent || sent.spoken == null) {
    return node('answer', 'classification', [], {
      subject: null,
      relation: null,
      found: [],
      classification: null,
    });
  }
  const entity = worldNode(sent.spoken, world);
  if (!entity || entity.kind !== 'entity') {
    return node('answer', 'classification', [], {
      subject: sent.spoken,
      relation: null,
      found: [],
      classification: null,
    });
  }
  const matched = [...new Set(offered)].filter((kind) => kind === entity.name);
  // An entity may be known to be a thing without the world proving either
  // life or non-life. The alternatives were still understood as a question;
  // keep its empty answer so it becomes unsure rather than falling through as
  // an unrelated claim that might be learned.
  if (matched.length !== 1) {
    return node('answer', 'classification', [], {
      subject: sent.spoken,
      relation: null,
      found: [],
      classification: null,
    });
  }
  return node('answer', 'classification', [], {
    subject: sent.spoken,
    relation: null,
    found: [],
    classification: matched[0],
  });
}

// A claim whose predicate is one of the closed entity refinements. The
// refinement is unary: a language may voice it with one word or a phrase, but
// the proposition is always whether the subject reaches (or is excluded from)
// the world's living anchor. Unknown stays absent in the open world.
function classificationClaim(said, world, mood) {
  const a = world.anchors || {};
  if (a.living == null || world.baseRelation == null) return null;
  const marked = said
    .map((n, at) => ({ at, kind: classificationOn(n) }))
    .filter(({ kind }) => kind != null);
  const offered = [...new Set(marked.map(({ kind }) => kind))];
  if (offered.length !== 1) return null;

  const relation = said.findIndex((n) => conceptOf(n) === world.baseRelation);
  if (relation < 0) return null;
  const predicate = marked[0].at;
  const isSubject = (n) => conceptOf(n) != null && classificationOn(n) == null;
  // In an infix claim the subject precedes `is`; in a fronted question it
  // follows it. Keep both word orders in language data and resolve only their
  // semantic positions here. The mirrored case also permits languages that
  // place the classifier before their base relation.
  const subjectNode = relation < predicate
    ? said.slice(0, relation).reverse().find(isSubject) ??
      said.slice(relation + 1, predicate).find(isSubject)
    : said.slice(relation + 1).find(isSubject) ??
      said.slice(0, predicate).reverse().find(isSubject);
  const subject = conceptOf(subjectNode);
  if (subject == null) return null;

  const entity = worldNode(subject, world);
  if (!entity || entity.kind !== 'entity') return null;
  const surfaceNot = said.some(negatesOn);
  const wanted = (offered[0] === 'living') !== surfaceNot ? 'living' : 'nonliving';
  const standing = entity.name === 'unknown'
    ? 'absent'
    : entity.name === wanted
      ? 'held'
      : 'against';
  const semanticNot = wanted === 'nonliving';
  const state = {
    subject,
    relation: world.baseRelation,
    object: a.living,
    negated: semanticNot,
    classification: offered[0],
    surfaceNot,
  };
  const out = [node('standing', standing, [], state)];
  if (mood !== 'tell') return out;
  if (standing === 'against') {
    out.push(node('refuse', 'contradiction', [], state));
  } else if (standing === 'absent') {
    out.push(node('learn', 'link', [], {
      subject,
      relation: world.baseRelation,
      object: a.living,
      quantity: null,
      made: null,
      not: semanticNot,
    }));
  }
  return out;
}

function classificationOn(n) {
  const thought = thoughtOf(n);
  return thought ? thought.classifies ?? null : null;
}

// Whether this thing was marked as a new one or the one already meant.
function markAt(n) {
  const m = n && findBranch(n, 'mark');
  return m ? m.name : null;
}

// Who a word is said of (first/second/third), where the language says so.
function personOf(n) {
  const t = n ? findBranch(n, 'thought') : null;
  return t && t.state.thought ? t.state.thought.person ?? null : null;
}

// How many a word is said of (singular/plural), where the language says so.
function personNumber(n) {
  const t = n ? findBranch(n, 'thought') : null;
  return t && t.state.thought ? t.state.thought.number ?? null : null;
}

// Focus: what a bare third-person pointer (`it`) may stand for. The bearer the
// pointer landed on is speaker-side (an individual of who spoke) and it
// directly holds exactly one kind: `it` is that kind, not who holds it.
// Otherwise the pointer stands — existing threads (`cupboard` answers) keep
// working, and the brain never guesses beyond this one exclusion.
function focusFor(term, world, sent) {
  const subject = conceptOf(term);
  if (subject == null || !world || !sent) return undefined;
  if (markOn(term) !== 'spoken' || personOf(term) !== 'third') return undefined;
  if (sent.from == null && sent.to == null) return undefined;
  const a = world.anchors || {};
  // A bare pointer stands for what is held, not for whoever holds it — where
  // the brain knows the holder is somebody. Where it knows nothing of them,
  // holder and held are both things it was told about and there is nothing to
  // tell them apart, so the pointer stays where it landed.
  const somebody = (id) =>
    id != null &&
    ((sent.from != null && (id === sent.from || world.isA(id, sent.from))) ||
      (sent.to != null && (id === sent.to || world.isA(id, sent.to))) ||
      (a.person != null && world.isA(id, a.person)));
  if ((thoughtOf(term) || {}).stands != null || !somebody(subject)) return undefined;
  const held = [];
  for (const of of world.linked(subject, a.holding)) if (!held.includes(of)) held.push(of);
  if (held.length === 1) return held[0];
  return undefined;
}

// A plural third-person pointer (`they`, `them`) stands for every topic in
// focus, not only the latest — one apiece, the way joined questions answer
// each. Speaker-side topics (who spoke, who was spoken to) never join: `they`
// is third person. One member or none falls back to the word as thought.
function membersFor(term, world, sent) {
  if (markOn(term) !== 'spoken' || personOf(term) !== 'third' || personNumber(term) !== 'plural') {
    return [term];
  }
  const focus = sent && Array.isArray(sent.focus) ? sent.focus : [];
  // Bare result values hold no term and join no claim as topics; actions join
  // no `they` — a doing is repeated, not pointed at. Plural expansion is over
  // things spoken of.
  const members = focus.filter((id) => {
    if (typeof id !== 'number') return false;
    // What is kept out is what a pointer cannot reach — a doing is repeated,
    // not pointed at. What the world says nothing about is not kept out:
    // somebody the conversation named and never said a kind for is still one
    // of those spoken of, and asking to know they are a thing first drops
    // exactly the names a conversation introduces.
    const action = world ? (world.anchors || {}).action : null;
    if (action != null && world && world.isA(id, action)) return false;
    if (sent.from != null && (id === sent.from || (world && world.isA(id, sent.from)))) return false;
    return !(sent.to != null && (id === sent.to || (world && world.isA(id, sent.to))));
  });
  if (members.length < 2) return [term];
  return members.map((id) =>
    withBranch(
      term,
      (term.branch || []).map((b) =>
        b.kind === 'thought'
          ? withBranch(b, b.branch, { ...b.state, thought: { ...b.state.thought, concept: id } })
          : b,
      ),
    ),
  );
}

// The number term saying how many of this thing there are, if any.
// How many of this thing the signal said there were, as a number — whether or
// not the world has a term for it.
function quantityAmount(n, world) {
  const q = n && findBranch(n, 'quantity');
  if (!q) return null;
  return q.state.value ?? world.valueOf(q.state.concept);
}

function quantityTerm(n) {
  const q = n && findBranch(n, 'quantity');
  return q ? q.state.concept : null;
}

// What the brain means to express about a thing, decided by what the world says
// the thing IS — never by the part of speech the language filed it under. The
// brain walks to its own anchors and answers the kind of thing it found: it
// answers a communication with one of its own, counts a number, and otherwise
// says it knows the thing.
//
// A word said by itself is recognized only where the brain is left holding
// something: a thing becomes what is spoken of, and what follows can ask after
// it. Everything else said alone leaves the brain exactly as it was, and it
// says it does not understand rather than reporting a word it looked up. What
// any of them does with the rest of a sentence around it is another matter,
// and is decided on the whole sentence.
export function intentOf(n, world) {
  if (!n.state.exists) return 'nothing';
  const ts = thoughtOf(n);
  if (!ts || ts.meaning == null) return 'unknown';

  const concept = ts.concept;
  const a = world && world.anchors ? world.anchors : {};
  if (concept != null && world) {
    if (world.isA(concept, a.greeting)) return 'greet';
    if (world.isA(concept, a.number)) return 'count';
    // Said by itself, only a thing leaves the brain anything. It becomes what
    // is being spoken of, and the next signal can ask after it — `tank`, then
    // `what is it?`. A relation joins two things and neither is there; an
    // action is done by someone to something and nobody is there; a property
    // is had by something and nothing is there. After any of them the brain
    // holds exactly what it held before, so there is nothing it took in and
    // nothing to say it recognized. It does not understand, and says so.
    // Only where the world can say so. Told nothing about what a thing is,
    // the brain has no category to answer with and does not refuse on it.
    if (a.thing != null && !world.isA(concept, a.thing)) return 'unknown';
  }
  // A number the world never named is still a number.
  if (concept == null && ts.value != null) return 'count';
  // A word that marks rather than names — a hole, or which one is meant —
  // stands for nothing by itself, and there is nothing in it to recognise.
  if (concept == null && ts.marks) return 'unknown';
  // A pointer voicing on its own voices only its dictionary meaning — `I
  // recognise "the one it came from"` — which is nonsense, not recognition.
  // Counts and confirms of what one lands on still speak (above); a bare
  // pointer to an ordinary thing says nothing by itself.
  if (ts.marks === 'from' || ts.marks === 'to' || ts.marks === 'spoken') return 'unknown';
  return 'recognise';
}

export function meaningOf(n) {
  const ts = thoughtOf(n);
  return ts ? ts.meaning : null;
}

// Saying back the thing a word named, rather than the gloss the language filed
// it under: `dog` is answered with dog, not with canine animal. The term is
// handed over and the language says it in its own word for it, which is the
// same road every other answer takes. Where the word named nothing the brain
// has nothing to hand over, and the word itself has to stand for it.
export function saidBack(n) {
  const ts = thoughtOf(n);
  if (!ts) return null;
  return ts.concept != null ? ts.concept : ts.meaning;
}

export function languageOf(n) {
  const ts = thoughtOf(n);
  return ts ? ts.language : null;
}

// The claim itself, said back. The brain hands over the three terms it joined
// and the language puts them in an order and gives them their words; where it
// cannot say all three there is no claim to restate, and it says none of it
// rather than a sentence with a hole in it.
//
// What is one of a kind takes its article, and what is not — a name, or a
// word the language says stands bare — does not. Which things are names the
// brain knows; which words stand bare is the language's, and which form one
// of a kind takes against what follows is the language's too.
//
// A comparing said on one scale is said back as the comparing, not as the
// more-or-less it was worked through: asked bigger, the brain says bigger,
// in the frame the language gives for saying so.
// A thing the world holds that says something — a claim — said back as what
// it says. Anything else is said by its own word.
// Something that happened, said back. An occurrence is a thing the world
// holds, so a walk that finds one has found a doing and not a kind of doing:
// answering `push` where somebody pushed a fence says what sort of thing
// happened and never says what did. Who did it, what was done, and what it
// was done to, in the frame the language gives for saying so.
export function doingSaid(id, langName, langs, world) {
  const a = world && world.anchors ? world.anchors : {};
  const lang = (langs || []).find((l) => l.data.name === langName);
  if (!lang || id == null || a.action == null || a.agent == null) return null;
  const [action] = world.linked(id, world.baseRelation).filter((k) => world.isA(k, a.action));
  if (action == null) return null;
  const [who] = world.linked(id, a.agent);
  if (who == null) return null;
  const [when] = a.when == null ? [] : world.linked(id, a.when);
  const doer = termWord(who, langName, langs, world);
  const did = (when != null ? lang.wordWhen(action, 'past') : null)
    ?? termWord(action, langName, langs, world);
  if (doer == null || did == null) return null;
  const one = world.isIndividual(who) || lang.isBare(who) ? doer : `${lang.oneFor(doer)} ${doer}`;
  const [to] = a.target == null ? [] : world.linked(id, a.target);
  const other = to == null ? null : termWord(to, langName, langs, world);
  const said = other == null
    ? lang.express('did', { subject: one, relation: did })
    : lang.express('didTo', {
        subject: one,
        relation: did,
        object: world.isIndividual(to) || lang.isBare(to) ? other : `${lang.oneFor(other)} ${other}`,
      });
  return said ? said.trim().replace(/\.$/, '') : null;
}

export function claimTermSaid(id, langName, langs, world) {
  const claim = world && world.claimOf ? world.claimOf(id) : null;
  if (!claim) return null;
  const said = claimSaid(
    node('standing', 'held', [], {
      subject: claim.subject,
      relation: claim.relation,
      object: claim.object,
      negated: claim.not,
    }),
    langName,
    langs,
    world,
  );
  return said ? said.trim().replace(/\.$/, '') : null;
}

// The word a signal compared with, where it compared with one, so the answer
// is said with the word that was asked. Whether the two things were turned
// round is the fact-writer's to say: a comparison worked out from amounts
// leaves them where the signal put them.
function wordUsed(said) {
  const thought = said ? thoughtOf(said) : null;
  return thought && thought.compares != null ? { compares: thought.compares } : {};
}

// The state a language says an ordering with. An ordering is the scale's and
// the scale has states at both ends; the fact runs upward, so the word for it
// is a state at the upper end. A comparison the world put on no scale is its
// own state already.
export function upperState(relation, world) {
  const a = world && world.anchors ? world.anchors : {};
  if (relation == null || a.compares == null) return null;
  const of = world.linked(relation, a.compares)[0];
  if (of == null) return null;
  const states = world.linked(of, a.measure);
  if (states.length === 0) return of;
  for (const state of states) {
    if (a.toward == null || world.linked(state, a.toward)[0] === a.more) return state;
  }
  return null;
}

// The reading of a clock, said back the way a day-clock is read. A measure
// of the day sits on the record in the smallest of its units — six hundred
// and fifteen minutes — and the clock that read it read ten hours and
// fifteen minutes, which the day says as ten fifteen. The language numbers
// each part; the brain only joins what the clock holds together.
export function clockSaid(clock, langName, langs, world, written) {
  if (clock == null || world == null) return null;
  const a = world.anchors || {};
  const unit = UNITS.find((name) => a[name] === clock.unit) ?? null;
  const base = unit == null ? null : stepsInTime(unit, 'second');
  if (base == null) return null;
  const total = Number(clock.amount) * base;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const number = (n) => numberSaid(world.termFor(n), n, langName, langs, world, written);
  // Whole hours and the quarter-hour standing after them are the reading of
  // the day — ten fifteen — with no unit in between. What is not such a
  // reading is said as amounts of the units it is.
  if (seconds === 0 && minutes > 0 && hours > 0) {
    const hour = number(hours);
    const minute = number(minutes);
    return hour == null || minute == null ? null : `${hour} ${minute}`;
  }
  const lang = (langs || []).find((l) => l.data.name === langName);
  const unitWord = (count, term) =>
    (count === 1 ? null : lang && lang.manyWordFor(term)) ?? termWord(term, langName, langs, world, written);
  const parts = [];
  for (const [count, term] of [[hours, a.hour], [minutes, a.minute], [seconds, a.second]]) {
    if (count <= 0) continue;
    const many = number(count);
    if (many == null) continue;
    parts.push(`${many} ${unitWord(count, term)}`);
  }
  return parts.length === 0 ? null : parts.join(' ');
}

// The part of a signal that completes what is being said of a thing. Which
// part of its own grammar does that is the language's to declare; the brain
// knows only that some part does, and never what any language calls it.
function completing(root) {
  if (!root) return null;
  for (const b of root.branch || []) {
    if (b.state && b.state.completes) return b;
    const deeper = completing(b);
    if (deeper) return deeper;
  }
  return null;
}

// A name this conversation gave, asked what it was given. `sam is three` bound
// the word sam to the conversation's three; asked `is sam three?`, the binding
// the runtime handed back answers on its own — a name holds what it was given,
// and nothing in the world is written for it. Only a number complement is read
// back; asked of another amount it denies, and a name given a term is a thing
// to be introduced, never a value to be compared.
function namedBack(root, world, mood, sent) {
  if (mood !== 'ask' || !sent || !sent.names) return null;
  const a = world.anchors || {};
  const predicate = findBranch(root, 'predicate');
  const joint = predicate && (predicate.branch || []).find((b) => b.kind === 'thing');
  const jt = joint ? conceptOf(joint) : null;
  // A comparison joins with more, less or an ordering word; reading the name's
  // number as an equality is not the comparison's read, which answers with its
  // own algebra. The verb to be shows no term on a fronted question, and it is
  // the word these asks make with: both are read here.
  if (
    jt != null &&
    (jt === a.more ||
      jt === a.less ||
      (a.order != null && (jt === a.order || world.isA(jt, a.order) || world.subrelationOf(jt, a.order))))
  ) {
    return null;
  }
  const subject = findBranch(root, 'subject');
  const who = subject && (subject.branch || []).find((b) => b.kind === 'thing');
  if (!who || !who.state || who.state.identity == null) return null;
  const binding = sent.names[who.state.identity];
  if (!binding || (binding.of == null && binding.value == null)) return null;
  const completer = completing(root);
  const what = completer && (completer.branch || []).find((b) => b.kind === 'thing');
  if (!what) return null;
  const given = conceptOf(what);
  const number = numberOf(what, world);
  const isNumber = number != null || (given != null && a.number != null && world.isA(given, a.number));
  if (!isNumber) return null;
  const same =
    (binding.of != null && given === binding.of) ||
    (number != null && binding.value != null && number === binding.value);
  return node('standing', same ? 'held' : 'against', [], {
    subject: null,
    relation: null,
    object: null,
    negated: false,
    worked: true,
  });
}
