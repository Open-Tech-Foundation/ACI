// Primitive perception layers of the brain.
// The brain climbs a fixed ladder of layers; each layer adds its perception
// of the signal to a running state, and may branch.
//
// The brain has no inbuilt knowledge of any language. It perceives raw
// structure by itself; language recognition happens inside the
// understanding phase, driven solely by externally-loaded language data
// (see src/languages.js). It never knows a language's name.

import { Decimal } from '@opentf/std';

// The conversation this signal belongs to, for the length of one turn. Set on
// the way in from what the runtime knows and never read outside a turn — the
// graph itself belongs to the brain that was opened with it.
let graph = null;

const $ = Symbol.for('aci.node');

// A node is the single uniform unit of the whole system:
//   { [$]: 'node', kind, name, branch (array of child nodes), state }
function node(kind, name, branch = [], state = {}) {
  return { [$]: 'node', kind, name, branch, state };
}

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

function thing(prev) {
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

function quality(prev, langs) {
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

function senseVisual(raw) {
  if (raw === '') return null;
  return node('quality', 'visual', []);
}

function senseSound(raw, langs) {
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
function measuring(roots, world) {
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
      const of = quantityOn(conceptOf(beside), world);
      if (of == null || !serves.includes(of)) continue;
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
function quantityOn(state, world) {
  const a = world.anchors || {};
  if (state == null || a.measure == null) return null;
  const of = world.related(state, a.measure) || [];
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
// The far end of an ordering, where a word asks for one. The quality is the
// word's own; the comparison made on it is the world's, and so is which way it
// runs. Among everything that comparison joins, the far end is the one nothing
// stands beyond — and where several are unbeaten there is no one far end, so
// the brain names none rather than choosing.
function farEnd(term, world) {
  const a = world.anchors || {};
  if (a.compares == null || !functionsOf(term).includes('extreme')) return undefined;
  const state = conceptOf(term);
  if (state == null) return undefined;
  // The ordering the extreme is of: the one a state declares it compares by,
  // or the word itself where it already names an ordering. `first` is the far
  // end of `before` the way `biggest` is the far end of size.
  const comparison =
    world.members(state, a.compares)[0] ??
    (a.relation != null && world.isA(state, a.relation) ? state : null);
  if (comparison == null) return undefined;
  // Read through any converse the world declares, so a thing said to be older
  // than another stands in the ordering of youth as well — one fact, either
  // end. Reading only what was written down would find nothing at the end
  // nobody happened to speak from.
  const joined = new Set();
  for (const t of world.data.terms) {
    const beyond = world.related(t.id, comparison);
    if (beyond.length === 0) continue;
    joined.add(t.id);
    for (const other of beyond) joined.add(other);
  }
  const unbeaten = [...joined].filter((id) => world.members(id, comparison).length === 0);
  return unbeaten.length === 1 ? unbeaten : [];
}

// Whether a relation compares at all, and which way it runs. A comparison made
// on a state is declared narrower than `more` or than `less`, so asking the
// broader relation answers for every one of them without naming any.
function isComparing(relation, world) {
  const a = world.anchors || {};
  return toward(relation, a.more, world) || toward(relation, a.less, world);
}

function toward(relation, broader, world) {
  if (relation == null || broader == null) return false;
  return relation === broader || world.subrelationOf(relation, broader);
}

function compared(roots, world) {
  if (!world) return roots;
  const a = world.anchors || {};
  if (a.measure == null || a.compares == null) return roots;
  // Which scale a comparison is made along, traced rather than read off the
  // word: the comparison says which state it compares, and the state is
  // measured by exactly one scale. A word never has to carry it.
  const scaleOf = (comparison) => {
    const state = world.linked(comparison, a.compares)[0];
    return state == null ? null : world.members(state, a.measure)[0] ?? null;
  };
  return roots.map((n) => {
    const thought = thoughtOf(n);
    if (!thought || thought.concept == null) return n;
    // A word may name the state and leave its ending to say it compares, or it
    // may name the comparison outright. Both arrive here at the same place.
    if (world.linked(thought.concept, a.compares).length > 0) {
      const held = { ...thought, on: scaleOf(thought.concept) };
      return withBranch(n, n.branch.map((b) =>
        b.kind === 'thought' ? withBranch(b, b.branch, { ...b.state, thought: held }) : b,
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
    const comparison = world.members(state, a.compares)[0];
    if (comparison == null) return n;
    const compares = { ...thought, concept: comparison, on: scaleOf(comparison), names: false };
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
      const held = speakerSide(t.concept) ? heldKinds(t.concept) : [];
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
function together(here, next, world, langs) {
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
function below(sign, number, world) {
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
function given(word, at) {
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
    described(
      calling(
        naming(
          stoodFor(
            standsIn(whose(settle(positioned, world), world, langs, mood, allocate), world),
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
  return roots.map((n, i) => {
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
    const owner = owning(markerFor(roots, i, side, owning));
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
    return standingFor(n, standing[0]);
  });
}

// The same word, thought to stand for something else. What it was heard and
// recognised as is kept; only what it names changes.
function standingFor(n, concept) {
  const thought = thoughtOf(n);
  if (!thought) return n;
  return withBranch(
    n,
    n.branch.map((b) =>
      b.kind === 'thought'
        ? withBranch(b, b.branch, { ...b.state, thought: { ...thought, concept } })
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

// A language may distinguish readings through context without teaching the
// brain any of its words. Each constrained reading says what may stand before
// or after it; the first matching reading wins, otherwise the first reading
// without a constraint is the deterministic fallback. These are relations
// among understood things — pointer, predicate, determiner, modifier, denial
// and proposition — rather than parts of speech or English spellings.
function contextual(roots, world) {
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
    if (kind === 'denial') return rest.some(negatesOn);
    // A unit standing after it. Which reading of a word is meant may turn on
    // one: a clock that reads ten hours is measuring, where somebody who reads
    // is doing something.
    if (kind === 'unit') return rest.some((n) => contextKind(n, 'unit', world));
    // A word pointing at somebody standing after it. `who am i` asks after a
    // name; `who is taller than sam` asks after whoever stands there.
    if (kind === 'pointer') return rest.some((n) => contextKind(n, 'pointer', world));
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
    if (kinds.some((kind) => contextKind(roots[i], kind, world))) return true;
    if (across !== 'modifier' || !functionsOf(roots[i]).includes('modifier')) return false;
  }
  return false;
}

function contextKind(n, kind, world) {
  const thought = thoughtOf(n);
  if (kind === 'pointer') return thought && thought.marks != null;
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
  const already = roots.some((n) => {
    if (ways(n)) return false;
    const t = findBranch(n, 'thought');
    return t && (doing(t.state.thought) || joining(t.state.thought));
  });
  if (already) return roots;

  let taken = false;
  return roots.map((n) => {
    const mine = ways(n);
    if (taken || !mine) return n;
    const other = mine.find(doing);
    if (!other) return n;
    taken = true;
    return withBranch(
      n,
      n.branch.map((b) =>
        b.kind === 'thought' ? withBranch(b, b.branch, { ...b.state, thought: other }) : b,
      ),
    );
  });
}

// Walk away from a position in one direction until something answers to
// `wanted`, stopping if a thing that carries its own concept gets in the way
// first. This is the one mechanism solve() and judge() both find a neighbor
// through: solve reads a marker or a number beside a thing, judge reads which
// thing beside an action plays which part — neither ever reaches past a thing
// that isn't the one it was looking for.
function nearestOver(said, from, step, wanted, over = null) {
  for (let i = from + step; i >= 0 && i < said.length; i += step) {
    if (wanted(said[i])) return said[i];
    if (over && over(said[i])) continue;
    if (conceptOf(said[i]) != null) return null;
  }
  return null;
}

// A word saying what a thing is like is not another thing standing in the way:
// four big balls are four balls, and the count reaches the balls past the
// bigness. Another thing does stop it — a count never reaches over one thing
// to another.
const describing = (world) => (n) => {
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

// Whether the signal says how much of something rather than how many of it. A
// number standing beside a property is a measure, and the brain has no measure
// to hold: how many is a count of things, and a property is not a thing to be
// counted.
function measured(said, world) {
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
  const isMany = (n) =>
    n && n.state.exists && [a.all, a.some, a.none].includes(conceptOf(n));
  const found = nearestOver(said, at, -1, isMany) || nearestOver(said, at, 1, isMany);
  return found ? conceptOf(found) : null;
}

// How many of a kind a thing holds, counting everything it holds that is one
// of that kind. Nothing says a thing holds `things`; it holds bats and balls,
// and those are things.
function heldUnder(bearer, kind, world, under = null) {
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
      if (many != null) total = (total ?? 0) + many;
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
    if (each != null) total = (total ?? 0) + many * each;
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
  if (!world || mine == null || !world.isA(mine, (world.anchors || {}).thing)) return null;
  const marker = markerFor(roots, at, markingSide(roots, langs), markOn);
  const marks = markOn(marker);
  return marks === 'new' || marks === 'known' ? marks : null;
}

// The word marking a thing need not touch it — `from the basket` puts an
// article between. Walk away from the thing over words that name nothing, and
// stop at the next thing: a marker never reaches past one. The walk itself is
// `nearestOver` — a marker is simply a word with nothing else to find first.
function markerFor(said, at, side, carries) {
  if (side !== 'before' && side !== 'after') return null;
  const step = side === 'before' ? 1 : -1;
  return nearestOver(said, at, step, carries);
}

// Word order comes from the language that recognized this signal, never from
// whichever language happened to be loaded first. A signal with no one
// recognized language has no order to infer from.
function signalLanguage(said, langs) {
  const names = new Set((said || []).map(languageOf).filter((name) => name != null));
  if (names.size !== 1) return null;
  const [name] = names;
  return (langs || []).find((lang) => lang.data.name === name) ?? null;
}

// Which side of an action each part falls on, as this language declares it.
function partsSide(said, langs) {
  const lang = signalLanguage(said, langs);
  return lang && lang.parts ? lang.parts : null;
}

function markingSide(said, langs) {
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
function worldNode(concept, world) {
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

// ---------------------------------------------------------------------------
// judge — a signal that names a relation between two terms makes a claim, and
// the brain checks it against the world. It reads the claim off the order of
// the things it perceived, never off a grammar symbol: phrase names come from
// data and mean nothing to the brain.
// ---------------------------------------------------------------------------
function judge(roots, world, mood, langs, sent) {
  if (!world || roots.length !== 1) return roots;
  const root = roots[0];
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
    const [asked] = judge([when], world, 'ask', langs, sent);
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
          ? instructionFrom(when, so, world, langs, sent)
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
    const [followed] = judge([next], world, mood, langs, sent);
    return [withBranch(root, [...root.branch, ...(followed.branch || []).filter(taken)])];
  }

  // What a signal put as a condition, and what it put on the other side, held as
// one thing the brain can come back to. Both sides are checked the way a
// question is — neither is made — and what is kept is the pair, not the facts.
function instructionFrom(when, so, world, langs, sent) {
  const a = world.anchors || {};
  if (a.instructing == null || a.condition == null || a.consequence == null) return [];
  if (a.subject == null || a.object == null || sent == null || sent.allocate == null) return [];
  const sideOf = (part) => {
    if (!part) return null;
    const [seen] = judge([part], world, 'ask', langs, sent);
    const stood = (seen.branch || []).find((n) => n.kind === 'standing');
    if (!stood) return null;
    const { subject, relation, object, negated } = stood.state;
    return subject == null || relation == null || object == null
      ? null
      : { subject, relation, object, negated: Boolean(negated) };
  };
  const on = sideOf(when);
  const then = sideOf(so);
  if (!on || !then) return [];
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

// A word may hold a claim at arm's length rather than make it: `a cat might
  // be an animal` says nothing is so, it says what might be. The brain checks
  // it, which is what being asked does, and takes nothing in. It cannot tell
  // might from does-not-know — it has no notion of what could be, only of what
  // it holds — so what it says is what it found.
  if (mood === 'tell' && hasFunctionAnywhere(root, 'modal')) {
    const [asked] = judge([root], world, 'ask', langs, sent);
    return [asked];
  }

  const spoken = claimWithin(root);
  if (spoken) {
    const [checked] = judge([spoken], world, 'ask', langs, sent);
    return [withBranch(root, [...root.branch, ...(checked.branch || []).filter(taken)])];
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
        joinedWhole(b, join) ? judge([b], world, offered ? 'ask' : mood, langs, sent)[0] : b,
      ),
    );
    return [instead(root, join, judged)];
  }

  const greeted = greeting(root, world);
  if (greeted) {
    const [, rest] = greeted;
    return [instead(root, rest, judge([rest], world, mood, langs, sent)[0])];
  }

  const said = [];
  const collect = (n) => {
    if (n.kind === 'thing') said.push(n);
    (n.branch || []).forEach(collect);
  };
  collect(root);

  const a = world.anchors || {};

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
      const joins = (from, to, rel) =>
        rel === world.baseRelation
          ? world.isA(from, to, rel)
          : upward(from, world).some((rung) => world.isA(rung, to, rel));
      const knownCount = counted == null ? null : world.held(holder, rel, object);
      // How many of a kind a thing holds answers whether it holds one at all:
      // three apples is an apple, and none of them is not.
      const heldMany = counted == null ? world.held(holder, rel, object) : null;
      const holds = counted != null
        ? knownCount === counted
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
      const heldDenied = upward(holder, world).some((rung) => world.denies(rung, object, rel));
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
      // Told there are none of a kind is not silence about them. A count of
      // zero stands against the claim that there is one, the way any other
      // count stands against a claim of a different one.
      const heldNone = heldMany === 0;
      const opposed = functionalAgainst || constrainedAgainst || predicateAgainst || (counted != null
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
      const found =
        howMany === a.some
          ? holds || world.members(subject, world.baseRelation).some((one) => joins(one, object, rel))
            ? 'held'
            : 'absent'
          : holds
            ? 'held'
            : opposed
              ? 'against'
              : 'absent';
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
      const added = [node('standing', stands, [], { subject, relation: rel, object, negated: isDenied })];

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
    const acting = said.findIndex((n) => reaches(n, a.action, world));
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
  if (holes.length > 0 && said.some((n) => reaches(n, a.communication, world))) {
    const focus = sent && Array.isArray(sent.focus) ? sent.focus : [];
    const thing = world ? (world.anchors || {}).thing : null;
    const topic = focus.find(
      (id) => typeof id === 'number' && (thing == null || world.isA(id, thing)),
    );
    if (topic == null) return roots;
    return [
      withBranch(root, [
        ...root.branch,
        node('answer', 'link', [], { subject: null, relation: null, found: [topic] }),
      ]),
    ];
  }

  const asked = holes.length > 0
    ? partAsked(said, world, claims, markingSide(said, langs), partsSide(said, langs))
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
      const joins = (from, to, r) =>
        r === world.baseRelation
          ? world.isA(from, to, r)
          : upward(from, world).some((rung) => world.isA(rung, to, r));
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
  if (!(joint >= 0 && joined >= 2)) {
    // Asked whether something happened, the brain looks through what it was
    // told happened. It does not put another one on the record: being asked is
    // not being told, and answering is not doing.
    if (mood === 'ask') {
      const ever = happened(said, world, claims, markingSide(said, langs), partsSide(said, langs));
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
    );
    if (done) return [withBranch(root, [...root.branch, ...done])];
  }

  const quantity = said.find((n) => reaches(n, a.quantity, world));
  if (quantity && holes.length > 0) {
    const rel = namedRelation(said, world, claims, holes.length > 0);
    const things = said.filter((n, i) => i !== rel && claims(n));

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
      const counts = (w) =>
        world.held(w.bearer, w.relation, w.of) != null ||
        heldUnder(w.bearer, w.of, world) != null ||
        // What a thing measures may be carried by what it holds rather than
        // written of the thing, and that end is the one that answers.
        heldUnder(w.bearer, w.of, world, w.relation) != null;
      const way = ways.find(counts) ?? ways[0];
      // Asked after a kind it holds none of by name, but several kinds under
      // it, the count is all of those together: a shop of five bats and two
      // balls holds seven things.
      // Under the word the question used. What a basket holds is not what it
      // has: reading through the broad relation here answers one question with
      // the other.
      const under = heldUnder(way.bearer, way.of, world, way.relation);
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
        : world.held(way.bearer, way.relation, way.of) ?? under;
      const total = howMany == null ? null : world.termFor(howMany);
      return [
        withBranch(root, [
          ...root.branch,
          node('count', total == null ? 'beyond' : 'counted', [], {
            of: way.of,
            held: way.bearer,
            members: howMany,
            total,
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
        : each.reduce((sum, many) => sum + many, 0);
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
    if (!alone) return roots;
    const held = working(said, world, true);
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

  const worked = calculate(said, at, relation, world);
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
  const terms = said.filter((n, i) => i !== at && claims(n) && !ofSyntax(n, i));

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
      const stood = (x, y) => calculate([x, op, y], 1, relation, world);
      const beats = (x, y) => {
        const s = stood(x, y);
        return s != null && s.name === 'held';
      };
      const winner = terms.find((x) => terms.every((y) => x === y || beats(x, y)));
      if (winner != null) {
        return [
          withBranch(root, [
            ...root.branch,
            node('answer', 'link', [], { subject: null, relation, found: [conceptOf(winner)] }),
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

  if (holes.length > 0 && terms.length >= 1) {
    const nodes = [];
    const asked = terms.flatMap((t) => membersFor(t, world, sent));
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
      const far = farEnd(term, world);
      if (far !== undefined) {
        nodes.push(node('answer', 'link', [], { subject, relation, found: far }));
        continue;
      }
      const seeksOn = holes.some((n) => onOf(n) != null);
      const pointed =
        markOn(term) === 'spoken' || markOn(term) === 'from' || markOn(term) === 'to';
      const of = asking.size === 1 && ![...asking].includes(a.cause) ? [...asking][0] : null;
      // Which side the hole stands on says which way to walk. `who is taller
      // than sam` asks after whoever stands above sam, and walking out from
      // sam finds whoever he stands above instead — the same fact read from
      // the wrong end. A hole before the thing asks who stands to it; a hole
      // after asks what it stands to.
      // Only where the two ends are not alike. A relation that runs one way —
      // standing taller, coming before — reads differently from either end, so
      // a hole standing before the thing asks after the far end rather than
      // the near one. Where the relation says nothing about direction, there
      // is no other end to ask after.
      const asksBack =
        relation != null &&
        world.asymmetric(relation) &&
        holes.some((hole) => said.indexOf(hole) < said.indexOf(term));
      // What this conversation was told comes first, and the world answers
      // where it is silent. Somebody named a moment ago is in the conversation
      // and not yet in the world, so a question about them reaches nothing
      // there.
      const here = asksBack && graph ? graph.standingIn(subject, relation) : [];
      // Asked after something by name, what answers is whatever has one.
      // Being called something is a fact a thing holds, never a kind it is,
      // so asking whether it *is* a name turns every named thing away.
      const wants = (t) =>
        of == null ||
        (a.name != null && of === a.name
          ? world.related(t, a.name).length > 0 || world.symbolOf(t) != null
          : world.isA(t, of));
      let found = seeksOn && pointed
        ? []
        : [...new Set([
            ...here,
            ...(asksBack
              ? world.standing(subject, relation)
              : reached(subject, relation, world)),
          ])].filter(wants);
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
      const mine = [node('answer', 'link', [], { subject, relation, found })];
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
    return [withBranch(root, [...root.branch, ...nodes])];
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
      lefts = rights.slice(0, 1);
      rights = rights.slice(1);
    }
    // Where a side has more than one word, a doing among them is how the fact
    // was said, not one of the things it holds between: `sara arrived before
    // john` relates sara and john, and the arriving is not a third party to
    // it. A side that is only a doing still stands — walking is faster than
    // running.
    const notDoing = (list) => {
      if (list.length < 2) return list;
      const things = list.filter((n) => !reaches(n, a.action, world));
      return things.length > 0 ? things : list;
    };
    lefts = notDoing(lefts);
    rights = notDoing(rights);
    // A plural pointer stands for every topic in focus, one apiece.
    lefts = lefts.flatMap((n) => membersFor(n, world, sent));
    rights = rights.flatMap((n) => membersFor(n, world, sent));
    if (lefts.length === 0 || rights.length === 0) return roots;
    // What the signal offered — the other fact, where the signal denies. Read
    // once: every fact in one offering was denied alike.
    const negated = said.some(negatesOn);

    // Every fact the signal offered, in the order it offered them.
    const pairs = lefts.flatMap((left) => rights.map((right) => [left, right]));
    const offered = pairs.map(([left, right]) => factFor(left, right, negated, relation)).filter((ns) => ns.length > 0);
    if (offered.length === 0) return roots;
    return [withBranch(root, [...root.branch, ...asOneOffering(offered)])];
  }

  return roots;
}

// Whether this stands beside the word joining it to another as a whole of the
// same size — a clause, or a signal the same shape as the one holding it. What
// stands between them is a word like any other, and is not one of them.
function joinedWhole(b, whole) {
  return Boolean(b.state && b.state.whole) || b.kind === whole.kind;
}

// Whether the brain follows what it is told to do. It is the one being asked,
// so it is the one this is about: the answer is a fact its memory holds of
// itself, and nothing in the signal can change it. Told outright that it does
// not, it says no; told nothing either way, it agrees.
function following(world) {
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

// The one term standing under a part of the signal, where there is exactly one.
function named(part) {
  const found = [];
  const walk = (n) => {
    if (n.kind === 'thing' && conceptOf(n) != null) found.push(conceptOf(n));
    (n.branch || []).forEach(walk);
  };
  walk(part);
  return found.length === 1 ? found[0] : null;
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
function hasFunction(n, wanted) {
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

// What the brain came to, and not the walking it did to get there.
function taken(n) {
  return VERDICT.includes(n.kind) || n.kind === 'count' || n.kind === 'sum';
}

// A greeting standing before a whole signal is said alongside it, not in it:
// `hello, how are you` is a greeting and a question, and neither is part of
// the other. Which words greet is the language's; that a greeting is its own
// act is the brain's.
function greeting(root, world) {
  const branch = root.branch || [];
  const said = branch.filter((b) => joinedWhole(b, root));
  const communication = world && world.anchors ? world.anchors.communication : null;
  const greets = branch.filter(
    (b) => b.kind === 'thing' && communication != null && world.isA(conceptOf(b), communication),
  );
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
function joinIn(n) {
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

// The same tree with one node standing in place of another.
function instead(n, target, made) {
  if (n === target) return made;
  return withBranch(n, (n.branch || []).map((b) => instead(b, target, made)));
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

// Which of several verdicts reached at once this one is, so that what was
// reached for one is not read as standing for the rest. A signal that reached
// a single verdict carries no such mark: there is nothing to tell apart.
function among(nodes, which, many) {
  if (!many) return nodes;
  return nodes.map((n) => withBranch(n, undefined, { ...n.state, among: which }));
}

// What a thing has, it has by being what it is: a memory belongs to computers,
// and this brain has one by being one. So the walk climbs the `is` chain and
// gathers what each rung links to, nearest first. The `is` chain is the ladder
// itself and is not climbed for its own sake — asked what a thing is, the brain
// answers the rung above it, not every rung to the top.
function reached(subject, relation, world) {
  if (relation === world.baseRelation) {
    const found = world.linked(subject, relation);
    const thing = world.anchors ? world.anchors.thing : null;
    return found.length > 1 && thing != null ? found.filter((id) => id !== thing) : found;
  }
  const out = [];
  for (const rung of upward(subject, world)) {
    for (const t of world.linked(rung, relation)) if (!out.includes(t)) out.push(t);
  }
  return out;
}

// A scale is what a property takes its values on, and a value is an amount of
// a unit. Two things stand on one scale by both having been measured on it,
// and which is further along is what their amounts say — not what either of
// them has been called. An apple of ten grams is heavier than a stone of five,
// whatever anyone called either of them.
function alongScale(left, right, relation, world, on) {
  const a = world.anchors || {};
  if (a.measure == null || left == null || right == null) return null;
  // A word may say which scale it compares on — heavier is more, on weight —
  // and then only what is measured on that scale counts.
  const reads = (v) =>
    on == null || world.linked(v.unit, a.measure).includes(on);
  const lefts = valuesOn(conceptOf(left), world).filter(reads);
  const rights = valuesOn(conceptOf(right), world).filter(reads);

  const found = [];
  for (const l of lefts) {
    for (const r of rights) {
      // The same unit, or there is nothing to compare: five grams and five
      // metres are not two readings of one thing, and nor are grams and
      // kilograms until something says how one stands to the other.
      if (l.unit !== r.unit || l.amount === r.amount) continue;
      found.push(l.amount > r.amount);
    }
  }
  // Nothing measured in common, or two scales that disagree — a thing may be
  // heavier and cooler at once, and neither of those is the comparison.
  if (found.length === 0 || found.some((x) => x !== found[0])) return null;

  const holds = toward(relation, a.more, world) ? found[0] : !found[0];
  return node('standing', holds ? 'held' : 'against', [], {
    subject: conceptOf(left),
    relation,
    object: conceptOf(right),
    worked: true,
    on,
  });
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

// The relations the world says are a different one from this. Two things
// joined by one of those are not joined by this: a thing on a table is not
// under it, and that is the world's to say, not the brain's.
function apartFrom(relation, world) {
  const a = world.anchors || {};
  if (a.different == null || relation == null) return [];
  return [...world.linked(relation, a.different), ...world.members(relation, a.different)];
}

// The rungs a thing stands on: itself, then everything it is a kind of.
function upward(id, world) {
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
function calculate(said, at, relation, world) {
  const a = world.anchors || {};

  // Two sides asked to be the same: each is worked out on its own, and what
  // the brain compares is what each came to.
  const between = said.findIndex((n) => conceptOf(n) === a.same);
  if (between >= 0) {
    const left = working(said.slice(0, between), world, true);
    const right = working(said.slice(between + 1), world, true);
    if (!left || !right) return null;
    return node('standing', numericEqual(left.value, right.value) ? 'held' : 'against', [], {
      subject: world.termFor(left.value),
      relation: a.same,
      object: world.termFor(right.value),
      worked: true,
    });
  }

  if (isComparing(relation, world)) {
    // Each side is worked out on its own, the way two sides asked to be the
    // same are: what is compared is what each side comes to, not the nearest
    // number standing in it.
    const before = working(said.slice(0, at), world, true);
    const after = working(said.slice(at + 1), world, true);
    const left = before ? before.value : valueBeside(said, at, -1, world);
    const right = after ? after.value : valueBeside(said, at, 1, world);
    // Two numbers are the case where the world can already say which is
    // greater. Where they are not numbers, they may still stand on one scale,
    // and being further along it is the same thing said without counting.
    if (left == null || right == null) {
      // The things compared, not the words joining them: `a cow is heavier than
      // a goat` names two relations and neither is one of the things.
      const thing = (n) => conceptOf(n) != null && !world.isA(conceptOf(n), a.relation);
      return alongScale(
        nearest(said, at, -1, thing),
        nearest(said, at, 1, thing),
        relation,
        world,
        onOf(said[at]),
      );
    }
    const compared = numericCompare(left, right);
    if (Number.isNaN(compared)) return null;
    const holds = toward(relation, a.more, world) ? compared > 0 : compared < 0;
    // The terms compared, not the numbers they name: a standing joins terms
    // wherever it comes from, and what is said back is said in words.
    return node('standing', holds ? 'held' : 'against', [], {
      subject: world.termFor(left),
      relation,
      object: world.termFor(right),
      worked: true,
    });
  }

  const run = working(said, world);
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
function working(said, world, alone) {
  const steps = [];
  for (const n of said) {
    const c = conceptOf(n);
    const value = numberOf(n, world);
    const group = groupOn(n);
    if (value != null) steps.push({ value });
    else if (group) steps.push({ group });
    else if (c != null && operates(c, world) != null) steps.push({ op: c });
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

// One arithmetic act on one number, worked in whole parts like the four with
// exact answers: doubling and halving always terminate.
const whole = (work, x) => {
  try {
    return exactValue(work(new Decimal(x)));
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
  ['magnitude', 1, (x) => exactValue(new Decimal(x).abs())],
  ['double', 1, (x) => whole((d) => d.multiply(2), x)],
  ['halve', 1, (x) => whole((d) => d.divide(2), x)],
];

function exactValue(value) {
  const text = value.toString();
  if (!text.includes('.')) {
    const integer = BigInt(text);
    if (integer >= BigInt(Number.MIN_SAFE_INTEGER) && integer <= BigInt(Number.MAX_SAFE_INTEGER)) {
      return Number(integer);
    }
  }
  return text;
}

function numericEqual(left, right) {
  try { return new Decimal(left).equals(new Decimal(right)); } catch { return false; }
}

function numericCompare(left, right) {
  try { return new Decimal(left).compareTo(new Decimal(right)); } catch { return NaN; }
}

function numericNegate(value) {
  try { return exactValue(new Decimal(value).negate()); } catch { return null; }
}

function finite(value) {
  return Number.isFinite(value) ? value : null;
}

function operates(term, world) {
  const a = world.anchors || {};
  for (const [name, takes, work] of OPERATIONS) {
    if (term != null && term === a[name]) return { takes, work };
  }
  return null;
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

// What one sender says of one thing: an individual of what was said, with the
// parts they played in it and the moment it was said. An occurrence like any
// other — nothing new was needed to hold it.
function held(holder, about, said, negated, when, world, allocate) {
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

// The `neither` term is never a doer: it drops from the parts, and a lone
// target left agentless by inversion (`neither did theo`) is the new agent.
function demoteNeither(stood, a) {
  const fallen = stood.filter((p) => p.of !== a.neither);
  if (fallen.some((p) => p.role === a.agent)) return fallen;
  const alone = fallen.filter((p) => p.role === a.target);
  if (alone.length === 1) return [{ ...alone[0], role: a.agent }];
  return fallen;
}

// The latest occurrence of an action: the highest id among its individuals —
// ids grow as things are learned, so the same signals always pick the same
// occurrence. Parts ride over by role; what the new signal names wins.
function priorEvent(action, world) {
  if (action == null || !world) return null;
  let latest = null;
  for (const one of world.members(action, world.baseRelation)) {
    if (!world.isIndividual(one)) continue;
    if (latest == null || one > latest) latest = one;
  }
  return latest;
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
function act(said, claims, world, side, sides, allocate) {
  const a = world.anchors || {};
  const acting = said.findIndex((n) => reaches(n, a.action, world));
  // A signal may name what was done, or name the operation itself: `give one
  // spoon to it` and `add one spoon into it` come to the same change in what a
  // thing holds, and only one of them has anyone doing it.
  const named = acting >= 0 ? acting : said.findIndex((n) => operated(conceptOf(n), world));
  if (named < 0) return null;

  const stood = rolesIn(said, named, claims, world, side, sides);
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
        if (p.mark !== 'new' || p.of == null) return p;
        if (!world.isA(p.of, a.thing) || world.isIndividual(p.of)) return p;
        const id = allocate();
        const name = `${world.term(p.of).name}#${id}`;
        called.push(node('call', name, [], { name, id, of: p.of, made: true }));
        return { ...p, of: id };
      })
  // How a thing was marked is a fact about the word, not about the part it
  // played: what is kept is the role, the thing, and how much of it.
  ).map(({ role, of, amount }) => ({ role, of, amount }));

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
  const worked = work(action, parts, at, world, allocate);
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
    a.unit != null &&
    a.time != null &&
    part.amount != null &&
    world.isA(part.of, a.unit) &&
    (world.related(part.of, a.measure) || []).includes(a.time);
  const clock = parts.find(timely) || null;
  const event = node('event', `${world.term(action).name}#${happened}`, [], {
    id: happened,
    action,
    at,
    when: whenIn(said, world),
    ...(clock ? { time: { amount: clock.amount, unit: clock.of } } : {}),
    not: denied,
    parts: parts.filter((part) => !timely(part)),
  });

  // What the brain refuses did not happen, and it does not go on the record as
  // having happened. Where it simply cannot tell what followed, the event
  // stands: it was told something occurred, and that much is so.
  if (worked && worked.some((n) => n.kind === 'refuse')) return worked;
  return worked ? [...called, event, ...worked] : [...called, event];
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
function rolesIn(said, acting, claims, world, side, sides) {
  const a = world.anchors || {};
  const of = (i) => markerFor(said, i, side, roleOn);
  const parts = [];
  const taken = new Set();

  said.forEach((n, i) => {
    if (i === acting || !claims(n) || isDeterminer(said, i, world)) return;
    const named = roleOn(of(i));
    if (!named || a[named] == null) return;
    parts.push({ role: a[named], of: conceptOf(n), amount: amountOf(n, world), mark: markAt(n), at: i });
    taken.add(i);
  });

  // What no word says, the brain reads off the order things were perceived in —
  // but which side of the action is the doer is word order, and word order is
  // the language's. Told nothing, the brain assigns no part by order at all.
  said.forEach((n, i) => {
    if (i === acting || taken.has(i) || !claims(n) || isDeterminer(said, i, world) || !sides) return;
    const role = a[i < acting ? sides.before : sides.after];
    if (role != null) parts.push({ role, of: conceptOf(n), amount: amountOf(n, world), mark: markAt(n), at: i });
  });

  return parts.sort((x, y) => x.at - y.at).map(({ role, of, amount, mark }) => ({ role, of, amount, mark }));
}

// How many of this thing the signal counted, as a number.
function amountOf(n, world) {
  return world.valueOf(quantityTerm(n));
}

// An action the world says causes an operation, worked on what a thing holds.
// Which thing that is comes from the parts: taking draws from its source,
// giving adds to its destination, and the amount is what the target counted.
function work(action, parts, at, world, allocate) {
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
  if (!target || target.amount == null) return null;
  const amount = target.amount;
  // A part spoken of as one of its kind is answered by the one of it there is.
  const bearerOf = (part) => world.oneOf(part.of) ?? part.of;

  // One kind of holding passes. What Ravi *had*, Sam now *has* — the thing
  // moved, not the way of speaking about it — so whichever narrower word the
  // count was already written under at either end is the word it is written
  // under at both. Where neither end has been spoken of, holding is the plain
  // one.
  const ways = world.narrower(a.holding).filter((rel) => rel !== a.holding);
  const kept =
    ways.find((rel) => parts.some((p) => world.held(bearerOf(p), rel, target.of) != null)) ?? a.hold;

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
    const before = world.held(bearer, kept, target.of);
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
      thing: target.of,
      before: from,
      amount,
      after,
      term,
    });
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
      .find((one) => world.isIndividual(one) && world.isA(one, target.of));
    if (of == null) {
      if (allocate == null) continue;
      const id = allocate();
      const name = `${world.term(target.of).name}#${id}`;
      madeHere.push(node('call', name, [], { name, id, of: target.of, made: true }));
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

// What number this thing is. The world names some of them; the rest the brain
// read out of the figures it was sent, and both are numbers alike.
function numberOf(n, world) {
  const held = world.valueOf(conceptOf(n));
  if (held != null) return held;
  const thought = n ? findBranch(n, 'thought') : null;
  const read = thought && thought.state.thought ? thought.state.thought.value : null;
  return read == null ? null : read;
}

function conceptOf(n) {
  const thought = n ? findBranch(n, 'thought') : null;
  return thought && thought.state.thought ? thought.state.thought.concept : null;
}

function reaches(n, anchor, world) {
  const c = conceptOf(n);
  return c != null && world.isA(c, anchor);
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
        const isReferent = headConcept != null || findBranch(head, 'call') != null;
        const describing = middles.every((k) => functionsOf(k).includes('modifier'));
        if ((isContextualPointer || isReferent) && describing) {
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
function isDeterminer(said, i, world) {
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
function happened(said, world, claims, side, sides) {
  const a = world.anchors || {};
  const acting = said.findIndex((n) => reaches(n, a.action, world));
  if (acting < 0) return null;
  const parts = rolesIn(said, acting, claims, world, side, sides).filter((p) => p.of != null);
  if (parts.length === 0) return null;

  const action = conceptOf(said[acting]);
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
        (expectedWhen == null || world.linked(one, a.when).includes(expectedWhen)) &&
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

// What played the part a hole stands in. Everything the signal names has a
// part in what happened, the hole included; the brain looks through what it
// was told happened for one where the named parts match, and answers with what
// played the hole's part.
function partAsked(said, world, claims, side, sides) {
  const a = world.anchors || {};
  const acting = said.findIndex((n) => reaches(n, a.action, world));
  if (acting < 0) return null;

  // A hole plays a part the same way anything else does, and is known by its
  // mark rather than by naming nothing — a word may both stand for what is not
  // said and name the relation it asks across.
  const asking = (n) => claims(n) || markOn(n) === 'unknown';
  const of = (i) => markerFor(said, i, side, roleOn);
  const played = [];
  said.forEach((n, i) => {
    if (i === acting || !asking(n)) return;
    const named = roleOn(of(i));
    const role =
      named && a[named] != null
        ? a[named]
        : sides
          ? a[i < acting ? sides.before : sides.after]
          : null;
    if (role == null) return;
    played.push({ role, of: markOn(n) === 'unknown' ? null : conceptOf(n) });
  });
  const hole = played.find((p) => p.of == null);
  const known = played.filter((p) => p.of != null);
  if (!hole || known.length === 0) return null;

  const action = conceptOf(said[acting]);
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
  return node('answer', 'link', [], { subject: action, relation: hole.role, found });
}

// The part a word says the thing beside it plays in what happened. Which word
// assigns which part is the language's; that things play parts is the brain's.
function roleOn(n) {
  const t = n ? findBranch(n, 'thought') : null;
  return t && t.state.thought ? t.state.thought.role : null;
}

// Which side of now the signal put what it says on. That there are sides is the
// brain's — past, now, future, and nothing between them to weigh; which word
// says so is the language's, and which term each side is, is the world's.
function whenIn(said, world) {
  const a = world.anchors || {};
  for (const n of said) {
    const thought = n ? findBranch(n, 'thought') : null;
    const when = thought && thought.state.thought ? thought.state.thought.when : null;
    if (when && a[when] != null) return a[when];
  }
  return null;
}

// Whether this word denies what the signal says. That a claim can be denied is
// the brain's; which word does it is the language's.
function negatesOn(n) {
  const t = n ? findBranch(n, 'thought') : null;
  return Boolean(t && t.state.thought && t.state.thought.negates);
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

// What a word says about the thing beside it, or about itself.
function markOn(n) {
  const t = n ? findBranch(n, 'thought') : null;
  return t && t.state.thought ? t.state.thought.marks : null;
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
  const speakerSide = (id) =>
    id != null &&
    ((sent.from != null && (id === sent.from || world.isA(id, sent.from))) ||
      (sent.to != null && (id === sent.to || world.isA(id, sent.to))));
  if (!speakerSide(subject)) return undefined;
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
    const thing = world ? (world.anchors || {}).thing : null;
    if (thing != null && world && !world.isA(id, thing)) return false;
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

// ---------------------------------------------------------------------------
// express — the brain's last phase, and it runs on the structured signal. The
// brain decides only what it means to express — an intent, one of its own
// innate acts. How that intent is voiced belongs to the language it recognized,
// and lives in that language's data. No reply is written into the engine.
// ---------------------------------------------------------------------------
function express(roots, langs, world) {
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
function intentOf(n, world) {
  if (!n.state.exists) return 'nothing';
  const ts = thoughtOf(n);
  if (!ts || ts.meaning == null) return 'unknown';

  const concept = ts.concept;
  const a = world && world.anchors ? world.anchors : {};
  if (concept != null && world) {
    if (world.isA(concept, a.communication)) return 'greet';
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

// Voicing an intent in the language the signal was recognized as. A language
// that has nothing to say for an intent leaves it unsaid.
function speak(intent, meaning, langName, langs, terms) {
  const lang = (langs || []).find((l) => l.data.name === langName);
  const says = lang ? lang.express(intent, { meaning, ...terms }) : null;
  return node('express', intent, [], { says, meaning, language: langName || null });
}

function thoughtOf(n) {
  const thought = findBranch(n, 'thought');
  return thought ? thought.state.thought : null;
}

function meaningOf(n) {
  const ts = thoughtOf(n);
  return ts ? ts.meaning : null;
}

// Saying back the thing a word named, rather than the gloss the language filed
// it under: `dog` is answered with dog, not with canine animal. The term is
// handed over and the language says it in its own word for it, which is the
// same road every other answer takes. Where the word named nothing the brain
// has nothing to hand over, and the word itself has to stand for it.
function saidBack(n) {
  const ts = thoughtOf(n);
  if (!ts) return null;
  return ts.concept != null ? ts.concept : ts.meaning;
}

function languageOf(n) {
  const ts = thoughtOf(n);
  return ts ? ts.language : null;
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

// What a signal comes to. A signal may come to more than one of these at once,
// and each of them is whole: the first does not stand for the rest.
const VERDICT = ['standing', 'answer', 'learn', 'refuse'];

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
  if (roots.length !== 1) return null;
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
function expression(roots, langs, mood, world, sent) {
  // A signal that came to more than one verdict is composed, not re-judged as
  // one whole: each part already stands finished on its own. This is the one
  // new step — not perceiving several as one, but putting several already-
  // finished acts into a single one said back together.
  const together = roots.length === 1 && findBranch(roots[0], 'refuse') ? null : apart(roots, world);
  if (together) {
    const parts = together.map((r) => expression([r], langs, mood, world, sent));
    const langName = parts.map((p) => p.state.language).find(Boolean) || null;
    // An act that says a term is one of a list, and the language says what
    // goes between those. An act that says a sentence has already been ended
    // the way this language ends one, so nothing goes between but the space.
    const between = parts.every((p) => p.name === 'answer')
      ? listing(langName, langs)
      : ' ';
    // Each was judged in full and each verdict stays on the tree, but saying
    // one of them twice says nothing the first did not. Two that came out
    // differently are both worth saying; two that came out the same are one
    // thing to say, however many things it was reached about.
    const says = [
      ...new Set(parts.map((p) => p.state.says).filter((s) => s != null)),
    ].join(between);
    return withBranch(
      node('express', parts[0].name, [], { says: says || null, language: langName }),
      parts,
      { says: says || null, language: langName, bound: true, mood },
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
      : gave || named
      ? 'learn'
    : feeling
      ? feeling
      : stood
      ? learned
        ? 'learn'
        : stood.name === 'against'
          ? 'deny'
          : stood.name === 'absent'
            ? 'unsure'
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
            ? numberSaid(counted.state.total, counted.state.members, langName, langs, world, written)
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
  const seen = [];
  const collect = (n) => {
    const thought = findBranch(n, 'thought');
    if (thought && thought.state.thought) seen.push(thought.state.thought.names);
    (n.branch || []).forEach(collect);
  };
  roots.forEach(collect);
  return seen.some((names) => names === false);
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
function spoken(answer, langName, langs, world, written) {
  if (answer.state.classification != null) {
    const lang = (langs || []).find((candidate) => candidate.data.name === langName);
    return lang ? lang.classificationFor(answer.state.classification) : null;
  }
  const { found } = answer.state;
  const words = found.map((t) => termWord(t, langName, langs, world, written)).filter(Boolean);
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
function claimSaid(stood, langName, langs, world) {
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
    const word = termWord(term, langName, langs, world);
    if (word == null) return null;
    // One of a kind takes its article; what is not one — a name, a word the
    // language says stands bare, or a property in object place predicated
    // rather than counted (`a tuba is loud`, never `a loud`) — does not.
    // Object place only: what a thing has been called stays with the thing,
    // and learned properties must never unkind their bearer.
    const bare =
      (world && world.isIndividual(term)) ||
      lang.isBare(term) ||
      (isObject && world && world.isA(term, a.property));
    return bare ? word : `${lang.oneFor(word)} ${word}`;
  };
  const one = said(subject, false);
  const other = classification == null ? said(object, true) : lang.classificationFor(classification);
  if (one == null || other == null) return '';
  // Saying a comparison back needs no scale: what was compared on is in the
  // comparison itself. A scale is what lets measured things be worked out
  // against each other, and plenty of states are never measured at all.
  const comparing = isComparing(relation, world) ? lang.comparativeFor(relation) : null;
  if (comparing != null) {
    return lang.express('compare', { subject: one, relation: comparing, object: other }) ?? '';
  }
  const words = termWord(relation, langName, langs, world);
  if (words == null) return '';
  return lang.express('claim', { subject: one, relation: words, object: other }) ?? '';
}

// A number the brain worked out. The world may have no term for it — nothing
// says a world must name every number — and the language may still be able to
// write it, since its figures count from zero in the order it declared them.
function numberSaid(term, value, langName, langs, world, written) {
  const lang = (langs || []).find((l) => l.data.name === langName);
  // Written in figures, said in figures: no language needs a word for every
  // number, and the ones it has are for when it was asked in words.
  const inFigures = lang && written ? lang.figuresFor(value) : null;
  const named = inFigures ?? termWord(term, langName, langs, world, written);
  if (named != null) return named;
  if (!lang) return null;
  if (numericCompare(value, 0) >= 0) return lang.figuresFor(value);
  // Below nothing is still a number. The brain takes the sign from the term
  // for taking away, since that is what this language writes it with.
  const figures = lang.figuresFor(numericNegate(value));
  const sign = termWord(world ? (world.anchors || {}).minus : null, langName, langs, world, true);
  return figures == null || sign == null ? null : `${sign}${figures}`;
}

// A term, said in the language being spoken — or, where that language has no
// word for it, said as it was given. A name is not translated.
function termWord(term, langName, langs, world, written) {
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
  for (const standing of [false, true]) {
    const memo = new Map();
    for (const parse of parsesFrom(rules, start, tagged, 0, memo, standing)) {
      if (parse.next !== tagged.length) continue;
      const kids = (parse.tree.children || []).map((c) => leafOrPhrase(c, rules)).filter(Boolean);
      return [
        node(start, start, kids, {
          text: tagged.map((t) => t.root.state.identity).join(' '),
          ...(rules[start].whole ? { whole: true } : {}),
          ...(rules[start].referent ? { referent: true } : {}),
        }),
      ];
    }
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
function functionList(value) {
  if (!value || value.functions == null) return [];
  return Array.isArray(value.functions) ? value.functions : [value.functions];
}

function functionsOf(n) {
  return functionList(thoughtOf(n));
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
  judgedRoots = awoken(judgedRoots, world, mood);
  let learned = learnedFrom(judgedRoots, world);
  const inconsistent = learningConflict(world, learned);
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
  // Which side of a word its markers stand on is the language's to declare;
  // the graph is told, and assumes no order of its own.
  const spoken = signalLanguage(thoughtRoots, langs);
  // Held back until the change this turn proposes has been written. A turn
  // that fails to persist did not happen, and the conversation must not
  // remember what the world never took in.
  const remember = () => {
    if (!graph) return;
    graph.fromUnderstood(
      judgedRoots,
      world,
      inReach,
      spoken ? spoken.data.marking : null,
      at.from,
    );
  };

  const expressedRoots = express(judgedRoots, langs, world);
  return {
    input,
    language: spoken ? spoken.data.name : null,
    roots: expressedRoots,
    expression: expression(expressedRoots, langs, mood, world, at),
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

// Validate a whole proposed change against one immutable world. Individual
// clauses cannot approve facts independently when their combination creates
// a contradiction, reuses an identity, or closes a classification cycle.
function learningConflict(world, learned) {
  if (!world || !learned) return null;
  const terms = new Map(world.data.terms.map((t) => [t.id, {
    ...t,
    links: (t.links || []).map((l) => ({ ...l })),
  }]));
  const names = new Map(world.data.terms.map((t) => [t.name, t.id]));
  for (const proposed of learned.terms || []) {
    const named = names.get(proposed.name);
    if (named != null && named !== proposed.id) return `name ${proposed.name} already belongs to ${named}`;
    const held = terms.get(proposed.id);
    if (held && held.name !== proposed.name) return `term ${proposed.id} already names ${held.name}`;
    if (!held) {
      terms.set(proposed.id, { ...proposed, links: [] });
      names.set(proposed.name, proposed.id);
    }
    terms.get(proposed.id).links.push(...(proposed.links || []).map((l) => ({ ...l })));
  }

  // A link may not point at a term that is not there, nor be made of one. Only
  // what this change brings is looked at: the world it joins was already whole,
  // and every term it could name is either in that world or arriving with it.
  for (const proposed of learned.terms || []) {
    for (const link of proposed.links || []) {
      if (!terms.has(link.to)) return `link to unknown term ${link.to}`;
      if (!terms.has(link.rel)) return `link by unknown term ${link.rel}`;
    }
  }

  for (const term of terms.values()) {
    const facts = new Map();
    for (const link of term.links || []) {
      const key = `${link.rel}:${link.to}:${link.at ?? ''}`;
      const fact = facts.get(key);
      if (fact && Boolean(fact.not) !== Boolean(link.not)) return `term ${term.id} both holds and denies ${key}`;
      if (
        fact &&
        link.quantity !== undefined &&
        fact.quantity !== undefined &&
        fact.quantity !== link.quantity
      ) return `term ${term.id} gives ${key} two quantities`;
      facts.set(key, link);
    }
  }

  const same = (world.data.relations && world.data.relations.same) ?? world.anchors?.same;
  const identityEdges = new Map([...terms.keys()].map((id) => [id, []]));
  if (same != null) {
    for (const term of terms.values()) {
      for (const link of term.links || []) {
        if (link.not || link.rel !== same) continue;
        identityEdges.get(term.id).push(link.to);
        identityEdges.get(link.to).push(term.id);
      }
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
      pending.push(...(identityEdges.get(here) || []));
    }
    for (const member of found) identityCache.set(member, found);
    return found;
  };
  const identityOf = (id) => Math.min(...identities(id));
  const identityFacts = new Map();
  for (const term of terms.values()) {
    for (const link of term.links || []) {
      let subject = identityOf(term.id);
      let object = identityOf(link.to);
      if (terms.get(link.rel)?.symmetric && subject > object) {
        [subject, object] = [object, subject];
      }
      const key = `${subject}:${link.rel}:${object}:${link.at ?? ''}`;
      const fact = identityFacts.get(key);
      const substitutesIdentity = identities(term.id).size > 1 || identities(link.to).size > 1;
      if (substitutesIdentity && fact && Boolean(fact.not) !== Boolean(link.not)) {
        return `equivalent terms both hold and deny ${key}`;
      }
      if (
        substitutesIdentity && fact && fact.quantity !== undefined && link.quantity !== undefined &&
        fact.quantity !== link.quantity
      ) return `equivalent terms give ${key} two quantities`;
      identityFacts.set(key, link);
    }
  }

  const subrelation = world.anchors ? world.anchors.subrelation : null;
  const relationParents = new Map([...terms.keys()].map((id) => [id, []]));
  if (subrelation != null) {
    for (const term of terms.values()) {
      for (const link of term.links || []) {
        if (!link.not && link.rel === subrelation) relationParents.get(term.id).push(link.to);
      }
    }
  }
  const relationAncestorCache = new Map();
  const relationVariantCache = new Map();
  const relationAncestors = (id) => {
    if (relationAncestorCache.has(id)) return relationAncestorCache.get(id);
    const found = new Set();
    const pending = [id];
    while (pending.length) {
      const here = pending.pop();
      if (found.has(here)) continue;
      found.add(here);
      pending.push(...(relationParents.get(here) || []));
    }
    relationAncestorCache.set(id, found);
    return found;
  };
  const relationVariants = (id) => {
    if (!relationVariantCache.has(id)) {
      relationVariantCache.set(id, new Set(
        [...terms.keys()].filter((candidate) => relationAncestors(candidate).has(id)),
      ));
    }
    return relationVariantCache.get(id);
  };

  const converseRelation = world.anchors ? world.anchors.converse : null;
  const conversesOf = (relation) => {
    const out = new Set();
    if (converseRelation == null) return out;
    for (const candidate of terms.values()) {
      for (const link of candidate.links || []) {
        if (link.not || link.rel !== converseRelation) continue;
        if (candidate.id === relation) out.add(link.to);
        if (link.to === relation) out.add(candidate.id);
      }
    }
    return out;
  };
  const domain = world.anchors ? world.anchors.domain : null;
  const range = world.anchors ? world.anchors.range : null;
  const subtype = world.anchors ? world.anchors.subtype : null;
  const instance = world.anchors ? world.anchors.instance : null;
  const predication = world.anchors ? world.anchors.predication : null;
  const classificationRelations = new Set(
    [world.baseRelation, subtype, instance].filter((id) => id != null),
  );
  const constraintCache = new Map();
  const declaredKinds = (relation, declaration) => {
    const out = new Set();
    if (declaration == null) return out;
    for (const broader of relationAncestors(relation)) {
      for (const link of terms.get(broader)?.links || []) {
        if (!link.not && link.rel === declaration) out.add(link.to);
      }
    }
    return out;
  };
  const constraintKinds = (relation, side) => {
    const key = `${relation}:${side}`;
    if (constraintCache.has(key)) return constraintCache.get(key);
    const own = side === 'domain' ? domain : range;
    const opposite = side === 'domain' ? range : domain;
    const out = declaredKinds(relation, own);
    for (const broader of relationAncestors(relation)) {
      for (const converse of conversesOf(broader)) {
        for (const kind of declaredKinds(converse, opposite)) out.add(kind);
      }
    }
    constraintCache.set(key, out);
    return out;
  };
  const isA = (start, target) => {
    const seen = new Set();
    const pending = [start];
    while (pending.length) {
      const here = pending.pop();
      if (here === target) return true;
      if (seen.has(here)) continue;
      seen.add(here);
      for (const link of terms.get(here)?.links || []) {
        if (!link.not && classificationRelations.has(link.rel)) pending.push(link.to);
      }
    }
    return false;
  };
  const impliedKind = (id, kind) => {
    for (const term of terms.values()) {
      for (const link of term.links || []) {
        if (link.not) continue;
        const implied = [];
        if (term.id === id) implied.push(...constraintKinds(link.rel, 'domain'));
        if (link.to === id) implied.push(...constraintKinds(link.rel, 'range'));
        for (const found of implied) if (isA(found, kind)) return true;
      }
    }
    return false;
  };
  for (const term of terms.values()) {
    for (const link of term.links || []) {
      if (link.not) continue;
      for (const broader of relationAncestors(link.rel)) {
        if (broader === link.rel) continue;
        const sameMoment = (other) => (other.at ?? null) === (link.at ?? null);
        if ((term.links || []).some(
          (other) => other.not && other.rel === broader && other.to === link.to && sameMoment(other),
        )) return `narrower relation ${link.rel} contradicts denied broader relation ${broader}`;
        const object = terms.get(link.to);
        if (
          terms.get(broader)?.symmetric &&
          object &&
          (object.links || []).some(
            (other) => other.not && other.rel === broader && other.to === term.id && sameMoment(other),
          )
        ) return `narrower relation ${link.rel} contradicts denied broader relation ${broader}`;
        for (const back of conversesOf(broader)) {
          if (object && (object.links || []).some(
            (other) => other.not && other.rel === back && other.to === term.id && sameMoment(other),
          )) return `narrower relation ${link.rel} contradicts denied broader relation ${broader}`;
        }
      }
    }
  }

  for (const relation of terms.values()) {
    if (!relation.symmetric) continue;
    const variants = relationVariants(relation.id);
    const facts = new Map();
    for (const term of terms.values()) {
      for (const link of term.links || []) {
        if (!variants.has(link.rel) || (link.not && link.rel !== relation.id)) continue;
        const ends = term.id <= link.to ? [term.id, link.to] : [link.to, term.id];
        const key = `${ends[0]}:${ends[1]}:${link.at ?? ''}`;
        const fact = facts.get(key);
        if (fact && Boolean(fact.not) !== Boolean(link.not)) {
          return `symmetric relation ${relation.id} both holds and denies ${key}`;
        }
        if (
          fact &&
          fact.quantity !== undefined &&
          link.quantity !== undefined &&
          fact.quantity !== link.quantity
        ) return `symmetric relation ${relation.id} gives ${key} two quantities`;
        facts.set(key, link);
      }
    }
  }

  for (const relation of terms.values()) {
    if (!relation.irreflexive && !relation.asymmetric) continue;
    const variants = relationVariants(relation.id);
    for (const term of terms.values()) {
      if ((term.links || []).some(
        (link) => !link.not && variants.has(link.rel) && link.to === term.id,
      )) return `irreflexive relation ${relation.id} relates ${term.id} to itself`;
    }
  }

  for (const relation of terms.values()) {
    if (!relation.reflexive) continue;
    const required = [
      ...constraintKinds(relation.id, 'domain'),
      ...constraintKinds(relation.id, 'range'),
    ];
    for (const term of terms.values()) {
      const eligible = required.length === 0 || required.every(
        (kind) => isA(term.id, kind) || impliedKind(term.id, kind),
      );
      if (!eligible) continue;
      if ((term.links || []).some(
        (link) => link.not && link.rel === relation.id && link.to === term.id,
      )) return `reflexive relation ${relation.id} denies its required self-link`;
    }
  }

  for (const relation of terms.values()) {
    if (!relation.functional) continue;
    const bySubject = new Map([...terms.keys()].map((id) => [id, []]));
    const variants = relationVariants(relation.id);
    const converse = world.anchors ? world.anchors.converse : null;
    const converses = new Set();
    if (converse != null) {
      for (const candidate of terms.values()) {
        for (const link of candidate.links || []) {
          if (link.not || link.rel !== converse) continue;
          if (variants.has(candidate.id)) converses.add(link.to);
          if (variants.has(link.to)) converses.add(candidate.id);
        }
      }
    }
    const add = (subject, link) => {
      const normalizedSubject = identityOf(subject);
      const normalizedLink = { ...link, to: identityOf(link.to) };
      bySubject.get(normalizedSubject).push(normalizedLink);
      if (relation.symmetric && normalizedSubject !== normalizedLink.to) {
        bySubject.get(normalizedLink.to).push({ ...normalizedLink, to: normalizedSubject });
      }
    };
    for (const term of terms.values()) {
      for (const link of term.links || []) {
        if (link.not) continue;
        if (variants.has(link.rel)) add(term.id, link);
        if (converses.has(link.rel)) add(link.to, { ...link, to: term.id });
      }
    }
    for (const [subject, links] of bySubject) {
      const timeless = new Set(links.filter((link) => link.at == null).map((link) => link.to));
      const all = new Set(links.map((link) => link.to));
      if (timeless.size > 1 || (timeless.size === 1 && all.size > 1)) {
        return `functional relation ${relation.id} gives ${subject} competing objects`;
      }
      const byMoment = new Map();
      for (const link of links) {
        if (link.at == null) continue;
        if (!byMoment.has(link.at)) byMoment.set(link.at, new Set());
        byMoment.get(link.at).add(link.to);
      }
      for (const objects of byMoment.values()) {
        if (objects.size > 1) {
          return `functional relation ${relation.id} gives ${subject} competing objects at one moment`;
        }
      }
    }
  }

  const is = world.baseRelation;
  const visiting = new Set();
  const visited = new Set();
  const visit = (id) => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    const term = terms.get(id);
    for (const link of (term && term.links) || []) {
      if (!link.not && classificationRelations.has(link.rel) && visit(link.to)) return true;
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  };
  for (const id of terms.keys()) if (visit(id)) return 'classification cycle';

  for (const term of terms.values()) {
    for (const link of term.links || []) {
      if (link.rel === subtype && (term.individual || terms.get(link.to)?.individual)) {
        return 'subtype must connect kinds';
      }
      if (link.rel === instance && (!term.individual || terms.get(link.to)?.individual)) {
        return 'instance must connect an individual to a kind';
      }
      if (
        link.rel === predication &&
        (world.anchors.property == null || !isA(link.to, world.anchors.property))
      ) return 'predication must name a property';
    }
  }

  const relationKind = world.anchors ? world.anchors.relation : null;
  for (const term of terms.values()) {
    for (const link of term.links || []) {
      if (link.not || (link.rel !== domain && link.rel !== range)) continue;
      if (relationKind != null && !isA(term.id, relationKind)) {
        return 'domain and range may only constrain relations';
      }
      if (terms.get(link.to)?.individual) return 'domain and range must name kinds, not individuals';
    }
  }

  const inferredTypes = new Map();
  const infer = (id, kinds) => {
    if (kinds.size === 0) return;
    if (!inferredTypes.has(id)) inferredTypes.set(id, new Set());
    for (const kind of kinds) inferredTypes.get(id).add(kind);
  };
  if (domain != null || range != null) {
    for (const term of terms.values()) {
      for (const link of term.links || []) {
        if (link.not) continue;
        infer(term.id, constraintKinds(link.rel, 'domain'));
        infer(link.to, constraintKinds(link.rel, 'range'));
      }
    }
  }
  const effectiveAncestors = (id) => {
    const found = new Set();
    const pending = [id, ...(inferredTypes.get(id) || [])];
    while (pending.length) {
      const here = pending.pop();
      if (found.has(here)) continue;
      found.add(here);
      for (const link of terms.get(here)?.links || []) {
        if (!link.not && classificationRelations.has(link.rel)) pending.push(link.to);
      }
    }
    return found;
  };
  const different = (world.data.relations && world.data.relations.different) ?? world.anchors?.different;
  const excluded = (left, right) => {
    if (left === right) return false;
    if (different != null) {
      if ((terms.get(left)?.links || []).some(
        (link) => !link.not && link.rel === different && link.to === right,
      )) return true;
      if ((terms.get(right)?.links || []).some(
        (link) => !link.not && link.rel === different && link.to === left,
      )) return true;
    }
    for (const parent of (terms.get(left)?.links || [])
      .filter((link) => !link.not && classificationRelations.has(link.rel))
      .map((link) => link.to)) {
      if (
        terms.get(parent)?.disjoint &&
        (terms.get(right)?.links || []).some(
          (link) => !link.not && classificationRelations.has(link.rel) && link.to === parent,
        )
      ) return true;
    }
    return false;
  };
  for (const component of new Set([...identityCache.values()])) {
    if (component.size < 2) continue;
    const effective = new Set();
    const values = new Set();
    for (const member of component) {
      if (terms.get(member)?.value !== undefined) values.add(terms.get(member).value);
      for (const ancestor of effectiveAncestors(member)) effective.add(ancestor);
      if ((terms.get(member)?.links || []).some(
        (link) => link.not && link.rel === same && component.has(link.to),
      )) return 'equivalent terms are explicitly denied as same';
    }
    for (const member of component) {
      if ((terms.get(member)?.links || []).some(
        (link) => link.not && classificationRelations.has(link.rel) && effective.has(link.to),
      )) return 'equivalent terms contradict an inherited classification';
    }
    if (values.size > 1) return 'equivalent terms name different numeric values';
    for (const left of effective) {
      for (const right of effective) {
        if (excluded(left, right)) return 'equivalent terms have exclusive identities or kinds';
      }
    }
  }
  for (const [id] of inferredTypes) {
    const effective = effectiveAncestors(id);
    for (const rung of effective) {
      for (const link of terms.get(rung)?.links || []) {
        if (link.not && classificationRelations.has(link.rel) && effective.has(link.to)) {
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

  if (subrelation != null) {
    if (relationKind != null) {
      for (const term of terms.values()) {
        for (const link of term.links || []) {
          if (
            !link.not &&
            link.rel === subrelation &&
            (!isA(term.id, relationKind) || !isA(link.to, relationKind))
          ) return 'subrelation endpoints must both be relations';
        }
      }
    }
    const active = new Set();
    const done = new Set();
    const climb = (id) => {
      if (active.has(id)) return true;
      if (done.has(id)) return false;
      active.add(id);
      for (const link of terms.get(id)?.links || []) {
        if (!link.not && link.rel === subrelation && climb(link.to)) return true;
      }
      active.delete(id);
      done.add(id);
      return false;
    };
    for (const id of terms.keys()) if (climb(id)) return 'subrelation cycle';
  }

  // Proposed links enter atomically, so asymmetric relations must be checked
  // over the complete proposal as well as one clause at a time. A transitive
  // asymmetric relation admits no cycle of any length.
  for (const relation of terms.values()) {
    if (!relation.asymmetric) continue;
    const variants = relationVariants(relation.id);
    const converse = world.anchors ? world.anchors.converse : null;
    const converses = new Set();
    if (converse != null) {
      for (const candidate of terms.values()) {
        for (const link of candidate.links || []) {
          if (link.not || link.rel !== converse) continue;
          if (variants.has(candidate.id)) converses.add(link.to);
          if (variants.has(link.to)) converses.add(candidate.id);
        }
      }
    }
    const edges = new Map([...terms.values()].map((term) => [term.id, []]));
    for (const term of terms.values()) {
      for (const link of term.links || []) {
        if (link.not) continue;
        if (variants.has(link.rel)) edges.get(term.id).push(link.to);
        if (converses.has(link.rel)) edges.get(link.to).push(term.id);
      }
    }
    for (const [subject, objects] of edges) {
      if (objects.includes(subject)) return `asymmetric relation ${relation.id} relates ${subject} to itself`;
      if (objects.some((object) => (edges.get(object) || []).includes(subject))) {
        return `asymmetric relation ${relation.id} holds both ways`;
      }
    }
    if (!relation.transitive) continue;
    const visiting = new Set();
    const visited = new Set();
    const cyclic = (id) => {
      if (visiting.has(id)) return true;
      if (visited.has(id)) return false;
      visiting.add(id);
      for (const next of edges.get(id) || []) if (cyclic(next)) return true;
      visiting.delete(id);
      visited.add(id);
      return false;
    };
    for (const id of edges.keys()) if (cyclic(id)) return `asymmetric relation ${relation.id} has a cycle`;
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
function stands(n, world) {
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
function givings(roots, world, mood) {
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
    const rest = roots.slice(i + 1).filter((other) => stands(other, world));
    if (rest.length < 2 || conceptOf(rest[0]) !== world.baseRelation) return;
    if (thought.marks !== 'named' && numberOf(rest[1], world) == null) return;
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
    if (n.kind === 'event' && target != null) {
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
  if (!world || roots.length !== 1) return null;
  // A signal that came to several verdicts learned from every one of them,
  // held together — the second fact is as much a fact as the first.
  const together = apart(roots, world);
  if (together) {
    const terms = asOne(
      together.flatMap((r) => (learnedFrom([r], world) || { terms: [] }).terms),
    );
    return terms.length ? { terms } : null;
  }

  // One signal may offer more than one fact, and every one it took in is
  // handed back. What several of them were about one and the same thing is
  // one thing learned.
  const branch = roots[0].branch || [];
  const events = branch.filter((b) => b.kind === 'event');
  const learns = branch.filter((b) => b.kind === 'learn');
  const instructions = branch.filter((b) => b.kind === 'instruction');
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
    called.length === 0
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
    if (n.kind === 'learn' || n.kind === 'event' || n.kind === 'instruction') reference(n.state);
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
    ...events.flatMap((e) => tookPlace(e, world)),
    ...learns.flatMap((l) => tookIn(l, world, naming)),
  ]);
  // The surface copula names the broad classification question. Memory keeps
  // the stronger primitive when it can: one existing entity belongs to a
  // kind, one kind specializes another, and a property describes a bearer.
  for (const term of terms) {
    for (const link of term.links) {
      if (link.rel !== world.baseRelation) continue;
      link.rel = term.individual && Number.isInteger(link.at) && world.anchors.instance != null
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

// Something that happened, in the one shape all knowledge takes. How much of
// each part goes on the record with it: amounts are state of the occurrence,
// so a later count reads them rather than guessing.
// A standing instruction never occurred and is never done with. Every time the
// brain takes a fact in, what it holds is laid against every instruction it
// keeps: where a condition has come to stand, what stands on it follows. The
// instruction stays where it is — it governs whatever turns up next as well.
function awoken(roots, world, mood) {
  if (mood !== 'tell' || !world || roots.length !== 1) return roots;
  const a = world.anchors || {};
  if (a.instructing == null || a.condition == null || a.consequence == null) return roots;
  const root = roots[0];
  const offered = (root.branch || []).filter((n) => n.kind === 'learn');
  if (offered.length === 0) return roots;
  const told = new Set(
    offered.map((n) => `${n.state.subject}:${n.state.relation}:${n.state.object}:${Boolean(n.state.not)}`),
  );
  const follows = [];
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
    const arriving = told.has(`${on.subject}:${on.relation}:${on.object}:${on.not}`);
    if (!arriving && !world.isA(on.subject, on.object, on.relation)) continue;
    if (world.isA(then.subject, then.object, then.relation)) continue;
    follows.push(
      node('learn', 'link', [], {
        subject: then.subject,
        relation: then.relation,
        object: then.object,
        quantity: null,
        made: null,
        not: then.not,
      }),
    );
  }
  return follows.length === 0 ? roots : [withBranch(root, [...root.branch, ...follows])];
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
  const { id, action, at, parts, not, when } = event.state;
  const of = { rel: world.baseRelation, to: action, at };
  if (not) of.not = true;
  const stood = when == null ? [] : [{ rel: world.anchors.when, to: when, at }];
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
  const { subject, relation, object, quantity, made, not } = learn.state;
  const link = { rel: relation, to: object };
  if (not) link.not = true;
  if (quantity != null) {
    link.quantity = quantity;
    // What is so now is so from now: state is stamped, so what was so before
    // stays on the record instead of being written over.
    link.at = world.now();
  }
  // Placement is state too: a new location succeeds the old one while both
  // remain in history. Which relations are placements is world knowledge.
  if (quantity == null && world.anchors.placement != null && world.isA(relation, world.anchors.placement)) {
    link.at = world.now();
  }
  // And so is how a thing stands on one of its quantities. Cold and hot are
  // both temperatures, and a thing has one temperature at a time: the second
  // succeeds the first rather than standing against it. Which qualities are
  // states of a quantity the world says, the same way it says which relations
  // are placements.
  if (quantity == null && link.at == null && quantityOn(object, world) != null) {
    link.at = world.now();
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
function walk(node, fn) {
  const kids = (node.branch || []).map((c) => walk(c, fn));
  return fn(withBranch(node, kids));
}

function withBranch(node, branch, state) {
  return Object.assign({}, node, {
    branch: branch === undefined ? node.branch : branch,
    state: state === undefined ? node.state : state,
  });
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

function findBranch(n, kind) {
  return (n.branch || []).find((b) => b.kind === kind) || null;
}

function toString(v) {
  if (typeof v === 'string') return v;
  if (v === null || v === undefined) return '';
  return String(v);
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

function quote(s) {
  return /^[\p{L}\p{N}]+$/u.test(s) ? s : `"${s}"`;
}

export { node, learningConflict };
