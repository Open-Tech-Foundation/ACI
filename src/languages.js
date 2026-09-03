// Language loader.
// The brain has NO inbuilt knowledge of any language. All language data —
// symbols, words, grammar — is loaded from external JSON files, one per
// language. The brain only ever sees the shape of the data, never the names
// of the languages themselves.

function buildLanguage(data) {
  const symbols = data.symbols || {};
  const letters = charSet(symbols.letter);
  const vowels = charSet(symbols.vowel);
  const asking = charSet(symbols.question);
  const own = Object.values(symbols).map(charSet);
  const alone = Object.values(symbols).filter((set) => set && set.alone).map(charSet);

  // Every character this language's words are made of.
  const inWords = new Set();
  for (const word of Object.keys(data.words || {})) {
    for (const ch of word) {
      inWords.add(ch.toLowerCase());
      inWords.add(ch.toUpperCase());
    }
  }

  const words = new Map();
  // The word a term is named by, so the brain can say a term it only holds as
  // an id — its own name among them. First word wins, except one that says it
  // is another way to write the term rather than what the term is called:
  // `6` and `six` name one number and only one of them is its name.
  const named = new Map();
  const written = new Map();
  for (const [word, info] of Object.entries(data.words || {})) {
    words.set(word.toLowerCase(), info);
    if (info.concept == null) continue;
    const into = info.names === false ? written : named;
    if (!into.has(info.concept)) into.set(info.concept, word);
  }

  return {
    data,
    express: (intent, vars) => voice(data, intent, vars, named),
    isLetterSymbol: (ch) => letters.has(ch),
    isVowelSymbol: (ch) => vowels.has(ch),
    isQuestionSymbol: (ch) => asking.has(ch),
    // A mark is whatever this language's own words are not made of. Nothing
    // needs to declare them: `?` ends no English word, and `+` would end one
    // the moment a language gave it to a word.
    isWordSymbol: (ch) => inWords.has(ch),
    // Any symbol this language says it is written in.
    isOwnSymbol: (ch) => own.some((set) => set.has(ch)),
    // A symbol that stands as a word of its own, wherever it falls.
    isLoneSymbol: (ch) => alone.some((set) => set.has(ch)),
    // Another way this language writes a term, where it has one that is not
    // what the term is called.
    otherWordFor: (concept) => (concept == null ? null : written.get(concept) ?? null),
    lookupWord: (w) => lookUp(words, data.derivations, w),
    wordFor: (concept) => (concept == null ? null : named.get(concept) ?? null),
    grammar: data.grammar || {},
    // Which side of a marking word the thing it marks falls on. English puts it
    // after — `the basket`, `from the basket` — and another language need not.
    marking: data.marking === 'before' ? 'before' : 'after',
    // Which side of an action the doer falls on, and which side the target.
    // English puts the doer first; a verb-final language does not.
    parts: data.parts || null,
    roles: symbolRoles(symbols),
  };
}

// How this language voices one of the brain's intents.
//
// The brain never holds a reply. It hands over the terms it means — a subject,
// a relation, an object — and this fills a sentence frame with the words this
// language has for them. A slot naming a role in `speech` takes that language's
// own function word; a slot holding a term id takes the word for that term. So
// "I don't know" is not written anywhere: it is the speaker word, the frame's
// own negation, and whatever this language calls term 285.
function voice(data, intent, vars, named) {
  const form = data.expressions ? data.expressions[intent] : null;
  if (typeof form !== 'string') return null;
  const speech = data.speech || {};
  const agreeing = (key) => key in speech && speech[key] && typeof speech[key] === 'object';

  // Everything that stands on its own first, so that what agrees with what
  // follows has something to look at.
  const filled = form.replace(/\{(\w+)\}/g, (whole, key) => {
    if (agreeing(key)) return whole;
    if (key in speech) return speech[key];
    const v = vars ? vars[key] : null;
    if (typeof v === 'number') return named.get(v) ?? '';
    return v == null ? '' : String(v);
  });

  // A word may take a different form for what comes after it — `a` against
  // `an`. That a language may do this is all the brain knows; which symbols
  // call for which form is the language's own, and it names them from its own
  // symbol sets.
  return filled.replace(/\{(\w+)\}/g, (whole, key, at) => {
    const forms = speech[key];
    if (!forms || typeof forms !== 'object') return '';
    const rest = filled.slice(at + whole.length).replace(/^\s+/, '');
    const next = rest ? rest[0] : '';
    for (const [type, form] of Object.entries(forms.before || {})) {
      if (charSet((data.symbols || {})[type]).has(next)) return form;
    }
    return forms.otherwise ?? '';
  });
}

// A word not listed may still be one this language derives from a word that is:
// take the ending off, put back what it replaced, and look again. Rules are the
// language's, and there are few of them; the words they reach are many and none
// of them is written down. A listed word always wins over a derived one.
function lookUp(words, derivations, w) {
  const surface = String(w).toLowerCase();
  const listed = words.get(surface);
  if (listed) return listed;

  for (const rule of derivations || []) {
    if (!surface.endsWith(rule.ending) || surface.length <= rule.ending.length) continue;
    const stem = surface.slice(0, -rule.ending.length) + rule.becomes;
    const found = words.get(stem);
    if (!found || (rule.of !== undefined && found.pos !== rule.of)) continue;
    return { ...found, derived: { from: stem, ending: rule.ending } };
  }
  return null;
}

// A symbol set holds both cases: the data lists one, the brain may meet either.
function charSet(symbolInfo) {
  const chars = symbolInfo ? charsOf(symbolInfo.characters) : [];
  return new Set(chars.flatMap((c) => [c.toLowerCase(), c.toUpperCase()]));
}

function charsOf(s) {
  return Array.from(String(s).replace(/\s+/g, ''));
}

// Which kind of symbol each character is, by the data's own symbol types.
function symbolRoles(symbols) {
  const roles = new Map();
  for (const [symbolType, symbolInfo] of Object.entries(symbols)) {
    roles.set(symbolType, new Set(charsOf(symbolInfo.characters)));
  }
  return roles;
}

export function fromData(data) {
  return buildLanguage(data);
}

// Files are read in name order so the brain sees the same languages in the
// same order on every machine.
export async function loadLanguageDirectory(dir) {
  const { readDir, file } = await import('runtime:fs');
  const entries = (await readDir(dir))
    .filter((e) => e.isFile && e.name.endsWith('.json'))
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

  const langs = [];
  for (const entry of entries) {
    langs.push(fromData(await file(`${dir}/${entry.name}`).json()));
  }
  return langs;
}
