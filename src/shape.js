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
  for (const t of data.terms) {
    const at = `${where} term ${JSON.stringify(t && t.id)}`;
    if (!t || typeof t !== 'object') fail(where, 'every term must be an object');
    onlyKeys(t, ['id', 'name', 'links', 'value', 'individual'], at);
    if (!isId(t.id)) fail(at, 'id must be a non-negative integer');
    if (typeof t.name !== 'string' || t.name === '') fail(at, 'name must be a non-empty string');
    if (byId.has(t.id)) fail(at, 'duplicate id');
    if (t.individual !== undefined && t.individual !== true) {
      fail(at, 'individual, where present, must be true');
    }
    if (t.value !== undefined && !Number.isInteger(t.value)) {
      fail(at, 'value must be a whole number — it is what the term names, not a label');
    }
    if (!Array.isArray(t.links)) fail(at, 'links must be an array');
    byId.set(t.id, t);
  }

  for (const t of data.terms) {
    const at = `${where} term ${t.id}`;
    const seen = new Set();
    for (const l of t.links) {
      if (!l || typeof l !== 'object') fail(at, 'every link must be an object');
      onlyKeys(l, ['rel', 'to', 'quantity', 'at'], at);
      if (!isId(l.rel)) fail(at, 'link rel must be a non-negative integer');
      if (!isId(l.to)) fail(at, 'link to must be a non-negative integer');
      if (l.quantity !== undefined && !Number.isInteger(l.quantity)) {
        fail(at, 'link quantity must be a whole number');
      }
      if (l.at !== undefined && !(Number.isInteger(l.at) && l.at >= 0)) {
        fail(at, 'link at must be a whole number of ticks');
      }
      const key = `${l.rel}:${l.to}:${l.at ?? ''}`;
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
  const ids = new Set(data.terms.map((t) => t.id));
  const relationIds = new Set(Object.values(data.relations || {}));
  // Name the source a bad link came from, not the merged whole.
  const from = (id) => (origin && origin.get(id)) || where;

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
    ['name', 'symbols', 'words', 'derivations', 'speech', 'expressions', 'grammar'],
    where,
  );

  if (typeof data.name !== 'string' || data.name === '') {
    fail(where, 'name must be a non-empty string');
  }
  const at = `language "${data.name}"`;

  if (!data.symbols || typeof data.symbols !== 'object') fail(at, 'symbols must be an object');
  for (const [type, info] of Object.entries(data.symbols)) {
    if (!info || typeof info.characters !== 'string' || info.characters === '') {
      fail(`${at} symbols.${type}`, 'characters must be a non-empty string');
    }
    onlyKeys(info, ['characters'], `${at} symbols.${type}`);
  }
  if (!data.symbols.letter) fail(at, 'symbols.letter is required — without it nothing is read');

  if (!data.words || typeof data.words !== 'object') fail(at, 'words must be an object');
  for (const [word, info] of Object.entries(data.words)) {
    const w = `${at} word "${word}"`;
    if (!info || typeof info !== 'object') fail(w, 'must be an object');
    onlyKeys(info, ['pos', 'meaning', 'concept', 'marks'], w);
    if (typeof info.pos !== 'string' || info.pos === '') fail(w, 'pos must be a non-empty string');
    if (typeof info.meaning !== 'string') fail(w, 'meaning must be a string');
    if (info.concept !== undefined && !isId(info.concept)) fail(w, 'concept must be a term id');
    if (
      info.marks !== undefined &&
      info.marks !== 'new' &&
      info.marks !== 'known' &&
      info.marks !== 'unknown'
    ) {
      fail(w, 'marks must be "new", "known" or "unknown"');
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

function checkGrammar(grammar, at) {
  if (!grammar || typeof grammar !== 'object') fail(at, 'grammar must be an object');
  onlyKeys(grammar, ['start', 'rules'], `${at} grammar`);
  if (typeof grammar.start !== 'string' || grammar.start === '') {
    fail(`${at} grammar`, 'start must name a rule');
  }
  if (!grammar.rules || typeof grammar.rules !== 'object') {
    fail(`${at} grammar`, 'rules must be an object');
  }
  if (!grammar.rules[grammar.start]) {
    fail(`${at} grammar`, `start "${grammar.start}" has no rule`);
  }
  for (const [symbol, rule] of Object.entries(grammar.rules)) {
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
