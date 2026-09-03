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
  roots = quality(roots);
  roots = form(roots);
  roots = symbol(roots);

  roots = recognizeLanguage(roots, langs);

  return roots;
}

function existence(signal) {
  if (signal === undefined || signal === null || signal === '') {
    return [node('void', 'void', [], { exists: false })];
  }
  const raw = toString(signal);
  // A multi-word signal is perceived as one thing per word, so each token
  // climbs the whole ladder on its own. Single-word input stays a single root.
  let tokens = tokenize(raw);
  if (tokens.length === 0) tokens = [raw];
  const multi = tokens.length > 1;
  return tokens.map((t) =>
    node('existence', 'something', [], { exists: true, raw: t, multi }),
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

function quality(prev) {
  return prev.map((n) => {
    if (!n.state.exists) return withBranch(n);
    const raw = n.state.identity;
    const branches = [];
    const visualSense = senseVisual(raw);
    if (visualSense) branches.push(visualSense);
    const soundSense = senseSound(raw);
    if (soundSense) branches.push(soundSense);
    return withBranch(n, branches);
  });
}

function senseVisual(raw) {
  if (raw === '') return null;
  return node('quality', 'visual', []);
}

function senseSound(raw) {
  const isLetter = /[a-zA-Z]/.test(raw);
  if (!isLetter) return null;
  const phonetics = structurePhonetics(raw);
  return node('quality', 'sound', [], { phonetics });
}

// phonetics is inferred purely from the symbol sequence, not any language.
function structurePhonetics(raw) {
  return raw.split('').map((ch) => {
    const c = ch.toLowerCase();
    return { char: c, isVowel: 'aeiou'.includes(c) };
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
      if (b.name !== 'shape') return withBranch(b);
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
      const word = /^[a-zA-Z]+$/.test(identity) ? lang.lookupWord(identity) : null;
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
  return roots.map((n) => {
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

    return result;
  });
}

// The world says what a term is; the brain reads only its own categories out of
// it. thing / property / relation / action are the brain's innate schema — the
// four ways anything can exist. Only a thing is living or nonliving; an action
// is an action, never a nonliving thing.
function worldNode(concept, world) {
  if (concept == null || !world) return null;
  const a = world.anchors || {};

  if (world.isA(concept, a.thing)) {
    if (!world.isA(concept, a.living)) {
      return node('entity', 'nonliving', [], { concept });
    }
    const kids = world.isA(concept, a.person)
      ? [node('entity', 'person', [], { kind: 'person' })]
      : [];
    return node('entity', 'living', kids, { concept });
  }
  if (world.isA(concept, a.action)) return node('action', 'action', [], { concept });
  if (world.isA(concept, a.property)) return node('property', 'property', [], { concept });
  if (world.isA(concept, a.relation)) return node('relation', 'relation', [], { concept });
  return null;
}

// ---------------------------------------------------------------------------
// compose — when more than one thing was perceived (a multi-word signal),
// bind their individual solves into one sentence-level result.
// ---------------------------------------------------------------------------
function compose(solvedRoots) {
  if (!solvedRoots || solvedRoots.length < 2) return solvedRoots;
  const parts = solvedRoots.map((n) => {
    const r = findBranch(n, 'response');
    return r ? r.name : 'unrecognized';
  });
  const sentence = node('response', 'sentence', [], {
    parts,
    text: solvedRoots.map((n) => n.state.identity || '').join(' '),
  });
  return solvedRoots.map((n) => withBranch(n, [...n.branch, sentence]));
}

// ---------------------------------------------------------------------------
// express — the brain's final phase. Given what something IS (solved: its
// entity, emotion and meaning), express derives the actual reply. The reply is
// reasoned from the understood structure, never read from data.
// ---------------------------------------------------------------------------
function express(roots) {
  return roots.map((n) => {
    if (!n.state.exists) {
      return withBranch(n, [...n.branch, node('express', 'nothing', [])]);
    }
    const sentence = findBranch(n, 'response');
    const reply = deriveReply(n, sentence && sentence.name === 'sentence');
    return withBranch(n, [...n.branch, node('express', reply, [])]);
  });
}

// Deriving a reply from understanding: an interjection is a social act — the
// brain recognizes the living entity it reasoned about and greets back. Other
// parts of speech get a reply fitted to what they are.
function deriveReply(n, sentence) {
  const thought = findBranch(n, 'thought');
  const ts = thought ? thought.state.thought : null;
  const pos = ts ? ts.pos : null;
  const meaning = ts ? ts.meaning : null;

  if (sentence) {
    return 'I understand.';
  }
  if (pos === 'interjection') {
    return 'Hello!';
  }
  if (pos === 'numeral') {
    return `It is ${meaning}.`;
  }
  if (pos === 'verb') {
    return `Yes, it ${meaning}.`;
  }
  if (meaning) {
    return `I recognise "${meaning}".`;
  }
  return '...';
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
// Pipeline driver — the five phases, all inside the brain.
// The brain is pure: given the input and the already-loaded language data it
// perceives, reasons, solves and expresses. It carries no knowledge of any
// language; all language knowledge arrives as external data.
//
// Where that data comes from — disk (runtime:fs, server), HTTP, or a bundled
// JSON — is a separate concern kept outside this module so browser builds
// never resolve the server-only runtime:fs module. A server wrapper feeds the
// loaded languages in via brainFrom(input, langs). See bin/ask.js.
// ---------------------------------------------------------------------------
export function brainFrom(input, langs, world) {
  const roots = understand(input, langs);
  const thoughtRoots = think(roots, langs);
  const solvedRoots = solve(thoughtRoots, world);
  const composedRoots = compose(solvedRoots);
  const expressedRoots = express(composedRoots);
  const structuredRoots = structurePhrase(expressedRoots, langs);
  return {
    input,
    roots: structuredRoots,
    phases: {
      understand: roots,
      think: thoughtRoots,
      solve: solvedRoots,
      express: expressedRoots,
      structure: structuredRoots,
    },
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
    .map((t) => t.replace(/^[^\w]+|[^\w]+$/g, ''))
    .filter(Boolean);
}

function quote(s) {
  return /^[a-zA-Z0-9]+$/.test(s) ? s : `"${s}"`;
}

export { node };
