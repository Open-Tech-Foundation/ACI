// Language loader.
// The brain has NO inbuilt knowledge of any language. All language data —
// alphabet, symbols, words, grammar — is loaded from external JSON files,
// one per language. The brain only ever sees the shape of the data, never
// the names of the languages themselves.

export function loadLanguage(file) {
  return buildLanguage(JSON.parse(file));
}

function buildLanguage(data) {
  const letterLower = (data.symbols && data.symbols.letter && charsOf(data.symbols.letter.characters)) || [];
  const letterSet = new Set(letterLower.map((c) => c).concat(letterLower.map((c) => c.toUpperCase())));

  const words = new Map();
  for (const [word, info] of Object.entries(data.words || {})) {
    words.set(word.toLowerCase(), info);
  }

  return {
    data,
    isLetterSymbol: (ch) => letterSet.has(ch),
    lookupWord: (w) => words.get(String(w).toLowerCase()) || null,
    grammar: data.grammar || {},
    roles: allRoles(data),
  };
}

function charsOf(s) {
  return Array.from(String(s).replace(/\s+/g, ''));
}

function allRoles(data) {
  const roles = new Map();
  for (const [symbolType, symbolInfo] of Object.entries(data.symbols || {})) {
    roles.set(symbolType, new Set(charsOf(symbolInfo.characters)));
  }
  for (const [pos, wordInfo] of Object.entries(data.words || {})) {
    void wordInfo;
    roles.set(pos, new Set());
  }
  return roles;
}

export async function loadLanguagesFromFiles(files) {
  const langs = [];
  for (const [path, text] of Object.entries(files)) {
    void path;
    langs.push(loadLanguage(text));
  }
  return langs;
}

export async function loadLanguageDirectory(dir) {
  const { readDir, file } = await import('runtime:fs');
  const entries = await readDir(dir);
  const langs = [];
  for (const entry of entries) {
    if (!entry.isFile || !entry.name.endsWith('.json')) continue;
    const data = await file(`${dir}/${entry.name}`).json();
    langs.push(fromData(data));
  }
  return langs;
}

export function fromData(data) {
  return buildLanguage(data);
}
