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

// What a word may mark: which one is meant, which side of the conversation, or
// the thing the conversation was last about. `prior` stands for the last
// action — what was just done, repeated. `idea` stands for the last thing
// said and checked — an idea, asked about again but never asserted.
const MARKS = ['new', 'known', 'unknown', 'from', 'to', 'spoken', 'named', 'prior', 'idea'];
const PERSONS = ['first', 'second', 'third'];
const NUMBERS = ['singular', 'plural'];

function isId(v) {
  return Number.isSafeInteger(v) && v >= 0;
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
    onlyKeys(t, ['id', 'name', 'links', 'value', 'individual', 'disjoint', 'transitive', 'symbol'], at);
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
    if (t.transitive !== undefined && t.transitive !== true) {
      fail(at, 'transitive, where present, must be true');
    }
    if (t.value !== undefined && !Number.isSafeInteger(t.value)) {
      fail(at, 'value must be a safe whole number — it is what the term names, not a label');
    }
    if (!Array.isArray(t.links)) fail(at, 'links must be an array');
    byId.set(t.id, t);
    byName.set(t.name, t.id);
  }

  for (const t of data.terms) {
    const at = `${where} term ${t.id}`;
    const seen = new Set();
    const polarities = new Map();
    for (const l of t.links) {
      if (!l || typeof l !== 'object') fail(at, 'every link must be an object');
      onlyKeys(l, ['rel', 'to', 'quantity', 'at', 'not'], at);
      if (!isId(l.rel)) fail(at, 'link rel must be a non-negative integer');
      if (!isId(l.to)) fail(at, 'link to must be a non-negative integer');
      if (l.quantity !== undefined && !Number.isSafeInteger(l.quantity)) {
        fail(at, 'link quantity must be a safe whole number');
      }
      if (l.at !== undefined && !(Number.isSafeInteger(l.at) && l.at >= 0)) {
        fail(at, 'link at must be a safe whole number of ticks');
      }
      if (l.not !== undefined && l.not !== true) {
        fail(at, 'link not, where present, must be true — it denies the link');
      }
      const key = `${l.rel}:${l.to}:${l.at ?? ''}:${l.not ? 'not' : ''}`;
      if (seen.has(key)) fail(at, `duplicate link ${key}`);
      seen.add(key);
      const proposition = `${l.rel}:${l.to}:${l.at ?? ''}`;
      const polarity = l.not ? 'denied' : 'held';
      if (polarities.has(proposition) && polarities.get(proposition) !== polarity) {
        fail(at, `link ${proposition} is both held and denied`);
      }
      polarities.set(proposition, polarity);
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
    const propositions = new Map();
    for (const l of t.links) {
      if (!ids.has(l.to)) fail(`${from(t.id)} term ${t.id}`, `link to unknown term ${l.to}`);
      if (!ids.has(l.rel)) fail(`${from(t.id)} term ${t.id}`, `link by unknown term ${l.rel}`);
      const key = `${l.rel}:${l.to}:${l.at ?? ''}`;
      const held = propositions.get(key);
      if (held && Boolean(held.not) !== Boolean(l.not)) {
        fail(`${from(t.id)} term ${t.id}`, `link ${key} is both held and denied`);
      }
      if (
        held &&
        held.quantity !== undefined &&
        l.quantity !== undefined &&
        held.quantity !== l.quantity
      ) {
        fail(`${from(t.id)} term ${t.id}`, `link ${key} has conflicting quantities`);
      }
      propositions.set(key, l);
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

  // Classification is a partial order. A cycle would make each kind an
  // ancestor of itself through another kind and collapse distinct concepts.
  const is = data.relations && data.relations.is;
  if (is != null) {
    const edges = new Map(data.terms.map((t) => [
      t.id,
      t.links.filter((l) => !l.not && l.rel === is).map((l) => l.to),
    ]));
    const visiting = new Set();
    const visited = new Set();
    const visit = (id) => {
      if (visiting.has(id)) fail(`${from(id)} term ${id}`, 'classification cycle');
      if (visited.has(id)) return;
      visiting.add(id);
      for (const next of edges.get(id) || []) visit(next);
      visiting.delete(id);
      visited.add(id);
    };
    for (const id of edges.keys()) visit(id);
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
    ['name', 'symbols', 'words', 'derivations', 'marking', 'parts', 'numbers', 'speech', 'expressions', 'grammar'],
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
      onlyKeys(info, ['characters', 'alone', 'figures', 'pos', 'point', 'places'], `${at} symbols.${type}`);
      // Where the part below one begins, and how far this language writes it.
      if (info.point !== undefined && (typeof info.point !== 'string' || info.point.length !== 1)) {
        fail(`${at} symbols.${type}`, 'point, where present, must be one character');
      }
      if (info.places !== undefined && (!Number.isInteger(info.places) || info.places < 1)) {
        fail(`${at} symbols.${type}`, 'places, where present, must be a whole number of them');
      }
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
  for (const [word, entry] of Object.entries(data.words || {})) {
    const w = `${at} word "${word}"`;
    if (!entry || typeof entry !== 'object') fail(w, 'must be an object');
    // A word may name more than one thing — a saw is a tool, and it is also
    // what someone did with their eyes. An entry is one reading or a list of
    // them, and which one a signal means is the brain's to settle.
    const readings = Array.isArray(entry) ? entry : [entry];
    if (readings.length === 0) fail(w, 'must hold at least one reading');
    for (const info of readings) checkWord(info, w);
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

  if (data.numbers !== undefined) {
    if (!data.numbers || typeof data.numbers !== 'object') fail(at, 'numbers must be an object');
    onlyKeys(data.numbers, ['composition'], `${at} numbers`);
    if (data.numbers.composition !== 'multiplicative-additive') {
      fail(`${at} numbers`, 'composition must name a supported composition');
    }
  }

  if (data.derivations !== undefined) {
    if (!Array.isArray(data.derivations)) fail(at, 'derivations must be an array');
    for (const rule of data.derivations) {
      const r = `${at} derivation`;
      if (!rule || typeof rule !== 'object') fail(r, 'must be an object');
      onlyKeys(rule, ['ending', 'becomes', 'of', 'pos', 'when', 'negates'], r);
      if (typeof rule.ending !== 'string' || rule.ending === '') {
        fail(r, 'ending must be a non-empty string');
      }
      if (typeof rule.becomes !== 'string') fail(r, 'becomes must be a string');
      if (rule.of !== undefined && (typeof rule.of !== 'string' || rule.of === '')) {
        fail(r, 'of, where present, must name a part of speech');
      }
      if (rule.pos !== undefined && (typeof rule.pos !== 'string' || rule.pos === '')) {
        fail(r, 'pos, where present, must name the part of speech the ending makes');
      }
      if (rule.when !== undefined && (typeof rule.when !== 'string' || rule.when === '')) {
        fail(r, 'when, where present, must name when the ending puts the doing');
      }
      // A contraction may deny what its stem says: `don't` is `do` denied.
      if (rule.negates !== undefined && rule.negates !== true) {
        fail(r, 'negates, where present, must be true');
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
    onlyKeys(rule, ['rules', 'whole'], r);
    if (!Array.isArray(rule.rules) || rule.rules.length === 0) {
      fail(r, 'rules must be a non-empty array');
    }
    if (rule.whole !== undefined && rule.whole !== true) {
      fail(r, 'whole, where present, must be true');
    }
    for (const alt of rule.rules) {
      if (typeof alt !== 'string' || alt.trim() === '') fail(r, 'every rule must be a non-empty string');
    }
  }
}

export { ShapeError };

// One reading of a word: what it is, what it names, and what it says of
// what stands beside it.
function checkWord(info, w) {
  if (!info || typeof info !== 'object' || Array.isArray(info)) fail(w, 'must be an object');
  onlyKeys(
    info,
    ['pos', 'meaning', 'concept', 'marks', 'negates', 'role', 'when', 'names', 'groups', 'person', 'number', 'on', 'bare', 'choice', 'proximity', 'where'],
    w,
  );
  // A word may be more than one part of speech — English says a walk and
  // walks with the same word — so `pos` is one or a list of them, and which
  // one it is in a signal is what the parse settles.
  const parts = Array.isArray(info.pos) ? info.pos : [info.pos];
  if (parts.length === 0 || parts.some((p) => typeof p !== 'string' || p === '')) {
    fail(w, 'pos must be a non-empty string, or a list of them');
  }
  if (typeof info.meaning !== 'string') fail(w, 'meaning must be a string');
  if (info.concept !== undefined && !isId(info.concept)) fail(w, 'concept must be a term id');
  if (info.where !== undefined) {
    const positions = Array.isArray(info.where) ? info.where : [info.where];
    const allowed = ['initial', 'before-negation'];
    if (positions.length === 0 || positions.some((p) => !allowed.includes(p))) {
      fail(w, 'where must be initial, before-negation, or a list of them');
    }
  }
  // Which scale a word compares on: heavier is more, on weight. The word names
  // the comparing; the scale says what is being compared.
  if (info.on !== undefined && !isId(info.on)) fail(w, 'on must be a term id');
  if (info.role !== undefined && (typeof info.role !== 'string' || info.role === '')) {
    fail(w, 'role, where present, must name the part a thing plays');
  }
  // Which side of now what is said falls on. The value names a moment the
  // world anchors; the brain names none of them.
  if (info.when !== undefined && (typeof info.when !== 'string' || info.when === '')) {
    fail(w, 'when, where present, must name a moment');
  }
  // Who a word is said of, and how many. Closed sets, the same as `marks`:
  // there are exactly three persons and exactly two numbers to be.
  if (info.person !== undefined && !PERSONS.includes(info.person)) {
    fail(w, `person must be one of ${PERSONS.map((p) => `"${p}"`).join(', ')}`);
  }
  if (info.number !== undefined && !NUMBERS.includes(info.number)) {
    fail(w, `number must be one of ${NUMBERS.map((n) => `"${n}"`).join(', ')}`);
  }
  // How near what a pointer points at stands: `this` the nearest topic,
  // `that` the farthest. Near and far are the brain's to rank; which words
  // stand where is the language's.
  if (info.proximity !== undefined && info.proximity !== 'near' && info.proximity !== 'far') {
    fail(w, 'proximity, where present, must be "near" or "far"');
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
  // A word may join what it joins as a choice rather than a togetherness.
  if (info.choice !== undefined && info.choice !== true) {
    fail(w, 'choice, where present, must be true');
  }
  // A word may stand bare, with no article: what it names is not one of a
  // kind. That a language may do without is the brain's; which of its words do
  // is the language's.
  if (info.bare !== undefined && info.bare !== true) {
    fail(w, 'bare, where present, must be true');
  }
  if (info.marks !== undefined && !MARKS.includes(info.marks)) {
    fail(w, `marks must be one of ${MARKS.map((m) => `"${m}"`).join(', ')}`);
  }
  // A pointer names no term: what it points at is the circumstance of the
  // signal it arrived in, and no world can hold that. `prior` is one: the last
  // action lives in the record, not in any file.
  if ((info.marks === 'from' || info.marks === 'to' || info.marks === 'prior') && info.concept !== undefined) {
    fail(w, 'a word that points names no term of its own');
  }
}
