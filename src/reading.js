// Which of a word's readings a signal means.
//
// A word may be written one way and mean more than one thing. Nothing here
// knows which word, or which language: a reading says what must stand beside it
// for that reading to be the one meant, and this applies what the language
// declared. The first reading whose conditions hold wins; a reading that
// declares none is the fallback, so there is always one answer and it is the
// same answer every time.
//
// A condition describes a neighbour, and it may do so in the language's own
// terms — the function a word carries — or in the world's — the kind of thing
// it names, or the very term it is. The named kinds below are the ones that
// say something neither can: what a pointer is, and what a proposition looks
// like. Nothing else belongs here; a language that needs a new distinction
// declares it, and this reads it.
import { conceptOf, functionsOf, thoughtOf, withBranch, findBranch } from './node.js';
import { negatesOn, reaches } from './brain.js';

// A reading chosen by what stands beside it.
export function contextual(roots, world) {
  return roots.map((n, i) => {
    const t = findBranch(n, 'thought');
    const ways = t && t.state.ways ? t.state.ways : null;
    if (!ways || ways.length < 2) return n;
    if (!ways.some((word) => word && word.select != null)) return n;
    const thought = ways.find((word) => selectionMatches(word && word.select, roots, i, world))
      ?? ways.find((word) => word && word.select == null);
    if (!thought) return n;
    return withBranch(
      n,
      n.branch.map((b) => (
        b.kind === 'thought' ? withBranch(b, b.branch, { thought, contextual: true }) : b
      )),
    );
  });
}

function selectionMatches(selection, roots, at, world) {
  if (!selection) return false;
  if (selection.any) {
    return selection.any.some((condition) => selectionMatches(condition, roots, at, world));
  }
  if (selection.position === 'first' && at !== 0) return false;
  if (selection.before && !contextBefore(selection.before, roots, at, world)) return false;
  if (selection.after && !contextAfter(selection.after, selection.across, roots, at, world)) return false;
  return true;
}

function contextBefore(wanted, roots, at, world) {
  const kinds = Array.isArray(wanted) ? wanted : [wanted];
  return kinds.some((kind) => {
    const rest = roots.slice(at + 1);
    // A neighbour said in the language's own terms or the world's.
    if (typeof kind !== 'string') return rest.some((n) => describes(n, kind, world));
    if (kind === 'denial') return rest.some(negatesOn);
    // A unit standing after it. Which reading of a word is meant may turn on
    // one: a clock that reads ten hours is measuring, where somebody who reads
    // is doing something.
    if (kind === 'unit') return rest.some((n) => contextKind(n, 'unit', world));
    // A word pointing at somebody standing after it. `who am i` asks after a
    // name; `who is taller than sam` asks after whoever stands there.
    if (kind === 'pointer') return rest.some((n) => contextKind(n, 'pointer', world));
    // Something done, standing after it. Which reading of a word is meant may
    // turn on one: `can` holds a claim at arm's length, and before a doing it
    // says a thing is able to do it.
    if (kind === 'doing') {
      const a = world ? world.anchors || {} : {};
      return a.action != null && rest.some((n) => reaches(n, a.action, world));
    }
    // A word saying one thing is of another, standing straight after. Which
    // reading of a word is meant may turn on it: `left` is a side of something,
    // and `left of` is one thing standing to another.
    if (kind === 'having') {
      const a = world ? world.anchors || {} : {};
      const next = rest[0];
      return next != null && (conceptOf(next) === a.has || conceptOf(next) === a.hold);
    }
    // A word standing for a thing after it. A word may say how many of
    // something there are, or stand for that many of what was already brought
    // in, and which it is turns on whether it says how many *of* anything.
    if (kind === 'thing') {
      const a = world ? world.anchors || {} : {};
      return (
        world != null &&
        a.thing != null &&
        rest.some((n) => conceptOf(n) != null && world.isA(conceptOf(n), a.thing))
      );
    }
    if (kind !== 'proposition' || !world) return false;
    const a = world.anchors || {};
    const things = rest.filter((n) => {
      const concept = conceptOf(n);
      return concept != null && world.isA(concept, a.thing);
    }).length;
    const joins = rest.some((n) => {
      const concept = conceptOf(n);
      return concept != null && world.isA(concept, a.relation);
    });
    return things >= 2 && joins;
  });
}

function contextAfter(wanted, across, roots, at, world) {
  const kinds = Array.isArray(wanted) ? wanted : [wanted];
  for (let i = at - 1; i >= 0; i -= 1) {
    if (kinds.some((kind) => describes(roots[i], kind, world))) return true;
    if (across !== 'modifier' || !functionsOf(roots[i]).includes('modifier')) return false;
  }
  return false;
}

// Whether a word answers to what a reading asked to stand beside it.
//
// A language may say what it wants in its own terms — a word carrying a
// function it declared — or in the world's — a word naming a kind of thing, or
// naming one term and no other. Those three are enough to describe any
// neighbour without the brain learning a word, and a language that needs a
// distinction none of them makes is telling the brain something new about what
// a signal can hold, which is the one thing that belongs below.
function describes(n, wanted, world) {
  if (typeof wanted === 'string') return contextKind(n, wanted, world);
  if (!wanted || n == null) return false;
  if (wanted.functions != null) {
    const carried = functionsOf(n);
    return [].concat(wanted.functions).every((one) => carried.includes(one));
  }
  if (wanted.names != null) {
    const of = conceptOf(n);
    // `true` asks only that it names something. A name this conversation
    // brought in is one of nothing until somebody says what it is, and a
    // reading that wants a thing standing beside it wants that name too.
    if (wanted.names === true) return of != null;
    return world != null && of != null && world.isA(of, wanted.names);
  }
  if (wanted.is != null) return conceptOf(n) === wanted.is;
  // A scale: something other states are measured on. `colour` is one and
  // `cold` is not, though the world calls both of them properties, and a
  // reading may turn on which of the two stands beside it.
  if (wanted.measures === true) {
    const a = (world && world.anchors) || {};
    const of = conceptOf(n);
    return world != null && of != null && a.measure != null && world.linked(of, a.measure).length > 0;
  }
  return false;
}

function contextKind(n, kind, world) {
  const thought = thoughtOf(n);
  // A word that stands for something, in place of naming it. Marking alone is
  // not enough: an article marks which one is meant and never stands for it,
  // so `a heron` is a heron and not somebody pointed at.
  if (kind === 'pointer') {
    return Boolean(thought && thought.marks != null) && !functionsOf(n).includes('determiner');
  }
  if (kind === 'determiner') return functionsOf(n).includes('determiner');
  // A word standing for a unit. Which reading of a word is meant may turn on
  // one standing beside it: a clock that reads ten hours is measuring, where
  // somebody who reads is doing something.
  if (kind === 'unit') {
    const a = world ? world.anchors || {} : {};
    return world != null && a.unit != null && conceptOf(n) != null && world.isA(conceptOf(n), a.unit);
  }
  if (kind !== 'predicate' || !world) return false;
  const concept = conceptOf(n);
  const a = world.anchors || {};
  return concept != null && (
    world.isA(concept, a.relation) || world.isA(concept, a.action)
  );
}
