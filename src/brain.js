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
          ? { text: identity, pos: word.pos, meaning: word.meaning }
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
    };
    return withBranch(n, [...n.branch, node('thought', 'understood', [], { thought })]);
  });
}

// ---------------------------------------------------------------------------
// solve — reason about the understood meaning. The brain infers what kind of
// thing it is (entity) and how it feels (emotion) from the meaning itself,
// not from data fields. Social acts come from living entities; numerals are
// nonliving.
// ---------------------------------------------------------------------------
function solve(roots) {
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
    if (pos === 'interjection') {
      result.branch.push(
        node('entity', 'living', [node('entity', 'person', [], { kind: 'person' })], { kind: 'person' }),
      );
      result.branch.push(node('emotion', 'kind', []));
    } else if (pos === 'numeral') {
      result.branch.push(node('entity', 'nonliving', [], { kind: 'numeral' }));
    }

    return result;
  });
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
  if (!grammar || Object.keys(grammar).length === 0) return roots;

  const memo = new Map();
  const starts = Object.keys(grammar);
  for (const start of starts) {
    const res = parseFrom(grammar, start, tagged, 0, memo);
    if (res && res.next === tagged.length) {
      const kids = (res.tree.children || [res.tree]).map(leafOrPhrase);
      return [
        node('sentence', 'sentence', kids, {
          text: tagged.map((t) => t.root.state.identity).join(' '),
        }),
      ];
    }
  }
  return roots;
}

// Generic leftmost parse. Returns { next, tree } or null.
function parseFrom(grammar, symbol, tagged, index, memo) {
  const key = symbol + ':' + index;
  if (memo.has(key)) return memo.get(key);
  let result = null;

  const rules = grammar[symbol] ? grammar[symbol].rules : null;
  if (!rules) {
    // terminal: matches one token's part-of-speech
    if (index < tagged.length && tagged[index].pos === symbol) {
      result = { next: index + 1, tree: { symbol, likelyRoot: tagged[index].root } };
    }
  } else {
    for (const rule of rules) {
      const seq = rule.split(/\s+/).filter(Boolean);
      const r = parseSequence(grammar, seq, tagged, index, memo);
      if (r) { result = { next: r.next, tree: { symbol, children: r.tree.children } }; break; }
    }
  }
  memo.set(key, result);
  return result;
}

function parseSequence(grammar, seq, tagged, index, memo) {
  let i = index;
  const children = [];
  for (const sym of seq) {
    const r = parseFrom(grammar, sym, tagged, i, memo);
    if (!r) return null;
    children.push(r.tree);
    i = r.next;
  }
  return { next: i, tree: { symbol: 'seq', children } };
}

// Convert a parse-node into a brain node (leaf = solved root; phrase = node).
function leafOrPhrase(c) {
  if (c.likelyRoot) return c.likelyRoot;
  if (Array.isArray(c.children)) {
    const kids = (c.children || []).map(leafOrPhrase).filter(Boolean);
    return c.symbol && c.symbol !== 'seq' ? node(c.symbol, c.symbol, kids) : kids[0] || null;
  }
  return null;
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
export function brainFrom(input, langs) {
  const roots = understand(input, langs);
  const thoughtRoots = think(roots, langs);
  const solvedRoots = solve(thoughtRoots);
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
