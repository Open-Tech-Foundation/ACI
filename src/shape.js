// The shape all knowledge must take.
//
// Every source — the base world, a knowledge file, a language — passes through
// here before the brain sees it, and there is one door: internal and external
// knowledge are checked by the same rules. A source that does not fit is
// refused, never trimmed to fit. Silently accepting half a source is how the
// brain ends up reasoning over knowledge it does not have.

class ShapeError extends Error {}

function fail(where, why) {
  throw new ShapeError(`${where}: ${why}`);
}

// What a word may mark: which one is meant, or which side of the conversation.
const MARKS = ['new', 'known', 'unknown', 'from', 'to'];

function isId(v) {
  return Number.isInteger(v) && v >= 0;
}

function onlyKeys(data, allowed, where) {
  for (const key of Object.keys(data)) {
    if (!allowed.includes(key)) fail(where, `unknown field "${key}"`);
  }
}

// ---------------------------------------------------------------------------
// World, and knowledge files, which take the same shape — a knowledge file is
// simply a world that expects to be merged into another.
// ---------------------------------------------------------------------------
export function checkWorld(data, where = 'world') {
  if (!data || typeof data !== 'object') fail(where, 'must be an object');
  onlyKeys(data, ['anchors', 'relations', 'terms'], where);

  if (!Array.isArray(data.terms)) fail(where, 'terms must be an array');

  const byId = new Map();
  const byName = new Map();
  for (const t of data.terms) {
    const at = `${where} term ${JSON.stringify(t && t.id)}`;
    if (!t || typeof t !== 'object') fail(where, 'every term must be an object');
    onlyKeys(t, ['id', 'name', 'links', 'value', 'individual', 'disjoint', 'symbol'], at);
    if (!isId(t.id)) fail(at, 'id must be a non-negative integer');
    if (typeof t.name !== 'string' || t.name === '') fail(at, 'name must be a non-empty string');
    if (byId.has(t.id)) fail(at, 'duplicate id');
    // The symbols a thing is said as, where no language translates it: a name
    // is the same in every language, so it is held with the thing, not with the
    // words. `name` remains a label the engine never reads.
    if (t.symbol !== undefined && (typeof t.symbol !== 'string' || t.symbol === '')) {
      fail(at, 'symbol, where present, must be a non-empty string');
    }
    // Two terms with one name are one thing written twice, and the brain would
    // reason over each of them as though the other were not there.
    if (byName.has(t.name)) {
      fail(at, `"${t.name}" is already term ${byName.get(t.name)} — one thing, one term`);
    }
    if (t.disjoint !== undefined && t.disjoint !== true) {
      fail(at, 'disjoint, where present, must be true');
    }
    if (t.individual !== undefined && t.individual !== true) {
      fail(at, 'individual, where present, must be true');
    }
    if (t.value !== undefined && !Number.isInteger(t.value)) {
      fail(at, 'value must be a whole number — it is what the term names, not a label');
    }
    if (!Array.isArray(t.links)) fail(at, 'links must be an array');
    byId.set(t.id, t);
    byName.set(t.name, t.id);
  }

  for (const t of data.terms) {
    const at = `${where} term ${t.id}`;
    const seen = new Set();
    for (const l of t.links) {
      if (!l || typeof l !== 'object') fail(at, 'every link must be an object');
      onlyKeys(l, ['rel', 'to', 'quantity', 'at', 'not'], at);
      if (!isId(l.rel)) fail(at, 'link rel must be a non-negative integer');
      if (!isId(l.to)) fail(at, 'link to must be a non-negative integer');
      if (l.quantity !== undefined && !Number.isInteger(l.quantity)) {
        fail(at, 'link quantity must be a whole number');
      }
      if (l.at !== undefined && !(Number.isInteger(l.at) && l.at >= 0)) {
        fail(at, 'link at must be a whole number of ticks');
      }
      if (l.not !== undefined && l.not !== true) {
        fail(at, 'link not, where present, must be true — it denies the link');
      }
      const key = `${l.rel}:${l.to}:${l.at ?? ''}:${l.not ? 'not' : ''}`;
      if (seen.has(key)) fail(at, `duplicate link ${key}`);
      seen.add(key);
    }
  }

  if (data.relations !== undefined) {
    if (!data.relations || typeof data.relations !== 'object') {
      fail(where, 'relations must be an object');
    }
    for (const [name, id] of Object.entries(data.relations)) {
      if (!isId(id)) fail(`${where} relation "${name}"`, 'must be a term id');
    }
  }

  if (data.anchors !== undefined) {
    if (!data.anchors || typeof data.anchors !== 'object') {
      fail(where, 'anchors must be an object');
    }
    for (const [name, id] of Object.entries(data.anchors)) {
      if (!isId(id)) fail(`${where} anchor "${name}"`, 'must be a term id');
    }
  }

  return data;
}

// Every id a source points at must exist once the sources are merged. Checked
// after merging, because a knowledge file may name terms from the base world.
export function checkWhole(data, origin = null, where = 'world') {
  // Name the source a bad term came from, not the merged whole.
  const from = (id) => (origin && origin.get(id)) || where;
  const ids = new Set(data.terms.map((t) => t.id));
  const relationIds = new Set(Object.values(data.relations || {}));

  // Two sources may each be sound and still name one thing twice between them.
  const named = new Map();
  for (const t of data.terms) {
    if (named.has(t.name)) {
      fail(
        `${from(t.id)} term ${t.id}`,
        `"${t.name}" is already term ${named.get(t.name)} — one thing, one term`,
      );
    }
    named.set(t.name, t.id);
  }
  for (const t of data.terms) {
    for (const l of t.links) {
      if (!ids.has(l.to)) fail(`${from(t.id)} term ${t.id}`, `link to unknown term ${l.to}`);
      if (!ids.has(l.rel)) fail(`${from(t.id)} term ${t.id}`, `link by unknown term ${l.rel}`);
    }
  }
  for (const [name, id] of Object.entries(data.relations || {})) {
    if (!ids.has(id)) fail(`${where} relation "${name}"`, `unknown term ${id}`);
  }
  for (const [name, id] of Object.entries(data.anchors || {})) {
    if (!ids.has(id)) fail(`${where} anchor "${name}"`, `unknown term ${id}`);
  }
  if (data.terms.length > 0 && relationIds.size === 0) {
    fail(where, 'terms but no relations declared — nothing could be walked');
  }
  return data;
}

// ---------------------------------------------------------------------------
// Language
// ---------------------------------------------------------------------------
export function checkLanguage(data, where = 'language') {
  if (!data || typeof data !== 'object') fail(where, 'must be an object');
  onlyKeys(
    data,
    ['name', 'symbols', 'words', 'derivations', 'marking', 'parts', 'speech', 'expressions', 'grammar'],
    where,
  );

  if (typeof data.name !== 'string' || data.name === '') {
    fail(where, 'name must be a non-empty string');
  }
  const at = `language "${data.name}"`;

  if (data.symbols !== undefined) {
    if (!data.symbols || typeof data.symbols !== 'object') fail(at, 'symbols must be an object');
    for (const [type, info] of Object.entries(data.symbols)) {
      if (!info || typeof info.characters !== 'string' || info.characters === '') {
        fail(`${at} symbols.${type}`, 'characters must be a non-empty string');
      }
      onlyKeys(info, ['characters', 'alone', 'figures', 'pos'], `${at} symbols.${type}`);
      if (info.pos !== undefined && (typeof info.pos !== 'string' || info.pos === '')) {
        fail(`${at} symbols.${type}`, 'pos, where present, must be a part of speech');
      }
      // The set a number is written in, in the order its symbols count from.
      if (info.figures !== undefined && info.figures !== true) {
        fail(`${at} symbols.${type}`, 'figures, where present, must be true');
      }
      // Symbols that stand as words of their own, so `1+1` comes apart where
      // `cat` does not.
      if (info.alone !== undefined && info.alone !== true) {
        fail(`${at} symbols.${type}`, 'alone, where present, must be true');
      }
    }
  }

  if (data.words !== undefined && (!data.words || typeof data.words !== 'object')) {
    fail(at, 'words must be an object');
  }
  for (const [word, info] of Object.entries(data.words || {})) {
    const w = `${at} word "${word}"`;
    if (!info || typeof info !== 'object') fail(w, 'must be an object');
    onlyKeys(info, ['pos', 'meaning', 'concept', 'marks', 'negates', 'role', 'when', 'names', 'groups'], w);
    if (typeof info.pos !== 'string' || info.pos === '') fail(w, 'pos must be a non-empty string');
    if (typeof info.meaning !== 'string') fail(w, 'meaning must be a string');
    if (info.concept !== undefined && !isId(info.concept)) fail(w, 'concept must be a term id');
    if (info.role !== undefined && (typeof info.role !== 'string' || info.role === '')) {
      fail(w, 'role, where present, must name the part a thing plays');
    }
    // Which side of now what is said falls on. The value names a moment the
    // world anchors; the brain names none of them.
    if (info.when !== undefined && (typeof info.when !== 'string' || info.when === '')) {
      fail(w, 'when, where present, must name a moment');
    }
    // Another way to write a term is not what the term is called.
    if (info.names !== undefined && info.names !== false) {
      fail(w, 'names, where present, must be false');
    }
    // A word may open or close a group, so what is inside it is worked first.
    if (info.groups !== undefined && info.groups !== 'open' && info.groups !== 'close') {
      fail(w, 'groups must be "open" or "close"');
    }
    if (info.negates !== undefined && info.negates !== true) {
      fail(w, 'negates, where present, must be true');
    }
    if (info.marks !== undefined && !MARKS.includes(info.marks)) {
      fail(w, `marks must be one of ${MARKS.map((m) => `"${m}"`).join(', ')}`);
    }
    // A pointer names no term: what it points at is the circumstance of the
    // signal it arrived in, and no world can hold that.
    if ((info.marks === 'from' || info.marks === 'to') && info.concept !== undefined) {
      fail(w, 'a word that points names no term of its own');
    }
  }

  if (data.marking !== undefined && data.marking !== 'before' && data.marking !== 'after') {
    fail(at, 'marking must be "before" or "after" — which side of a marker the thing it marks falls');
  }

  // Which side of an action the doer falls on is word order, and word order is
  // the language's. The values name parts the world anchors; the brain names
  // neither of them.
  if (data.parts !== undefined) {
    if (!data.parts || typeof data.parts !== 'object') fail(at, 'parts must be an object');
    onlyKeys(data.parts, ['before', 'after'], `${at} parts`);
    for (const [side, role] of Object.entries(data.parts)) {
      if (typeof role !== 'string' || role === '') {
        fail(`${at} parts "${side}"`, 'must name the part a thing on that side plays');
      }
    }
  }

  if (data.derivations !== undefined) {
    if (!Array.isArray(data.derivations)) fail(at, 'derivations must be an array');
    for (const rule of data.derivations) {
      const r = `${at} derivation`;
      if (!rule || typeof rule !== 'object') fail(r, 'must be an object');
      onlyKeys(rule, ['ending', 'becomes', 'of'], r);
      if (typeof rule.ending !== 'string' || rule.ending === '') {
        fail(r, 'ending must be a non-empty string');
      }
      if (typeof rule.becomes !== 'string') fail(r, 'becomes must be a string');
      if (rule.of !== undefined && (typeof rule.of !== 'string' || rule.of === '')) {
        fail(r, 'of, where present, must name a part of speech');
      }
    }
  }

  if (data.speech !== undefined) {
    if (!data.speech || typeof data.speech !== 'object') fail(at, 'speech must be an object');
    for (const [role, form] of Object.entries(data.speech)) {
      // A word that agrees with what follows it gives its forms instead: which
      // symbol set calls for which, and what it says otherwise.
      if (form && typeof form === 'object') {
        onlyKeys(form, ['before', 'otherwise'], `${at} speech "${role}"`);
        if (typeof form.otherwise !== 'string') {
          fail(`${at} speech "${role}"`, 'otherwise must be a string');
        }
        for (const [type, said] of Object.entries(form.before || {})) {
          if (typeof said !== 'string') {
            fail(`${at} speech "${role}" before ${type}`, 'must be a string');
          }
        }
        continue;
      }
      if (typeof form !== 'string') fail(`${at} speech "${role}"`, 'must be a string');
    }
  }

  if (data.expressions !== undefined) {
    if (!data.expressions || typeof data.expressions !== 'object') {
      fail(at, 'expressions must be an object');
    }
    for (const [intent, form] of Object.entries(data.expressions)) {
      if (typeof form !== 'string') fail(`${at} expression "${intent}"`, 'must be a string');
    }
  }

  if (data.grammar !== undefined) checkGrammar(data.grammar, at);
  return data;
}

// What a language must have once every file that speaks it has been merged.
// A single file need not carry all of it: one may add words to a language whose
// alphabet and grammar another file declared, the way a knowledge file adds
// links to a world it did not write.
export function checkWholeLanguage(data, where = 'language') {
  const at = `${where} "${data.name}"`;
  if (!data.symbols || !data.symbols.letter) {
    fail(at, 'symbols.letter is required — without it nothing is read');
  }
  if (!data.words || Object.keys(data.words).length === 0) {
    fail(at, 'words are required — a language with none recognizes nothing');
  }
  const grammar = data.grammar;
  if (grammar !== undefined) {
    if (typeof grammar.start !== 'string' || grammar.start === '') {
      fail(`${at} grammar`, 'start must name a rule');
    }
    if (!grammar.rules || !grammar.rules[grammar.start]) {
      fail(`${at} grammar`, `start "${grammar.start}" has no rule`);
    }
  }
  return data;
}

function checkGrammar(grammar, at) {
  if (!grammar || typeof grammar !== 'object') fail(at, 'grammar must be an object');
  onlyKeys(grammar, ['start', 'rules'], `${at} grammar`);
  if (grammar.start !== undefined && (typeof grammar.start !== 'string' || grammar.start === '')) {
    fail(`${at} grammar`, 'start must name a rule');
  }
  if (grammar.rules !== undefined && (!grammar.rules || typeof grammar.rules !== 'object')) {
    fail(`${at} grammar`, 'rules must be an object');
  }
  for (const [symbol, rule] of Object.entries(grammar.rules || {})) {
    const r = `${at} grammar rule "${symbol}"`;
    if (!rule || typeof rule !== 'object') fail(r, 'must be an object');
    onlyKeys(rule, ['rules'], r);
    if (!Array.isArray(rule.rules) || rule.rules.length === 0) {
      fail(r, 'rules must be a non-empty array');
    }
    for (const alt of rule.rules) {
      if (typeof alt !== 'string' || alt.trim() === '') fail(r, 'every rule must be a non-empty string');
    }
  }
}

export { ShapeError };
