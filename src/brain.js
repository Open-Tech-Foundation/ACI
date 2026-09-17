// Primitive perception layers of the brain.
// The brain climbs a fixed ladder of layers; each layer adds its perception
// of the signal to a running state, and may branch.
//
// The brain has no inbuilt knowledge of any language. It perceives raw
// structure by itself; language recognition happens inside the
// understanding phase, driven solely by externally-loaded language data
// (see src/languages.js). It never knows a language's name.

import { Decimal } from '@opentf/std';
import { fromWorldData, grownBy, addAmounts, multiplyAmounts } from './world.js';
import { contextual } from './reading.js';
import { UNITS, unitsIn as stepsInTime } from './calendar.js';
import {
  $, node, taken, instead, numberOf, conceptOf, markOn, thoughtOf, functionsOf,
  withBranch, findBranch, toString, quote, functionList, VERDICT,
} from './node.js';
import {
  judge, measured, orderingOf, orderingsOf, senseSound, senseVisual, toward,
  claimTermSaid,
  clockSaid,
  doingSaid,
  exactValue,
  greetsOnly,
  hasFunction,
  intentOf,
  isComparing,
  isDeterminer,
  languageOf,
  meaningOf,
  opensPart,
  quantitiesOn,
  saidBack,
  unitsIn,
  upperState,
  upward,
  work,
} from './judge.js';

// The conversation this signal belongs to, for the length of one turn. Set on
// the way in from what the runtime knows and never read outside a turn — the
// graph itself belongs to the brain that was opened with it.
export let graph = null;



// ---------------------------------------------------------------------------
// understand — perception: void -> thing -> quality -> form -> symbol
// then language recognition against loaded language data.
// ---------------------------------------------------------------------------
function understand(input, langs, reading) {
  const language = reading && reading.language ? [reading.language] : [];
  let roots = existence(input, reading && reading.language ? reading.tokens : null);

  roots = thing(roots);
  roots = quality(roots, language);
  roots = form(roots);
  roots = symbol(roots);

  roots = recognizeLanguage(roots, language);
  roots = recordLanguageAmbiguity(roots, reading);
  roots = recordLanguageResolution(roots, reading);

  return roots;
}

function existence(signal, tokens) {
  const raw = toString(signal);
  // Nothing, or nothing but space, is nothing at all.
  if (raw.trim() === '') return [node('void', 'void', [], { exists: false })];
  // A multi-word signal is perceived as one thing per word, so each token
  // climbs the whole ladder on its own. Single-word input stays a single root.
  tokens = tokens ?? tokenize(raw, []);
  // A signal made only of marks still exists — it just holds no word.
  if (tokens.length === 0) tokens = [raw.trim()];
  return tokens.map((t) =>
    node('existence', 'something', [], { exists: true, raw: t }),
  );
}

// Read a whole signal under one language's symbol conventions. Tokenization is
// part of a language: a symbol that stands alone in one may be inside a word in
// another, and one language's mark may be another's letter. Trying each loaded
// language independently keeps those conventions from leaking across. Source
// order supplies no priority: no complete reading means no language is guessed
// token by token, while more than one is knowledge but not grounds for choosing
// one. Every candidate is preserved and none is allowed to drive thought.
function signalReading(input, langs) {
  const raw = toString(input);
  if (raw.trim() === '') return null;
  const candidates = [];
  for (const language of langs || []) {
    const tokens = tokenize(raw, [language]);
    // Edge marks may come away, but no language may obtain a complete reading
    // by silently discarding letters or numbers belonging to the signal.
    const kept = tokens.map(textualSymbols).join('');
    if (
      kept === textualSymbols(raw) &&
      tokens.length > 0 &&
      tokens.every((token) => recognizedBy(token, language))
    ) {
      candidates.push({ language, tokens });
    }
  }
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  candidates.sort((a, b) => compareText(a.language.data.name, b.language.data.name));
  return { candidates };
}

// Candidate evidence is tested from strongest structural constraint to
// grounding: a complete grammar parse, complete known meaning, then concepts
// that exist in the supplied world. These are elimination gates, never scores.
// A gate with no survivors proves nothing; a tie moves to the next gate; only
// one survivor is a decision. None of this judges or learns the candidate.
function resolveLanguageReading(input, reading, langs, at, world) {
  if (!reading || !reading.candidates) return reading;
  const considered = reading.candidates;
  const trials = considered.map((candidate) => {
    const perceived = understand(input, langs, candidate);
    const thought = think(perceived, langs, at, world);
    const structured = structurePhrase(thought, langs);
    return {
      candidate,
      thought,
      grammatical: structured.length === 1 && !['thing', 'void'].includes(structured[0].kind),
    };
  });
  const eliminated = [];
  let possible = trials;
  possible = evidenceGate(possible, (trial) => trial.grammatical, 'grammar', eliminated);
  if (possible.length === 1) {
    return resolvedReading(possible[0], considered, 'grammar', eliminated);
  }

  possible = evidenceGate(
    possible,
    (trial) => completeMeaning(trial.thought),
    'meaning',
    eliminated,
  );
  if (possible.length === 1) {
    return resolvedReading(possible[0], considered, 'meaning', eliminated);
  }

  if (world) {
    possible = evidenceGate(
      possible,
      (trial) => completeGrounding(trial.thought, world),
      'world',
      eliminated,
    );
    if (possible.length === 1) {
      return resolvedReading(possible[0], considered, 'world', eliminated);
    }
  }

  if (at && at.language != null) {
    possible = evidenceGate(
      possible,
      (trial) => trial.candidate.language.data.name === at.language,
      'context',
      eliminated,
    );
    if (possible.length === 1) {
      return resolvedReading(possible[0], considered, 'context', eliminated);
    }
  }
  return eliminated.length > 0
    ? { candidates: possible.map((trial) => trial.candidate), eliminated }
    : reading;
}

// A gate that rejects every candidate has no evidence to distinguish them and
// therefore changes nothing. Otherwise it removes only the candidates that
// failed and records the exact primitive that did so.
function evidenceGate(possible, accepts, by, eliminated) {
  const survivors = possible.filter(accepts);
  if (survivors.length === 0 || survivors.length === possible.length) return possible;
  for (const trial of possible) {
    if (!survivors.includes(trial)) eliminated.push({ candidate: trial.candidate, by });
  }
  return survivors;
}

function resolvedReading(trial, candidates, resolvedBy, eliminated) {
  return {
    ...trial.candidate,
    candidates,
    resolvedBy,
    eliminated,
  };
}

function thoughtWays(root) {
  const thought = findBranch(root, 'thought');
  if (!thought) return [];
  return thought.state.ways || [thought.state.thought];
}

function completeMeaning(roots) {
  return roots.length > 0 && roots.every((root) => (
    thoughtWays(root).some((thought) => thought && thought.wordKnown)
  ));
}

function completeGrounding(roots, world) {
  return completeMeaning(roots) && roots.every((root) => (
    thoughtWays(root).some((thought) => (
      thought && thought.wordKnown && (
        thought.concept == null || world.term(thought.concept) != null
      )
    ))
  ));
}

function compareText(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

// Keep every complete reading visible without pretending their token trees are
// one tree. Until later evidence selects a candidate, an ambiguous signal has
// no language-specific sounds, words, grammar, mood or learning behavior.
function recordLanguageAmbiguity(roots, reading) {
  if (!reading || !reading.candidates || reading.language) return roots;
  const candidates = readingCandidates(reading);
  const eliminated = readingEliminations(reading);
  return roots.map((root) => withBranch(root, [
    ...root.branch,
    node('language', 'ambiguous', [], {
      matches: [],
      candidates,
      ...(eliminated.length > 0 ? { eliminated } : {}),
    }),
  ]));
}

function readingCandidates(reading) {
  return (reading && reading.candidates ? reading.candidates : []).map(({ language, tokens }) => ({
    lang: language.data.name,
    tokens: [...tokens],
  }));
}

function readingEliminations(reading) {
  return (reading && reading.eliminated ? reading.eliminated : []).map(({ candidate, by }) => ({
    lang: candidate.language.data.name,
    tokens: [...candidate.tokens],
    by,
  }));
}

// A selected candidate carries the evidence that selected it. Keeping that
// evidence on the perceived language makes the decision replayable from the
// returned tree rather than hiding it in control flow.
function recordLanguageResolution(roots, reading) {
  if (!reading || !reading.resolvedBy) return roots;
  const resolution = {
    by: reading.resolvedBy,
    candidates: readingCandidates(reading),
    eliminated: readingEliminations(reading),
  };
  return roots.map((root) => withBranch(root, root.branch.map((part) => (
    part.kind === 'language'
      ? withBranch(part, part.branch, { ...part.state, resolution })
      : part
  ))));
}

function textualSymbols(value) {
  return Array.from(String(value)).filter((ch) => /[\p{L}\p{N}]/u.test(ch)).join('');
}

function recognizedBy(identity, lang) {
  const symbols = Array.from(String(identity));
  return (
    symbols.length > 0 &&
    symbols.every((ch) => lang.isOwnSymbol(ch)) &&
    symbols.some((ch) => lang.isWordSymbol(ch))
  );
}

export function thing(prev) {
  const out = [];
  for (const n of prev) {
    if (!n.state.exists) {
      out.push(withBranch(n));
      continue;
    }
    const raw = n.state.raw;
    out.push(
      node('thing', quote(raw), [], {
        exists: true,
        identity: raw,
        charCount: Array.from(raw).length,
      }),
    );
  }
  return out;
}

export function quality(prev, langs) {
  return prev.map((n) => {
    if (!n.state.exists) return withBranch(n);
    const raw = n.state.identity;
    const branches = [];
    const visualSense = senseVisual(raw);
    if (visualSense) branches.push(visualSense);
    const soundSense = senseSound(raw, langs);
    if (soundSense) branches.push(soundSense);
    return withBranch(n, branches);
  });
}

function form(prev) {
  return prev.map((n) => {
    const shaped = walk(n, (b) => {
      if (b.kind !== 'quality' || b.name !== 'visual') return withBranch(b);
      return withBranch(b, [node('form', 'shape', [])]);
    });
    return shaped;
  });
}

function symbol(prev) {
  return prev.map((n) =>
    walk(n, (b) => {
      if (b.kind !== 'form' || b.name !== 'shape') return withBranch(b);
      return withBranch(b, [node('symbol', 'symbol', [])]);
    }),
  );
}

// ---------------------------------------------------------------------------
// Language recognition — driven ONLY by the loaded language data.
// Once one language can read the whole signal, each token is matched against
// that language's declared symbols and vocabulary.
// ---------------------------------------------------------------------------
function recognizeLanguage(roots, langs) {
  if (!langs || langs.length === 0) return roots;

  return roots.map((n) => {
    if (!n.state.exists) return withBranch(n);
    const identity = n.state.identity;
    // The whole-signal reading supplies one language here.
    const matching = [];
    for (const lang of langs) {
      // Every symbol falls within something this language declares — its
      // letters, its digits, whatever else it says it is written in. The brain
      // does not hold that words are made of letters.
      if (!recognizedBy(identity, lang)) continue;
      // Every reading this language has of the word. One is the usual case;
      // more than one is a word that names more than one thing, and which of
      // them the signal means is settled later, by the signal.
      const found = lang.lookupWord(identity);
      const readings = (found || []).map((word) => ({
        text: identity,
        pos: word.pos,
        meaning: word.meaning,
        concept: word.concept ?? null,
        marks: word.marks ?? null,
        negates: word.negates ?? false,
        choice: word.choice ?? null,
        classifies: word.classifies ?? null,
        stands: word.stands ?? null,
        role: word.role ?? null,
        when: word.when ?? null,
        names: word.names ?? null,
        groups: word.groups ?? null,
        quantifies: word.quantifies ?? null,
        on: word.on ?? null,
        person: word.person ?? null,
        number: word.number ?? null,
        proximity: word.proximity ?? null,
        select: word.select ?? null,
        functions: lang.functionsFor(word),
      }));
      matching.push({
        lang: lang.data.name,
        word: readings[0] ?? null,
        words: readings,
        roles: classifyRoles(identity, lang),
      });
    }

    if (matching.length === 0) {
      return withBranch(n);
    }

    const langNode = node('language', langNameOrNull(matching), [], {
      matches: matching,
    });
    return withBranch(n, [...n.branch, langNode]);
  });
}

function classifyRoles(identity, lang) {
  const roles = [];
  const lower = String(identity).toLowerCase().split('');
  for (const ch of lower) {
    const role = lang.roles ? roleOfSymbol(ch, lang) : 'symbol';
    roles.push(role);
  }
  return roles;
}

function roleOfSymbol(ch, lang) {
  for (const [type, set] of lang.roles) {
    if (set.has(ch)) return type;
  }
  return 'symbol';
}

// The brain names a language only by what the data says (the file's own
// "name" field); where ambiguous it stays unmapped.
function langNameOrNull(matches) {
  if (matches.length === 1) return matches[0].lang;
  if (matches.length > 1) return 'ambiguous';
  return null;
}

// ---------------------------------------------------------------------------
// think — reason over the understood meaning using the language's data.
// ---------------------------------------------------------------------------
function think(roots, langs, at, world) {
  const thought = roots.map((n) => {
    if (!n.state.exists) return withBranch(n);
    const langNode = findBranch(n, 'language');
    if (!langNode || !langNode.state.matches || langNode.state.matches.length === 0) {
      return withBranch(n);
    }
    const first = langNode.state.matches[0];
    // A word this language does not list may still be a number written in its
    // own figures. Reading one is the brain's own — the language says which
    // symbols it counts in, and the world need never have named the number.
    const lang = (langs || []).find((l) => l.data.name === first.lang) || null;
    const value = first.word || !lang ? null : lang.valueOfFigures(n.state.identity);
    const read = value != null;
    // A word no language lists may still be a name — one given in some
    // conversation and held in the world since. Nothing about a name is
    // special to the brain: it is a term, met by what it is called.
    const called = first.word || read || !world ? null : world.termNamed(n.state.identity);
    const readOf = (word) => {
      // A bare result value in focus holds no term: the pointer stands for the
      // amount itself, so it names no term and the value below is what counts.
      // A prior action resolves to its kind, never to an occurrence of it:
      // `did` means washing, not one washing.
      const result = word ? focusValue(word, at) : null;
      const pointed =
        word && word.marks === 'prior' ? (pointedAt(word, at, world) ?? word.concept ?? null) : null;
      return {
      language: first.lang,
      wordKnown: Boolean(word) || read || called != null,
      // A word nothing knows still stands where it stands. Standing where a
      // thing stands is what a name does, so that is what it is taken as —
      // and `wordKnown` stays false, because nothing knows it yet.
      pos: word ? word.pos : read ? lang.figuresPos : lang.unknownPos,
      meaning: word ? word.meaning : read || called != null ? String(n.state.identity) : null,
      concept: result != null ? null : pointed != null ? pointed : word
        ? oneMeant(pointedAt(word, at, world), world) ?? word.concept
        : read && world
          ? world.termFor(value)
          : called,
      value: word && word.marks === 'named' ? givenValue(word, at) : result ?? value,
      marks: word ? word.marks : null,
      negates: word ? word.negates : false,
      choice: word ? word.choice === true : false,
      classifies: word ? word.classifies ?? null : null,
      stands: word ? word.stands ?? null : null,
      role: word ? word.role : null,
      when: word ? word.when : null,
      names: word ? word.names : read ? false : null,
      // Whether the number was read off its figures rather than looked up as a
      // word. A language writes its numbers in words its own way, and only
      // words are written that way.
      figures: read,
      // Which scale a word compares on, where it says so.
      on: word ? word.on ?? null : null,
      groups: word ? word.groups : null,
      // How many of a kind a word speaks of, where the word says so itself.
      // `some thing` puts the quantifier beside the kind; `something` carries
      // it, and both say the same thing.
      quantifies: word ? word.quantifies ?? null : null,
      // Who a word is said of, and how many. The language's to say; the brain
      // reads third-person pointers as not the speaker nor who was spoken to.
      person: word ? word.person ?? null : null,
      number: word ? word.number ?? null : null,
      // How near what the pointer points at stands. The language's to say.
      proximity: word ? word.proximity ?? null : null,
      select: word ? word.select ?? null : null,
      functions: word ? word.functions ?? null : null,
      };
    };
    // A word that names more than one thing is thought of every way it may be
    // meant. The brain does not pick here: it has one word and not yet a
    // signal, and picking now would be guessing.
    const ways = (first.words && first.words.length > 1 ? first.words : [first.word]).map(readOf);
    const state = ways.length > 1 ? { thought: ways[0], ways } : { thought: ways[0] };
    return withBranch(n, [...n.branch, node('thought', 'understood', [], state)]);
  });
  return furthering(
    measuring(
      borrowing(
        intraSignal(compared(reshaped(thought, world, langs), world), world, langs, at),
        world,
      ),
      world,
    ),
    world,
  );
}

// A word saying *in addition* beside a number is part of the amount.
//
// English says `two more flowers` for two further flowers, and the word it
// uses is the same one it uses to say one thing stands above another. There is
// no primitive called *more*: standing above is the comparison, and further is
// arithmetic the brain already does. Beside a number the word says neither of
// itself — the number is the whole of what it adds — so it stands aside and
// lets the amount speak.
//
// Away from a number it is untouched, and `tom has more books than sam` still
// compares.
function furthering(roots, world) {
  if (!world) return roots;
  const a = world.anchors || {};
  if (a.more == null) return roots;
  const amount = (n) => n != null && numberOf(n, world) != null;
  return roots.filter((n, at) => {
    if (conceptOf(n) !== a.more) return true;
    // Between two amounts it is comparing them: five is more than two. It only
    // stands aside where an amount is on one side of it and a kind on the
    // other — two more flowers — because there the number is the whole of what
    // it adds.
    const stands = (one) => one != null && (conceptOf(one) != null || numberOf(one, world) != null);
    const before = nearestOver(roots, at, -1, stands);
    const after = nearestOver(roots, at, 1, stands);
    return !(amount(before) && after != null && !amount(after));
  });
}

// So much of something is not a kind of it.
//
// `the room is 30 degree` says how warm the room is, and the weakest claim a
// signal can make — being — was all the brain had to go on, so it took the
// room to be a degree. A unit with a number beside it names a stronger claim
// than being: it says the thing is measured, and what the unit measures is
// what it is measured on.
//
// Only the weakest claim gives way. A signal that already named what it meant
// — weighing, reading — said something more particular than measuring, and
// that stands.
export function measuring(roots, world) {
  if (!world) return roots;
  const a = world.anchors || {};
  if (a.unit == null || a.measure == null) return roots;
  // A signal that says where a state begins or ends is not saying how much of
  // something a thing is. `hot is above thirty degrees` says what hot is, and
  // the amount belongs to the band and not to any hot thing.
  const bounding = (n) =>
    conceptOf(n) != null && (conceptOf(n) === a.above || conceptOf(n) === a.below);
  if (roots.some(bounding)) return roots;

  const isUnit = (n, at) =>
    n.state.exists &&
    conceptOf(n) != null &&
    world.isA(conceptOf(n), a.unit) &&
    numberBeside(roots, at, world);
  const measured = roots.some(isUnit);
  if (!measured) return roots;

  // An amount, a unit, and what it is an amount *of* are one thing said, not
  // three things standing in a row. Two metres tall is a height; the state
  // says which quantity, and the unit alone could not — it serves a height, a
  // length and a size alike.
  //
  // So the state is taken into the measure rather than left standing beside
  // it. A signal saying how tall something is says one thing about it.
  // A quantity taken from another thing, rather than from some one thing
  // nobody names. A distance is measured from whatever it is measured from,
  // and the signal has to say; a height is measured from the ground and never
  // says. So a reference standing in the signal is itself what names the
  // quantity.
  const relational = (of) =>
    a.reference != null &&
    a.thing != null &&
    (world.related(of, a.reference) || []).includes(a.thing);
  const named = roots.some((n) => roleOn(n) === 'source');

  const absorbed = new Set();
  const measures = new Map();
  roots.forEach((n, at) => {
    if (!isUnit(n, at)) return;
    const serves = world.related(conceptOf(n), a.measure) || [];
    if (serves.length < 2) return;
    // Said what it is taken from, that is the quantity: the only one this unit
    // serves that is taken from another thing at all.
    if (named) {
      const of = serves.find(relational);
      if (of != null) {
        measures.set(at, of);
        return;
      }
    }
    for (const step of [1, -1]) {
      const beside = roots[at + step];
      if (!beside || absorbed.has(at + step)) continue;
      // A state may stand on more than one quantity — a rope is long and so is
      // a meeting, and neither is long in the other's way — so which one is
      // meant is the one this unit reads: metres say length, hours say time.
      const of = quantitiesOn(conceptOf(beside), world).find((one) => serves.includes(one));
      if (of == null) continue;
      measures.set(at, of);
      absorbed.add(at + step);
      break;
    }
  });

  return roots
    .map((n, at) => {
      if (measures.has(at)) {
        return withBranch(
          n,
          (n.branch || []).map((b) =>
            b.kind === 'thought'
              ? withBranch(b, b.branch, {
                  ...b.state,
                  thought: { ...b.state.thought, measures: measures.get(at) },
                })
              : b,
          ),
        );
      }
      if (conceptOf(n) !== world.baseRelation) return n;
      return withBranch(
        n,
        (n.branch || []).map((b) =>
          b.kind === 'thought'
            ? withBranch(b, b.branch, { ...b.state, thought: { ...b.state.thought, concept: a.measure } })
            : b,
        ),
      );
    })
    .filter((n, at) => !absorbed.has(at));
}

// The quantity a state is a state of. The world says which; where it says
// nothing, the state is a state of nothing measurable.
// Which quantity a state is a state of. Measuring runs one way — a gram
// measures weight, and weight measures heavy — so what a state is measured on
// is found by asking what measures it, never by reading a link off the state.
export function quantityOn(state, world) {
  const of = quantitiesOn(state, world);
  return of.length ? of[0] : null;
}

// What a clause leaves unsaid, taken from what stands beside it.
//
// `tom has five books, and mary has three` says three of the same thing and
// never says of what. A number standing where a thing stands counts
// something; where nothing beside it says what, the brain takes what was
// counted alongside it.
//
// It borrows only what was actually counted there. Nothing counted beside it,
// nothing borrowed — the number is left standing as it is, and the brain says
// what it has rather than filling the gap with a guess.
function borrowing(roots, world) {
  if (!world) return roots;
  const a = world.anchors || {};
  const isNumber = (n) =>
    n && n.state.exists && (world.isA(conceptOf(n), a.number) || numberOf(n, world) != null);

  // Which numbers something has already taken as its count, and what each of
  // those things was. A number already counting something is not left unsaid.
  const taken = new Set();
  const alongside = [];
  roots.forEach((n, at) => {
    const count = quantityOf(roots, at, world);
    if (!count) return;
    if (count.said) taken.add(count.said);
    if (conceptOf(n) != null) alongside.push({ at, of: conceptOf(n) });
  });

  return roots.map((n, at) => {
    if (!isNumber(n) || taken.has(n)) return n;
    const value = numberOf(n, world);
    if (value == null) return n;
    // The nearest thing counted before it. What comes after cannot be what a
    // word already spoken was leaning on.
    let of = null;
    for (const one of alongside) if (one.at < at) of = one.of;
    if (of == null) return n;
    return withBranch(
      n,
      (n.branch || []).map((b) =>
        b.kind === 'thought'
          ? withBranch(b, b.branch, {
              ...b.state,
              thought: { ...b.state.thought, concept: of, counts: value },
            })
          : b,
      ),
    );
  });
}

export function compared(roots, world) {
  if (!world) return roots;
  const a = world.anchors || {};
  if (a.measure == null || a.compares == null) return roots;
  // Which scale a comparison is made along, traced rather than read off the
  // word: the comparison says which state it compares, and the state is
  // measured by exactly one scale. A word never has to carry it.
  // What a comparison is made along. An ordering names its scale outright; a
  // state that is on no scale is its own, and names none.
  const scaleOf = (comparison) => {
    const of = world.linked(comparison, a.compares)[0];
    if (of == null) return null;
    // A scale is what measures states. Being a property does not tell it from
    // one — a state is a property too — so what it measures does.
    if (world.linked(of, a.measure).length > 0) return of;
    return world.members(of, a.measure)[0] ?? null;
  };
  return roots.map((n) => {
    const thought = thoughtOf(n);
    if (!thought || thought.concept == null) return n;
    // A word may name the state and leave its ending to say it compares, or it
    // may name the comparison outright. Both arrive here at the same place.
    if (world.linked(thought.concept, a.compares).length > 0) {
      const held = { ...thought, on: scaleOf(thought.concept) };
      return withBranch(n, n.branch.map((b) =>
        b.kind === 'thought' ? withBranch(b, b.branch, { ...b.state, thought: held, settled: true }) : b,
      ));
    }
    if (!functionList(thought).includes('comparison')) return n;
    const state = thought.concept;
    // Comparing is made on a state, and the world names the comparison made on
    // each one. Nothing here ranks the states: hot is not above cool, they are
    // two states of one scale, and which of them is being compared on is the
    // whole of what the signal said. The other reading of the same fact is
    // that comparison's declared converse, which the world supplies and the
    // brain never names.
    const orderings = orderingsOf(state, world);
    const ordering = orderings[0] ?? null;
    // A word that says it compares and has no ordering to compare along says
    // nothing the brain can read. It is marked as that — unplaced — and never
    // left to stand as the plain state it was made from, because a later
    // reading would take the word for a quality and answer from it.
    if (ordering == null) {
      return withBranch(n, n.branch.map((b) =>
        b.kind === 'thought'
          ? withBranch(b, b.branch, { ...b.state, thought: { ...thought, unplaced: true } })
          : b,
      ));
    }
    const compares = {
      ...thought,
      concept: ordering.relation,
      on: ordering.scale ?? scaleOf(ordering.relation),
      toward: ordering.toward,
      compares: state,
      names: false,
      // Where the state is read on several scales alike, every one of them is
      // carried, and what is being compared settles which is meant. A word
      // cannot know whether a long thing is long in metres or in hours; the
      // things it is said of already stand on one scale or the other.
      among: orderings.length > 1
        ? orderings.map((one) => ({ relation: one.relation, on: one.scale }))
        : null,
    };
    return withBranch(n, n.branch.map((b) =>
      b.kind === 'thought' ? withBranch(b, b.branch, { ...b.state, thought: compares }) : b,
    ));
  });
}

// Focus tracked from the current tree: a third-person pointer (`it`, `them`)
// with nowhere to land — no previous topic — looks at entities already
// understood earlier in the SAME signal first. The nearest thing to the left
// is what is meant; with nothing to the left there is no forward reference,
// and the word keeps naming nothing. Relations, properties and numbers never
// join: joints are what is said, not what is spoken of. Where a previous
// topic already resolved the pointer, that stands — except where the pointer
// opens a new clause after a conjunction (its own signal first), or where it
// names nobody in particular but its bearer holds exactly one kind while the
// speaker's own (a third person is neither who spoke nor who was spoken to).
// A role-marked pointer (`from it`) always keeps reaching across signals:
// what a word is marked for beats recency, in this signal or any other. That
// a clause is a fresh start, and that marked words keep their mark, is the
// brain's; which words join and which mark is the language's.
function intraSignal(roots, world, langs, at) {
  if (!world) return roots;
  const a = world.anchors || {};
  if (a.thing == null) return roots;
  const seen = [];
  const rewrite = (n, concept) => {
    seen.push(concept);
    return withBranch(
      n,
      (n.branch || []).map((b) =>
        b.kind === 'thought'
          ? withBranch(b, b.branch, { ...b.state, thought: { ...b.state.thought, concept } })
          : b,
      ),
    );
  };
  const speakerSide = (id) =>
    id != null &&
    at != null &&
    ((at.from != null && (id === at.from || world.isA(id, at.from))) ||
      (at.to != null && (id === at.to || world.isA(id, at.to))));
  const heldKinds = (id) => {
    const held = [];
    if (id == null) return held;
    for (const of of world.linked(id, a.holding)) if (!held.includes(of)) held.push(of);
    return held;
  };
  return roots.map((n, i) => {
    const t = thoughtOf(n);
    if (!t || t.marks !== 'spoken' || t.person !== 'third') {
      if (t && t.concept != null && world.isA(t.concept, a.thing)) seen.push(t.concept);
      return n;
    }
    // A pointer already holding a result value is resolved; the current tree
    // must not steal it back to a neighbour.
    if (t.concept == null && t.value != null) return n;
    if (seen.length === 0 && t.concept == null) return n;
    if (t.concept != null) {
      if (i > 0 && functionsOf(roots[i - 1]).includes('join')) {
        if (seen.length > 0) return rewrite(n, seen[seen.length - 1]);
        return n;
      }
      // Role-marked first: `from it` is its source wherever it stands.
      if (langs && markerFor(roots, i, markingSide(roots, langs), roleOn)) return n;
      // A bare pointer stands for what is held, not for whoever holds it —
      // where the brain knows the holder is somebody. `i have three chocolates`
      // says so of the speaker; `nila is a person` says so of nila. Where it
      // knows nothing of the holder, both of them are things it was told
      // about and there is nothing to tell them apart, so the pointer stays
      // where it landed.
      const somebody = (id) =>
        speakerSide(id) || (a.person != null && id != null && world.isA(id, a.person));
      const held = t.stands == null && somebody(t.concept) ? heldKinds(t.concept) : [];
      if (held.length === 1) return rewrite(n, held[0]);
      return n;
    }
    // A pointer lands only where exactly one thing fits. Which kind a pointing
    // word stands for is its language's to declare; the brain drops whatever
    // cannot be that kind and takes what is left, and where none or more than
    // one is left it says nothing rather than taking the nearest and hoping.
    const fits = [];
    for (let at = seen.length - 1; at >= 0; at -= 1) {
      const candidate = seen[at];
      if (fits.includes(candidate)) continue;
      if (t.stands != null && world.excludes(candidate, t.stands)) continue;
      fits.push(candidate);
    }
    if (t.stands == null) return rewrite(n, seen[seen.length - 1]);
    return fits.length === 1 ? rewrite(n, fits[0]) : n;
  });
}

// What one word came to may not be what the words come to together. Having
// thought each on its own, the brain looks at them side by side and takes the
// ones that are really one thing as one: a sign for taking away, standing
// where there is nothing to take from, is not an operation but part of the
// number after it — `-500` is five hundred below nothing.
function reshaped(roots, world, langs) {
  if (!world) return roots;
  const a = world.anchors || {};
  const amount = (n) => (n ? numberOf(n, world) : null);
  const out = [];
  for (let i = 0; i < roots.length; i += 1) {
    const here = roots[i];
    const next = roots[i + 1];
    const before = out[out.length - 1];
    // Only a sign may be written against a number. A word for taking away
    // stands before what it takes and is not part of it: `subtract one apple`
    // takes one, and does not name minus one. The language says which of its
    // words are the name of a thing and which are another way to write it.
    const sign = thoughtOf(here);
    const written = sign != null && sign.names === false;
    const takesAway = a.minus != null && conceptOf(here) === a.minus && written;
    if (takesAway && next && amount(next) != null && amount(before) == null) {
      out.push(below(here, next, world));
      i += 1;
      continue;
    }
    out.push(here);
    // Two number words side by side are one number only where their language
    // declares a matching reduction. The brain supplies adjacent values; the
    // language supplies their order/divisibility constraints and operation.
    while (out.length > 1) {
      const joined = together(out[out.length - 2], out[out.length - 1], world, langs);
      if (!joined) break;
      out.splice(out.length - 2, 2, joined);
    }
  }
  return out;
}

// Two number words that their language reduces to one number, or nothing.
// Only words: figures are already whole as written.
export function together(here, next, world, langs) {
  const left = inWords(here, world);
  const right = inWords(next, world);
  if (left == null || right == null || left < 1 || right < 1) return null;
  const firstThought = thoughtOf(here);
  const language = firstThought ? firstThought.language : null;
  const spoken = (langs || []).find((lang) => lang.data.name === language);
  const value = spoken ? spoken.joinNumbers(left, right) : null;
  if (value == null) return null;
  const said = `${here.state.identity} ${next.state.identity}`;
  const thought = { ...thoughtOf(next), value, concept: world.termFor(value), meaning: said };
  return withBranch(
    Object.assign({}, next, { name: quote(said), state: { ...next.state, identity: said } }),
    (next.branch || []).map((b) =>
      b.kind === 'thought' ? withBranch(b, b.branch, { ...b.state, thought }) : b,
    ),
  );
}

// The number a word says, where a word said it and not a run of figures.
function inWords(n, world) {
  const thought = n ? thoughtOf(n) : null;
  if (!thought || thought.figures) return null;
  const value = numberOf(n, world);
  return Number.isInteger(value) ? value : null;
}

// One word standing for how far below nothing a number is.
export function below(sign, number, world) {
  const value = numericNegate(numberOf(number, world));
  const thought = thoughtOf(number) || {};
  const said = `${sign.state.identity}${number.state.identity}`;
  const rebuilt = { ...thought, value, concept: world.termFor(value), meaning: said };
  return withBranch(
    Object.assign({}, number, { name: quote(said), state: { ...number.state, identity: said } }),
    (number.branch || []).map((b) =>
      b.kind === 'thought' ? withBranch(b, b.branch, { ...b.state, thought: rebuilt }) : b,
    ),
  );
}

// A pointer means something different every time it is said, so no world can
// hold what it points at. That a word may point is the brain's; which words do
// it is the language's (`marks`); what they land on is the circumstance of this
// one signal — where it came from, where it went, and what was last spoken of.
// Told none of them, the brain does not guess, and the word names nothing.
function pointedAt(word, at, world) {
  if (word.marks === 'from') return (at && at.from) ?? null;
  if (word.marks === 'to') return (at && at.to) ?? null;
  if (word.marks === 'spoken') {
    // Nearer or farther topics first: `this` the nearest thing in mind,
    // `that` the farthest. Ranks, never guesses: one topic answers either
    // way. Words without proximity keep the head shortcut below.
    if ((word.proximity === 'near' || word.proximity === 'far') && world) {
      const thing = world.anchors ? world.anchors.thing : null;
      const topics = (at && Array.isArray(at.focus) ? at.focus : []).filter(
        (id) => typeof id === 'number' && (thing == null || world.isA(id, thing)),
      );
      if (topics.length > 0) return word.proximity === 'far' ? topics[topics.length - 1] : topics[0];
    }
    // The focus head first: a worked result or held kind outranks the older
    // topic — but never a doing. An action-kind head would resolve to one of
    // its occurrences below, pointing at history instead of the topic.
    // Non-id heads (bare values) carry no term and are read for value
    // separately; the topic id stays the fallback.
    const head = at && Array.isArray(at.focus) ? at.focus[0] : undefined;
    const action = world && world.anchors ? world.anchors.action : null;
    if (typeof head === 'number' && !(action != null && world && world.isA(head, action))) return head;
    return (at && at.spoken) ?? null;
  }
  // A word standing for the last action: what was just done, repeated. The
  // record holds every occurrence stamped; the latest one is what `did`
  // means. That repetition exists is the brain's; which word says it is the
  // language's.
  if (word.marks === 'prior') {
    const focus = at && Array.isArray(at.focus) ? at.focus : [];
    const action = world && world.anchors ? world.anchors.action : null;
    if (action != null && world) {
      const found = focus.find((id) => typeof id === 'number' && world.isA(id, action));
      if (found != null) return found;
    }
    return null;
  }
  // A word given a name in this conversation stands for whatever it was given.
  // Which word was given what is the circumstance's, the same as the rest.
  if (word.marks === 'named') return given(word, at).of ?? null;
  return null;
}

// A pointer lands on one thing, never on a kind: `i` is whoever sent this, not
// people. Where the circumstance names a kind and the world holds one of it,
// that one is who is meant; where it holds none, the kind stands until
// something is said that makes one.
function oneMeant(concept, world) {
  if (concept == null || !world || world.isIndividual(concept)) return concept;
  return world.oneOf(concept) ?? concept;
}

// The bare value a focus head holds where it holds no term: a worked sum the
// world never named (`beyond`) stays in mind as its value, so a later number
// beside it still counts.
function focusValue(word, at) {
  if (!word || word.marks !== 'spoken' || word.person !== 'third') return null;
  const head = at && Array.isArray(at.focus) ? at.focus[0] : undefined;
  return head && typeof head === 'object' && typeof head.value === 'number' ? head.value : null;
}

// A bare third-person pointer on speaker-side focus stands for what is held,
// not who holds it — the same shift judge applies to bare identity questions,
// but here at the word, so actions (`wash them`) reach the held kind too.
export function given(word, at) {
  return (at && at.names && at.names[word.text]) || {};
}

function givenValue(word, at) {
  const held = given(word, at);
  return held.value ?? null;
}

// ---------------------------------------------------------------------------
// solve — reason about the understood meaning. The brain infers what the word
// names by walking the world's `is` chain to its own anchors: the brain owns
// the categories, the world owns the membership. A word that names no term
// gets no category — the brain does not guess from the part of speech.
// ---------------------------------------------------------------------------
function solve(roots, world, langs, mood, allocate) {
  // Whose a thing is settles what it names, and a word nothing knows is named
  // only where it stands in a claim — so whose comes first, or a claim resting
  // on a pointer that landed on nothing would still name something.
  const positioned = calledHere(contextual(roots, world), world, langs);
  const settled = pointingAgain(
    drawn(
    described(
      calling(
        naming(
          stoodFor(
            sortsOf(standsIn(whose(settle(positioned, world), world, langs, mood, allocate), world), world),
            world,
            langs,
          ),
          world,
          langs,
          mood,
          allocate,
        ),
        world,
        langs,
        mood,
        allocate,
      ),
      world,
      langs,
      mood,
      allocate,
    ),
      world,
      langs,
      mood,
      allocate,
    ),
    world,
  );
  return settled.map((n, at) => {
    if (!n.state.exists) {
      return withBranch(n, [...n.branch, node('response', 'nothing', [])]);
    }
    const thought = findBranch(n, 'thought');
    const lang = findBranch(n, 'language');
    const thoughtState = thought ? thought.state.thought : null;
    const meaning = thoughtState ? thoughtState.meaning : null;
    const language = lang && lang.state.matches && lang.state.matches[0]
      ? lang.state.matches[0].lang
      : null;

    const result = withBranch(n, [...n.branch, node('response', meaning || 'unrecognized', [], { language })]);

    // Innate reasoning follows the world term the language supplied. Its POS
    // remains an opaque token used only by the grammar parser.
    const known = worldNode(thoughtState ? thoughtState.concept : null, world);
    if (known) result.branch.push(known);

    const count = quantityOf(settled, at, world);
    if (count != null) {
      result.branch.push(
        node('quantity', 'quantity', [], { concept: count.concept, value: count.value }),
      );
    }

    // A word beside a thing may say whether one is being introduced or the one
    // already spoken of is meant. Which word does that is the language's.
    const marked = markOf(settled, at, world, langs);
    if (marked) result.branch.push(node('mark', marked, []));

    return result;
  });
}

// One of many already brought in.
//
// A count brings in a collection — two dogs are two dogs — and what the signal
// says next may speak of them one at a time. `one is white and another is grey`
// does not bring in two more things: it reaches into the two that are there and
// takes them one apiece. Which words do the reaching is the language's to say;
// a bare number does it too, since a number standing where a thing stands, with
// a collection of a kind in reach, is that many of them.
//
// Each one drawn is a thing of the collection's kind, and what is said beside
// it is said of it rather than of the number or of the kind.
function drawn(roots, world, langs, mood, allocate) {
  if (!world || mood !== 'tell' || typeof allocate !== 'function') return roots;
  const a = world.anchors || {};
  if (a.thing == null) return roots;
  const thing = (n) => {
    const of = conceptOf(n);
    return of != null && world.isA(of, a.thing) && !world.isA(of, a.number);
  };
  // The collection: a count standing beside a kind.
  let of = null;
  for (const [i, n] of roots.entries()) {
    const many = numberOf(n, world);
    if (many == null || many < 2) continue;
    const beside = nearestOver(roots, i, 1, thing, describing(world));
    if (beside) {
      of = conceptOf(beside);
      break;
    }
  }
  if (of == null) return roots;
  const kind = world.term(of);
  if (!kind) return roots;
  // A word that reaches into what is there, or a number standing where a thing
  // stands. A number counting something has that thing next to it — `two dogs`
  // — while a number standing on its own has whatever is said of it next
  // instead, and that is a number spoken of as a thing.
  const stands = (n) => n != null && n.state.exists && conceptOf(n) != null;
  const reaches = (n, i) => {
    if (functionsOf(n).includes('member')) return true;
    if (numberOf(n, world) == null) return false;
    // What stands next says something of it, rather than being the kind it
    // counts. A word stands here as one of the four ways of existing, and that
    // is what is asked — not what the world says its term may also be. A
    // sister is a thing and a relation both, and `two sisters` counts sisters.
    const next = nearestOver(roots, i, 1, stands);
    return next != null && findBranch(next, 'relation') != null;
  };
  return roots.map((n, i) => {
    if (!n.state.exists || findBranch(n, 'call') || !reaches(n, i)) return n;
    // A word standing for every one of them speaks of the collection itself,
    // and draws nothing out: `both are white` says it of the two, not of one
    // of them and then the other.
    if (a.all != null && conceptOf(n) === a.all) {
      const thought = thoughtOf(n) || {};
      return withBranch(
        n,
        (n.branch || []).map((b) =>
          b.kind === 'thought'
            ? withBranch(b, b.branch, { ...b.state, thought: { ...thought, concept: of, wordKnown: true } })
            : b,
        ),
      );
    }
    const id = allocate();
    const thought = thoughtOf(n) || {};
    return withBranch(n, [
      ...(n.branch || []).map((b) =>
        b.kind === 'thought'
          ? withBranch(b, b.branch, {
              ...b.state,
              thought: { ...thought, concept: id, wordKnown: true },
            })
          : b,
      ),
      node('call', `${kind.name}#${id}`, [], {
        name: `${kind.name}#${id}`,
        id,
        of,
        made: true,
      }),
    ]);
  });
}

// A thing told apart by a quality is a particular thing.
//
// `the red box is inside the blue box` speaks of two boxes, not of box twice.
// Nobody named either of them, but each was picked out — one is the red one,
// the other the blue one — and picking a thing out is as much a way of
// bringing it into a conversation as naming it. Without this both come to the
// same kind, and the signal reads as a box inside itself.
//
// Only where a quality stands beside it, and only of a kind: something the
// world already holds as one thing is already that one thing, and describing
// it further does not make a second.
function described(roots, world, langs, mood, allocate) {
  if (!world || mood !== 'tell' || typeof allocate !== 'function') return roots;
  const a = world.anchors || {};
  if (a.thing == null || a.property == null) return roots;
  const side = markingSide(roots, langs);
  // How something is, not how many of it there are. A word saying how many
  // stands beside a thing the same way, and it picks nothing out: all cats are
  // still cats, and no particular cat was brought in by saying so.
  const quality = (n) => {
    const of = conceptOf(n);
    if (of == null || !functionsOf(n).includes('modifier')) return false;
    if (a.quantity != null && world.isA(of, a.quantity)) return false;
    return world.isA(of, a.property);
  };
  const describes = (i) => {
    const found = markerFor(roots, i, side, quality);
    return found ? conceptOf(found) : null;
  };
  // Two of one kind, told apart, are two things. One on its own is not: `the
  // tallest pig is quiet` says something of pigs, and `the sweet one is hot`
  // claims one fact — a quality there narrows the kind rather than bringing in
  // something new. It is standing beside another of the same kind, described
  // otherwise, that leaves no reading but two.
  const told = (i, of) =>
    roots.some((other, at) => {
      if (at === i || conceptOf(other) !== of) return false;
      const how = describes(at);
      return how != null && how !== describes(i);
    });
  return roots.map((n, i) => {
    const of = conceptOf(n);
    if (of == null || world.isIndividual(of) || !world.isA(of, a.thing)) return n;
    if (findBranch(n, 'call')) return n;
    if (describes(i) == null || !told(i, of)) return n;
    const id = allocate();
    const thought = thoughtOf(n);
    return withBranch(n, [
      ...n.branch.map((b) =>
        b.kind === 'thought'
          ? withBranch(b, b.branch, { ...b.state, thought: { ...thought, concept: id } })
          : b,
      ),
      node('call', `${world.term(of).name}#${id}`, [], {
        name: `${world.term(of).name}#${id}`,
        id,
        of,
        made: true,
      }),
    ]);
  });
}

// A word somebody gave as a name in this conversation reaches what they gave
// it to, whatever else the word means. The world is unchanged: it goes on
// calling a river a river, and the next conversation will too.
//
// Unless the signal says one of many. A name is one thing — nobody eats *an*
// apple the company, and three apples are not three of it either — so a word
// marked as one of a kind, counted, or said in the plural is the world's word
// however this conversation has used it. `i ate an apple while watching the
// apple product launch` says both in one breath, and that is what tells them
// apart.
function calledHere(roots, world, langs) {
  if (!world) return roots;
  const side = markingSide(roots, langs);
  return roots.map((n, i) => {
    const thought = thoughtOf(n);
    if (!thought || thought.figures) return n;
    const here = graph ? graph.namedIn(n.state.identity) : null;
    if (here == null || here === thought.concept) return n;
    // The conversation says which thing; the world must still hold it, and
    // hold it under the word that was said. What another conversation called
    // something reaches nothing here.
    const term = world.term(here);
    const held = term && typeof term.name === 'string' ? term.name.split('#')[0] : null;
    if (held == null || held.toLowerCase() !== String(n.state.identity).toLowerCase()) return n;
    // A name is one thing. Said of one of many — marked as one of a kind,
    // counted, or said in the plural — the word is the world's.
    if (markOn(markerFor(roots, i, side, markOn)) === 'new') return n;
    if (thought.number === 'plural' || numberBeside(roots, i, world)) return n;
    return withBranch(
      n,
      (n.branch || []).map((b) =>
        b.kind === 'thought'
          ? withBranch(b, b.branch, {
              ...b.state,
              thought: { ...thought, concept: here, wordKnown: true },
            })
          : b,
      ),
    );
  });
}

// A word said as a name is a name, whatever else it means.
//
// Somebody may call a pet `river`, and a river is a thing the world already
// knows. Without this the brain reads the word it knows and answers that the
// pet is a body of water. Which word says a name is coming is the language's —
// English has `called` and `named` — and the brain takes what follows as a
// name rather than as a meaning.
//
// The name is given to whatever stands on the other side of the naming word.
// It holds for as long as the conversation does: the world goes on calling a
// river a river.
function naming(roots, world, langs, mood, allocate) {
  if (!world || mood !== 'tell') return roots;
  const a = world.anchors || {};
  const at = roots.findIndex((n) => functionsOf(n).includes('naming'));
  if (at < 0) return roots;

  const stands = (n) => n != null && n.state.exists && conceptOf(n) != null;
  // Whatever is being named is a thing, never the word joining it to its name.
  const thing = (n) =>
    stands(n) && a.thing != null && world.isA(conceptOf(n), a.thing) &&
    !(a.relation != null && world.isA(conceptOf(n), a.relation));
  // `is called` — the word joining the thing to its naming is stepped over,
  // and it is where the two sides meet once they change places.
  const joining = (n) =>
    stands(n) && a.relation != null && world.isA(conceptOf(n), a.relation);
  const given = nearestOver(roots, at, 1, stands);
  const whose = nearestOver(roots, at, -1, thing, joining);
  if (given == null || whose == null) return roots;
  const held = roots.indexOf(whose);
  let mid = -1;
  for (let i = held + 1; i < at; i += 1) if (joining(roots[i])) mid = i;
  if (mid < 0) return roots;

  // The word given as a name is not the world's word any more. Stripped of
  // what it meant, it is a word nothing knows standing where a thing stands,
  // and that is already how a signal brings something in and calls it
  // something: `bruno is a dog`. So the signal is put that way round — the
  // name said first, what it is second — and the naming word itself, having
  // said which word is a name, drops out.
  const bare = withBranch(
    given,
    (given.branch || []).map((b) =>
      b.kind === 'thought'
        ? withBranch(b, b.branch, {
            ...b.state,
            thought: { ...b.state.thought, concept: null, wordKnown: false, meaning: null },
          })
        : b,
    ),
  );
  return [bare, roots[mid], ...roots.slice(0, mid)];
}

// A pointing word may look back at something this very signal is bringing in.
// While the signal was being thought about there was nothing to find — the
// thing had not been given an identity yet, and only what the world already
// held could be considered — so the pointer is put the same question again
// once names have been given.
//
// The rule is the one it was asked before: walk what has been met, drop
// whatever cannot be what the word stands for, and take what is left only if
// exactly one remains.
function pointingAgain(roots, world) {
  if (!world) return roots;
  const a = world.anchors || {};
  if (a.thing == null) return roots;
  const seen = [];
  return roots.map((n) => {
    const t = thoughtOf(n);
    if (!t) return n;
    // A thing named in this signal is met by the identity it was just given;
    // one the world already held is met by its own.
    const call = findBranch(n, 'call');
    const met = call ? call.state.id : t.concept;
    if (t.marks !== 'spoken' || t.person !== 'third' || t.concept != null) {
      if (met != null && (call || world.isA(met, a.thing))) seen.push(met);
      return n;
    }
    // A pointer already standing for an amount is resolved. It names no term
    // because the amount is the whole of what it stands for, and asking again
    // would take it back to whatever happens to stand nearby.
    if (t.value != null) return n;
    const fits = [];
    for (let at = seen.length - 1; at >= 0; at -= 1) {
      const candidate = seen[at];
      if (fits.includes(candidate)) continue;
      if (t.stands != null && world.excludes(candidate, t.stands)) continue;
      fits.push(candidate);
    }
    if (fits.length !== 1) return n;
    return withBranch(
      n,
      (n.branch || []).map((b) =>
        b.kind === 'thought'
          ? withBranch(b, b.branch, { ...b.state, thought: { ...b.state.thought, concept: fits[0] } })
          : b,
      ),
    );
  });
}

// A thing may be whose. `my cat` is not cats, it is the one cat the sender has,
// and the brain reads it as that one thing: which word says whose is the
// language's (`functions: "possessor"`), and whom it points at is the circumstance's.
//
// Where the world already holds one such thing, that is the one meant. Where it
// holds none and the signal is telling, one is made and given to whoever it
// belongs to. Where it holds more than one there is no *the* to resolve, and
// the brain does not pick.
function whose(roots, world, langs, mood, allocate) {
  if (!world) return roots;
  const a = world.anchors || {};
  if (a.has == null) return roots;
  const side = markingSide(roots, langs);
  const possessive = (n) => (n && functionsOf(n).includes('possessor') ? n : null);
  const owning = (n) => {
    const t = n ? thoughtOf(n) : null;
    return t && functionsOf(n).includes('possessor') && t.concept != null ? t.concept : null;
  };
  // What the long way round spends: the joint, and the thing on its far side.
  // Both are saying whose it is and say nothing else, so nothing reads them
  // again — read again, they offered the roof holding the shed.
  const spent = new Set();
  return roots.map((n, i) => {
    if (spent.has(i)) return unnamed(n);
    const kind = conceptOf(n);
    if (kind == null) return n;
    // A possessive is a pointer like any other: told nothing for it to land
    // on, it is nobody, and what it marks is nobody's. The brain does not read
    // past it to the word alone — `its name` with nothing spoken of is not the
    // name relation standing on its own, it is nothing at all.
    const marked = markerFor(roots, i, side, possessive);
    if (marked && owning(marked) == null) return unnamed(n);
    // A possessive names one thing that owns, never a kind: `the movie's name`
    // is the name of the one movie there is, not of movies.
    if (functionsOf(n).includes('possessor')) {
      const one = oneMeant(kind, world);
      return one === kind ? n : standingFor(n, one);
    }
    if (!world.isA(kind, a.thing) || world.isIndividual(kind)) return n;
    // Being somebody's friend is not having a friend. Where the world says the
    // word is a relation, the one it belongs to is the other end of it, and
    // nothing is made to be owned.
    if (a.relation != null && world.isA(kind, a.relation)) return n;
    // Whose it is may be said the long way round. `the roof of the shed` is the
    // shed's roof: the joint English says holding with stands between them, and
    // what owns is on its far side. Read as two things joined instead, it made
    // the roof hold the shed, and then said what followed of the shed rather
    // than of the roof — three facts, and all of them wrong.
    //
    // Which word joins them is the language's; that the far side is the one
    // that owns is what the joint says.
    const farSide = () => {
      const joint = roots[i + 1];
      if (!joint || conceptOf(joint) !== a.has) return null;
      // Only where the language *writes* the holding as a joint between two
      // things rather than naming it. `a shelf has books` names it, and the one
      // that owns stands before; `the roof of the shed` writes it, and the one
      // that owns stands after. The language says which of its words name a
      // thing and which are another way to write it.
      const said_ = thoughtOf(joint);
      if (!said_ || said_.names !== false) return null;
      const at = roots.findIndex((one, j) => j > i + 1 && conceptOf(one) != null);
      const of = at < 0 ? null : roots[at];
      const held = of == null ? null : conceptOf(of);
      if (held == null || !world.isA(held, a.thing)) return null;
      // A kind, a fraction and a relation are each read another way, and each
      // has a reading of its own.
      if (a.kind != null && kind === a.kind) return null;
      if (a.fraction != null && (world.isA(kind, a.fraction) || kind === a.fraction)) return null;
      spent.add(i + 1);
      spent.add(at);
      return held;
    };
    const owner = owning(markerFor(roots, i, side, owning)) ?? farSide();
    if (owner == null) return n;
    const held = world
      .individualsOf(kind)
      .filter((one) => world.linked(owner, a.has).includes(one));
    if (held.length > 1) return n;
    const id = held.length === 1 ? held[0] : mood === 'tell' ? allocate() : null;
    if (id == null) return n;
    const thought = { ...thoughtOf(n), concept: id };
    const made =
      held.length === 1
        ? []
        : [node('call', `${world.term(kind).name}#${id}`, [], { name: `${world.term(kind).name}#${id}`, id, of: kind, whose: owner, made: true })];
    return withBranch(n, [
      ...n.branch.map((b) =>
        b.kind === 'thought' ? withBranch(b, b.branch, { ...b.state, thought }) : b,
      ),
      ...made,
    ]);
  });
}

// A word that stands for nothing. What it was thought to be is kept — the word
// was still heard and still recognised — but it names nothing, so nothing is
// said of it and it joins no claim.
function unnamed(n) {
  return thoughtOf(n) && thoughtOf(n).concept != null ? standingFor(n, null) : n;
}

// `the giving` is not giving in general — it is the one that happened. A word
// naming a doing, marked as the one meant, stands for the latest occurrence of
// it, so that what is said next is said about that doing and not about the
// kind. Nothing having happened, the word still names the kind.
function stoodFor(roots, world, langs) {
  if (!world) return roots;
  const a = world.anchors || {};
  if (a.action == null) return roots;
  const side = markingSide(roots, langs);
  return roots.map((n, i) => {
    const kind = conceptOf(n);
    if (kind == null || world.isIndividual(kind) || !world.isA(kind, a.action)) return n;
    if (markOn(markerFor(roots, i, side, markOn)) !== 'known') return n;
    const one = priorEvent(kind, world);
    return one == null ? n : standingFor(n, one);
  });
}

// A word that names a relation, with `of` and a thing after it, names whoever
// stands in that relation to the thing: `the father of sam` is sam's father,
// not fatherhood and not sam. Where the world holds exactly one such, that one
// is meant; where it holds none or several there is no *the* to resolve, and
// the brain does not pick. The relation and the thing are spent saying it.
function standsIn(roots, world) {
  if (!world) return roots;
  const a = world.anchors || {};
  if (a.has == null || a.relation == null) return roots;
  // Only where the signal has a hole. With both ends named, the relation is
  // the claim being made — `tom is the father of sam` says fatherhood, it does
  // not ask who the father is.
  if (!roots.some((n) => markOn(n) === 'unknown')) return roots;
  const spent = new Set();
  return roots.map((n, i) => {
    if (spent.has(i)) return unnamed(n);
    const rel = conceptOf(n);
    if (rel == null || rel === a.has || rel === a.hold) return n;
    if (!world.isA(rel, a.relation)) return n;
    const marker = roots[i + 1];
    if (!marker || conceptOf(marker) !== a.has) return n;
    const object = roots[i + 2] ? conceptOf(roots[i + 2]) : null;
    if (object == null) return n;
    const standing = world.standing(object, rel);
    if (standing.length !== 1) return n;
    spent.add(i + 1);
    spent.add(i + 2);
    // The word is spent saying which thing, so it stands for that thing and
    // says nothing else. Asked which, the thing is the answer.
    return standingFor(n, standing[0], true);
  });
}

// `how many kinds of thing` is not a kind holding a thing. A word naming the
// brain's own `kind`, followed by the joint English says holding with and then
// a thing, says which kinds are being asked after — the far side narrows the
// word rather than standing at the other end of a relation. The joint and the
// thing are spent saying it, and what is left is the kind, narrowed.
//
// That a word may be narrowed this way is the brain's; which word joins the two
// is the language's, and it is the same joint that says holding elsewhere.
function sortsOf(roots, world) {
  if (!world) return roots;
  const a = world.anchors || {};
  if (a.has == null || a.kind == null) return roots;
  const spent = new Set();
  return roots.map((n, i) => {
    if (spent.has(i)) return unnamed(n);
    if (conceptOf(n) !== a.kind) return n;
    const marker = roots[i + 1];
    if (!marker || conceptOf(marker) !== a.has) return n;
    const of = roots[i + 2] ? conceptOf(roots[i + 2]) : null;
    if (of == null || a.thing == null || !world.isA(of, a.thing)) return n;
    spent.add(i + 1);
    spent.add(i + 2);
    const thought = thoughtOf(n);
    return withBranch(
      n,
      n.branch.map((b) =>
        b.kind === 'thought' ? withBranch(b, b.branch, { ...b.state, thought: { ...thought, on: of } }) : b,
      ),
    );
  });
}

// The same word, thought to stand for something else. What it was heard and
// recognised as is kept; only what it names changes.
function standingFor(n, concept, stands = false) {
  const thought = thoughtOf(n);
  if (!thought) return n;
  return withBranch(
    n,
    n.branch.map((b) =>
      b.kind === 'thought'
        ? withBranch(b, b.branch, {
            ...b.state,
            thought: stands ? { ...thought, concept, stands: true } : { ...thought, concept },
          })
        : b,
    ),
  );
}

// A word nothing knows, standing where a thing stands and spoken of as though
// it were one, is a name being given. The thing is made here, before anything
// is judged, so that whatever else the signal says of it is said of it and not
// of nothing: `john has 3 apples` names john and gives him the apples in one
// breath.
function calling(roots, world, langs, mood, allocate) {
  if (!world || mood !== 'tell') return roots;
  // Asking is not giving: a hole stands for what the signal does not say, so
  // a signal carrying one names nothing — `who has the telescope` leaves no
  // telescope behind, with or without a question mark.
  if (roots.some((n) => markOn(n) === 'unknown')) return roots;
  const a = world.anchors || {};
  // A word stands in a claim where the signal has something to join it to
  // something else. Only then is there anything to name.
  const joined = roots.some((n) => world.isA(conceptOf(n), a.relation));
  // A doing joins things too, but not every word beside one is somebody.
  // Whoever a thing was given *to* is; `the telescope` it was seen with is one
  // of a kind and not a name — a word marked as which-one-is-meant was never
  // being introduced. So in a doing a word is named only where a role points
  // at it and nothing marks it as one of a kind. Which words do either is the
  // language's to say.
  const doing = roots.some((n) => world.isA(conceptOf(n), a.action));
  const side = markingSide(roots, langs);
  const whichOne = (i) => markOn(markerFor(roots, i, side, markOn));
  // A doing puts its parts on either side of it as well as under a word for
  // them: which side is which is the language's (`parts`), and a word standing
  // on one of those sides is as much a part as one a preposition points at.
  // Without this the one *doing* it is never introduced — every language marks
  // whoever gave by where they stand, and only whoever it was given *to* by a
  // word.
  const parts = partsSide(roots, langs);
  const acting = roots.findIndex((n) => world.isA(conceptOf(n), a.action));
  const positioned = (i) =>
    parts != null &&
    acting >= 0 &&
    i !== acting &&
    (i < acting ? parts.before : parts.after) != null;
  const introduced = (i) =>
    (roleOn(markerFor(roots, i, side, roleOn)) != null || positioned(i)) &&
    whichOne(i) !== 'new' &&
    whichOne(i) !== 'known';
  if (!joined && !doing) return roots;
  return roots.map((n, i) => {
    const thought = thoughtOf(n);
    // A word whose whole job is to name something, with nothing given to it
    // yet, names something now. `x is 5` gives x an amount and makes no thing;
    // `my house is bigger than x` gives x nothing, and x is then whatever the
    // house is bigger than — a thing this signal is bringing in, the same as
    // any word nothing knows.
    // Unless an amount stands in the signal. A naming word is how a signal
    // gives one — `x is 5`, `x > 10` — and there x is waiting for a value, not
    // standing as a thing. With no amount anywhere, nothing is waiting, and x
    // is whatever the signal says of it.
    const naming =
      thought &&
      thought.marks === 'named' &&
      thought.concept == null &&
      !roots.some((other) => numberOf(other, world) != null);
    if (!thought || (!naming && (thought.wordKnown || thought.concept != null))) return n;
    if (!joined && !introduced(i)) return n;
    const rest = roots.slice(i + 1).filter((other) => stands(other, world));
    const before = roots.slice(0, i).filter((other) => stands(other, world));
    // Standing as a part of a doing is reason enough on its own. Somebody
    // wrote, and that is somebody — waiting for two more things to stand
    // beside them leaves the one doing it never introduced, and then there is
    // nobody for the doing to be of.
    if (!positioned(i) && rest.length < 2 && before.length < 2) return n;
    // A name given a number holds the number: `p is 1` is not a thing called
    // p, it is p standing for one. That is the conversation's to keep, not the
    // world's, and it is left to whoever keeps the conversation.
    if (rest.length >= 2 && conceptOf(rest[0]) === world.baseRelation && numberOf(rest[1], world) != null) {
      return n;
    }
    const id = allocate();
    // Being called something is a fact, so there are two things here: the thing
    // itself, and the name it is called by. The name is a thing in the world
    // like any other — it is what the signal wrote, the same in every language
    // — and the two are joined.
    const called = allocate();
    // A word nothing knows with a number beside it names many and not one:
    // there are three of whatever a cookie is, so it is a kind. Nothing counts
    // one thing three times.
    // And a word nothing knows standing where a kind is claimed is a kind, not
    // one thing. `the apple is company` says what the apple is one of; read as
    // one particular thing it says the apple is that very thing, which is
    // false, and the brain denied a claim nothing stood against. A word the
    // world has never heard is no grounds to deny anything.
    const classified =
      before.length > 0 && conceptOf(before[before.length - 1]) === world.baseRelation;
    const many = numberBeside(roots, i, world) || classified;
    const given = { ...thought, concept: id, wordKnown: true };
    return withBranch(n, [
      ...n.branch.map((b) =>
        b.kind === 'thought' ? withBranch(b, b.branch, { ...b.state, thought: given }) : b,
      ),
      // Recognising a referent is separate from accepting what was said of it.
      // The call establishes only that it is a thing; the judged proposition
      // supplies any more specific kind, polarity and scope.
      // A name given here may be one the world already claims — `x` is a
      // letter it knows, and somebody may still be called x. A name is claimed
      // once, so the thing this conversation brings in takes a name of its
      // own and is still *called* what it was called: the word reaches the
      // world's term, and the naming reaches this one.
      node('call', n.state.identity, [], {
        name: world.termNamed(n.state.identity) != null || namesInWorld(n.state.identity, world)
          ? `${n.state.identity}#${id}`
          : n.state.identity,
        // What it is called stays the word that was said, even where the term
        // had to take a name of its own to keep from clashing.
        word: n.state.identity,
        id,
        called,
        of: a.thing,
        many,
      }),
    ]);
  });
}

// Whether the world already calls something by this word. Being called
// something is one thing's; two things cannot share one name.
function namesInWorld(word, world) {
  if (!world || typeof word !== 'string') return false;
  const wanted = word.toLowerCase();
  return world.data.terms.some((t) => typeof t.name === 'string' && t.name.toLowerCase() === wanted);
}

// A word that may be meant more than one way is settled here, where the brain
// has the whole signal and not only the word. A signal names things, and it
// needs something joining them — a relation, or a doing. Where nothing does,
// and a word could have been a doing all along, that is what it was: `i saw an
// apple` names a person and a fruit and nothing between them until `saw` is
// read as the seeing it also is. Where something already joins them, every
// word stands as it was first thought: `i cut an apple with a saw` has its
// doing, so the saw is the tool.
function settle(roots, world) {
  if (!world) return roots;
  const a = world.anchors || {};
  const ways = (n) => {
    const t = findBranch(n, 'thought');
    return t && t.state.ways ? t.state.ways : null;
  };
  if (!roots.some(ways)) return roots;

  const doing = (thought) =>
    thought && thought.concept != null && world.isA(thought.concept, a.action);
  const joining = (thought) =>
    thought && thought.concept != null && world.isA(thought.concept, a.relation);
  // Only a word that is already what it is can be what joins the signal. One
  // still to be settled is not yet anything, and cannot stand as the joint on
  // the strength of a reading the brain has not taken.
  // What else the signal names, already settled. A word still to be settled
  // says nothing here: it cannot narrow another while it is not yet anything
  // itself.
  const named = roots
    .filter((n) => !ways(n))
    .map((n) => {
      const t = findBranch(n, 'thought');
      return t && t.state.thought ? t.state.thought.concept : null;
    })
    .filter((c) => c != null);
  // The world holds one reading to the rest of the signal and not the other.
  // A cricket asked after a sport is the sport, because that is the one the
  // world puts under it; asked after an insect it is the insect. Nothing is
  // guessed — a reading the world cannot join to anything else said is not the
  // one meant, and where it joins two of them there is no one reading and the
  // brain says so rather than choosing.
  const joins = (thought) =>
    thought &&
    thought.concept != null &&
    named.some(
      (other) =>
        other !== thought.concept &&
        (world.isA(thought.concept, other) || world.isA(other, thought.concept)),
    );
  const narrowed = roots.map((n) => {
    const mine = ways(n);
    if (!mine) return n;
    const held = mine.filter(joins);
    if (held.length !== 1) return n;
    return withBranch(
      n,
      n.branch.map((b) =>
        b.kind === 'thought' ? withBranch(b, b.branch, { ...b.state, thought: held[0], settled: true }) : b,
      ),
    );
  });
  if (narrowed.some((n, i) => n !== roots[i])) return narrowed;

  // A reading that joins what else the signal names is the one meant, and a
  // relation joins by running between things rather than by standing under
  // them. `the capital of france` is the relation a city stands in to a
  // country, not the kind of city a capital is — and the world says which ends
  // a relation runs between. Where two readings both run between what was
  // said, neither is chosen.
  const runsBetween = (thought) => {
    if (!joining(thought)) return false;
    const ends = [
      ...(a.domain == null ? [] : world.linked(thought.concept, a.domain)),
      ...(a.range == null ? [] : world.linked(thought.concept, a.range)),
    ];
    return ends.length > 0 && named.some((other) => ends.some((end) => world.isA(other, end)));
  };
  const between = roots.map((n) => {
    const mine = ways(n);
    if (!mine) return n;
    const held = mine.filter(runsBetween);
    // Two readings of one word that name the same thing are one reading. A
    // language may write a word two ways over the same concept — `capital` is
    // said as a thing and used as a joint — and that is no ambiguity to refuse.
    if (new Set(held.map((one) => one.concept)).size !== 1) return n;
    return withBranch(
      n,
      n.branch.map((b) =>
        b.kind === 'thought' ? withBranch(b, b.branch, { ...b.state, thought: held[0], settled: true }) : b,
      ),
    );
  });
  if (between.some((n, i) => n !== roots[i])) return between;


  // A joint that ends in a measure is not joining two things the signal names:
  // `at ten hours` says when, and leaves the signal still wanting whatever it
  // is about. So a word that could be the doing still becomes one — `the gate
  // closed at ten hours` is a closing, where the joint alone would have left
  // `closed` as the way the gate stands and nothing said at all.
  const measuring = (thought) =>
    thought != null &&
    thought.concept != null &&
    a.measure != null &&
    world.linked(thought.concept, a.measure).length > 0;
  const measuredAfter = (i) =>
    roots.slice(i + 1).some((other) => {
      const t = findBranch(other, 'thought');
      return measuring(t ? t.state.thought : null);
    });

  const already = roots.some((n, i) => {
    if (ways(n)) return false;
    const t = findBranch(n, 'thought');
    const thought = t ? t.state.thought : null;
    if (doing(thought)) return true;
    return joining(thought) && !measuredAfter(i);
  });

  let taken = false;
  const asDoing = already
    ? roots
    : roots.map((n) => {
        const mine = ways(n);
        if (taken || !mine) return n;
        const other = mine.find(doing);
        if (!other) return n;
        taken = true;
        return withBranch(
          n,
          n.branch.map((b) =>
            b.kind === 'thought' ? withBranch(b, b.branch, { ...b.state, thought: other, settled: true }) : b,
          ),
        );
      });
  if (asDoing.some((n, i) => n !== roots[i])) return asDoing;

  // Nothing in this signal tells them apart, so what came before does. A word
  // that stands for two things stands for the one this conversation has already
  // met — and where it has met both, or neither, nothing here chooses.
  const back = roots.map((n) => {
    const mine = ways(n);
    if (!mine || graph == null) return n;
    const met = graph.metBefore(mine.map((w) => w && w.concept).filter((c) => c != null));
    if (met.length !== 1) return n;
    const held = mine.find((w) => w && w.concept === met[0]);
    if (!held) return n;
    return withBranch(
      n,
      n.branch.map((b) =>
        b.kind === 'thought' ? withBranch(b, b.branch, { ...b.state, thought: held, settled: true }) : b,
      ),
    );
  });
  if (back.some((n, i) => n !== roots[i])) return back;
  return roots;
}

// Walk away from a position in one direction until something answers to
// `wanted`, stopping if a thing that carries its own concept gets in the way
// first. This is the one mechanism solve() and judge() both find a neighbor
// through: solve reads a marker or a number beside a thing, judge reads which
// thing beside an action plays which part — neither ever reaches past a thing
// that isn't the one it was looking for.
export function nearestOver(said, from, step, wanted, over = null) {
  for (let i = from + step; i >= 0 && i < said.length; i += step) {
    if (wanted(said[i])) return said[i];
    if (opensPart(said[i])) return null;
    if (over && over(said[i])) continue;
    if (conceptOf(said[i]) != null) return null;
  }
  return null;
}

// A word saying what a thing is like is not another thing standing in the way:
// four big balls are four balls, and the count reaches the balls past the
// bigness. Another thing does stop it — a count never reaches over one thing
// to another.
export const describing = (world) => (n) => {
  const a = world.anchors || {};
  const concept = conceptOf(n);
  return (
    concept != null &&
    a.thing != null &&
    a.property != null &&
    !world.isA(concept, a.thing) &&
    world.isA(concept, a.property)
  );
};

// A number standing beside a thing says how many of it there are. The brain
// reads this off the order of the things it perceived — a language may put the
// number on either side, and it does not need to know which, so both are
// tried, left first.
function quantityOf(roots, at, world) {
  if (!world) return null;
  const a = world.anchors || {};
  // A word that borrowed its kind from what stood beside it carries the count
  // it was itself saying. There is no number beside it to find — it *was* the
  // number — so it is asked directly.
  const said = thoughtOf(roots[at]);
  if (said && said.counts != null) {
    return { concept: world.termFor(said.counts), value: said.counts, said: null };
  }
  const mine = conceptOf(roots[at]);
  // A thing being named in this very signal is not in the world yet, so there
  // is nothing to look up. What it is being made as says whether a number
  // beside it counts it, and that is on the tree already.
  const made = findBranch(roots[at], 'call');
  const of = made ? made.state.of : mine;
  // A number is not a count of itself.
  if (of == null || world.isA(of, a.number) || !world.isA(of, a.thing)) return null;

  // A number is a number whether or not the world ever named it: no world
  // names every one, and a thousand stones is still a thousand.
  const isNumber = (n) =>
    n && n.state.exists && (world.isA(conceptOf(n), a.number) || numberOf(n, world) != null);
  const past = describing(world);
  const found =
    nearestOver(roots, at, -1, isNumber, past) || nearestOver(roots, at, 1, isNumber, past);
  return found ? { concept: conceptOf(found), value: numberOf(found, world), said: found } : null;
}

// Whether a number stands beside this word. Read off the order the same way a
// count is, and for the same reason: a language may put the number on either
// side, and the brain does not need to know which.
function numberBeside(roots, at, world) {
  const a = world.anchors || {};
  const isNumber = (n) =>
    n && n.state.exists && (world.isA(conceptOf(n), a.number) || numberOf(n, world) != null);
  const past = describing(world);
  return Boolean(
    nearestOver(roots, at, -1, isNumber, past) || nearestOver(roots, at, 1, isNumber, past),
  );
}

// Read off the order, like a count: a marker beside a thing marks that thing.
function markOf(roots, at, world, langs) {
  const mine = conceptOf(roots[at]);
  const a = (world && world.anchors) || {};
  // A doing may be pointed at the same way a thing is. `the backup` is one
  // backup that happened, and which one is meant is exactly what a marker
  // says, so the mark belongs on it as much as on any thing.
  if (!world || mine == null || !(world.isA(mine, a.thing) || world.isA(mine, a.action))) {
    return null;
  }
  const marker = markerFor(roots, at, markingSide(roots, langs), markOn);
  const marks = markOn(marker);
  return marks === 'new' || marks === 'known' ? marks : null;
}

// The word marking a thing need not touch it — `from the basket` puts an
// article between. Walk away from the thing over words that name nothing, and
// stop at the next thing: a marker never reaches past one. The walk itself is
// `nearestOver` — a marker is simply a word with nothing else to find first.
export function markerFor(said, at, side, carries, over = null) {
  if (side !== 'before' && side !== 'after') return null;
  const step = side === 'before' ? 1 : -1;
  return nearestOver(said, at, step, carries, over);
}

// Word order comes from the language that recognized this signal, never from
// whichever language happened to be loaded first. A signal with no one
// recognized language has no order to infer from.
export function signalLanguage(said, langs) {
  const names = new Set((said || []).map(languageOf).filter((name) => name != null));
  if (names.size !== 1) return null;
  const [name] = names;
  return (langs || []).find((lang) => lang.data.name === name) ?? null;
}

// Which side of an action each part falls on, as this language declares it.
export function partsSide(said, langs) {
  const lang = signalLanguage(said, langs);
  return lang && lang.parts ? lang.parts : null;
}

export function markingSide(said, langs) {
  const lang = signalLanguage(said, langs);
  return lang ? lang.marking : null;
}

// The world says what a term is; the brain reads only its own categories out of
// it. thing / property / relation / action are the brain's innate schema — the
// four ways anything can exist. Only a thing can be living or nonliving, and
// an open world may establish neither: not reaching organism is ignorance,
// not evidence of non-life. An action is an action, never a nonliving thing.
// Mindedness is a separate axis: a thing may have a mind whether or not it is
// alive.
export function worldNode(concept, world) {
  if (concept == null || !world) return null;
  const a = world.anchors || {};

  if (world.isA(concept, a.thing)) {
    const alive = world.isA(concept, a.living);
    const notAlive = !alive && (
      world.excludes(concept, a.living) ||
      upward(concept, world).some((rung) => world.denies(rung, a.living, world.baseRelation))
    );
    const kids = [];
    if (alive && world.isA(concept, a.person)) {
      kids.push(node('entity', 'person', [], { kind: 'person' }));
    }
    // Having a mind is orthogonal to being alive. A cat is both, a stone
    // neither, and the brain itself has a mind without being alive — which is
    // why this is a second axis and not a third kind of thing.
    if (world.isA(concept, a.mind, a.has)) {
      kids.push(node('mind', 'mind', [], { concept: a.mind }));
    }
    return node('entity', alive ? 'living' : notAlive ? 'nonliving' : 'unknown', kids, { concept });
  }
  if (world.isA(concept, a.action)) return node('action', 'action', [], { concept });
  if (world.isA(concept, a.property)) return node('property', 'property', [], { concept });
  if (world.isA(concept, a.relation)) return node('relation', 'relation', [], { concept });
  return null;
}

// Whether this stands beside the word joining it to another as a whole of the
// same size — a clause, or a signal the same shape as the one holding it. What
// stands between them is a word like any other, and is not one of them.
export function joinedWhole(b, whole) {
  return Boolean(b.state && b.state.whole) || b.kind === whole.kind;
}

// Whether the brain follows what it is told to do. It is the one being asked,
// so it is the one this is about: the answer is a fact its memory holds of
// itself, and nothing in the signal can change it. Told outright that it does
// not, it says no; told nothing either way, it agrees.
export function following(world) {
  const a = world.anchors || {};
  if (a.follow == null || a.instruction == null || a.self == null) {
    return [node('agree', 'follow', [], {})];
  }
  if (world.denies(a.self, a.instruction, a.follow)) {
    return [
      node('refuse', 'unfollowed', [], {
        subject: a.self,
        relation: a.follow,
        object: a.instruction,
      }),
    ];
  }
  return [node('agree', 'follow', [], {})];
}

// The one term standing under a part of the signal, where there is exactly one.
export function named(part) {
  const found = [];
  const walk = (n) => {
    if (n.kind === 'thing' && conceptOf(n) != null) found.push(conceptOf(n));
    (n.branch || []).forEach(walk);
  };
  walk(part);
  return found.length === 1 ? found[0] : null;
}


// A signal that says nothing but greetings, and the greetings in it. One is a
// greeting; several are several, and neither is part of the other.
export function onlyGreetings(root, world) {
  const greets = world && world.anchors ? world.anchors.greeting : null;
  if (greets == null) return null;
  return greetsOnly(root, world, greets);
}

// Whether this word greets. A greeting is not a thing of the world, so nothing
// can be done to it and it can do nothing. Speaking, writing and reading are
// not greetings, however much they are communication: `nila spoke` is
// something nila did, and it used to name no doer at all.
export function greetsHere(n, world) {
  const greets = world && world.anchors ? world.anchors.greeting : null;
  return greets != null && n.kind === 'thing' && world.isA(conceptOf(n), greets);
}

// A greeting standing before a whole signal is said alongside it, not in it:
// `hello, how are you` is a greeting and a question, and neither is part of
// the other. Which words greet is the language's; that a greeting is its own
// act is the brain's.
export function greeting(root, world) {
  const branch = root.branch || [];
  const communication = world && world.anchors ? world.anchors.greeting : null;
  if (communication == null) return null;
  const greets = [];
  const said = [];
  for (const b of branch) {
    const only = greetsOnly(b, world, communication);
    if (only) greets.push(...only);
    else if (joinedWhole(b, root)) said.push(b);
  }
  if (greets.length === 0 || said.length !== 1) return null;
  // Only where what follows says something of its own. One greeting after
  // another is two greetings, not a greeting and a signal.
  let other = false;
  const walk = (n) => {
    if (
      n.kind === 'thing' &&
      !(communication != null && world.isA(conceptOf(n), communication))
    ) other = true;
    (n.branch || []).forEach(walk);
  };
  walk(said[0]);
  return other ? [...greets, said[0]] : null;
}

// Where in the signal whole ones were joined. A join need not stand at the
// top: a question may be laid over one — "what is 1+8 and 5+9" asks two whole
// workings-out — and what wraps it adds no term of its own, so the join is
// looked for all the way down and the wrapping is left as it was found.
export function joinIn(n) {
  if (!n || !n.branch) return null;
  // A join is in the signal, never in what the brain made of it: the work kept
  // under a verdict is not more of the signal, and is not looked through.
  if (VERDICT.includes(n.kind)) return null;
  // Two wholes standing together are not joined where one is put as the
  // condition of the other: what follows from a claim is not a second signal
  // said alongside it.
  if (!hasFunction(n, 'condition') && n.branch.filter((b) => joinedWhole(b, n)).length > 1) return n;
  for (const b of n.branch) {
    const found = joinIn(b);
    if (found) return found;
  }
  return null;
}


// Which of several verdicts reached at once this one is, so that what was
// reached for one is not read as standing for the rest. A signal that reached
// a single verdict carries no such mark: there is nothing to tell apart.
export function among(nodes, which, many) {
  if (!many) return nodes;
  return nodes.map((n) => withBranch(n, undefined, { ...n.state, among: which }));
}

// What a thing has, it has by being what it is: a memory belongs to computers,
// and this brain has one by being one. So the walk climbs the `is` chain and
// gathers what each rung links to, nearest first. The `is` chain is the ladder
// itself and is not climbed for its own sake — asked what a thing is, the brain
// answers the rung above it, not every rung to the top.
export function reached(subject, relation, world) {
  if (relation === world.baseRelation) {
    const found = world.linked(subject, relation);
    const thing = world.anchors ? world.anchors.thing : null;
    return found.length > 1 && thing != null ? found.filter((id) => id !== thing) : found;
  }
  const out = [];
  for (const rung of upward(subject, world)) {
    // What a thing itself stands in is read both ways round — a fact written
    // either way is the same fact. What it inherits from its kinds is read only
    // the way that kind's fact was written: `a container holds things` says
    // what containers do, and turned round it would put every thing inside one.
    const found = rung === subject ? world.linked(rung, relation) : world.stated(rung, relation);
    for (const t of found) if (!out.includes(t)) out.push(t);
  }
  return out;
}

// One arithmetic act on one number, worked in whole parts like the four with
// exact answers: doubling and halving always terminate.
export const whole = (work, x) => {
  try {
    return exactValue(work(new Decimal(x)));
  } catch {
    return null;
  }
};

export function numericCompare(left, right) {
  try { return new Decimal(left).compareTo(new Decimal(right)); } catch { return NaN; }
}

function numericNegate(value) {
  try { return exactValue(new Decimal(value).negate()); } catch { return null; }
}

// What one sender says of one thing: an individual of what was said, with the
// parts they played in it and the moment it was said. An occurrence like any
// other — nothing new was needed to hold it.
export function held(holder, about, said, negated, when, world, allocate) {
  const a = world.anchors || {};
  const id = allocate();
  return node('event', `${world.term(said).name}#${id}`, [], {
    id,
    action: said,
    at: world.now(),
    when,
    not: negated,
    parts: [
      { role: a.agent, of: holder, amount: null },
      { role: a.target, of: about, amount: null },
    ],
  });
}

// The latest occurrence of an action: the highest id among its individuals —
// ids grow as things are learned, so the same signals always pick the same
// occurrence. Parts ride over by role; what the new signal names wins.
export function priorEvent(action, world) {
  if (action == null || !world) return null;
  let latest = null;
  for (const one of world.members(action, world.baseRelation)) {
    if (!world.isIndividual(one)) continue;
    if (latest == null || one > latest) latest = one;
  }
  return latest;
}



export function reaches(n, anchor, world) {
  const c = conceptOf(n);
  return c != null && world.isA(c, anchor);
}

// The part a word says the thing beside it plays in what happened. Which word
// assigns which part is the language's; that things play parts is the brain's.
export function roleOn(n) {
  const t = n ? findBranch(n, 'thought') : null;
  return t && t.state.thought ? t.state.thought.role : null;
}

// Whether this word denies what the signal says. That a claim can be denied is
// the brain's; which word does it is the language's.
export function negatesOn(n) {
  const t = n ? findBranch(n, 'thought') : null;
  return Boolean(t && t.state.thought && t.state.thought.negates);
}


// ---------------------------------------------------------------------------
// express — the brain's last phase, and it runs on the structured signal. The
// brain decides only what it means to express — an intent, one of its own
// innate acts. How that intent is voiced belongs to the language it recognized,
// and lives in that language's data. No reply is written into the engine.
// ---------------------------------------------------------------------------
export function express(roots, langs, world) {
  return roots.map((n) =>
    walk(n, (b) =>
      b.kind === 'thing' || b.kind === 'void'
        ? withBranch(b, [
            ...b.branch,
            speak(
              intentOf(b, world),
              // Recognising a thing says the thing. Every other intent says
              // what that intent is about, and a number is voiced as it was
              // written rather than as the word for it.
              intentOf(b, world) === 'recognise' ? saidBack(b) : meaningOf(b),
              languageOf(b),
              langs,
            ),
          ])
        : withBranch(b),
    ),
  );
}

// Several finished acts, said back as one. Each was judged in full and each
// verdict stays on the tree, but saying one of them twice says nothing the
// first did not: two that came out differently are both worth saying, two that
// came out the same are one thing to say, however many things it was reached
// about. What goes between is the language's — a list of answers is listed the
// way it lists; anything else has already been ended the way it ends a
// sentence, so nothing goes between but the space.
function saidTogether(parts, langs, mood) {
  const langName = parts.map((p) => p.state.language).find(Boolean) || null;
  const between = parts.every((p) => p.name === 'answer') ? listing(langName, langs) : ' ';
  // Only what is needed. Saying it took something in says nothing where the
  // same signal also said something about the world: the answer is the reply,
  // and that it was also told a thing it now holds is not news. Where nothing
  // else was said, one of those is enough — the last, which is where the
  // signal left off.
  const told = parts.filter((p) => TAKEN_IN.includes(p.name));
  const rest = parts.filter((p) => !TAKEN_IN.includes(p.name));
  const worth = rest.length > 0 ? rest : told.slice(-1);
  const says = [
    ...new Set(worth.map((p) => p.state.says).filter((s) => s != null)),
  ].join(between);
  return withBranch(
    // The act is the one that got said. Every part stays underneath.
    node('express', (worth[0] || parts[0]).name, [], { says: says || null, language: langName }),
    parts,
    { says: says || null, language: langName, bound: true, mood },
  );
}

// Voicing an intent in the language the signal was recognized as. A language
// that has nothing to say for an intent leaves it unsaid.
function speak(intent, meaning, langName, langs, terms) {
  const lang = (langs || []).find((l) => l.data.name === langName);
  const says = lang ? lang.express(intent, { meaning, ...terms }) : null;
  return node('express', intent, [], { says, meaning, language: langName || null });
}


// Asking or telling. That a signal can do either is the brain's; which mark
// asks is the recognized language's. An unrelated loaded language cannot turn
// this signal into a question.
function moodOf(input, roots, langs) {
  const raw = toString(input).trim();
  if (raw === '') return 'tell';
  const last = Array.from(raw).pop();
  const lang = signalLanguage(roots, langs);
  return lang && lang.isQuestionSymbol(last) ? 'ask' : 'tell';
}

// The acts that are about what the brain does or does not know, and so are
// handed the term for knowing. It holds no word for it.
const KNOWING = ['understood', 'unsure', 'empathy', 'learn', 'unheard'];

// The acts that say only that something was taken in. Nothing about the world
// is in them, so beside anything that does say something they are not worth
// saying. Not knowing is not one of them: it is an answer.
const TAKEN_IN = ['understood', 'learn'];

// What a signal comes to. A signal may come to more than one of these at once,
// and each of them is whole: the first does not stand for the rest.

// Refusals where the brain is not standing against what was said but cannot
// place it. Saying no to those would be answering something it never
// understood; it says it does not know instead.
const UNPLACED = ['unmeasured'];

// A signal that came to several verdicts, one root apiece — or nothing, where
// it came to one. There are two ways a signal holds more than one: whole
// clauses joined by a word, and one act judged of several things at once.
// Either way the words are the same words; only what was reached of them
// differs, so each root keeps the whole signal and only its own verdict.
function apart(roots, world) {
  // Several things said, each already whole and each judged on its own. Loose
  // words that never bound into anything are not that: they are one signal the
  // brain could not make a whole of.
  if (
    roots.length > 1 &&
    roots.every((n) => (n.kind !== 'thing' && n.kind !== 'void') || greetsHere(n, world))
  ) return roots;
  if (roots.length !== 1) return null;
  // A signal that only greets is greetings, however many of them there are.
  // Nothing was said beside them, so there is nothing for them to be part of.
  const onlyGreets = onlyGreetings(roots[0], world);
  if (onlyGreets && onlyGreets.length > 1) return onlyGreets;
  const greeted = greeting(roots[0], world);
  if (greeted) return greeted;
  const join = joinIn(roots[0]);
  if (join) return join.branch.filter((b) => joinedWhole(b, join));
  const branch = roots[0].branch || [];
  const places = [];
  for (const b of branch) {
    if (!VERDICT.includes(b.kind) || b.state.among == null) continue;
    if (!places.includes(b.state.among)) places.push(b.state.among);
  }
  if (places.length < 2) return null;
  const rest = branch.filter((b) => !VERDICT.includes(b.kind));
  return places.map((which) =>
    withBranch(roots[0], [...rest, ...branch.filter((b) => b.state.among === which)]),
  );
}

// The brain's one act toward the whole signal, with what it said about each
// thing kept underneath.
function expression(roots, langs, mood, world, sent, took = null) {
  // A signal that came to more than one verdict is composed, not re-judged as
  // one whole: each part already stands finished on its own. This is the one
  // new step — not perceiving several as one, but putting several already-
  // finished acts into a single one said back together.
  const together = roots.length === 1 && findBranch(roots[0], 'refuse') ? null : apart(roots, world);
  if (together) {
    return saidTogether(
      together.map((r) => expression([r], langs, mood, world, sent)),
      langs,
      mood,
    );
  }

  const parts = [];
  const collect = (n) => {
    const said = findBranch(n, 'express');
    if (said) parts.push(said);
    (n.branch || []).forEach(collect);
  };
  roots.forEach(collect);

  // One root that is not itself a thing means the signal was bound into a whole.
  const bound =
    roots.length === 1 && roots[0].kind !== 'thing' && roots[0].kind !== 'void';
  const stood = bound ? findBranch(roots[0], 'standing') : null;
  const answer = bound ? findBranch(roots[0], 'answer') : null;
  const learned = bound ? findBranch(roots[0], 'learn') : null;
  const counted = bound ? findBranch(roots[0], 'count') : null;
  const gave = bound ? findBranch(roots[0], 'named') : null;
  const agreed = bound ? findBranch(roots[0], 'agree') : null;
  const named = bound ? within(roots[0], 'call') : null;
  const sum = bound ? findBranch(roots[0], 'sum') : null;
  const did = bound ? findBranch(roots[0], 'did') : null;
  const refused = bound ? findBranch(roots[0], 'refuse') : null;
  // A rule the brain agreed to keep. Nothing in it stands — both halves are
  // held at arm's length — and keeping it is still taking something in.
  const kept = bound ? findBranch(roots[0], 'instruction') : null;
  // Understanding what someone feels, and holding it as theirs rather than as
  // the world's — which is what the record already is. So the act is only the
  // last step: it was said of whoever said it, and it stands at the bad pole.
  const felt = bound ? findBranch(roots[0], 'event') : null;
  // A word this language has no entry for. The brain cannot place it, but it
  // can say which one stopped it — the symbols came in with the signal.
  const unheard = unheardIn(roots);
  const feeling = feelingIn(felt, world, sent);
  const langName = parts.map((p) => p.state.language).find(Boolean) || null;
  // Said back the way it was said: a signal written in figures is answered in
  // figures. The brain does not choose between them — it uses what it was
  // given, and the language is the one holding both forms.
  const written = wroteOther(roots);
  // A question the world cannot fill is a gap, not an answer, and so is one the
  // language cannot say — a term it has no word for leaves the brain with
  // nothing to answer with. The node stays on the tree either way: what the
  // brain looked for and did not find is worth as much as what it found.
  const answered = answer ? spoken(answer, langName, langs, world, written) : null;
  const found = answer && answered != null;

  // A refusal is the last word: whatever else could be said, the brain is
  // turning this one down rather than reporting on it.
  // Asked, it answers the claim. Told, it answers only if it disagrees; a claim
  // it already holds is simply understood.
  const intent =
    // A word it does not have is why it got no further, and saying so comes
    // before any verdict. A claim it could not read is not a claim it can
    // answer: yes or no to one would be answering something it made up. This
    // stands ahead of everything, because every verdict below it rests on
    // having understood what was said.
    unheard != null
    ? 'unheard'
    : refused
    ? UNPLACED.includes(refused.name)
      ? 'unsure'
      : // Told two things that cannot both be true, the brain says so and
        // names them. Denying the second would pick a winner between two
        // things it was told, and there is nothing to choose by: what it has
        // is a conflict, and a deterministic brain reports one rather than
        // settling it quietly. Asked, it still answers from what it knows.
        refused.name === 'contradiction' && mood !== 'ask'
        ? 'conflict'
        : 'deny'
    : agreed
      ? 'agree'
      // What the brain says it did is what it did. A signal may make things to
      // hold what it says and then say nothing they could hold — three red
      // balls and two blue ones, with no fact between the box and either — and
      // the things are dropped. Nothing was taken in, so `I understand` would
      // be saying it took something in.
      : (gave || named) && took !== false
      ? 'learn'
    : feeling
      ? feeling
      : stood
      ? learned
        ? 'learn'
        : stood.name === 'against'
          ? 'deny'
          : stood.name === 'absent'
            // And the other way round. A rule is taken in whole and both its
            // halves are held at arm's length, so nothing stands — but a rule
            // is something the brain now holds, and saying it does not know
            // would be saying it kept nothing.
            ? (kept ? 'learn' : 'unsure')
            : // What the brain worked out, it answers — asked or not. Told
              // that ten is more than two, saying it already knew is beside
              // the point: it did not know it, it worked it out.
              mood === 'ask' || stood.state.worked
              ? 'affirm'
              : 'understood'
    : did
      ? did.state.term == null
        ? 'deny'
        : // Told that something was done, the brain works out what it comes to
          // and takes that in — but nobody asked it for the number, so what it
          // says is that it has it, not the number itself.
          mood === 'ask'
          ? 'answer'
          : 'learn'
      : sum
        ? sum.state.term != null || sayable(sum.state.value, langName, langs)
          ? 'answer'
          : 'unsure'
      : counted
        ? counted.state.total != null || sayable(counted.state.members, langName, langs)
          ? 'answer'
          : 'unsure'
      : answer
        ? found
          ? 'answer'
          : 'unsure'
      : bound
        ? // Something happened, or something was said and held: the brain took
          // it in, which is not the same as having known it.
          felt
          ? 'learn'
          : 'unknown'
        : parts.length === 1
          ? parts[0].name
          : 'unknown';

  const said =
    intent === 'unheard'
      ? unheard
      : feeling
      ? termWord(felt.state.action, langName, langs, world, written)
      : intent === 'answer'
      ? did
        ? termWord(did.state.term, langName, langs, world, written)
        : sum
          ? numberSaid(sum.state.term, sum.state.value, langName, langs, world, written)
          : counted
            ? amountSaid(counted, langName, langs, world, written)
            : answered
      : wholeMeaning(intent, parts);
  // Where the brain is speaking of its own state, it hands over the term for
  // that state and lets the language find the words. It holds none of them.
  const terms = KNOWING.includes(intent)
    ? { relation: world && world.anchors ? world.anchors.know : null }
    : null;
  const whole = speak(
    intent,
    intent === 'affirm' || intent === 'conflict'
      ? claimSaid(stood, langName, langs, world)
      : said,
    langName,
    langs,
    terms,
  );
  return withBranch(whole, parts, { ...whole.state, bound, mood });
}

// What someone said of themselves, and which pole it stands at. The brain has
// an act for each: it is sorry for the one and glad of the other. Two walks and
// nothing between them to weigh — a term reaches a pole or it does not.
function feelingIn(felt, world, sent) {
  const a = world && world.anchors ? world.anchors : {};
  const from = sent ? sent.from : null;
  if (!felt || !world || from == null || felt.state.not) return null;
  const part = (felt.state.parts || []).find((p) => p.role === a.target);
  if (!part || part.of !== from) return null;
  if (world.isA(felt.state.action, a.bad)) return 'empathy';
  if (world.isA(felt.state.action, a.good)) return 'glad';
  return null;
}

// Whether this language can write the number at all.
function sayable(value, langName, langs) {
  const lang = (langs || []).find((l) => l.data.name === langName);
  const negative = numericCompare(value, 0) < 0;
  return Boolean(lang && lang.figuresFor(negative ? numericNegate(value) : value) != null);
}

// Whether the signal wrote its terms in words the language says do not name
// them — figures against the words for the numbers they are.
function wroteOther(roots) {
  let written = false;
  const collect = (n) => {
    const thought = findBranch(n, 'thought');
    // Whether a number in this signal was read off its figures. Not whether
    // some word of it is a way of writing something rather than naming it: the
    // `of` in `how many of them` is written that way and is no figure, and so
    // is the `weigh` in `how many grams does the crate weigh` — reading either
    // for a figure answered one question in digits and the next in words, by
    // which words the language happened to have marked.
    if (thought && thought.state.thought && thought.state.thought.figures) written = true;
    (n.branch || []).forEach(collect);
  };
  roots.forEach(collect);
  return written;
}

// The first thing in the signal that a language recognized the letters of but
// had no word for. It is not a term and never will be until someone gives it
// one; what the brain has of it is what it was sent.
function unheardIn(roots) {
  for (const n of roots) {
    if (!n.state || !n.state.exists) continue;
    const thought = findBranch(n, 'thought');
    if (thought && thought.state.thought && !thought.state.thought.wordKnown) {
      return String(n.state.identity);
    }
  }
  return null;
}

// A one-thing signal expresses that thing, so it needs that thing's meaning.
function wholeMeaning(intent, parts) {
  return parts.length === 1 && parts[0].name === intent ? parts[0].state.meaning : null;
}

// The answer is a term; saying it is the language's job. A name question asks
// what this language calls the term itself, so the brain's own name is the word
// that names its self term — not a fact it holds anywhere.
// What the brain found is all of what it found: a thing that has three things
// has three, and saying the first of them would be picking one. The words are
// the language's, and so is what goes between them.
export function spoken(answer, langName, langs, world, written) {
  if (answer.state.classification != null) {
    const lang = (langs || []).find((candidate) => candidate.data.name === langName);
    return lang ? lang.classificationFor(answer.state.classification) : null;
  }
  // A clock reading is a measure of the day, and it is said as the reading of
  // the clock that gave it — ten fifteen — not as a count in the smallest of
  // its units. The number and the unit were one phrase on the way in; they are
  // one phrase on the way out.
  if (answer.state.clock != null) {
    const reading = clockSaid(answer.state.clock, langName, langs, world, written);
    if (reading != null) return reading;
  }
  const { found, through } = answer.state;
  const way = through == null ? null : termWord(through, langName, langs, world);
  // A place is said as a place — the way it holds, and the thing it holds to,
  // which takes whatever the language puts before one of a kind. A bare term
  // said on its own takes nothing, as ever.
  const lang = (langs || []).find((l) => l.data.name === langName);
  const asOne = (term, said) =>
    lang && !lang.isBare(term) && !(world && world.isIndividual(term))
      ? `${lang.oneFor(said)} ${said}`
      : said;
  const words = found
    .map((t) => {
      const claim = claimTermSaid(t, langName, langs, world);
      if (claim != null) return claim;
      const done = doingSaid(t, langName, langs, world);
      if (done != null) return done;
      const said = termWord(t, langName, langs, world, written);
      if (said == null) return null;
      return way == null ? said : `${way} ${asOne(t, said)}`;
    })
    .filter(Boolean);
  // In an open world, finding no relation is lack of evidence rather than
  // evidence of none. Explicit negative knowledge is judged separately.
  if (words.length === 0) return null;
  return words.join(listing(langName, langs));
}

// A language says what stands between things said one after another; told
// nothing, the brain leaves them the space its words already arrived in.
function listing(langName, langs) {
  const lang = (langs || []).find((l) => l.data.name === langName);
  const between = lang && lang.data.speech ? lang.data.speech.list : null;
  return typeof between === 'string' ? between : ' ';
}

export function claimSaid(stood, langName, langs, world) {
  const lang = (langs || []).find((l) => l.data.name === langName);
  if (!lang || !stood) return null;
  const { subject, relation, object, negated, on, classification, surfaceNot } = stood.state;
  // A claim that was denied cannot be said back in a frame with no room for
  // the denial: saying it without would say the opposite of what was asked.
  if (classification == null && negated) return '';
  if (classification != null && surfaceNot) return '';
  // A number is not one of a kind, and does not go in a frame built for one.
  const a = world && world.anchors ? world.anchors : {};
  if (world && (world.isA(subject, a.number) || world.isA(object, a.number))) return '';
  const said = (term, isObject) => {
    // A claim in place of a thing is said as what it says. `person know
    // claim#12` is no answer; what the person knows is.
    const within = claimTermSaid(term, langName, langs, world);
    if (within != null) return within;
    const word = termWord(term, langName, langs, world);
    if (word == null) return null;
    // One of a kind takes its article; what is not one — a name, a word the
    // language says stands bare, or a property in object place predicated
    // rather than counted (`a tuba is loud`, never `a loud`) — does not.
    // Object place only: what a thing has been called stays with the thing,
    // and learned properties must never unkind their bearer.
    // One of a kind takes its article; what is not one does not — a name, a
    // word the language says stands bare, a property in object place, or
    // something done, which is not one of anything: a wren can fly, never a
    // wren can a fly.
    const bare =
      (world && world.isIndividual(term)) ||
      lang.isBare(term) ||
      (isObject && world && (world.isA(term, a.property) || world.isA(term, a.action)));
    return bare ? word : `${lang.oneFor(word)} ${word}`;
  };
  const turned = Boolean(stood.state.turned);
  const one = said(turned ? object : subject, false);
  const other = classification == null
    ? said(turned ? subject : object, true)
    : lang.classificationFor(classification);
  if (one == null || other == null) return '';
  // An ordering has no word of its own — a language says it with a state read
  // from one end, and the fact is written the way the ordering runs, so the
  // word for it is the state at the upper end.
  // A signal may compare with a word for a state — bigger, on size — or name
  // the comparing itself, and a word that already compares is said as it is.
  const bare = a.more != null && (relation === a.more || relation === a.less);
  const comparing = isComparing(relation, world)
    ? lang.comparativeFor(
        stood.state.compares ?? upperState(relation, world) ?? relation,
        bare ? termWord(relation, langName, langs, world) : null,
      )
    : null;
  if (comparing != null) {
    return lang.express('compare', { subject: one, relation: comparing, object: other }) ?? '';
  }
  // Two things level on a scale are the same *in that*, and saying it without
  // the scale says something else entirely — an apple is not a mango. What
  // they are alike in is said with them.
  if (a.same != null && relation === a.same && on != null) {
    const scale = termWord(on, langName, langs, world);
    if (scale != null) {
      const said_ = lang.express('level', { subject: one, relation: scale, object: other });
      if (said_ != null) return said_;
    }
  }
  const words = termWord(relation, langName, langs, world);
  if (words == null) return '';
  return lang.express('claim', { subject: one, relation: words, object: other }) ?? '';
}

// How much of something there is, said back. What the question named needs no
// repeating — asked how many stamps, four is the answer, and asked how many
// hours make a day, twenty-four is. What it did not name has to be said:
// asked how long the mast is, `six` says nothing at all, because six of
// nothing is no length. So the unit goes with the number, in the words the
// language has for more than one of it.
function amountSaid(counted, langName, langs, world, written) {
  const many = numberSaid(
    counted.state.total, counted.state.members, langName, langs, world, written,
  );
  const of = counted.state.of;
  const a = world && world.anchors ? world.anchors : {};
  if (counted.state.named) return many;
  if (many == null || of == null || a.unit == null || !world.isA(of, a.unit)) return many;
  const lang = (langs || []).find((l) => l.data.name === langName);
  const unit = (counted.state.members === 1 ? null : lang && lang.manyWordFor(of))
    ?? termWord(of, langName, langs, world, written);
  return unit == null ? many : `${many} ${unit}`;
}

// A number the brain worked out. The world may have no term for it — nothing
// says a world must name every number — and the language may still be able to
// write it, since its figures count from zero in the order it declared them.
export function numberSaid(term, value, langName, langs, world, written) {
  const lang = (langs || []).find((l) => l.data.name === langName);
  // Written in figures, said in figures: no language needs a word for every
  // number, and the ones it has are for when it was asked in words.
  const inFigures = lang && written ? lang.figuresFor(value) : null;
  const named = inFigures ?? termWord(term, langName, langs, world, written);
  if (named != null) return named;
  if (!lang) return null;
  // A number no word names outright is still sayable where the language says
  // how its number words go together. It already reads them that way — two
  // hundred three is two hundred and then three — and this is the same rules
  // walked the other way. No language needs a word for every number, and none
  // has to be told the ones it can build.
  if (!written) {
    const built = numberInWords(value, langName, langs, world);
    if (built != null) return built;
  }
  if (numericCompare(value, 0) >= 0) return lang.figuresFor(value);
  // Below nothing is still a number. The brain takes the sign from the term
  // for taking away, since that is what this language writes it with.
  const figures = lang.figuresFor(numericNegate(value));
  const sign = termWord(world ? (world.anchors || {}).minus : null, langName, langs, world, true);
  return figures == null || sign == null ? null : `${sign}${figures}`;
}

// Every number this language has a word for, largest first. Built from what the
// world values and what the language calls it — neither of them a list of
// numbers kept here.
function wordedNumbers(langName, langs, world) {
  const lang = (langs || []).find((l) => l.data.name === langName);
  if (!lang || !world || !world.data) return [];
  const out = [];
  for (const term of world.data.terms) {
    const value = world.valueOf(term.id);
    if (!Number.isSafeInteger(value) || value < 1) continue;
    const word = lang.wordFor(term.id);
    if (word == null) continue;
    out.push({ value, word });
  }
  return out.sort((a, b) => b.value - a.value);
}

// A number said in words, built the way this language builds them. The language
// says which pairs go together and what they come to — `joinNumbers` — and this
// asks it the question backwards: which pair comes to the number wanted. Every
// rule is the language's; what is here is the walk.
function numberInWords(value, langName, langs, world, depth = 0) {
  const lang = (langs || []).find((l) => l.data.name === langName);
  if (!lang || !Number.isSafeInteger(value) || value < 1 || depth > 8) return null;
  const words = wordedNumbers(langName, langs, world);
  const own = words.find((one) => one.value === value);
  if (own) return own.word;
  for (const scale of words) {
    if (scale.value < 2 || scale.value > value) continue;
    const times = Math.floor(value / scale.value);
    const left = value - times * scale.value;
    // The pair the language multiplies: as many of the scale as there are.
    if (lang.joinNumbers(times, scale.value) !== times * scale.value) continue;
    const many = numberInWords(times, langName, langs, world, depth + 1);
    if (many == null) continue;
    const said = `${many} ${scale.word}`;
    if (left === 0) return said;
    // And the pair it adds: what is over, after the scale.
    if (lang.joinNumbers(times * scale.value, left) !== value) continue;
    const rest = numberInWords(left, langName, langs, world, depth + 1);
    if (rest == null) continue;
    return `${said} ${rest}`;
  }
  return null;
}

// A term, said in the language being spoken — or, where that language has no
// word for it, said as it was given. A name is not translated.
export function termWord(term, langName, langs, world, written) {
  if (term == null) return null;
  const lang = (langs || []).find((l) => l.data.name === langName);
  const other = lang && written ? lang.otherWordFor(term) : null;
  const word = other ?? (lang ? lang.wordFor(term) : null);
  const said = word ?? (world ? world.symbolOf(term) : null);
  if (said != null || !world) return said;
  // A thing nothing was ever called is said by what it is: one apple, spoken
  // of once and never named, is an apple. The walk stops at the first kind
  // there is a word for, and a thing of nothing is unsayable.
  for (const kind of world.linked(term, world.baseRelation)) {
    const named = termWord(kind, langName, langs, world, written);
    if (named != null) return named;
  }
  return null;
}

// ---------------------------------------------------------------------------
// structure — grammar-driven phrase building, purely from data.
// The brain parses the sequence of parts-of-speech against whatever grammar the
// language data provides. It knows nothing about English; it only applies the
// grammar it is given. A successful parse binds the solved words into a single
// structured sentence tree.
// ---------------------------------------------------------------------------
function structurePhrase(roots, langs) {
  if (!roots || roots.length < 2) return roots;
  const tagged = roots.map((n) => ({ root: n, pos: posOf(n) }));
  if (tagged.some((t) => t.pos.length === 0)) return roots;

  const grammar = grammarOf(roots[0], langs);
  const start = grammar && grammar.start;
  const rules = grammar && grammar.rules;
  if (!start || !rules || !rules[start]) return roots;

  // Read as the language writes it first. Only where nothing the language
  // declares reads the whole signal is a hole allowed to stand as a thing in
  // its own right — otherwise a question naming what it asks after would be
  // swallowed by the asking word alone.
  const read = (words) => {
    for (const standing of [false, true]) {
      const memo = new Map();
      for (const parse of parsesFrom(rules, start, words, 0, memo, standing)) {
        if (parse.next !== words.length) continue;
        const kids = (parse.tree.children || []).map((c) => leafOrPhrase(c, rules)).filter(Boolean);
        return [
          node(start, start, kids, {
            text: words.map((t) => t.root.state.identity).join(' '),
            ...(rules[start].whole ? { whole: true } : {}),
            ...(rules[start].referent ? { referent: true } : {}),
          }),
        ];
      }
    }
    return null;
  };

  const whole = read(tagged);
  if (whole) return whole;

  // A word that joins stands between two things said. Where no reading places
  // it, there was nothing for it to join — what it stood between was already
  // one signal — and the signal is read without it. Which words join is the
  // language's; that one no reading can place adds nothing is the brain's.
  const joins = tagged.filter((t) => functionsOf(t.root).includes('join'));
  const without = [...joins.map((j) => [j]), ...(joins.length > 1 ? [joins] : [])];
  for (const dropped of without) {
    const left = tagged.filter((t) => !dropped.includes(t));
    if (left.length < 2) continue;
    const found = read(left);
    if (found) return found;
  }
  return roots;
}

// Every way `symbol` can match starting at `index`, memoized. Returning all
// parses rather than the first is what lets an enclosing rule reject a short
// match and take a longer one — `sentence -> interjection | interjection
// sentence` needs exactly that.
//
// Seeding the memo before recursing makes a left-recursive rule yield nothing
// instead of overflowing the stack: a grammar is data, and bad data must not
// take the brain down.
function parsesFrom(rules, symbol, tagged, index, memo, standing = false) {
  const key = symbol + ':' + index;
  if (memo.has(key)) return memo.get(key);
  memo.set(key, []);

  const rule = rules[symbol];
  let results;
  if (!rule || !rule.rules) {
    // terminal: matches one token's part-of-speech
    results =
      index < tagged.length && tagged[index].pos.includes(symbol)
        ? [{ next: index + 1, tree: { symbol, root: tagged[index].root } }]
        : [];
  } else {
    results = [];
    for (const alternative of rule.rules) {
      const seq = alternative.split(/\s+/).filter(Boolean);
      for (const r of parseSequence(rules, seq, tagged, index, memo, standing)) {
        results.push({ next: r.next, tree: { symbol, children: r.children } });
      }
    }
  }

  // A hole stands wherever a thing may stand.
  //
  // Asking is saying with a hole in it, and the hole falls where the thing it
  // asks after would have stood. So anything the grammar says stands for
  // something can be a hole instead, and no language has to write its asking
  // words into every place a thing may go — one rule for holding a telescope,
  // another for standing taller than somebody, another for each after that.
  if (standing && rule && rule.referent && index < tagged.length && markOn(tagged[index].root) === 'unknown') {
    results = [...results, { next: index + 1, tree: { symbol, root: tagged[index].root } }];
  }

  // Two of the same sort with a joining word between them are one of that
  // sort. This is the brain's, not any language's: a language says which of
  // its words join, and never has to write out every sort they may stand
  // between. Written out, a language would need one rule for things joined,
  // another for doings joined, another for whole claims joined, and would
  // still be missing the next one.
  //
  // Read from the right, so a run of them joins without the rule standing on
  // itself: what is already matched is the left side, and what follows the
  // joining word is asked for afresh.
  const joined = [];
  for (const r of results) {
    const between = tagged[r.next];
    if (!between || !functionsOf(between.root).includes('join')) continue;
    for (const other of parsesFrom(rules, symbol, tagged, r.next + 1, memo, standing)) {
      joined.push({
        next: other.next,
        tree: { symbol, joined: true, children: [r.tree, { symbol, root: between.root }, other.tree] },
      });
    }
  }
  results = [...results, ...joined];

  memo.set(key, results);
  return results;
}

// Every way the sequence `seq` can match starting at `index`.
function parseSequence(rules, seq, tagged, index, memo, standing = false) {
  let states = [{ next: index, children: [] }];
  for (const symbol of seq) {
    const grown = [];
    for (const state of states) {
      for (const r of parsesFrom(rules, symbol, tagged, state.next, memo, standing)) {
        grown.push({ next: r.next, children: [...state.children, r.tree] });
      }
    }
    if (grown.length === 0) return [];
    states = grown;
  }
  return states;
}

// Convert a parse-node into a brain node (leaf = solved root; phrase = node).
function leafOrPhrase(c, rules) {
  if (c.root) return c.root;
  return node(
    c.symbol,
    c.symbol,
    (c.children || []).map((child) => leafOrPhrase(child, rules)).filter(Boolean),
    {
      ...(rules[c.symbol] && rules[c.symbol].whole ? { whole: true } : {}),
      ...(rules[c.symbol] && rules[c.symbol].referent ? { referent: true } : {}),
      ...(rules[c.symbol] && rules[c.symbol].completes ? { completes: true } : {}),
      ...(c.joined ? { joined: true } : {}),
    },
  );
}

// A joining stands over whatever surrounds it: somebody who reads and writes
// reads, and writes. The two sides are not two parts of one doing — they are
// two doings, and everything said outside the joining is said of both.
//
// So the signal is spread into one of itself per side, and those stand joined
// as wholes. From there the brain judges each on its own, which is what it
// already does when a signal joins two whole claims outright.
function spread(roots, world) {
  if (!world || roots.length !== 1) return roots;
  const a = world.anchors || {};
  if (a.action == null) return roots;
  const root = roots[0];
  const found = joinedDoings(root, world, a);
  if (!found) return roots;
  const sides = found.branch.filter((b) => reaches(b, a.action, world));
  if (sides.length < 2) return roots;
  return [withBranch(root, sides.map((side) => instead(root, found, side)))];
}

// A joining the brain made whose sides are doings. Only doings: a joining of
// things is already one thing standing in one place, and spreading it would
// say the signal twice over.
function joinedDoings(n, world, a) {
  if (!n || !n.branch) return null;
  if (n.state && n.state.joined && n.branch.filter((b) => reaches(b, a.action, world)).length > 1) {
    return n;
  }
  for (const b of n.branch) {
    const found = joinedDoings(b, world, a);
    if (found) return found;
  }
  return null;
}

// What the brain made of the word, not what the language listed: a number read
// out of its figures stands where the language says figures stand. A word may
// be more than one part of speech, and every one it may be is offered to the
// parse; which one it is, is what a successful parse settles.
function posOf(n) {
  const thought = thoughtOf(n);
  const pos = thought ? thought.pos : null;
  if (pos == null) return [];
  return Array.isArray(pos) ? pos : [pos];
}

// Language-declared cognitive functions. POS values are opaque parser symbols;
// none of them may decide reasoning behavior.


function grammarOf(root, langs) {
  const langNode = findBranch(root, 'language');
  const name = langNode && langNode.state.matches && langNode.state.matches[0]
    ? langNode.state.matches[0].lang
    : null;
  const lang = langs.find((L) => L.data.name === name);
  return lang ? lang.grammar : null;
}

// ---------------------------------------------------------------------------
// Pipeline driver — the five phases, all inside the brain. Express runs last,
// Several things said at once, taken one after another.
//
// Each is reasoned through in full, and what it settles stands for the next:
// `tom is older than mike` has to be so before `who is the oldest` can be
// asked. The world the brain was handed does not move, so it grows one of its
// own from what it has accepted so far — nothing is written anywhere, and the
// runtime is handed the whole of it at the end as one change.
function oneAfterAnother(wholes, knowledge, circumstance) {
  let world = (knowledge && knowledge.world) || null;
  let said = circumstance || {};
  const done = [];
  for (const whole of wholes) {
    const answer = brainFrom(whole, { ...knowledge, world }, said);
    done.push(answer);
    if (answer.learned) world = grownBy(world, answer.learned);
    said = {
      ...said,
      spoken: answer.spoken,
      focus: answer.focus,
      names: answer.names,
      language: answer.language ?? said.language ?? null,
    };
  }
  const langs = (knowledge && knowledge.languages) || [];
  const roots = done.flatMap((answer) => answer.roots);
  const terms = done.flatMap((answer) => (answer.learned ? answer.learned.terms : []));
  const last = done[done.length - 1];
  return {
    ...last,
    input: toString(wholes.join(' ')),
    roots,
    // Each was said with the mood it was said in — a question asked at the end
    // does not make what came before it a question — so what each came to is
    // composed, never worked out again over all of them at once.
    expression: saidTogether(done.map((answer) => answer.expression), langs, last.expression.state.mood),
    learned: terms.length > 0 ? { terms } : null,
    // Each in the order it was said: the conversation holds them the way it
    // was told them.
    remember: () => done.forEach((answer) => answer.remember()),
    phases: last.phases,
  };
}

// on the structured signal, so the brain replies to the whole and not only to
// each word of it.
// The brain is pure: given the input and the already-loaded language data it
// perceives, reasons, solves and expresses. It carries no knowledge of any
// language; all language knowledge arrives as external data.
//
// Where that data comes from — disk (runtime:fs, server), HTTP, or a bundled
// JSON — is a separate concern kept outside this module so browser builds
// never resolve the server-only runtime:fs module. A server wrapper feeds the
// loaded data in via brainFrom(input, langs, world). See demo/server.js.
// ---------------------------------------------------------------------------
export function brainFrom(input, knowledge, circumstance) {
  const langs = (knowledge && knowledge.languages) || [];
  const world = (knowledge && knowledge.world) || null;
  // A signal may hold more than one thing said. Reading where each one ends is
  // reading, so it is done here and not outside — and they are taken in order,
  // each against the world the one before it left, because that is what saying
  // them one after another means.
  const wholes = signalsIn(input, langs);
  if (wholes.length > 1) return oneAfterAnother(wholes, knowledge, circumstance);
  // Which conversation this signal belongs to. One brain, one graph: reading a
  // turn through to the end never gives way to another, so the brain knows
  // which conversation it is reasoning in for as long as it takes, and nothing
  // it holds outlives the call.
  graph = (knowledge && knowledge.graph) || null;

  // Where the signal came from is the runtime's to say — a person, a device, a
  // service, or nothing said at all. Where it went is this brain, unless the
  // runtime says otherwise: having received it is not an assumption.
  let nextId = world ? world.nextId() : 0;
  const at = {
    from: circumstance && circumstance.from != null ? circumstance.from : null,
    to:
      circumstance && circumstance.to != null
        ? circumstance.to
        : (world && world.anchors ? world.anchors.self : null) ?? null,
    // What the conversation was last about is no more the brain's to keep than
    // who is speaking: it was handed back after the signal before this one, and
    // it comes back the same way, or it does not come back at all.
    spoken: circumstance && circumstance.spoken != null ? circumstance.spoken : null,
    // The ranked focus list, latest first — what was spoken of, what it holds,
    // and earlier topics still in mind. The runtime holds it per conversation;
    // the brain only reads it and hands back the new one.
    focus:
      circumstance && Array.isArray(circumstance.focus)
        ? [...circumstance.focus]
        : circumstance && circumstance.spoken != null
          ? [circumstance.spoken]
          : [],
    // What this conversation has given a name to. No more the brain's to keep
    // than who is speaking: it was handed back and comes back the same way.
    names: (circumstance && circumstance.names) || {},
    // A language established by an earlier signal is circumstance like its
    // topic, not knowledge held by the brain. It may settle a surviving tie,
    // but it cannot revive a candidate disproved by this signal's evidence.
    language: circumstance && circumstance.language != null
      ? circumstance.language
      : null,
    allocate: () => nextId++,
  };

  const perceived = signalReading(input, langs);
  const reading = resolveLanguageReading(input, perceived, langs, at, world);
  const roots = understand(input, langs, reading);
  const thoughtRoots = think(roots, langs, at, world);
  const mood = moodOf(input, thoughtRoots, langs);
  const solvedRoots = solve(thoughtRoots, world, langs, mood, at.allocate);
  const structuredRoots = spread(structurePhrase(solvedRoots, langs), world);
  let judgedRoots = judge(structuredRoots, world, mood, langs, at);
  judgedRoots = awoken(judgedRoots, world, mood, at);
  judgedRoots = saidByPointing(judgedRoots, world, mood);
  let learned = learnedFrom(judgedRoots, world);
  let inconsistent = learningConflict(world, learned);
  // A kind claim that runs the wrong way, about a kind this conversation holds
  // several of, is no cycle: it says one of them is of that kind. `a basket has
  // five fruits` and then `one fruit is an apple` cannot mean fruit is a sort
  // of apple, and does mean one of those five is one — which the graph writes
  // as a thing drawn out of the group.
  if (inconsistent === 'classification cycle' && graph != null) {
    const drawn = (learned && learned.terms ? learned.terms : []).some((term) =>
      (term.links || []).some(
        (link) => graph.drawnGroup(term.id) != null && world.isA(link.to, term.id),
      ),
    );
    if (drawn) {
      inconsistent = null;
      learned = null;
    }
  }
  if (inconsistent && judgedRoots.length === 1) {
    judgedRoots = [withBranch(judgedRoots[0], [
      ...judgedRoots[0].branch,
      node('refuse', 'inconsistent', [], { why: inconsistent }),
    ])];
    learned = null;
  }
  // The conversation graph, filled once the signal is understood. This is the
  // one place it is built: the phases below settle who did what to whom, and
  // the graph is where that settles into things, facts, doings and what
  // governs. Reading it is `serialize`, and nothing else assembles it.
  // What the signal left in reach, so a word in the next one has something to
  // land on. Worked out once and handed both to the graph and to the runtime.
  const inReach = focusOf(judgedRoots, at, world);
  // What the signal named. A name is held by the conversation and never by the
  // world, so a signal may take something in with nothing to write down.
  const named = Object.keys(namedIn(solvedRoots, { ...at, world, mood }) || {});
  // Which side of a word its markers stand on is the language's to declare;
  // the graph is told, and assumes no order of its own.
  const spoken = signalLanguage(thoughtRoots, langs);
  // Held back until the change this turn proposes has been written. A turn
  // that fails to persist did not happen, and the conversation must not
  // remember what the world never took in.
  // A signal the brain could not read leaves nothing behind. Half of one taken
  // in is worse than none: the memory would hold what nobody was told, and
  // every reading over it would be answering from a guess.
  let read = true;
  const remember = () => {
    if (!graph || !read) return;
    graph.fromUnderstood(
      judgedRoots,
      world,
      inReach,
      spoken ? spoken.data.marking : null,
      at.from,
      mood,
    );
  };

  const expressedRoots = express(judgedRoots, langs, world);
  const said = expression(
    expressedRoots, langs, mood, world, at,
    learned != null || named.length > 0,
  );
  // Nor does one it read and could not place. Told something and left unsure
  // of it, the brain took nothing in, and the pieces it made along the way are
  // not claims anybody made — an instruction it could not hold as one would
  // otherwise leave both its sides standing as facts.
  read = said.name !== 'unknown' && !(mood === 'tell' && said.name === 'unsure');
  return {
    input,
    language: spoken ? spoken.data.name : null,
    roots: expressedRoots,
    expression: said,
    learned,
    remember,
    spoken: spokenOf(judgedRoots, at, world),
    focus: inReach,
    names: namedIn(solvedRoots, { ...at, world, mood }),
    // An instruction the brain agreed to follow and could not act on yet. It
    // keeps none of it: it hands it back, and the runtime brings it round again
    // when something has moved.
    told: findBranch(judgedRoots[0] || node('void', 'void'), 'agree') ? toString(input) : null,
    phases: {
      understand: roots,
      think: thoughtRoots,
      solve: solvedRoots,
      structure: structuredRoots,
      judge: judgedRoots,
      express: expressedRoots,
    },
  };
}

// What a pointer stands for is said of what it lands on.
//
// A language may say that one of its pointing words stands for a kind or a
// state — `she` for female. Landing it on something says that of the thing:
// somebody calling x `she` has said x is female, as surely as saying so
// outright. Which word stands for what is the language's; that saying it of a
// thing says it is the brain's.
//
// Only what the signal itself put there. Asking after something says nothing
// of it, and neither does a pointer that landed nowhere.
function saidByPointing(roots, world, mood) {
  if (!world || mood !== 'tell') return roots;
  const a = world.anchors || {};
  const relation = a.predication ?? world.baseRelation;
  if (relation == null) return roots;
  const said = [];
  const seek = (n) => {
    const t = thoughtOf(n);
    if (
      n.kind === 'thing' &&
      t &&
      t.stands != null &&
      t.concept != null &&
      t.concept !== t.stands &&
      markOn(n) === 'spoken' &&
      !world.isA(t.concept, t.stands)
    ) said.push({ subject: t.concept, object: t.stands });
    (n.branch || []).forEach(seek);
  };
  roots.forEach(seek);
  if (said.length === 0) return roots;
  return roots.map((root) =>
    withBranch(root, [
      ...(root.branch || []),
      // Said, and taken in: the claim the pointing made, and the fact it
      // leaves behind. A claim is what the conversation holds; the fact is
      // what the world does.
      ...said.flatMap(({ subject, object }) => [
        node('standing', 'absent', [], { subject, relation, object, negated: false }),
        node('learn', 'link', [], { subject, relation, object, not: false }),
      ]),
    ]),
  );
}

// Whether a change the brain proposes would leave the world unsound.
//
// The world the change joins was already whole. So what is walked is what the
// change touches — the terms it names, the links it adds, and what the world
// already holds about those — and nothing else: a fact bearing on nothing else
// cannot have made anything else wrong. Weighing one fact by walking every
// term is what made learning cost more the more there was to know.
//
// Every rule below is a rule the whole world is held to. Only where each one
// starts from has changed, and the world is asked for the steps out from there
// rather than having them rebuilt from all of it.
function learningConflict(world, learned) {
  if (!world || !learned) return null;
  const proposed = learned.terms || [];
  if (proposed.length === 0) return null;
  const a = world.anchors || {};

  // What each term the change names would hold afterwards: what it holds now,
  // and what the change adds to it.
  const after = new Map();
  const claimed = new Map();
  for (const proposal of proposed) {
    const standing = world.term(proposal.id);
    if (standing && standing.name !== proposal.name) {
      return `term ${proposal.id} already names ${standing.name}`;
    }
    const owner = claimed.get(proposal.name) ?? world.named(proposal.name);
    if (owner != null && owner !== proposal.id) {
      return `name ${proposal.name} already belongs to ${owner}`;
    }
    claimed.set(proposal.name, proposal.id);
    const before = after.get(proposal.id) ?? standing;
    after.set(proposal.id, {
      ...(before || {}),
      ...proposal,
      links: [...((before && before.links) || []), ...(proposal.links || [])],
    });
  }
  const term = (id) => after.get(id) ?? world.term(id);
  const links = (id) => term(id)?.links || [];
  const arriving = proposed.flatMap((proposal) =>
    (proposal.links || []).map((link) => ({ subject: proposal.id, link })),
  );

  // A link may not point at a term that is not there, nor be made of one. Only
  // what this change brings is looked at: every term it could name is either
  // in the world it joins or arriving with it.
  for (const { link } of arriving) {
    if (term(link.to) == null) return `link to unknown term ${link.to}`;
    if (term(link.rel) == null) return `link by unknown term ${link.rel}`;
  }

  // One term may not hold and deny the same thing, nor give it two counts.
  for (const id of after.keys()) {
    const facts = new Map();
    for (const link of links(id)) {
      const key = `${link.rel}:${link.to}:${link.at ?? ''}`;
      const fact = facts.get(key);
      if (fact && Boolean(fact.not) !== Boolean(link.not)) {
        return `term ${id} both holds and denies ${key}`;
      }
      if (
        fact &&
        link.quantity !== undefined &&
        fact.quantity !== undefined &&
        fact.quantity !== link.quantity
      ) return `term ${id} gives ${key} two quantities`;
      facts.set(key, link);
    }
  }

  // Identity is an equivalence class over stored ids, not a merge. The world
  // knows its own classes; a change may join two of them, and then the class
  // is both together.
  const sameRelation = (world.data.relations && world.data.relations.same) ?? a.same;
  const joined = new Map();
  if (sameRelation != null) {
    for (const { subject, link } of arriving) {
      if (link.not || link.rel !== sameRelation) continue;
      if (!joined.has(subject)) joined.set(subject, []);
      if (!joined.has(link.to)) joined.set(link.to, []);
      joined.get(subject).push(link.to);
      joined.get(link.to).push(subject);
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
      for (const other of world.equivalents(here)) pending.push(other);
      for (const other of joined.get(here) || []) pending.push(other);
    }
    for (const member of found) identityCache.set(member, found);
    return found;
  };
  const identityOf = (id) => Math.min(...identities(id));

  // Where the change reaches: the terms it names, the ends of the links it
  // brings, and everything those stand for. A rule broken by this change is
  // broken somewhere in here.
  const reached = new Set();
  for (const id of after.keys()) for (const member of identities(id)) reached.add(member);
  for (const { subject, link } of arriving) {
    for (const end of [subject, link.to]) for (const member of identities(end)) reached.add(member);
  }

  const subtype = a.subtype;
  const instance = a.instance;
  const predication = a.predication;
  const classifies = (rel) => rel === world.baseRelation || rel === subtype || rel === instance;

  // What the change itself says a term must be, through the kinds a relation
  // declares for either of its ends.
  const inferred = new Map();
  const infer = (id, kinds) => {
    if (kinds.length === 0) return;
    if (!inferred.has(id)) inferred.set(id, new Set());
    for (const kind of kinds) inferred.get(id).add(kind);
  };
  for (const { subject, link } of arriving) {
    if (link.not) continue;
    infer(subject, world.domains(link.rel));
    infer(link.to, world.ranges(link.rel));
  }

  // Everything a term is, once the change stands: what the world already says
  // it is, what the change classifies it as, and what a relation's declared
  // kinds make of it.
  const kindsCache = new Map();
  const walkKinds = (id, from) => {
    const found = new Set();
    const pending = from;
    while (pending.length) {
      const here = pending.pop();
      if (found.has(here)) continue;
      found.add(here);
      for (const kind of world.kinds(here)) pending.push(kind);
      for (const link of links(here)) {
        if (!link.not && classifies(link.rel)) pending.push(link.to);
      }
    }
    return found;
  };
  const kindsOf = (id) => {
    if (!kindsCache.has(id)) kindsCache.set(id, walkKinds(id, [id, ...(inferred.get(id) || [])]));
    return kindsCache.get(id);
  };
  // What a term is said to be, without what this very change would make of it.
  // A link is not evidence for the shape it must itself have: what a relation
  // declares of its ends cannot be what proves those ends fit.
  const classifiedAs = (id) => walkKinds(id, [id]);

  const different = (world.data.relations && world.data.relations.different) ?? a.different;
  const excluded = (left, right) => {
    if (left === right) return false;
    if (different != null) {
      if (links(left).some((link) => !link.not && link.rel === different && link.to === right)) return true;
      if (links(right).some((link) => !link.not && link.rel === different && link.to === left)) return true;
    }
    for (const link of links(left)) {
      if (link.not || !classifies(link.rel)) continue;
      if (
        term(link.to)?.disjoint &&
        links(right).some((other) => !other.not && classifies(other.rel) && other.to === link.to)
      ) return true;
    }
    return false;
  };

  // Equivalent representatives cannot disagree about one fact. Only a fact the
  // change brings can start a disagreement.
  for (const { subject, link } of arriving) {
    const subjects = identities(subject);
    const objects = identities(link.to);
    if (subjects.size < 2 && objects.size < 2) continue;
    const key = `${identityOf(subject)}:${link.rel}:${identityOf(link.to)}:${link.at ?? ''}`;
    const disagrees = (other) => {
      if (other === link || other.rel !== link.rel) return null;
      if ((other.at ?? '') !== (link.at ?? '')) return null;
      if (Boolean(other.not) !== Boolean(link.not)) return `equivalent terms both hold and deny ${key}`;
      if (
        other.quantity !== undefined &&
        link.quantity !== undefined &&
        other.quantity !== link.quantity
      ) return `equivalent terms give ${key} two quantities`;
      return null;
    };
    for (const member of subjects) {
      for (const other of links(member)) {
        if (!objects.has(other.to)) continue;
        const wrong = disagrees(other);
        if (wrong) return wrong;
      }
    }
    if (!term(link.rel)?.symmetric) continue;
    for (const member of objects) {
      for (const other of links(member)) {
        if (!subjects.has(other.to)) continue;
        const wrong = disagrees(other);
        if (wrong) return wrong;
      }
    }
  }

  // What one representative is, they all are — read whole for a class the
  // change touches, since the rest were already sound.
  const classes = new Map();
  for (const id of reached) {
    const component = identities(id);
    if (component.size > 1) classes.set(identityOf(id), component);
  }
  for (const component of classes.values()) {
    const effective = new Set();
    const values = new Set();
    for (const member of component) {
      if (term(member)?.value !== undefined) values.add(term(member).value);
      for (const kind of kindsOf(member)) effective.add(kind);
      if (links(member).some(
        (link) => link.not && link.rel === sameRelation && component.has(link.to),
      )) return 'equivalent terms are explicitly denied as same';
    }
    for (const member of component) {
      if (links(member).some(
        (link) => link.not && classifies(link.rel) && effective.has(link.to),
      )) return 'equivalent terms contradict an inherited classification';
    }
    if (values.size > 1) return 'equivalent terms name different numeric values';
    for (const left of effective) {
      for (const right of effective) {
        if (excluded(left, right)) return 'equivalent terms have exclusive identities or kinds';
      }
    }
  }

  // What a relation's declared kinds make of a term cannot be something that
  // term is said not to be, or something exclusive of what it is.
  for (const id of inferred.keys()) {
    const effective = kindsOf(id);
    for (const rung of effective) {
      for (const link of links(rung)) {
        if (link.not && classifies(link.rel) && effective.has(link.to)) {
          return 'domain or range inference contradicts a denied classification';
        }
      }
      for (const other of effective) {
        if (excluded(rung, other)) {
          return 'domain or range inference contradicts an exclusive classification';
        }
      }
    }
  }

  const sameMoment = (left, right) => (left.at ?? null) === (right.at ?? null);

  // A narrower fact entails every broader one, so a denial of any broader
  // proposition cannot stand beside it. Either half may be the one arriving,
  // so both are looked for.
  const contradicts = (subject, positive, object) => {
    for (const broader of world.broader(positive.rel)) {
      if (broader === positive.rel) continue;
      if (links(subject).some(
        (other) => other.not && other.rel === broader && other.to === object && sameMoment(other, positive),
      )) return `narrower relation ${positive.rel} contradicts denied broader relation ${broader}`;
      if (term(broader)?.symmetric && links(object).some(
        (other) => other.not && other.rel === broader && other.to === subject && sameMoment(other, positive),
      )) return `narrower relation ${positive.rel} contradicts denied broader relation ${broader}`;
      for (const back of world.converses(broader)) {
        if (links(object).some(
          (other) => other.not && other.rel === back && other.to === subject && sameMoment(other, positive),
        )) return `narrower relation ${positive.rel} contradicts denied broader relation ${broader}`;
      }
    }
    return null;
  };
  for (const { subject, link } of arriving) {
    if (!link.not) {
      const wrong = contradicts(subject, link, link.to);
      if (wrong) return wrong;
      continue;
    }
    // A denial arriving. What already holds, said more narrowly, would be
    // contradicted by it — said of this term, or of the one it points at
    // through a symmetric relation or one declared its converse.
    for (const other of links(subject)) {
      if (other.not) continue;
      const wrong = contradicts(subject, other, other.to);
      if (wrong) return wrong;
    }
    for (const other of links(link.to)) {
      if (other.not) continue;
      const wrong = contradicts(link.to, other, other.to);
      if (wrong) return wrong;
    }
  }

  // A symmetric edge and its mirror are one proposition, and one proposition
  // has one polarity and one count.
  for (const relation of world.marked('symmetric')) {
    const variants = new Set(world.narrower(relation));
    const counts = (link) => variants.has(link.rel) && !(link.not && link.rel !== relation);
    if (!arriving.some(({ link }) => counts(link))) continue;
    const facts = new Map();
    for (const id of reached) {
      for (const link of links(id)) {
        if (!counts(link)) continue;
        const ends = id <= link.to ? [id, link.to] : [link.to, id];
        const key = `${ends[0]}:${ends[1]}:${link.at ?? ''}`;
        const fact = facts.get(key);
        if (fact && Boolean(fact.not) !== Boolean(link.not)) {
          return `symmetric relation ${relation} both holds and denies ${key}`;
        }
        if (
          fact &&
          fact.quantity !== undefined &&
          link.quantity !== undefined &&
          fact.quantity !== link.quantity
        ) return `symmetric relation ${relation} gives ${key} two quantities`;
        facts.set(key, link);
      }
    }
  }

  // Nothing stands to itself through a relation that says it cannot.
  for (const relation of [...world.marked('irreflexive'), ...world.marked('asymmetric')]) {
    const variants = new Set(world.narrower(relation));
    for (const id of reached) {
      if (links(id).some((link) => !link.not && variants.has(link.rel) && link.to === id)) {
        return `irreflexive relation ${relation} relates ${id} to itself`;
      }
    }
  }

  // A relation that must hold of everything it may hold of cannot have its
  // self-link denied by something it may hold of.
  for (const relation of world.marked('reflexive')) {
    const required = [...world.domains(relation), ...world.ranges(relation)];
    for (const id of reached) {
      if (!links(id).some((link) => link.not && link.rel === relation && link.to === id)) continue;
      const kinds = kindsOf(id);
      if (required.every((kind) => kinds.has(kind))) {
        return `reflexive relation ${relation} denies its required self-link`;
      }
    }
  }

  // A relation that holds of one thing at a time may not be given two. Both
  // ways of writing one — by the relation itself, and by one declared its
  // converse — are the same fact and count once.
  for (const relation of world.marked('functional')) {
    const variants = new Set(world.narrower(relation));
    const converses = new Set();
    for (const variant of variants) for (const other of world.converses(variant)) converses.add(other);
    const subjects = new Set();
    for (const { subject, link } of arriving) {
      if (link.not) continue;
      if (variants.has(link.rel)) subjects.add(identityOf(subject));
      if (converses.has(link.rel)) subjects.add(identityOf(link.to));
    }
    // Said of one end, a symmetric fact is said of the other as well.
    const backwards = [...converses, ...(term(relation)?.symmetric ? variants : [])];
    for (const subject of subjects) {
      const objects = [];
      for (const member of identities(subject)) {
        for (const link of links(member)) {
          if (!link.not && variants.has(link.rel)) objects.push({ at: link.at, to: identityOf(link.to) });
        }
        for (const rel of backwards) {
          const holders = new Set([
            ...world.pointing(member, rel),
            ...arriving
              .filter(({ link }) => !link.not && link.rel === rel && link.to === member)
              .map(({ subject: holder }) => holder),
          ]);
          for (const holder of holders) {
            for (const link of links(holder)) {
              if (link.not || link.rel !== rel || link.to !== member) continue;
              objects.push({ at: link.at, to: identityOf(holder) });
            }
          }
        }
      }
      const timeless = new Set(objects.filter((one) => one.at == null).map((one) => one.to));
      const all = new Set(objects.map((one) => one.to));
      if (timeless.size > 1 || (timeless.size === 1 && all.size > 1)) {
        return `functional relation ${relation} gives ${subject} competing objects`;
      }
      const byMoment = new Map();
      for (const one of objects) {
        if (one.at == null) continue;
        if (!byMoment.has(one.at)) byMoment.set(one.at, new Set());
        byMoment.get(one.at).add(one.to);
      }
      for (const held of byMoment.values()) {
        if (held.size > 1) {
          return `functional relation ${relation} gives ${subject} competing objects at one moment`;
        }
      }
    }
  }

  // Classification is a partial order: a kind cannot be one of itself through
  // another. A cycle the change makes runs through a link the change brings,
  // so the walk starts at one end of each and looks for the other.
  for (const { subject, link } of arriving) {
    if (link.not || !classifies(link.rel)) continue;
    if (kindsOf(link.to).has(subject)) return 'classification cycle';
  }

  // What the world says a classifying link may join.
  for (const { subject, link } of arriving) {
    if (link.rel === subtype && (term(subject)?.individual || term(link.to)?.individual)) {
      return 'subtype must connect kinds';
    }
    if (link.rel === instance && (!term(subject)?.individual || term(link.to)?.individual)) {
      return 'instance must connect an individual to a kind';
    }
    if (
      link.rel === predication &&
      (a.property == null || !classifiedAs(link.to).has(a.property))
    ) return 'predication must name a property';
  }

  // Only a relation may be given a domain or a range, and only kinds may be
  // named as one.
  const relationKind = a.relation;
  for (const { subject, link } of arriving) {
    if (link.not || (link.rel !== a.domain && link.rel !== a.range)) continue;
    if (relationKind != null && !classifiedAs(subject).has(relationKind)) {
      return 'domain and range may only constrain relations';
    }
    if (term(link.to)?.individual) return 'domain and range must name kinds, not individuals';
  }

  // A relation narrower than another is a relation, and no relation is
  // narrower than itself through a chain of them.
  const subrelation = a.subrelation;
  for (const { subject, link } of arriving) {
    if (link.not || link.rel !== subrelation) continue;
    if (relationKind != null && (!classifiedAs(subject).has(relationKind) || !classifiedAs(link.to).has(relationKind))) {
      return 'subrelation endpoints must both be relations';
    }
    const above = new Set();
    const pending = [link.to];
    while (pending.length) {
      const here = pending.pop();
      if (above.has(here)) continue;
      above.add(here);
      for (const broader of world.broader(here)) pending.push(broader);
      for (const other of links(here)) {
        if (!other.not && other.rel === subrelation) pending.push(other.to);
      }
    }
    if (above.has(subject)) return 'subrelation cycle';
  }

  // A relation that runs one way cannot run both, nor round to where it
  // started. The change brings the edge that would close it, so the walk goes
  // out from where that edge points and looks for where it came from.
  for (const relation of world.marked('asymmetric')) {
    const variants = new Set(world.narrower(relation));
    const converses = new Set();
    for (const variant of variants) for (const other of world.converses(variant)) converses.add(other);
    const brought = arriving.filter(
      ({ link }) => !link.not && (variants.has(link.rel) || converses.has(link.rel)),
    );
    if (brought.length === 0) continue;
    const forward = (id) => {
      const out = [];
      for (const link of links(id)) {
        if (link.not) continue;
        if (variants.has(link.rel)) out.push(link.to);
      }
      for (const converse of converses) {
        for (const holder of world.pointing(id, converse)) out.push(holder);
      }
      for (const { subject, link } of arriving) {
        if (link.not) continue;
        if (converses.has(link.rel) && link.to === id) out.push(subject);
      }
      return out;
    };
    for (const { subject, link } of brought) {
      const from = converses.has(link.rel) ? link.to : subject;
      const to = converses.has(link.rel) ? subject : link.to;
      if (from === to) return `asymmetric relation ${relation} relates ${from} to itself`;
      if (forward(to).includes(from)) {
        return term(relation)?.transitive && !forward(to).includes(from)
          ? `asymmetric relation ${relation} has a cycle`
          : `asymmetric relation ${relation} holds both ways`;
      }
      if (!term(relation)?.transitive) continue;
      const seen = new Set();
      const pending = [to];
      while (pending.length) {
        const here = pending.pop();
        if (here === from) return `asymmetric relation ${relation} has a cycle`;
        if (seen.has(here)) continue;
        seen.add(here);
        pending.push(...forward(here));
      }
    }
  }

  return null;
}


// What this signal gave a name to. A word that stands for whatever it was
// given, standing beside a term, is being given that term: `x is 5` says that
// x is the brain's word for five from here on. The brain keeps none of it — it
// hands it back, and the runtime decides whether the next signal is still the
// same conversation.
function namedIn(roots, at) {
  const given = { ...at.names };
  for (const { name, of, value } of givings(roots, at.world, at.mood)) {
    given[name] = { of, value };
  }
  return given;
}

// Whether a word stands for anything at all — a term, or an amount the world
// never named.
export function stands(n, world) {
  return conceptOf(n) != null || numberOf(n, world) != null;
}

// Each thing this signal named, and what kind it was said to be. The word is
// one nothing knows — no language lists it and no world holds it — and it
// stands before the weakest joint there is, which is how a thing is said to
// be of a kind.
function namings(said, world, mood) {
  const out = [];
  if (mood !== 'tell' || !world) return out;
  said.forEach((n, i) => {
    const thought = thoughtOf(n);
    if (!thought || thought.wordKnown || thought.concept != null) return;
    const rest = said.slice(i + 1).filter((other) => conceptOf(other) != null);
    if (rest.length < 2) return;
    // Said to be of a kind, that is the kind it is. Said anything else — that
    // it has something, that it weighs something — there is still a thing
    // being spoken of, and a thing is what it is.
    const a = world.anchors || {};
    const said_of = conceptOf(rest[1]);
    const of =
      conceptOf(rest[0]) === world.baseRelation && said_of != null && world.isA(said_of, a.thing)
        ? said_of
        : a.thing;
    out.push({ name: n.state.identity, of });
  });
  return out;
}

// Each name this signal gave, and what it was given. The word joining them is
// the signal's joint and not what the name stands for: `x is 5` gives x five,
// not being.
export function givings(roots, world, mood) {
  const out = [];
  if (mood !== 'tell') return out;
  roots.forEach((n, i) => {
    const thought = thoughtOf(n);
    // A word the language marks as a name, or one nothing knows at all: both
    // stand for whatever they were given.
    if (!thought || (thought.marks !== 'named' && thought.wordKnown)) return;
    // Giving a name is done with the weakest joint there is: `x is 5` gives,
    // `x > 10` asks. So what stands next to the name must be that joint, and
    // what stands past it is what the name was given.
    // A word marking whose something is does not stand for anything itself —
    // `my friend` gives a name a friend, never the one whose friend it is.
    const rest = roots
      .slice(i + 1)
      .filter((other, at) => stands(other, world) && !isDeterminer(roots, i + 1 + at, world));
    if (rest.length < 2 || conceptOf(rest[0]) !== world.baseRelation) return;
    if (thought.marks !== 'named' && numberOf(rest[1], world) == null) return;
    // A name stands for something. What it is given must be something to
    // stand for — a joining is not: `x is 5` gives x a value, `x is taller
    // than nila` says something about x, and taking that for a giving binds
    // the name to the comparison itself and loses the claim.
    const a = world.anchors || {};
    const given = conceptOf(rest[1]);
    if (
      given != null &&
      numberOf(rest[1], world) == null &&
      (world.isA(given, a.relation) || world.isA(given, a.action))
    ) return;
    // A name holds what it was given, term or amount. No world names every
    // number, and a name given one the world has no word for holds it all the
    // same.
    out.push({
      name: n.state.identity,
      of: conceptOf(rest[1]),
      value: numberOf(rest[1], world),
    });
  });
  return out;
}

// What the signal was about, so that the signal after it may point back at it.
// The brain keeps this no more than it keeps what it learned — it hands it
// back, and the runtime decides whether the next signal is the same
// conversation.
//
// One thing offered several facts is still the one thing spoken of. Several
// things offered facts together are several, and there is no one of them to
// point back at: where there is none or more than one, the brain does not
// pick. A signal it could make nothing of says nothing about what was spoken
// of, and what was spoken of before it still stands.
function spokenOf(roots, at, world) {
  if (roots.length !== 1) return at.spoken;
  const target = world && world.anchors ? world.anchors.target : null;
  const took = [];
  const stood = [];
  const walk = (n) => {
    // What the brain did to the world names the thing more exactly than what
    // the fact stood on: a state was taken in for the one thing bearing it,
    // and that one, not its kind, is what was spoken of.
    if (n.kind === 'learn') keep(took, n.state.subject);
    // Something that happened was about the thing it was done to. Told a thing
    // was seen, the next signal may point back at what was seen — a signal
    // that offers no fact still speaks of something.
    // Being greeted is not what a conversation is now about: a greeting names
    // nothing to speak of next, and what was in mind stays there.
    const a = world && world.anchors ? world.anchors : {};
    const greeting = n.kind === 'event' && world && world.isA(n.state.action, a.greeting);
    if (n.kind === 'event' && target != null && !greeting) {
      for (const part of n.state.parts || []) if (part.role === target) keep(took, part.of);
    }
    if (n.kind === 'standing' || n.kind === 'answer') keep(stood, n.state.subject);
    // Giving a name speaks of what was stood for: `x is 5` puts five in mind
    // even though nothing is taken into the world for it.
    if (n.kind === 'named') {
      for (const g of n.state.gave || []) keep(took, g.of);
    }
    (n.branch || []).forEach(walk);
  };
  roots.forEach(walk);
  // A bare word that the world establishes as one thing is itself what was
  // spoken of. This is perception, not a guessed noun rule: the solved entity
  // branch is what proves it is a thing. Actions, properties, unknown words and
  // signals naming several things establish no new single topic.
  const perceived = [];
  if (roots[0].kind === 'thing') {
    const entity = findBranch(roots[0], 'entity');
    if (entity && entity.state.concept != null) keep(perceived, entity.state.concept);
  }
  const found = took.length > 0 ? took : stood.length > 0 ? stood : perceived;
  if (found.length === 0) return at.spoken;
  return found.length === 1 ? found[0] : null;
}

function keep(found, of) {
  if (of != null && !found.includes(of)) found.push(of);
}

// The ranked focus list this signal leaves behind, latest first: what was
// worked out, what was spoken of, what it directly holds, what was done,
// what was said and checked, then earlier topics still in mind. A result the
// world named goes back as its term; one it did not goes back as its bare
// value, so counting beside it still works. What was spoken of before and
// untouched stays on; several spoken of at once leave no primary, but all
// stay in focus. Capped so the same signals always give the same list.
function focusOf(roots, at, world) {
  const primary = spokenOf(roots, at, world);
  const sum = [];
  const met = [];
  const actions = [];
  const ideas = [];
  const gather = (n) => {
    if (n.kind === 'sum' && n.name === 'worked') {
      sum.push(n.state.term ?? { value: n.state.value });
    }
    // What was done stays repeatable: the action of every occurrence, so a
    // later `did` means the latest one. Individuals, not kinds.
    if (n.kind === 'event' && typeof n.state.action === 'number') {
      if (!actions.includes(n.state.action)) actions.push(n.state.action);
    }
    // What was said and checked stays askable: every verdict, so a later
    // `so` asks about the latest one again. The triple, not the name — the
    // world may have moved since.
    if (n.kind === 'standing' && n.state.relation != null && n.state.subject != null) {
      ideas.push({
        standing: {
          subject: n.state.subject,
          relation: n.state.relation,
          object: n.state.object,
          negated: n.state.negated,
        },
      });
    }
    // A number said on its own is a thing the conversation now has. Nothing
    // was said *of* it — it was simply said — and until now that meant it was
    // answered and dropped, leaving the next signal's `it` nothing to land on.
    if (n.kind === 'thing' && conceptOf(n) == null) {
      const value = numberOf(n, world);
      if (value != null) met.push({ value });
    }
    (n.branch || []).forEach(gather);
  };
  roots.forEach(gather);
  const held = [];
  if (primary != null && world) {
    const a = world.anchors || {};
    for (const of of world.linked(primary, a.holding)) if (!held.includes(of)) held.push(of);
  }
  const prior = at && Array.isArray(at.focus) ? at.focus : [];
  const out = [];
  const key = (e) => {
    if (typeof e === 'number') return `id:${e}`;
    if (e && e.value !== undefined) return `value:${e.value}`;
    if (e && e.standing) {
      const s = e.standing;
      return `idea:${s.subject}:${s.relation}:${s.object}:${s.negated}`;
    }
    return null;
  };
  for (const id of [...sum, ...met, primary, ...held, ...actions, ...ideas, ...prior]) {
    if (id == null) continue;
    const k = key(id);
    if (k != null && out.some((had) => key(had) === k)) continue;
    out.push(id);
  }
  return out.slice(0, 8);
}

// What the brain accepted, in the one shape all knowledge takes. The brain does
// not keep it — it hands it back, and the runtime decides whether to remember.
function learnedFrom(roots, world) {
  if (!world || roots.length === 0) return null;
  // A signal that came to several verdicts learned from every one of them,
  // held together — the second fact is as much a fact as the first.
  // What one claim being so is why another is, is a fact about the pair and
  // belongs to neither half. It is looked for over the whole signal, before
  // the halves are taken one at a time.
  const reasons = [];
  const about = [];
  const seek = (n) => {
    if (n.kind === 'cause') reasons.push(n);
    if (n.kind === 'about') about.push(n);
    (n.branch || []).forEach(seek);
  };
  roots.forEach(seek);
  const followed = [];
  const walk = (n) => {
    if (n.kind === 'learn' && n.state.following) followed.push(n.state.following);
    (n.branch || []).forEach(walk);
  };
  roots.forEach(walk);
  const behind = [
    ...reasons.flatMap((c) => stoodBehind(c, world)),
    ...about.flatMap((n) => heldAbout(n, world)),
    ...stoodOn(followed, world),
  ];

  const together = roots.length > 1 ? roots : apart(roots, world);
  if (together) {
    const terms = asOne([
      ...together.flatMap((r) => (learnedFrom([r], world) || { terms: [] }).terms),
      ...behind,
    ]);
    return terms.length ? { terms } : null;
  }

  // One signal may offer more than one fact, and every one it took in is
  // handed back. What several of them were about one and the same thing is
  // one thing learned.
  const branch = roots[0].branch || [];
  const events = branch.filter((b) => b.kind === 'event');
  const learns = branch.filter((b) => b.kind === 'learn');
  const instructions = branch.filter((b) => b.kind === 'instruction');
  const causes = reasons;
  const called = [];
  const gather = (n) => {
    if (n.kind === 'call') called.push(n);
    (n.branch || []).forEach(gather);
  };
  gather(roots[0]);
  if (
    events.length === 0 &&
    learns.length === 0 &&
    instructions.length === 0 &&
    called.length === 0 &&
    causes.length === 0 &&
    about.length === 0
  ) return null;
  // What was named in this signal is not in the world yet, so its name is
  // known here and nowhere else.
  const naming = new Map(called.map((c) => [c.state.id, c.state.name]));
  // A referent introduced inside a possibility, failed condition or quoted
  // claim is represented while reasoning but is not thereby asserted to
  // exist. Keep only calls used by a proposition or event the brain accepted.
  const referenced = new Set();
  const reference = (value) => {
    if (typeof value === 'number') referenced.add(value);
    else if (Array.isArray(value)) value.forEach(reference);
    else if (value && typeof value === 'object') Object.values(value).forEach(reference);
  };
  const accepted = (n) => {
    // A doing that says nothing about the world takes nothing into it — not
    // the doing, and not the one who did it. They are this conversation's.
    const saying =
      n.kind === 'event' && world.isA(n.state.action, (world.anchors || {}).greeting);
    if (!saying && (n.kind === 'learn' || n.kind === 'event' || n.kind === 'instruction')) {
      reference(n.state);
    }
    (n.branch || []).forEach(accepted);
  };
  accepted(roots[0]);
  const keptCalls = called.filter((c) => referenced.has(c.state.id));
  const terms = asOne([
    // A thing given a name is a thing there is one of, called what it was
    // called. It comes first, because what else the signal said of it is said
    // of that thing.
    ...keptCalls.flatMap((c) => {
      const a = world.anchors || {};
      // Being called something is a fact, so the name is a thing of its own and
      // the two are joined by it. A thing made because a signal spoke of one
      // was never called anything, and there is no name to make.
      const naming = c.state.made || c.state.called == null || a.name == null
        ? []
        : [{ rel: a.name, to: c.state.called }];
      // One thing given a name, with nothing said of what it is, is not put at
      // the top of the ladder. That it is a thing carries nothing — everything
      // is — and the world holds the kinds of thing apart from one another, so
      // a term pinned there cannot afterwards be found to be any particular one
      // of them. It exists and is not yet any kind, which is the truth of it:
      // what the signal says of it puts it somewhere.
      //
      // A kind is another matter. A word standing for many is a kind the world
      // does not have, and a kind with nothing above it hangs off nothing.
      const kind = !c.state.made && !c.state.many && c.state.of === a.thing
        ? []
        : [{ rel: world.baseRelation, to: c.state.of }];
      return [
        {
          id: c.state.id,
          name: c.state.name,
          // Counted, a word names a kind there may be many of; uncounted, it
          // names one thing. A thing there are three of is not one thing.
          individual: !c.state.many,
          links: [...kind, ...naming],
        },
        // The name itself: what the signal wrote, which is the same in every
        // language and so is held here rather than looked for in one.
        ...(naming.length === 0
          ? []
          : [
              {
                id: c.state.called,
                name: `"${c.state.word ?? c.state.name}"`,
                symbol: c.state.word ?? c.state.name,
                links: [],
              },
            ]),
      ];
    }),
    // And whoever it belongs to has it.
    ...keptCalls
      .filter((c) => c.state.whose != null)
      .map((c) => ({
        id: c.state.whose,
        name: world.term(c.state.whose) ? world.term(c.state.whose).name : c.state.name,
        links: [{ rel: world.anchors.has, to: c.state.id }],
      })),
    ...instructions.flatMap((i) => tookHold(i, world)),
    ...behind,
    // A doing that says nothing about the world does not go into it. Greeting
    // somebody is something that happened between the two of them, and this
    // conversation is where it is held.
    ...events
      .filter((e) => !world.isA(e.state.action, (world.anchors || {}).greeting))
      .flatMap((e) => tookPlace(e, world)),
    ...learns.flatMap((l) => tookIn(l, world, naming)),
  ]);
  // The surface copula names the broad classification question. Memory keeps
  // the stronger primitive when it can: one existing entity belongs to a
  // kind, one kind specializes another, and a property describes a bearer.
  for (const term of terms) {
    for (const link of term.links) {
      if (link.rel !== world.baseRelation) continue;
      // A state a thing stands in on some scale is stamped with when it came
      // to be so — and a state is something a thing is *in*, never a kind it
      // is one *of*: a red cat is not one of the reds. Anything else stamped
      // is one of what it was made to be one of.
      const inState = quantityOn(link.to, world) != null;
      link.rel = !inState && term.individual && Number.isInteger(link.at) && world.anchors.instance != null
        ? world.anchors.instance
        : world.classificationRelation(
          term.id,
          link.to,
          term.individual || world.isIndividual(term.id),
        );
    }
  }
  return terms.length ? { terms } : null;
}

// Which claims a fired rule stands between. Fired as written, they are the
// rule's own two claims, already things the world holds. Fired for something
// else, the facts are that thing's and are written down as claims of their
// own — a rule is not what happened.
function stoodBy(condition, consequence, ids, sent) {
  if (ids.met) return { claim: ids.then, from: ids.on };
  return {
    claim: sent.allocate(),
    from: sent.allocate(),
    wrote: { condition, consequence },
  };
}

// What a doing brings about may be a relation — putting leaves the thing put
// standing in a place — or a way the thing stands afterwards, as opening
// leaves it open. The two are read differently and only the world can tell
// them apart, so this asks it which relation, if any, a doing brings.
export function bringsRelation(doing, world) {
  const a = world.anchors || {};
  if (a.brings == null || a.relation == null || doing == null) return null;
  return world.linked(doing, a.brings).find((brought) => world.isA(brought, a.relation)) ?? null;
}

// What a doing leaves behind. Some doings change nothing but the record that
// they happened; others leave the world standing differently afterwards, and
// which of them do is the world's to say. Putting a key into a drawer leaves
// the key in the drawer — the doing is over and the key is still there — so
// the world says what putting brings about and the brain writes it down.
//
// Only between what was done to and where it was done to: an action brings
// its target to its destination, and with either of them unsaid there is
// nothing for it to have brought about.
export function brought(action, parts, world) {
  const a = world.anchors || {};
  if (a.target == null || a.destination == null) return [];
  const relation = bringsRelation(action, world);
  if (relation == null) return [];
  const target = parts.find((p) => p.role === a.target);
  const where = parts.find((p) => p.role === a.destination);
  if (!target || !where || target.of == null || where.of == null) return [];
  return [
    node('learn', 'link', [], {
      subject: target.of,
      relation,
      object: where.of,
      quantity: null,
      made: null,
      not: false,
    }),
  ];
}

// Something that happened, in the one shape all knowledge takes. How much of
// each part goes on the record with it: amounts are state of the occurrence,
// so a later count reads them rather than guessing.
// A standing instruction never occurred and is never done with. Every time the
// brain takes a fact in, what it holds is laid against every instruction it
// keeps: where a condition has come to stand, what stands on it follows. The
// instruction stays where it is — it governs whatever turns up next as well.
function awoken(roots, world, mood, sent) {
  if (mood !== 'tell' || !world || roots.length !== 1) return roots;
  if (sent == null || sent.allocate == null) return roots;
  const a = world.anchors || {};
  if (a.instructing == null || a.condition == null || a.consequence == null) return roots;
  const root = roots[0];
  const offered = (root.branch || []).filter((n) => n.kind === 'learn');
  if (offered.length === 0) return roots;
  const key = (fact) =>
    `${fact.subject}:${fact.relation}:${fact.object}:${Boolean(fact.not)}`;
  const arrivals = offered.map((n) => n.state);
  const told = new Set(arrivals.map(key));
  const follows = [];
  // What one instruction leads to may be what another was waiting for. A cold
  // drum makes a bell red, and a red bell makes a cup blue: the bell turning
  // red is as much something that has come about as anything the signal said,
  // so the instructions are gone through again with it among them, and again,
  // until a whole round adds nothing. What has already followed is never added
  // twice, so a chain that leads back on itself ends.
  for (let more = true; more; ) {
    more = false;
    for (const one of world.individualsOf(a.instructing)) {
      const [onId] = world.linked(one, a.condition);
      const [thenId] = world.linked(one, a.consequence);
      if (onId == null || thenId == null) continue;
      const on = world.claimOf(onId);
      const then = world.claimOf(thenId);
      if (!on || !then) continue;
      // The condition stands where the world already had it or where this very
      // signal brings it. Nothing is looked up twice: what was just offered is
      // as good as what was already held.
      // Whatever meets the condition. A rule naming a kind is about every one
      // of that kind — a drum being cold is what a cold drum is, and tom being
      // a drum makes tom's being cold that same thing. So the condition is not
      // matched word for word: what is looked for is anything that is one of
      // what it names and stands as it says.
      // Told the consequence does not stand, the condition cannot either. A
      // bell that is not red is a drum that is not cold: the rule read the
      // other way round, which follows from it and is not a second rule. The
      // other way round — a red bell making a drum cold — does not follow, and
      // the brain never reads it that way.
      const denies = (claim, one) =>
        one.relation === claim.relation &&
        one.object === claim.object &&
        Boolean(one.not) !== Boolean(claim.not) &&
        (one.subject === claim.subject || world.isA(one.subject, claim.subject));
      for (const one of arrivals) {
        if (!denies(then, one)) continue;
        const subject = then.subject === on.subject ? one.subject : on.subject;
        const against = key({ subject, relation: on.relation, object: on.object, not: !on.not });
        if (told.has(against)) continue;
        told.add(against);
        follows.push(
          node('learn', 'link', [], {
            subject,
            relation: on.relation,
            object: on.object,
            quantity: null,
            made: null,
            not: !on.not,
            following: stoodBy(
              { subject: one.subject, relation: then.relation, object: then.object, not: Boolean(one.not) },
              { subject, relation: on.relation, object: on.object, not: !on.not },
              { on: thenId, then: onId, met: one.subject === then.subject },
              sent,
            ),
          }),
        );
        more = true;
      }
      const meets = [];
      if (told.has(key({ ...on, not: on.not })) || world.isA(on.subject, on.object, on.relation)) {
        meets.push(on.subject);
      }
      for (const one of arrivals) {
        if (one.relation !== on.relation || one.object !== on.object) continue;
        if (Boolean(one.not) !== on.not || one.subject === on.subject) continue;
        if (!world.isA(one.subject, on.subject)) continue;
        if (!meets.includes(one.subject)) meets.push(one.subject);
      }
      for (const met of meets) {
        // What the condition was about, the consequence is about: `if a thing
        // is cold then it is red` says the same thing is red, and which thing
        // is whichever one met the condition. Where the consequence names
        // something else, that is what it names.
        const subject = then.subject === on.subject ? met : then.subject;
        if (world.isA(subject, then.object, then.relation)) continue;
        const reached = key({ ...then, subject });
        if (told.has(reached)) continue;
        told.add(reached);
        follows.push(
          node('learn', 'link', [], {
            subject,
            relation: then.relation,
            object: then.object,
            quantity: null,
            made: null,
            not: then.not,
            // What it followed from, kept with it. A fact the brain worked out
            // rather than was told has something it stands on, and a brain that
            // cannot say what that was is asking to be taken on trust.
            //
            // Where the rule fired as it was written, the two claims it is
            // built out of are the two facts, and they are already things. Met
            // by something else — tom, where the rule said a drum — the facts
            // are tom's, not the rule's, so they are written down as their own
            // claims. Saying `a drum is cold` when it was tom who was cold
            // would be answering with the rule instead of with what happened.
            following: stoodBy(
              { subject: met, relation: on.relation, object: on.object, not: on.not },
              { subject, relation: then.relation, object: then.object, not: then.not },
              { on: onId, then: thenId, met: met === on.subject },
              sent,
            ),
          }),
        );
        more = true;
      }
    }
  }
  return follows.length === 0 ? roots : [withBranch(root, [...root.branch, ...follows])];
}

// A claim somebody holds, written down: the claim as a thing of its own, and
// whoever holds it joined to it. The same shape one claim standing behind
// another already takes — a claim is a thing a relation can reach, and it
// does not matter which relation reaches it.
function heldAbout(held, world) {
  const a = world.anchors || {};
  const { holder, of, relation, claimId, claim } = held.state;
  return [
    {
      id: claimId,
      name: `claim#${claimId}`,
      individual: true,
      links: [
        { rel: world.baseRelation, to: claim.relation, ...(claim.negated ? { not: true } : {}) },
        { rel: a.subject, to: claim.subject },
        { rel: a.object, to: claim.object },
      ],
    },
    {
      id: holder,
      name: world.term(holder) ? world.term(holder).name : `${world.term(of) ? world.term(of).name : 'thing'}#${holder}`,
      ...(of == null ? {} : { individual: true }),
      links: [
        ...(of == null ? [] : [{ rel: world.baseRelation, to: of }]),
        { rel: relation, to: claimId },
      ],
    },
  ];
}

// What a worked-out fact stands on. Where a standing instruction has fired,
// the claim it reached is joined to the claim that met its condition — both
// are already things the world holds, and the joining is what lets the brain
// say afterwards what a fact followed from rather than only that it holds.
function stoodOn(followed, world) {
  const a = world.anchors || {};
  if (a.follows == null) return [];
  const claimed = (id, side) => ({
    id,
    name: `claim#${id}`,
    individual: true,
    links: [
      { rel: world.baseRelation, to: side.relation, ...(side.not ? { not: true } : {}) },
      { rel: a.subject, to: side.subject },
      { rel: a.object, to: side.object },
    ],
  });
  return followed.flatMap(({ claim, from, wrote }) => [
    ...(wrote == null
      ? []
      : [claimed(claim, wrote.consequence), claimed(from, wrote.condition)]),
    {
      id: claim,
      name: world.term(claim) ? world.term(claim).name : `claim#${claim}`,
      links: [{ rel: a.follows, to: from }],
    },
  ]);
}

// One claim being so as the reason another is: both written down as things,
// and the reason joined to what it is the reason for.
function stoodBehind(cause, world) {
  const a = world.anchors || {};
  const { reason, effect, reasonId, effectId } = cause.state;
  const claim = (side, at) => ({
    id: at,
    name: `claim#${at}`,
    individual: true,
    links: [
      { rel: world.baseRelation, to: side.claim.relation, ...(side.claim.negated ? { not: true } : {}) },
      { rel: a.subject, to: side.claim.subject },
      { rel: a.object, to: side.claim.object },
    ],
  });
  // A doing is already a thing the world holds — the occurrence itself — so
  // nothing is written down for it but the joining. What is so has to be
  // written down first: a claim is a thing that says something, and until it
  // is one there is nothing for a cause to point at.
  const side = (of, at) => (of.done != null ? [] : [claim(of, at)]);
  const at = (of, made) => (of.done != null ? of.done : made);
  const behind = side(reason, reasonId);
  const joined = { rel: a.cause, to: at(effect, effectId) };
  return [
    ...side(effect, effectId),
    ...(behind.length > 0
      ? [{ ...behind[0], links: [...behind[0].links, joined] }]
      : [{ id: reason.done, name: world.term(reason.done) ? world.term(reason.done).name : `did#${reason.done}`, links: [joined] }]),
  ];
}

// A standing instruction on the record: the pair it holds, each side written
// as a claim the way any claim is written, and the instruction joining them.
// Nothing here is the fact either side speaks of — a claim is a thing that
// says something, not the saying of it.
function tookHold(instruction, world) {
  const a = world.anchors || {};
  const { id, onId, thenId, on, then } = instruction.state;
  const claim = (side, at) => ({
    id: at,
    name: `claim#${at}`,
    individual: true,
    links: [
      { rel: world.baseRelation, to: side.relation, ...(side.negated ? { not: true } : {}) },
      { rel: a.subject, to: side.subject },
      { rel: a.object, to: side.object },
    ],
  });
  return [
    claim(on, onId),
    claim(then, thenId),
    {
      id,
      name: `instruction#${id}`,
      individual: true,
      links: [
        { rel: world.baseRelation, to: a.instructing },
        { rel: a.condition, to: onId },
        { rel: a.consequence, to: thenId },
      ],
    },
  ];
}

function tookPlace(event, world) {
  const { id, action, at, parts, not, when, times } = event.state;
  const of = { rel: world.baseRelation, to: action, at };
  if (not) of.not = true;
  // Which side of now it was on, and any time the signal named. Both are when
  // it happened, said one coarsely and the other by name.
  const stood = [
    ...(when == null ? [] : [{ rel: world.anchors.when, to: when, at }]),
    ...(times || []).map((to) => ({ rel: world.anchors.when, to, at })),
  ];
  return [
    {
      id,
      name: event.name,
      individual: true,
      links: [
        of,
        ...stood,
        ...parts.map((p) => ({
          rel: p.role,
          to: p.of,
          at,
          ...(Number.isInteger(p.amount) ? { quantity: p.amount } : {}),
        })),
      ],
    },
    ...became(event, world),
  ];
}

// A change leaves the thing changed.
//
// Recording that a becoming happened is not the same as the thing being how it
// became: told a drum becomes hot, the brain held a becoming and went on saying
// the drum was cold. So where a doing takes a thing to a state — one of its
// quantities, the world says which — the thing is put in that state as of the
// moment it happened, and the state it was in before stays behind it as
// history, the way any other state does.
function became(event, world) {
  const { at, parts, not } = event.state;
  if (not || !parts || world.anchors.predication == null) return [];
  const whom = parts.find((p) => p.role === world.anchors.agent);
  const into = parts.find((p) => p.role === world.anchors.target);
  if (!whom || !into || quantityOn(into.of, world) == null) return [];
  const term = world.term(whom.of);
  if (!term) return [];
  return [
    {
      id: whom.of,
      name: term.name,
      links: [{ rel: world.anchors.predication, to: into.of, at }],
    },
  ];
}

// A fact the brain took in. A world with no term for what it is about has
// nowhere to put it, and it comes back with nothing.
function tookIn(learn, world, naming) {
  const { subject, relation, object, quantity, made, not, when } = learn.state;
  const link = { rel: relation, to: object };
  if (not) link.not = true;
  // When a state was so. What is said plainly is so from now; what is said of
  // the past was so before anything else the brain holds about it, since that
  // is all the tense says — it was so, and it is not what stands now.
  const past = when != null && world.anchors.past != null && when === world.anchors.past;
  const stamp = () => {
    const now = world.now();
    if (!past) return now;
    let first = now;
    for (const l of (world.term(subject) || { links: [] }).links || []) {
      if (l.rel === relation && Number.isInteger(l.at) && l.at < first) first = l.at;
    }
    return first - 1;
  };
  if (quantity != null) {
    link.quantity = quantity;
    // What is so now is so from now: state is stamped, so what was so before
    // stays on the record instead of being written over.
    link.at = stamp();
  }
  // Placement is state too: a new location succeeds the old one while both
  // remain in history. Which relations are placements is world knowledge.
  if (quantity == null && world.anchors.placement != null && world.isA(relation, world.anchors.placement)) {
    link.at = stamp();
  }
  // And so is how a thing stands on one of its quantities. Cold and hot are
  // both temperatures, and a thing has one temperature at a time: the second
  // succeeds the first rather than standing against it. Which qualities are
  // states of a quantity the world says, the same way it says which relations
  // are placements.
  if (quantity == null && link.at == null && quantityOn(object, world) != null) {
    link.at = stamp();
    // A state said of a time that is not now is not how the thing stands. The
    // world holds what stands; that it was so then is what the conversation
    // holds, and the two are different things that one stamp was being asked
    // to say at once — when it was told, and when it was so. Told in the past
    // tense, the world is told nothing and the conversation keeps it.
    if (past) return [];
  }
  if (made) {
    const kind = world.term(made.of);
    if (!kind) return [];
    return [
      {
        id: made.id,
        name: `${kind.name}#${made.id}`,
        individual: true,
        links: [{ rel: world.baseRelation, to: made.of }, link],
      },
    ];
  }
  const term = world.term(subject);
  const name = term ? term.name : (naming && naming.get(subject)) ?? null;
  if (name == null) return [];
  return [{ id: subject, name, links: [link] }];
}

// Several verdicts may have been reached about one and the same thing — a
// thing given two things at once, or spoken of twice over. What was learned of
// it is one thing learned, holding everything reached about it and holding
// each of those once.
function asOne(terms) {
  const held = new Map();
  const same = (l) => JSON.stringify([l.rel, l.to, l.not ?? false, l.quantity ?? null, l.at ?? null]);
  for (const term of terms) {
    const already = held.get(term.id);
    if (!already) {
      held.set(term.id, { ...term, links: [...term.links] });
      continue;
    }
    for (const link of term.links) {
      if (!already.links.some((l) => same(l) === same(link))) already.links.push(link);
    }
  }
  return [...held.values()];
}

// ---- tree helpers ---------------------------------------------------------
export function walk(node, fn) {
  const kids = (node.branch || []).map((c) => walk(c, fn));
  return fn(withBranch(node, kids));
}


// The first node of a kind anywhere under this one.
function within(n, kind) {
  if (n.kind === kind) return n;
  for (const b of n.branch || []) {
    const found = within(b, kind);
    if (found) return found;
  }
  return null;
}



// Split a signal into words on whitespace, taking the marks off each end. A
// mark is a character no word of the language is made of — nothing has to
// declare them, and a language that gives `+` to a word stops treating it as
// one. Told no language, the brain takes nothing off: it has no grounds to.
function tokenize(signal, langs) {
  const marks = (langs || []).map((l) => (ch) => !l.isWordSymbol(ch));
  const bare = (t) => {
    let from = 0;
    let to = t.length;
    // The candidate language must call it a mark. Each language is tokenized
    // independently before one whole-signal reading is selected.
    const marked = (ch) => marks.length > 0 && marks.every((is) => is(ch));
    while (from < to && marked(t[from])) from += 1;
    while (to > from && marked(t[to - 1])) to -= 1;
    return t.slice(from, to);
  };
  // A symbol a language says stands alone is a word wherever it falls, so
  // `1+1` comes apart into three and `cat` does not come apart at all.
  const lone = (langs || []).map((l) => (ch) => l.isLoneSymbol(ch));
  const apart = (t) => {
    // A whole declared word wins over an embedded standalone symbol. Other
    // text still comes apart normally (`5-2` remains three tokens). Edge
    // punctuation is ignored for this check because it comes away just below.
    if ((langs || []).some((lang) => lang.hasWord(bare(t)))) return [t];
    const out = [];
    let held = '';
    for (const ch of t) {
      if (lone.some((is) => is(ch))) {
        if (held) out.push(held);
        out.push(ch);
        held = '';
      } else held += ch;
    }
    if (held) out.push(held);
    return out;
  };
  return String(signal)
    .split(/\s+/)
    .filter(Boolean)
    .flatMap(apart)
    .map(bare)
    .filter(Boolean);
}


// What a signal holds, where it holds more than one thing said.
//
// A mark that ends what is being said ends it: three sentences typed together
// are three things said one after another, not one long one. Which marks end
// are the language's to declare, and a mark inside a word ends nothing — the
// point in `0.1` is not the end of anything. Where a signal holds one thing,
// it comes back as it was given.
//
// The brain reads; acting on what it read is the runtime's, and taking these
// in order, each against the world the one before it left, is acting.
export function signalsIn(input, langs) {
  const said = String(input ?? '');
  if (!langs || langs.length === 0) return [said];
  // A mark is a character no word is made of — that much needs no declaring,
  // and a language that gives one to a word stops it ending anything. Which of
  // its marks end what is being said, a language does declare.
  const marks = langs.map((l) => (ch) => !l.isWordSymbol(ch));
  const ends = langs.map((l) => (ch) => l.endsWhat(ch));
  const closes = (ch) => marks.every((is) => is(ch)) && ends.some((is) => is(ch));
  const held = [];
  let piece = [];
  for (const token of said.split(/\s+/).filter(Boolean)) {
    piece.push(token);
    if (closes(token[token.length - 1])) {
      held.push(piece.join(' '));
      piece = [];
    }
  }
  if (piece.length > 0) held.push(piece.join(' '));
  return held.length > 1 ? held : [said];
}

export { node, learningConflict };
