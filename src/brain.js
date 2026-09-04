// Primitive perception layers of the brain.
// The brain climbs a fixed ladder of layers; each layer adds its perception
// of the signal to a running state, and may branch.
//
// The brain has no inbuilt knowledge of any language. It perceives raw
// structure by itself; language recognition happens inside the
// understanding phase, driven solely by externally-loaded language data
// (see src/languages.js). It never knows a language's name.

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
function understand(input, langs) {
  let roots = existence(input, langs);

  roots = thing(roots);
  roots = quality(roots, langs);
  roots = form(roots);
  roots = symbol(roots);

  roots = recognizeLanguage(roots, langs);

  return roots;
}

function existence(signal, langs) {
  const raw = toString(signal);
  // Nothing, or nothing but space, is nothing at all.
  if (raw.trim() === '') return [node('void', 'void', [], { exists: false })];
  // A multi-word signal is perceived as one thing per word, so each token
  // climbs the whole ladder on its own. Single-word input stays a single root.
  let tokens = tokenize(raw, langs);
  // A signal made only of marks still exists — it just holds no word.
  if (tokens.length === 0) tokens = [raw.trim()];
  return tokens.map((t) =>
    node('existence', 'something', [], { exists: true, raw: t }),
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
// The symbol is matched against each language's alphabet/words; the brain
// "notices" a language when the signal's letters fall within its letter set
// and the word resolves in its vocabulary.
// ---------------------------------------------------------------------------
function recognizeLanguage(roots, langs) {
  if (!langs || langs.length === 0) return roots;

  return roots.map((n) => {
    if (!n.state.exists) return withBranch(n);
    const identity = n.state.identity;
    const letters = Array.from(String(identity));

    // Which loaded languages recognize every letter of this signal?
    const matching = [];
    for (const lang of langs) {
      // Every symbol falls within something this language declares — its
      // letters, its digits, whatever else it says it is written in. The brain
      // does not hold that words are made of letters.
      const allRecognized =
        letters.length > 0 &&
        letters.every((ch) => lang.isOwnSymbol(ch)) &&
        letters.some((ch) => lang.isWordSymbol(ch));
      if (!allRecognized) continue;
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
        role: word.role ?? null,
        when: word.when ?? null,
        names: word.names ?? null,
        groups: word.groups ?? null,
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
  return roots.map((n) => {
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
    const readOf = (word) => ({
      language: first.lang,
      wordKnown: Boolean(word) || read,
      pos: word ? word.pos : read ? lang.figuresPos : null,
      meaning: word ? word.meaning : read ? String(n.state.identity) : null,
      concept: word
        ? pointedAt(word, at) ?? word.concept
        : read && world
          ? world.termFor(value)
          : null,
      value,
      marks: word ? word.marks : null,
      negates: word ? word.negates : false,
      role: word ? word.role : null,
      when: word ? word.when : null,
      names: word ? word.names : read ? false : null,
      groups: word ? word.groups : null,
    });
    // A word that names more than one thing is thought of every way it may be
    // meant. The brain does not pick here: it has one word and not yet a
    // signal, and picking now would be guessing.
    const ways = (first.words && first.words.length > 1 ? first.words : [first.word]).map(readOf);
    const state = ways.length > 1 ? { thought: ways[0], ways } : { thought: ways[0] };
    return withBranch(n, [...n.branch, node('thought', 'understood', [], state)]);
  });
}

// A pointer means something different every time it is said, so no world can
// hold what it points at. That a word may point is the brain's; which words do
// it is the language's (`marks`); what they land on is the circumstance of this
// one signal — where it came from, where it went, and what was last spoken of.
// Told none of them, the brain does not guess, and the word names nothing.
function pointedAt(word, at) {
  if (word.marks === 'from') return (at && at.from) ?? null;
  if (word.marks === 'to') return (at && at.to) ?? null;
  if (word.marks === 'spoken') return (at && at.spoken) ?? null;
  // A word given a name in this conversation stands for whatever it was given.
  // Which word was given what is the circumstance's, the same as the rest.
  if (word.marks === 'named') return (at && at.names && at.names[word.text]) ?? null;
  return null;
}

// ---------------------------------------------------------------------------
// solve — reason about the understood meaning. The brain infers what the word
// names by walking the world's `is` chain to its own anchors: the brain owns
// the categories, the world owns the membership. A word that names no term
// gets no category — the brain does not guess from the part of speech.
// ---------------------------------------------------------------------------
function solve(roots, world, langs) {
  const settled = settle(roots, world);
  return settled.map((n, at) => {
    if (!n.state.exists) {
      return withBranch(n, [...n.branch, node('response', 'nothing', [])]);
    }
    const thought = findBranch(n, 'thought');
    const lang = findBranch(n, 'language');
    const thoughtState = thought ? thought.state.thought : null;
    const meaning = thoughtState ? thoughtState.meaning : null;
    const pos = thoughtState ? thoughtState.pos : null;
    const language = lang && lang.state.matches && lang.state.matches[0]
      ? lang.state.matches[0].lang
      : null;

    const result = withBranch(n, [...n.branch, node('response', meaning || 'unrecognized', [], { language })]);

    // Innate reasoning: interjections are social — they come from living
    // entities (persons). The brain knows this from the part-of-speech
    // category, not from the semantic meaning.
    const known = worldNode(thoughtState ? thoughtState.concept : null, world);
    if (known) result.branch.push(known);

    const count = quantityOf(settled, at, world);
    if (count != null) {
      result.branch.push(node('quantity', 'quantity', [], { concept: count }));
    }

    // A word beside a thing may say whether one is being introduced or the one
    // already spoken of is meant. Which word does that is the language's.
    const marked = markOf(settled, at, world, langs);
    if (marked) result.branch.push(node('mark', marked, []));

    return result;
  });
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
function nearestOver(said, from, step, wanted) {
  for (let i = from + step; i >= 0 && i < said.length; i += step) {
    if (wanted(said[i])) return said[i];
    if (conceptOf(said[i]) != null) return null;
  }
  return null;
}

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
    return beside != null && world.isA(conceptOf(beside), a.property);
  });
}

// A number standing beside a thing says how many of it there are. The brain
// reads this off the order of the things it perceived — a language may put the
// number on either side, and it does not need to know which, so both are
// tried, left first.
function quantityOf(roots, at, world) {
  if (!world) return null;
  const a = world.anchors || {};
  const mine = conceptOf(roots[at]);
  // A number is not a count of itself.
  if (mine == null || world.isA(mine, a.number) || !world.isA(mine, a.thing)) return null;

  const isNumber = (n) => n && n.state.exists && world.isA(conceptOf(n), a.number);
  const found = nearestOver(roots, at, -1, isNumber) || nearestOver(roots, at, 1, isNumber);
  return found ? conceptOf(found) : null;
}

// Read off the order, like a count: a marker beside a thing marks that thing.
function markOf(roots, at, world, langs) {
  const mine = conceptOf(roots[at]);
  if (!world || mine == null || !world.isA(mine, (world.anchors || {}).thing)) return null;
  const marker = markerFor(roots, at, markingSide(world, langs), markOn);
  const marks = markOn(marker);
  return marks === 'new' || marks === 'known' ? marks : null;
}

// The word marking a thing need not touch it — `from the basket` puts an
// article between. Walk away from the thing over words that name nothing, and
// stop at the next thing: a marker never reaches past one. The walk itself is
// `nearestOver` — a marker is simply a word with nothing else to find first.
function markerFor(said, at, side, carries) {
  const step = side === 'before' ? 1 : -1;
  return nearestOver(said, at, step, carries);
}

// Every loaded language marks on the same side or the brain cannot tell; where
// they disagree it takes the first, since the signal is in one of them.
// Which side of an action each part falls on, as this language declares it.
function partsSide(langs) {
  const lang = (langs || [])[0];
  return lang && lang.parts ? lang.parts : null;
}

function markingSide(world, langs) {
  const lang = (langs || [])[0];
  return lang ? lang.marking : 'after';
}

// The world says what a term is; the brain reads only its own categories out of
// it. thing / property / relation / action are the brain's innate schema — the
// four ways anything can exist. Only a thing is living or nonliving; an action
// is an action, never a nonliving thing. Mindedness is a separate axis: a thing
// may have a mind whether or not it is alive.
function worldNode(concept, world) {
  if (concept == null || !world) return null;
  const a = world.anchors || {};

  if (world.isA(concept, a.thing)) {
    const alive = world.isA(concept, a.living);
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
    return node('entity', alive ? 'living' : 'nonliving', kids, { concept });
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
        return [withBranch(root, [...root.branch, node('agree', 'follow', [], {})])];
      }
      const found = (asked.branch || []).filter(taken);
      const nothing = node('standing', 'absent', [], {
        subject: null,
        relation: null,
        object: null,
        negated: false,
      });
      return [withBranch(root, [...root.branch, ...(found.length ? found : [nothing])])];
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

  const spoken = claimWithin(root);
  if (spoken) {
    const [checked] = judge([spoken], world, 'ask', langs, sent);
    return [withBranch(root, [...root.branch, ...(checked.branch || []).filter(taken)])];
  }

  const join = joinIn(root);
  if (join) {
    const judged = withBranch(
      join,
      join.branch.map((b) =>
        joinedWhole(b, join) ? judge([b], world, mood, langs, sent)[0] : b,
      ),
    );
    return [instead(root, join, judged)];
  }

  const said = [];
  const collect = (n) => {
    if (n.kind === 'thing') said.push(n);
    (n.branch || []).forEach(collect);
  };
  collect(root);

  const a = world.anchors || {};

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
  // A number spent saying how many of something there are is not itself one of
  // the things being spoken about.
  const spent = new Set(
    said.map((n) => quantityTerm(n)).filter((c) => c != null),
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

  // A claim may be about anything that exists, not only about a thing: gravity
  // is a force, and neither of them is a thing.
  const claims = (n) =>
    (conceptOf(n) != null || numberOf(n, world) != null) &&
    // The weakest relation is the signal's joint, never one of the things being
    // joined: "what is your name" is about a name, not about `is`.
    conceptOf(n) !== world.baseRelation &&
    !reaches(n, a.quantity, world) &&
    !spent.has(conceptOf(n));

  // An action can be spoken about as much as it can be carried out. A relation
  // named between two things is the signal's joint, and the joint is never one
  // of the things joined — so this is a claim about the action, not one of it
  // happening.
  const joint = namedRelation(said, world, claims, holes.length > 0);
  const joined = said.filter((n, i) => i !== joint && claims(n)).length;

  // An action the world says causes an operation, worked on what a thing holds.
  // What taking does is the world's to say; the arithmetic is the brain's.
  const done = joint >= 0 && joined >= 2 ? null : act(said, claims, world, markingSide(world, langs), partsSide(langs));
  if (done) return [withBranch(root, [...root.branch, ...done])];

  const quantity = said.find((n) => reaches(n, a.quantity, world));
  if (quantity && holes.length > 0) {
    const rel = namedRelation(said, world, claims, holes.length > 0);
    const things = said.filter((n, i) => i !== rel && claims(n));

    // Asked how many of something a thing holds, the brain reads its state.
    if (rel >= 0 && things.length >= 2) {
      const subject = conceptOf(things[0]);
      const object = conceptOf(things[things.length - 1]);
      const of = world.oneOf(subject);
      const bearer = of == null ? subject : of;
      const howMany = world.held(bearer, conceptOf(said[rel]), object);
      const total = howMany == null ? null : world.termFor(howMany);
      return [
        withBranch(root, [
          ...root.branch,
          node('count', total == null ? 'beyond' : 'counted', [], {
            of: object,
            held: bearer,
            members: howMany,
            total,
          }),
        ]),
      ];
    }

    // Asked how many of a kind there are, it counts what it knows.
    if (things.length === 1) {
      const kind = conceptOf(things[0]);
      const members = world
        .members(kind, world.baseRelation)
        .filter((id) => !world.isIndividual(id));
      const total = world.termFor(members.length);
      return [
        withBranch(root, [
          ...root.branch,
          node('count', total == null ? 'beyond' : 'counted', [], {
            of: kind,
            members: members.length,
            total,
          }),
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
  const terms = said.filter((n, i) => i !== at && claims(n));

  // A question with a hole answers every term it was given, each in full — a
  // togetherness of things asked about is not one blurred question, it is one
  // question asked of each, same as "1 and 2 and 3 are what" is three answers
  // held together, not one. The term nearest the hole is not privileged: a
  // question puts its hole wherever its language likes.
  if (holes.length > 0 && terms.length >= 1) {
    const nodes = [];
    for (const [i, term] of terms.entries()) {
      const subject = conceptOf(term);
      // A name is a fact like any other: what the term links to by the name
      // relation, read out of memory. Nothing about it is special to the engine.
      const found = reached(subject, relation, world);
      const mine = [node('answer', 'link', [], { subject, relation, found })];
      // The brain looked, and what it found stays on the tree. Saying it is
      // another act, and one it will not perform where any of the answer harms.
      const harmed = found.find((t) => harms(t, world));
      if (harmed != null) mine.push(node('refuse', 'harm', [], { said: harmed }));
      nodes.push(...among(mine, i, terms.length > 1));
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
    const lefts = said.filter((n, i) => i < at && claims(n));
    const rights = said.filter((n, i) => i > at && claims(n) && conceptOf(n) != null);
    if (lefts.length === 0 || rights.length === 0) return roots;
    // What the signal offered — the other fact, where the signal denies. Read
    // once: every fact in one offering was denied alike.
    const negated = said.some(negatesOn);

    // One thing spoken of is one thing, however many facts are offered about
    // it. The one that bears a state is made once for the thing that was
    // spoken of, not once per fact — otherwise a cupboard told it has cups and
    // plates would be two cupboards, one of each.
    const bearers = new Map();
    const bearerFor = (left, subject) => {
      if (!bearers.has(left)) bearers.set(left, bearerOf(subject, world, markAt(left)));
      return bearers.get(left);
    };

    const factFor = (left, right) => {
      const subject = conceptOf(left);
      const object = conceptOf(right);
      if (subject == null) return [];
      const howMany = world.valueOf(quantityTerm(right));
      // A fact about how many is about the thing that bears it, not about its
      // kind.
      const bearer = howMany == null ? null : bearerFor(left, subject);
      if (howMany != null && bearer == null) return [];
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
        return [held(from, subject, object, negated, whenIn(said, world), world)];
      }

      // A thing holds what its kinds hold: the fact is among what the brain
      // holds if any rung the thing stands on reaches the object by the
      // relation named — or by the other end of it, where the world says one
      // relation is another the other way round. Being in a thing and its
      // holding you are one fact, and the brain has it either way it is told.
      const joins = (from, to, rel) =>
        rel === world.baseRelation
          ? world.isA(from, to, rel)
          : upward(from, world).some((rung) => world.isA(rung, to, rel));
      const holds =
        joins(holder, object, relation) ||
        bothWays(relation, world).some((back) => joins(object, holder, back)) ||
        forced(holder, object, relation, world);
      // Something the brain holds stands against the fact where it says the
      // two are not so joined, where the two terms exclude each other and the
      // fact is about kind, or where it holds them joined by a relation it
      // says is a different one — a thing on a table is not under it. Failing
      // to find a path is none of those: not having reached a thing is not
      // holding anything against it.
      const kindFact = relation === world.baseRelation;
      const opposed =
        world.denies(holder, object, relation) ||
        (kindFact && world.excludes(subject, object)) ||
        apartFrom(relation, world).some((other) => joins(holder, object, other));
      const found = holds ? 'held' : opposed ? 'against' : 'absent';
      // Denied, the fact offered is the other one: what the brain holds stands
      // against a denial of it, and what it holds against, a denial is among.
      const stands = !negated
        ? found
        : found === 'held'
          ? 'against'
          : found === 'against'
            ? 'held'
            : 'absent';
      const added = [node('standing', stands, [], { subject, relation, object, negated })];

      // Offered a fact nothing it holds bears on, the brain takes it in —
      // unless something stands against it, or taking it would close a loop. A
      // relation already running from the object to the subject cannot also
      // run back.
      // How many is state: telling the brain a different count is not standing
      // against what it holds, it is saying the world has moved on.
      const revises = howMany != null && world.held(holder, relation, object) !== howMany;

      if (mood === 'tell') {
        const loops = !negated && subject !== object && world.isA(object, subject, relation);
        if (!revises && (stands === 'against' || loops)) {
          added.push(
            node('refuse', stands === 'against' ? 'contradiction' : 'loop', [], {
              subject,
              relation,
              object,
            }),
          );
        } else if (stands === 'absent' || revises) {
          added.push(
            node('learn', 'link', [], {
              subject: holder,
              relation,
              object,
              quantity: howMany,
              made: bearer && bearer.made ? bearer : null,
              not: negated,
            }),
          );
        }
      }
      return added;
    };

    // Every fact the signal offered, in the order it offered them.
    const pairs = lefts.flatMap((left) => rights.map((right) => [left, right]));
    const offered = pairs.map(([left, right]) => factFor(left, right)).filter((ns) => ns.length > 0);
    if (offered.length === 0) return roots;
    return [withBranch(root, [...root.branch, ...asOneOffering(offered)])];
  }

  return roots;
}

// Whether this stands beside the word joining it to another as a whole of the
// same size — a clause, or a signal the same shape as the one holding it. What
// stands between them is a word like any other, and is not one of them.
function joinedWhole(b, whole) {
  return b.kind === 'clause' || b.kind === whole.kind;
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
  if (!marksWith(root, 'conditional')) return null;
  // What stands on either side of the words that mark a condition. A whole
  // signal, or a thing on its own — a thing put where a claim would go is the
  // thing to say, which is what `else small` says.
  const parts = (root.branch || []).filter((b) => b.kind !== 'thing');
  return parts.length >= 2 && parts.length <= 3 ? parts : null;
}

// Whether one of the words standing here is of this part of speech.
function marksWith(n, part) {
  return (n.branch || []).some((b) => {
    const t = b.kind === 'thing' ? thoughtOf(b) : null;
    const pos = t ? t.pos : null;
    return pos != null && (Array.isArray(pos) ? pos : [pos]).includes(part);
  });
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
  return (n.branch || []).some((b) => {
    const t = b.kind === 'thing' ? thoughtOf(b) : null;
    const pos = t ? t.pos : null;
    return pos != null && (Array.isArray(pos) ? pos : [pos]).includes('complementizer');
  });
}

// What the brain came to, and not the walking it did to get there.
function taken(n) {
  return VERDICT.includes(n.kind) || n.kind === 'count' || n.kind === 'sum';
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
  if (!marksWith(n, 'conditional') && n.branch.filter((b) => joinedWhole(b, n)).length > 1) return n;
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
  return [whole, ...offered.flatMap((ns) => ns.filter((n) => n.kind === 'learn'))];
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
  if (relation === world.baseRelation) return world.linked(subject, relation);
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
function alongScale(left, right, relation, world) {
  const a = world.anchors || {};
  if (a.measure == null || left == null || right == null) return null;
  const lefts = valuesOn(conceptOf(left), world);
  const rights = valuesOn(conceptOf(right), world);

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

  const holds = relation === a.more ? found[0] : !found[0];
  return node('standing', holds ? 'held' : 'against', [], {
    subject: conceptOf(left),
    relation,
    object: conceptOf(right),
  });
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
// physical thing, the universe has gravity, gravity acts on everything
// physical, and what gravity causes is weight. This does not come down the
// ladder the way a kind's facts do — it comes from the universe inward.
//
// That a force reaches the physical and nothing else is the brain's: a number
// has no weight, and no world has to say so. Which forces there are, and what
// each one causes, is the world's.
function forced(thing, had, relation, world) {
  const a = world.anchors || {};
  if (relation !== a.has || a.force == null || a.physical == null || a.cause == null) return false;
  if (!world.isA(thing, a.physical)) return false;
  return world
    .members(a.force, world.baseRelation)
    .some((force) => world.isA(force, had, a.cause));
}

// The other end of a relation, where the world says one is another the other
// way round. Said once and read both ways, the way the world says two terms
// stand `different` and the brain reads that pair either way about.
function bothWays(relation, world) {
  const a = world.anchors || {};
  if (a.converse == null || relation == null) return [];
  return [...world.linked(relation, a.converse), ...world.members(relation, a.converse)];
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
    for (const up of world.linked(x, world.baseRelation)) climb(up);
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
    return node('standing', left.value === right.value ? 'held' : 'against', [], {
      subject: world.termFor(left.value),
      relation: a.same,
      object: world.termFor(right.value),
    });
  }

  if (relation === a.more || relation === a.less) {
    const left = valueBeside(said, at, -1, world);
    const right = valueBeside(said, at, 1, world);
    // Two numbers are the case where the world can already say which is
    // greater. Where they are not numbers, they may still stand on one scale,
    // and being further along it is the same thing said without counting.
    if (left == null || right == null) {
      const named = (n) => conceptOf(n) != null;
      return alongScale(
        nearest(said, at, -1, named),
        nearest(said, at, 1, named),
        relation,
        world,
      );
    }
    const holds = relation === a.more ? left > right : left < right;
    // The terms compared, not the numbers they name: a standing joins terms
    // wherever it comes from, and what is said back is said in words.
    return node('standing', holds ? 'held' : 'against', [], {
      subject: world.termFor(left),
      relation,
      object: world.termFor(right),
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
const OPERATIONS = [
  ['plus', 2, (x, y) => x + y],
  ['minus', 2, (x, y) => x - y],
  ['times', 2, (x, y) => x * y],
  ['divide', 2, (x, y) => (y === 0 ? null : x / y)],
  ['power', 2, (x, y) => finite(x ** y)],
  ['remainder', 2, (x, y) => (y === 0 ? null : x % y)],
  ['root', 1, (x) => (x < 0 ? null : Math.sqrt(x))],
  ['logarithm', 1, (x) => (x > 0 ? Math.log10(x) : null)],
  ['natural-logarithm', 1, (x) => (x > 0 ? Math.log(x) : null)],
  ['sine', 1, (x) => Math.sin(x)],
  ['cosine', 1, (x) => Math.cos(x)],
  ['tangent', 1, (x) => finite(Math.tan(x))],
  ['magnitude', 1, (x) => Math.abs(x)],
];

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
function bearerOf(kind, world, mark) {
  if (world.isIndividual(kind)) return { id: kind, made: false };
  if (mark === 'new') return { id: world.nextId(), of: kind, made: true };
  const one = world.oneOf(kind);
  // Meaning the one already spoken of, where there is none or more than one,
  // leaves nothing to mean. The brain does not pick.
  if (mark === 'known') return one == null ? null : { id: one, made: false };
  if (one != null) return { id: one, made: false };
  return { id: world.nextId(), of: kind, made: true };
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
function held(holder, about, said, negated, when, world) {
  const a = world.anchors || {};
  const id = world.nextId();
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

// Carrying out an action on what a thing holds. The world links an action to
// the operation it causes; the brain works the operation and keeps the result.
function act(said, claims, world, side, sides) {
  const a = world.anchors || {};
  const acting = said.findIndex((n) => reaches(n, a.action, world));
  // A signal may name what was done, or name the operation itself: `give one
  // spoon to it` and `add one spoon into it` come to the same change in what a
  // thing holds, and only one of them has anyone doing it.
  const named = acting >= 0 ? acting : said.findIndex((n) => operated(conceptOf(n), world));
  if (named < 0) return null;

  const parts = rolesIn(said, named, claims, world, side, sides);
  if (parts.length === 0) return null;

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
  const worked = work(action, parts, at, world);
  // Nobody did an operation a signal named outright. Nothing happened to
  // anyone — only what a thing holds coming to something else — so there is
  // nothing that happened to put on the record.
  if (acting < 0) return worked;

  const happened = world.nextId();

  // What happened is a thing that happened once: it is of its kind, it has the
  // parts things played in it, and it has a moment. Nothing new was needed to
  // hold it — an event is an individual like any other.
  const event = node('event', `${world.term(action).name}#${happened}`, [], {
    id: happened,
    action,
    at,
    when: whenIn(said, world),
    parts,
  });

  // What the brain refuses did not happen, and it does not go on the record as
  // having happened. Where it simply cannot tell what followed, the event
  // stands: it was told something occurred, and that much is so.
  if (worked && worked.some((n) => n.kind === 'refuse')) return worked;
  return worked ? [event, ...worked] : [event];
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
    if (i === acting || !claims(n)) return;
    const named = roleOn(of(i));
    if (!named || a[named] == null) return;
    parts.push({ role: a[named], of: conceptOf(n), amount: amountOf(n, world), at: i });
    taken.add(i);
  });

  // What no word says, the brain reads off the order things were perceived in —
  // but which side of the action is the doer is word order, and word order is
  // the language's. Told nothing, the brain assigns no part by order at all.
  said.forEach((n, i) => {
    if (i === acting || taken.has(i) || !claims(n) || !sides) return;
    const role = a[i < acting ? sides.before : sides.after];
    if (role != null) parts.push({ role, of: conceptOf(n), amount: amountOf(n, world), at: i });
  });

  return parts.sort((x, y) => x.at - y.at).map(({ role, of, amount }) => ({ role, of, amount }));
}

// How many of this thing the signal counted, as a number.
function amountOf(n, world) {
  return world.valueOf(quantityTerm(n));
}

// An action the world says causes an operation, worked on what a thing holds.
// Which thing that is comes from the parts: taking draws from its source,
// giving adds to its destination, and the amount is what the target counted.
function work(action, parts, at, world) {
  const a = world.anchors || {};
  // The world says which action causes which operation; where the signal named
  // the operation itself there is nothing to look up.
  const causes = world.linked(action, a.cause);
  const op = causes.find((c) => c === a.plus || c === a.minus) ?? operated(action, world);
  if (!op) return null;

  const target = parts.find((p) => p.role === a.target);
  const wanted = op === a.plus ? a.destination : a.source;
  // An action may say that the part it goes to, or comes from, is one already
  // named: what a get goes to is whoever did it. No signal has to say that
  // twice, and which actions are like that is the world's to say, not the
  // brain's — it reads the role off the action the same way it reads the
  // operation off it.
  const also = world.linked(action, wanted);
  const place =
    parts.find((p) => p.role === wanted) ?? parts.find((p) => also.includes(p.role));
  if (!target || !place) return null;

  const amount = target.amount;
  const one = world.oneOf(place.of);
  const bearer = one == null ? place.of : one;
  const before = world.held(bearer, a.hold, target.of);
  if (amount == null || before == null) return null;

  const after = op === a.plus ? before + amount : before - amount;
  const term = world.termFor(after);
  const done = node('did', world.term(action).name, [], {
    action,
    operation: op,
    holder: bearer,
    thing: target.of,
    before,
    amount,
    after,
    term,
  });

  // A state the world cannot name is not a state the brain will hold. Taking
  // more than is there leaves what was there untouched.
  if (term == null) return [done, node('refuse', 'beyond', [], { after })];

  return [
    done,
    node('learn', 'link', [], {
      subject: bearer,
      relation: a.hold,
      object: target.of,
      quantity: after,
      not: false,
    }),
  ];
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
  for (let i = 0; i < said.length; i += 1) {
    if (!reaches(said[i], a.relation, world)) continue;
    if (!asking && !(nearest(said, i, -1, claims) && nearest(said, i, 1, claims))) continue;
    if (conceptOf(said[i]) !== world.baseRelation) return i;
    if (fallback < 0) fallback = i;
  }
  return fallback;
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

// The number term saying how many of this thing there are, if any.
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
            speak(intentOf(b, world), meaningOf(b), languageOf(b), langs),
          ])
        : withBranch(b),
    ),
  );
}

// What the brain means to express about a thing, decided by what the world says
// the thing IS — never by the part of speech the language filed it under. The
// brain walks to its own anchors and answers the kind of thing it found: it
// answers a communication with one of its own, counts a number, confirms a
// relation, and otherwise says it knows the thing.
function intentOf(n, world) {
  if (!n.state.exists) return 'nothing';
  const ts = thoughtOf(n);
  if (!ts || ts.meaning == null) return 'unknown';

  const concept = ts.concept;
  const a = world && world.anchors ? world.anchors : {};
  if (concept != null && world) {
    if (world.isA(concept, a.communication)) return 'greet';
    if (world.isA(concept, a.number)) return 'count';
    if (world.isA(concept, a.relation)) return 'confirm';
  }
  // A word that marks rather than names — a hole, or which one is meant —
  // stands for nothing by itself, and there is nothing in it to recognise.
  if (concept == null && ts.marks) return 'unknown';
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

function languageOf(n) {
  const ts = thoughtOf(n);
  return ts ? ts.language : null;
}

// Asking or telling. That a signal can do either is the brain's; which mark
// asks is the language's, and the brain reads it off the loaded symbol sets.
function moodOf(input, langs) {
  const raw = toString(input).trim();
  if (raw === '') return 'tell';
  const last = Array.from(raw).pop();
  return (langs || []).some((l) => l.isQuestionSymbol(last)) ? 'ask' : 'tell';
}

// The acts that are about what the brain does or does not know, and so are
// handed the term for knowing. It holds no word for it.
const KNOWING = ['understood', 'unsure', 'empathy', 'learn', 'unheard'];

// What a signal comes to. A signal may come to more than one of these at once,
// and each of them is whole: the first does not stand for the rest.
const VERDICT = ['standing', 'answer', 'learn', 'refuse'];

// A signal that came to several verdicts, one root apiece — or nothing, where
// it came to one. There are two ways a signal holds more than one: whole
// clauses joined by a word, and one act judged of several things at once.
// Either way the words are the same words; only what was reached of them
// differs, so each root keeps the whole signal and only its own verdict.
function apart(roots) {
  if (roots.length !== 1) return null;
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
  const together = apart(roots);
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
  const intent = refused
    ? 'deny'
    : agreed
      ? 'agree'
      : gave
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
            : mood === 'ask'
              ? 'affirm'
              : 'understood'
    : did
      ? did.state.term != null
        ? 'answer'
        : 'deny'
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
        : // A word it does not have is why it got no further, and saying so is
          // worth more than saying nothing.
          unheard != null
          ? 'unheard'
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
    intent === 'affirm' ? intent : intent,
    intent === 'affirm' ? claimSaid(stood, langName, langs, world) : said,
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
  return Boolean(lang && lang.figuresFor(value < 0 ? -value : value) != null);
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
  const { found } = answer.state;
  const words = found.map((t) => termWord(t, langName, langs, world, written)).filter(Boolean);
  // A walk that came back empty is an answer: nothing is what it has, the way
  // zero is what it counted. The node keeps its empty `found` either way.
  if (words.length === 0) {
    const none = world && world.anchors ? world.anchors.none : null;
    return termWord(none, langName, langs, world, written);
  }
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
function claimSaid(stood, langName, langs, world) {
  const lang = (langs || []).find((l) => l.data.name === langName);
  if (!lang || !stood) return null;
  const { subject, relation, object } = stood.state;
  // A number is not one of a kind, and does not go in a frame built for one.
  const a = world && world.anchors ? world.anchors : {};
  if (world && (world.isA(subject, a.number) || world.isA(object, a.number))) return '';
  const words = [subject, relation, object].map((t) => termWord(t, langName, langs, world));
  if (words.some((w) => w == null)) return '';
  return lang.express('claim', { subject: words[0], relation: words[1], object: words[2] }) ?? '';
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
  if (value >= 0) return lang.figuresFor(value);
  // Below nothing is still a number. The brain takes the sign from the term
  // for taking away, since that is what this language writes it with.
  const figures = lang.figuresFor(-value);
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
  return word ?? (world ? world.symbolOf(term) : null);
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

  const memo = new Map();
  for (const parse of parsesFrom(rules, start, tagged, 0, memo)) {
    if (parse.next !== tagged.length) continue;
    const kids = (parse.tree.children || []).map(leafOrPhrase).filter(Boolean);
    return [
      node(start, start, kids, {
        text: tagged.map((t) => t.root.state.identity).join(' '),
      }),
    ];
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
function parsesFrom(rules, symbol, tagged, index, memo) {
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
      for (const r of parseSequence(rules, seq, tagged, index, memo)) {
        results.push({ next: r.next, tree: { symbol, children: r.children } });
      }
    }
  }

  memo.set(key, results);
  return results;
}

// Every way the sequence `seq` can match starting at `index`.
function parseSequence(rules, seq, tagged, index, memo) {
  let states = [{ next: index, children: [] }];
  for (const symbol of seq) {
    const grown = [];
    for (const state of states) {
      for (const r of parsesFrom(rules, symbol, tagged, state.next, memo)) {
        grown.push({ next: r.next, children: [...state.children, r.tree] });
      }
    }
    if (grown.length === 0) return [];
    states = grown;
  }
  return states;
}

// Convert a parse-node into a brain node (leaf = solved root; phrase = node).
function leafOrPhrase(c) {
  if (c.root) return c.root;
  return node(c.symbol, c.symbol, (c.children || []).map(leafOrPhrase).filter(Boolean));
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

  // Where the signal came from is the runtime's to say — a person, a device, a
  // service, or nothing said at all. Where it went is this brain, unless the
  // runtime says otherwise: having received it is not an assumption.
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
    // What this conversation has given a name to. No more the brain's to keep
    // than who is speaking: it was handed back and comes back the same way.
    names: (circumstance && circumstance.names) || {},
  };

  const roots = understand(input, langs);
  const thoughtRoots = think(roots, langs, at, world);
  const solvedRoots = solve(thoughtRoots, world, langs);
  const mood = moodOf(input, langs);
  const structuredRoots = structurePhrase(solvedRoots, langs);
  const judgedRoots = judge(structuredRoots, world, mood, langs, at);
  const expressedRoots = express(judgedRoots, langs, world);
  return {
    input,
    roots: expressedRoots,
    expression: expression(expressedRoots, langs, mood, world, at),
    learned: learnedFrom(judgedRoots, world),
    spoken: spokenOf(judgedRoots, at),
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

// What this signal gave a name to. A word that stands for whatever it was
// given, standing beside a term, is being given that term: `x is 5` says that
// x is the brain's word for five from here on. The brain keeps none of it — it
// hands it back, and the runtime decides whether the next signal is still the
// same conversation.
function namedIn(roots, at) {
  const given = { ...at.names };
  for (const { name, of } of givings(roots, at.world, at.mood)) given[name] = of;
  return given;
}

// Each name this signal gave, and what it was given. The word joining them is
// the signal's joint and not what the name stands for: `x is 5` gives x five,
// not being.
function givings(roots, world, mood) {
  const out = [];
  if (mood !== 'tell') return out;
  roots.forEach((n, i) => {
    const thought = thoughtOf(n);
    if (!thought || thought.marks !== 'named') return;
    // Giving a name is done with the weakest joint there is: `x is 5` gives,
    // `x > 10` asks. So what stands next to the name must be that joint, and
    // what stands past it is what the name was given.
    const after = roots.slice(i + 1).filter((other) => conceptOf(other) != null);
    if (after.length < 2 || conceptOf(after[0]) !== world.baseRelation) return;
    out.push({ name: n.state.identity, of: conceptOf(after[1]) });
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
function spokenOf(roots, at) {
  if (roots.length !== 1) return at.spoken;
  const took = [];
  const stood = [];
  const walk = (n) => {
    // What the brain did to the world names the thing more exactly than what
    // the fact stood on: a state was taken in for the one thing bearing it,
    // and that one, not its kind, is what was spoken of.
    if (n.kind === 'learn') keep(took, n.state.subject);
    if (n.kind === 'standing' || n.kind === 'answer') keep(stood, n.state.subject);
    (n.branch || []).forEach(walk);
  };
  roots.forEach(walk);
  const found = took.length > 0 ? took : stood;
  if (found.length === 0) return at.spoken;
  return found.length === 1 ? found[0] : null;
}

function keep(found, of) {
  if (of != null && !found.includes(of)) found.push(of);
}

// What the brain accepted, in the one shape all knowledge takes. The brain does
// not keep it — it hands it back, and the runtime decides whether to remember.
function learnedFrom(roots, world) {
  if (!world || roots.length !== 1) return null;
  // A signal that came to several verdicts learned from every one of them,
  // held together — the second fact is as much a fact as the first.
  const together = apart(roots);
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
  if (events.length === 0 && learns.length === 0) return null;
  const terms = asOne([
    ...events.flatMap((e) => tookPlace(e, world)),
    ...learns.flatMap((l) => tookIn(l, world)),
  ]);
  return terms.length ? { terms } : null;
}

// Something that happened, in the one shape all knowledge takes.
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
      links: [of, ...stood, ...parts.map((p) => ({ rel: p.role, to: p.of, at }))],
    },
  ];
}

// A fact the brain took in. A world with no term for what it is about has
// nowhere to put it, and it comes back with nothing.
function tookIn(learn, world) {
  const { subject, relation, object, quantity, made, not } = learn.state;
  const link = { rel: relation, to: object };
  if (not) link.not = true;
  if (quantity != null) {
    link.quantity = quantity;
    // What is so now is so from now: state is stamped, so what was so before
    // stays on the record instead of being written over.
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
  if (!term) return [];
  return [{ id: subject, name: term.name, links: [link] }];
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
    // Every language must call it a mark: one language's punctuation may be
    // another's letter.
    const marked = (ch) => marks.length > 0 && marks.every((is) => is(ch));
    while (from < to && marked(t[from])) from += 1;
    while (to > from && marked(t[to - 1])) to -= 1;
    return t.slice(from, to);
  };
  // A symbol a language says stands alone is a word wherever it falls, so
  // `1+1` comes apart into three and `cat` does not come apart at all.
  const lone = (langs || []).map((l) => (ch) => l.isLoneSymbol(ch));
  const apart = (t) => {
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

export { node };
