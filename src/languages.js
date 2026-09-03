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

  const words = new Map();
  // The word a term is named by, so the brain can say a term it only holds as an
  // id — its own name among them. First word wins, in file order.
  const named = new Map();
  for (const [word, info] of Object.entries(data.words || {})) {
    words.set(word.toLowerCase(), info);
    if (info.concept != null && !named.has(info.concept)) named.set(info.concept, word);
  }

  return {
    data,
    express: (intent, vars) => voice(data.expressions, intent, vars),
    isLetterSymbol: (ch) => letters.has(ch),
    isVowelSymbol: (ch) => vowels.has(ch),
    isQuestionSymbol: (ch) => asking.has(ch),
    lookupWord: (w) => words.get(String(w).toLowerCase()) || null,
    wordFor: (concept) => (concept == null ? null : named.get(concept) ?? null),
    grammar: data.grammar || {},
    roles: symbolRoles(symbols),
  };
}

// How this language voices one of the brain's intents. The brain never holds a
// reply of its own; a language that says nothing for an intent leaves it unsaid.
function voice(expressions, intent, vars) {
  const form = expressions ? expressions[intent] : null;
  if (typeof form !== 'string') return null;
  return form.replace(/\{(\w+)\}/g, (_, key) => {
    const v = vars ? vars[key] : null;
    return v == null ? '' : String(v);
  });
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
