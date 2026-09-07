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
  const counted = Object.values(symbols).find((set) => set && set.figures);
  const counting = counted ? charsOf(counted.characters) : [];
  // Where the part below one begins, and how many places this language writes.
  const point = counted && counted.point ? counted.point : null;
  const places = counted && counted.places ? counted.places : 0;
  const syntax = data.syntax || {};

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
  for (const [word, entry] of Object.entries(data.words || {})) {
    // A word may name more than one thing. Every reading of it is kept, and
    // which one a signal means is settled later, by the signal.
    const readings = Array.isArray(entry) ? entry : [entry];
    words.set(word.toLowerCase(), readings);
    for (const info of readings) {
      if (info.concept == null) continue;
      const into = info.names === false ? written : named;
      if (!into.has(info.concept)) into.set(info.concept, word);
    }
  }

  return {
    data,
    express: (intent, vars) => voice(data, intent, vars, named),
    isLetterSymbol: (ch) => letters.has(ch),    isVowelSymbol: (ch) => vowels.has(ch),
    isQuestionSymbol: (ch) => asking.has(ch),
    // A mark is whatever this language's own words are not made of. Nothing
    // needs to declare them: `?` ends no English word, and `+` would end one
    // the moment a language gave it to a word.
    // A figure is what numbers are written in, so it forms words the language
    // never had to list.
    isWordSymbol: (ch) => inWords.has(ch) || counting.includes(ch),
    // Any symbol this language says it is written in.
    isOwnSymbol: (ch) => own.some((set) => set.has(ch)),
    // A symbol that stands as a word of its own, wherever it falls.
    isLoneSymbol: (ch) => alone.some((set) => set.has(ch)),
    // Any number written out in the symbols this language counts in, in the
    // order it declared them. A term is not needed for it: a world that never
    // named ninety-nine can still be told the answer is 99.
    figuresFor: (value) => figures(counting, point, places, value),
    // And back: any run of them is a number, whether or not this language has
    // a word for it and whether or not the world ever named it.
    valueOfFigures: (text) => valued(counting, point, text),
    // What a number written that way stands as, when it is put in a sentence.
    figuresPos: counted ? counted.pos ?? null : null,
    // Where this language's grammar admits a previously unseen name. The
    // parser symbol is language data; the brain does not invent a noun class.
    unknownPos: data.unknown ? data.unknown.pos : null,
    // Another way this language writes a term, where it has one that is not
    // what the term is called.
    otherWordFor: (concept) => (concept == null ? null : written.get(concept) ?? null),
    // The word that compares on one scale, where the language has one that is
    // not what the comparing is called: bigger is more, on size. First word
    // wins, the way a name does.
    comparativeFor: (relation, on) => {
      if (relation == null || on == null) return null;
      for (const [word, entry] of Object.entries(data.words || {})) {
        const readings = Array.isArray(entry) ? entry : [entry];
        if (readings.some((info) => info && info.concept === relation && info.on === on)) {
          return word;
        }
      }
      return null;
    },
    // Whether the language ever says one of the term: a word may stand bare,
    // with no article — gravity is a force, not a gravity.
    isBare: (concept) => {
      if (concept == null) return false;
      for (const entry of Object.values(data.words || {})) {
        const readings = Array.isArray(entry) ? entry : [entry];
        if (readings.some((info) => info && info.concept === concept && info.bare === true)) {
          return true;
        }
      }
      return false;
    },
    // The article for one of a kind, said against what follows it — `a`
    // against `an`. Which symbols call for which is the language's own.
    oneFor: (word) => {
      const forms = (data.speech || {}).one;
      if (!forms || typeof forms !== 'object') return '';
      const next = String(word || '').trim().replace(/^\s+/, '')[0] ?? '';
      return agreeWith(forms, symbols, next);
    },
    lookupWord: (w) => lookUp(words, data.derivations, w),
    functionsFor: (word) => {
      const held = new Set(word && word.functions != null
        ? (Array.isArray(word.functions) ? word.functions : [word.functions])
        : []);
      const positions = word ? (Array.isArray(word.pos) ? word.pos : [word.pos]) : [];
      for (const position of positions) {
        const functions = syntax[position];
        for (const fn of functions == null ? [] : (Array.isArray(functions) ? functions : [functions])) {
          held.add(fn);
        }
      }
      return [...held];
    },
    wordFor: (concept) => (concept == null ? null : named.get(concept) ?? null),
    grammar: data.grammar || {},
    // Which side of a marking word the thing it marks falls on. English puts it
    // after — `the basket`, `from the basket` — and another language need not.
    marking: data.marking ?? null,
    // Which side of an action the doer falls on, and which side the target.
    // English puts the doer first; a verb-final language does not.
    parts: data.parts || null,
    joinNumbers: (left, right) => {
      if (
        !Number.isSafeInteger(left) ||
        !Number.isSafeInteger(right) ||
        left < 1 ||
        right < 1
      ) return null;
      const rules = data.numbers ? data.numbers.composition : null;
      if (!Array.isArray(rules)) return null;
      for (const rule of rules) {
        if (!numberOrderMatches(rule.order, left, right)) continue;
        if (rule.multipleOf) {
          const { side, value: divisor } = rule.multipleOf;
          if ((side !== 'left' && side !== 'right') || !Number.isSafeInteger(divisor) || divisor < 1) {
            continue;
          }
          const value = side === 'left' ? left : right;
          if (value % divisor !== 0) continue;
        }
        let value = null;
        if (rule.operation === 'add') value = left + right;
        else if (rule.operation === 'multiply') value = left * right;
        else continue;
        // Language rules may combine only exact whole values. A lossy result
        // is no result, just as a lossy figure or world value is refused.
        return Number.isSafeInteger(value) && value >= 0 ? value : null;
      }
      return null;
    },
    roles: symbolRoles(symbols),
  };
}

function numberOrderMatches(order, left, right) {
  if (order === 'any') return true;
  if (order === 'ascending') return left < right;
  if (order === 'descending') return left > right;
  if (order === 'equal') return left === right;
  return false;
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
    return agreeWith(forms, data.symbols || {}, rest ? rest[0] : '');
  });
}

// The form a word takes against what follows it, from the forms its language
// gives for that word and the symbol sets it names. Shared by voicing a frame
// and by saying one of a kind on its own.
function agreeWith(forms, symbols, next) {
  for (const [type, form] of Object.entries(forms.before || {})) {
    if (charSet(symbols[type]).has(next)) return form;
  }
  return forms.otherwise ?? '';
}

// A word not listed may still be one this language derives from a word that is:
// take the ending off, put back what it replaced, and look again. Rules are the
// language's, and there are few of them; the words they reach are many and none
// of them is written down. A listed word always wins over a derived one.
// Every reading of a word, or none. A word listed outright gives its own; one
// reached by a derivation gives the readings of the stem it was derived from.
function lookUp(words, derivations, w) {
  const surface = String(w).toLowerCase();
  const listed = words.get(surface);
  if (listed) return listed;

  for (const rule of derivations || []) {
    if (!surface.endsWith(rule.ending) || surface.length <= rule.ending.length) continue;
    const stem = surface.slice(0, -rule.ending.length) + rule.becomes;
    // Doubled consonants: taking `est` off `biggest` leaves `bigg`, and the
    // word is `big`. The undoubled stem is tried only on a miss — both
    // lookups are exact, and a listed word still wins over either.
    const undid = stem.replace(/(.)\1$/, '$1');
    const probes = undid === stem ? [stem] : [stem, undid];
    for (const probe of probes) {
      const found = words.get(probe);
      if (!found) continue;
      const fits = found.filter((info) => rule.of === undefined || partsOf(info).includes(rule.of));
      if (fits.length === 0) continue;
    // An ending may change what part of speech the word is, deny what its
    // stem says, and say when the doing was. Which endings do that is the
    // language's to say.
    const reads = {
      ...(rule.pos === undefined ? {} : { pos: rule.pos }),
      ...(rule.when === undefined ? {} : { when: rule.when }),
      ...(rule.negates === undefined ? {} : { negates: rule.negates }),
      ...(rule.functions === undefined ? {} : { functions: rule.functions }),
    };
      return fits.map((info) => ({
        ...info,
        ...reads,
        derived: { from: probe, ending: rule.ending },
      }));
    }
  }
  return null;
}

function partsOf(info) {
  return Array.isArray(info.pos) ? info.pos : [info.pos];
}

// A symbol set holds both cases: the data lists one, the brain may meet either.
// A number in a language's own figures. The symbols count from zero in the
// order the language wrote them, so how many there are is the base. A part
// below one is written after the point the language declares, to as many places
// as it says it writes — the brain holds the value exactly either way.
function figures(counting, point, places, value) {
  if (counting.length < 2) {
    return null;
  }
  // Decimal strings preserve values beyond Number's safe range. Translate
  // them directly when this language uses ten figures.
  if (typeof value === 'string' && counting.length === 10 && /^\d+(?:\.\d+)?$/.test(value)) {
    const [whole, fraction = ''] = value.split('.');
    const before = Array.from(whole, (digit) => counting[Number(digit)]).join('');
    const after = fraction.slice(0, places).replace(/0+$/, '');
    if (!after) return before;
    if (!point) return null;
    return `${before}${point}${Array.from(after, (digit) => counting[Number(digit)]).join('')}`;
  }
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  const base = counting.length;
  let whole = Math.floor(value);
  let out = '';
  do {
    out = counting[whole % base] + out;
    whole = Math.floor(whole / base);
  } while (whole > 0);

  let over = value - Math.floor(value);
  if (over === 0) return out;
  if (!point || !(places > 0)) return null;
  let after = '';
  for (let i = 0; i < places && over > 0; i += 1) {
    over *= base;
    const digit = Math.floor(over);
    after += counting[digit];
    over -= digit;
  }
  // What is written stops where the language stops writing; the trailing
  // nothings say no more than the point does.
  after = after.replace(new RegExp(`${escaped(counting[0])}+$`), '');
  return after === '' ? out : `${out}${point}${after}`;
}

function escaped(ch) {
  return ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// A number read out of a language's own figures: every symbol counts for its
// place in the set the language declared, and how many there are is the base.
function valued(counting, point, text) {
  const whole = String(text);
  if (counting.length < 2 || whole.length === 0) return null;
  const at = point ? whole.indexOf(point) : -1;
  if (at >= 0 && whole.indexOf(point, at + 1) >= 0) return null;
  const digits = at < 0 ? whole : whole.slice(0, at) + whole.slice(at + 1);
  const chars = Array.from(digits);
  if (chars.length === 0) return null;
  const indices = chars.map((ch) => counting.indexOf(ch));
  if (indices.some((digit) => digit < 0)) return null;
  // Base ten is kept as written until arithmetic consumes it. Whole values in
  // the safe range retain the public numeric representation used by terms;
  // decimals and large integers remain exact strings.
  if (counting.length === 10) {
    const decimal = indices.map(String).join('');
    const written = at < 0
      ? decimal
      : `${decimal.slice(0, at) || '0'}.${decimal.slice(at)}`;
    if (at >= 0) return written.replace(/^0+(?=\d)/, '').replace(/\.?0+$/, '') || '0';
    const integer = BigInt(written || '0');
    return integer <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(integer) : integer.toString();
  }
  let value = 0;
  for (const ch of chars) {
    const digit = counting.indexOf(ch);
    if (digit < 0) return null;
    value = value * counting.length + digit;
  }
  return at < 0 ? value : value / counting.length ** (whole.length - at - 1);
}

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
