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
  let roots = existence(input);

  roots = thing(roots);
  roots = quality(roots, langs);
  roots = form(roots);
  roots = symbol(roots);

  roots = recognizeLanguage(roots, langs);

  return roots;
}

function existence(signal) {
  const raw = toString(signal);
  // Nothing, or nothing but space, is nothing at all.
  if (raw.trim() === '') return [node('void', 'void', [], { exists: false })];
  // A multi-word signal is perceived as one thing per word, so each token
  // climbs the whole ladder on its own. Single-word input stays a single root.
  let tokens = tokenize(raw);
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
      const allRecognized = letters.length > 0 && letters.every((ch) => lang.isLetterSymbol(ch));
      if (!allRecognized) continue;
      const word = lang.lookupWord(identity);
      matching.push({
        lang: lang.data.name,
        word: word
          ? {
              text: identity,
              pos: word.pos,
              meaning: word.meaning,
              concept: word.concept ?? null,
            }
          : null,
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
function think(roots, langs) {
  return roots.map((n) => {
    if (!n.state.exists) return withBranch(n);
    const langNode = findBranch(n, 'language');
    if (!langNode || !langNode.state.matches || langNode.state.matches.length === 0) {
      return withBranch(n);
    }
    const first = langNode.state.matches[0];
    const thought = {
      language: first.lang,
      wordKnown: Boolean(first.word),
      pos: first.word ? first.word.pos : null,
      meaning: first.word ? first.word.meaning : null,
      concept: first.word ? first.word.concept : null,
    };
    return withBranch(n, [...n.branch, node('thought', 'understood', [], { thought })]);
  });
}

// ---------------------------------------------------------------------------
// solve — reason about the understood meaning. The brain infers what the word
// names by walking the world's `is` chain to its own anchors: the brain owns
// the categories, the world owns the membership. A word that names no term
// gets no category — the brain does not guess from the part of speech.
// ---------------------------------------------------------------------------
function solve(roots, world) {
  return roots.map((n, at) => {
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

    const count = quantityOf(roots, at, world);
    if (count != null) {
      result.branch.push(node('quantity', 'quantity', [], { concept: count }));
    }

    return result;
  });
}

// A number standing beside a thing says how many of it there are. The brain
// reads this off the order of the things it perceived — a language may put the
// number on either side, and it does not need to know which.
function quantityOf(roots, at, world) {
  if (!world) return null;
  const a = world.anchors || {};
  const mine = conceptOf(roots[at]);
  // A number is not a count of itself.
  if (mine == null || world.isA(mine, a.number) || !world.isA(mine, a.thing)) return null;

  for (const beside of [roots[at - 1], roots[at + 1]]) {
    if (!beside || !beside.state.exists) continue;
    const c = conceptOf(beside);
    if (c != null && world.isA(c, a.number)) return c;
  }
  return null;
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
function judge(roots, world, mood) {
  if (!world || roots.length !== 1) return roots;
  const root = roots[0];
  if (root.kind === 'thing' || root.kind === 'void') return roots;

  const said = [];
  const collect = (n) => {
    if (n.kind === 'thing') said.push(n);
    (n.branch || []).forEach(collect);
  };
  collect(root);

  const a = world.anchors || {};
  const holes = said.filter((n) => conceptOf(n) == null && n.state.exists);

  // A quantity word, a thing, and something unresolved asks how many there are.
  // The brain counts by walking, and says so plainly when the world runs out.
  const quantity = said.find((n) => reaches(n, a.quantity, world));
  if (quantity && holes.length > 0) {
    const of = said.find(
      (n) => reaches(n, a.thing, world) && !reaches(n, a.quantity, world),
    );
    if (of) {
      const kind = conceptOf(of);
      const members = world.members(kind, world.baseRelation);
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

  const at = namedRelation(said, world);
  if (at < 0) return roots;

  const relation = conceptOf(said[at]);

  const worked = calculate(said, at, relation, world);
  if (worked) return [withBranch(root, [...root.branch, worked])];
  const terms = said.filter((n, i) => i !== at && reaches(n, a.thing, world));

  // Two terms and a relation is a claim, and the brain checks it.
  if (terms.length >= 2) {
    const subject = conceptOf(nearest(said, at, -1, a.thing, world));
    const object = conceptOf(nearest(said, at, 1, a.thing, world));
    if (subject == null || object == null) return roots;
    // A claim either holds, is contradicted, or is simply not known. Failing to
    // find a path is not proof of the opposite — only two terms that exclude
    // each other are, and only where the claim is about kind.
    const holds = world.isA(subject, object, relation);
    const kindClaim = relation === world.baseRelation;
    const truth = holds
      ? 'true'
      : kindClaim && world.excludes(subject, object)
        ? 'false'
        : 'unknown';
    const added = [node('truth', truth, [], { subject, relation, object })];

    // Told a claim it does not hold, the brain learns it — unless the claim is
    // contradicted, or taking it would close a loop. A relation already running
    // from the object to the subject cannot also run back.
    if (!holds && mood === 'tell') {
      const loops = subject !== object && world.isA(object, subject, relation);
      added.push(
        truth === 'false' || loops
          ? node('refuse', truth === 'false' ? 'contradiction' : 'loop', [], {
              subject,
              relation,
              object,
            })
          : node('learn', 'link', [], { subject, relation, object }),
      );
    }
    return [withBranch(root, [...root.branch, ...added])];
  }

  // One term, a relation, and something unresolved is a question, and the brain
  // answers it. The term it was given is the one being asked about, wherever in
  // the signal it fell — a question puts the hole where its language likes.
  if (terms.length === 1 && holes.length > 0) {
    const subject = conceptOf(terms[0]);
    const naming = world.isA(relation, a.name);
    const found = naming ? [] : world.linked(subject, relation);
    return [
      withBranch(root, [
        ...root.branch,
        node('answer', naming ? 'name' : 'link', [], {
          subject,
          relation,
          found,
          of: naming ? 'name' : 'link',
        }),
      ]),
    ];
  }

  return roots;
}

// Arithmetic is innate. The world says only which term names which number; what
// follows from two numbers is the brain's own, and would be the same in any
// language and any world. So this computes — it does not look anything up.
function calculate(said, at, relation, world) {
  const a = world.anchors || {};
  const op =
    relation === a.plus
      ? 'plus'
      : relation === a.minus
        ? 'minus'
        : relation === a.more
          ? 'more'
          : relation === a.less
            ? 'less'
            : null;
  if (!op) return null;

  const left = valueBeside(said, at, -1, world);
  const right = valueBeside(said, at, 1, world);
  if (left == null || right == null) return null;

  if (op === 'more' || op === 'less') {
    const holds = op === 'more' ? left > right : left < right;
    return node('truth', holds ? 'true' : 'false', [], { subject: left, relation, object: right });
  }

  const value = op === 'plus' ? left + right : left - right;
  const term = world.termFor(value);
  return node('sum', term == null ? 'beyond' : 'worked', [], { left, right, value, term });
}

function valueBeside(said, from, step, world) {
  for (let i = from + step; i >= 0 && i < said.length; i += step) {
    const v = world.valueOf(conceptOf(said[i]));
    if (v != null) return v;
  }
  return null;
}

// Which thing in the signal names the relation being spoken of. `is` is the
// weakest claim a signal can make, so any other relation named takes it.
function namedRelation(said, world) {
  const a = world.anchors || {};
  let fallback = -1;
  for (let i = 0; i < said.length; i += 1) {
    if (!reaches(said[i], a.relation, world)) continue;
    if (conceptOf(said[i]) !== world.baseRelation) return i;
    if (fallback < 0) fallback = i;
  }
  return fallback;
}

function conceptOf(n) {
  const thought = findBranch(n, 'thought');
  return thought && thought.state.thought ? thought.state.thought.concept : null;
}

function reaches(n, anchor, world) {
  const c = conceptOf(n);
  return c != null && world.isA(c, anchor);
}

// The nearest thing to one side that names a term of the wanted kind.
function nearest(said, from, step, anchor, world) {
  for (let i = from + step; i >= 0 && i < said.length; i += step) {
    if (reaches(said[i], anchor, world)) return said[i];
  }
  return null;
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

// The brain's one act toward the whole signal, with what it said about each
// thing kept underneath.
function expression(roots, langs, mood, world) {
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
  const truth = bound ? findBranch(roots[0], 'truth') : null;
  const answer = bound ? findBranch(roots[0], 'answer') : null;
  const learned = bound ? findBranch(roots[0], 'learn') : null;
  const counted = bound ? findBranch(roots[0], 'count') : null;
  const sum = bound ? findBranch(roots[0], 'sum') : null;
  const refused = bound ? findBranch(roots[0], 'refuse') : null;
  // A question the world cannot fill is a gap, not an answer. The node stays on
  // the tree either way — what the brain looked for and did not find is worth
  // as much as what it found.
  const found =
    answer && (answer.state.of === 'name' || answer.state.found.length > 0);

  // Asked, the brain answers the claim. Told, it answers only if it disagrees;
  // a claim it already holds is simply understood.
  // A refusal is a denial whatever the world could settle: the brain is turning
  // the teaching down, not reporting on it.
  const intent = truth
    ? refused
      ? 'deny'
      : learned
        ? 'understood'
        : truth.name === 'false'
          ? 'deny'
          : truth.name === 'unknown'
            ? 'unsure'
            : mood === 'ask'
              ? 'affirm'
              : 'understood'
    : sum
      ? sum.state.term != null
        ? 'answer'
        : 'unsure'
      : counted
        ? counted.state.total != null
          ? 'answer'
          : 'unsure'
      : answer
        ? found
          ? 'answer'
          : 'unknown'
      : bound
        ? 'understood'
        : parts.length === 1
          ? parts[0].name
          : 'unknown';

  const langName = parts.map((p) => p.state.language).find(Boolean) || null;
  const said =
    intent === 'answer'
      ? sum
        ? termWord(sum.state.term, langName, langs)
        : counted
          ? termWord(counted.state.total, langName, langs)
          : nameOf(answer, langName, langs)
      : wholeMeaning(intent, parts);
  // Where the brain is speaking of its own state, it hands over the term for
  // that state and lets the language find the words. It holds none of them.
  const terms =
    intent === 'understood' || intent === 'unsure'
      ? { relation: world && world.anchors ? world.anchors.know : null }
      : null;
  const whole = speak(intent, said, langName, langs, terms);
  return withBranch(whole, parts, { ...whole.state, bound, mood });
}

// A one-thing signal expresses that thing, so it needs that thing's meaning.
function wholeMeaning(intent, parts) {
  return parts.length === 1 && parts[0].name === intent ? parts[0].state.meaning : null;
}

// The answer is a term; saying it is the language's job. A name question asks
// what this language calls the term itself, so the brain's own name is the word
// that names its self term — not a fact it holds anywhere.
function nameOf(answer, langName, langs) {
  const { of, subject, found } = answer.state;
  return termWord(of === 'name' ? subject : found[0], langName, langs);
}

// A term, said in the language being spoken.
function termWord(term, langName, langs) {
  const lang = (langs || []).find((l) => l.data.name === langName);
  return lang && term != null ? lang.wordFor(term) : null;
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
  if (tagged.some((t) => !t.pos)) return roots;

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
      index < tagged.length && tagged[index].pos === symbol
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

function posOf(n) {
  const lang = findBranch(n, 'language');
  const word = lang && lang.state.matches && lang.state.matches[0] ? lang.state.matches[0].word : null;
  return word ? word.pos : null;
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
export function brainFrom(input, knowledge) {
  const langs = (knowledge && knowledge.languages) || [];
  const world = (knowledge && knowledge.world) || null;

  const roots = understand(input, langs);
  const thoughtRoots = think(roots, langs);
  const solvedRoots = solve(thoughtRoots, world);
  const mood = moodOf(input, langs);
  const structuredRoots = structurePhrase(solvedRoots, langs);
  const judgedRoots = judge(structuredRoots, world, mood);
  const expressedRoots = express(judgedRoots, langs, world);
  return {
    input,
    roots: expressedRoots,
    expression: expression(expressedRoots, langs, mood, world),
    learned: learnedFrom(judgedRoots, world),
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

// What the brain accepted, in the one shape all knowledge takes. The brain does
// not keep it — it hands it back, and the runtime decides whether to remember.
function learnedFrom(roots, world) {
  if (!world || roots.length !== 1) return null;
  const learn = findBranch(roots[0], 'learn');
  if (!learn) return null;
  const { subject, relation, object } = learn.state;
  const term = world.term(subject);
  if (!term) return null;
  return {
    terms: [{ id: subject, name: term.name, links: [{ rel: relation, to: object }] }],
  };
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

// Split a signal into words on whitespace, stripping surrounding punctuation
// from each token. The brain itself has no language knowledge here — it only
// finds the segmentation boundaries; meaning comes later from the language data.
function tokenize(signal) {
  return String(signal)
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => t.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter(Boolean);
}

function quote(s) {
  return /^[\p{L}\p{N}]+$/u.test(s) ? s : `"${s}"`;
}

export { node };
