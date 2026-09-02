# ACI — Brain Implementation Spec

A deterministic "human brain in computer form". The brain perceives a signal,
reasons about it, and produces a reply — with **no hardcoded language knowledge
in the core**. All language knowledge arrives as external data files.

## Core principle: pure brain, data-driven

The split is strict and enforced:

- **`src/brain.js`** — the pure engine. It owns only *innate concepts*
  (entity living/nonliving/person, emotion, social acts from parts of speech).
  It contains **zero** hardcoded vocabulary, words, replies, or grammar rules.
- **`languages/*.json`** — external data. Supplies words (POS + meaning) and a
  context-free grammar. The brain *applies* whatever it is given; it never knows
  a language's name or rules itself.

Anything the brain cannot infer structurally must come from data; anything data
provides must only *instantiate* the brain's innate concepts — never hand the
brain its answers (e.g. a word's entity type or reply string is **not** in the
data; the brain derives those).

## Data format — `languages/*.json`

```jsonc
{
  "name": "english",                 // label used only as a name
  "alphabet": "abcdefghijklmnopqrstuvwxyz",
  "symbols": {
    "letter":      { "characters": "abcdefghijklmnopqrstuvwxyz" },
    "punctuation": { "characters": ". , ! ? ; : ' \" - ( ) [ ]" }
  },
  "words": {
    "hi":    { "pos": "interjection", "meaning": "greeting" },
    "cat":   { "pos": "noun",         "meaning": "feline animal" },
    "is":    { "pos": "verb",         "meaning": "to be" },
    "two":   { "pos": "numeral",      "meaning": "2" }
  },
  "grammar": {                       // context-free grammar (all in data)
    "sentence":       { "rules": ["interjection", "interjection sentence", "subject predicate"] },
    "subject":        { "rules": ["noun", "article noun", "numeral noun"] },
    "predicate":      { "rules": ["verb verbComplement"] },
    "verbComplement": { "rules": ["noun", "numeral", "article noun"] }
  }
}
```

Each word carries only `pos` (part of speech) and `meaning`. There is **no**
`type`, `emotion`, or `reply` — the brain derives those.

### Grammar semantics

The grammar is a context-free grammar. Each entry is a non-terminal with a list
of `rules`; a rule is a whitespace-separated sequence of symbols.

- A symbol is a **non-terminal** if it is a key in `grammar`.
- A symbol is a **terminal** if it is not a key — it must match a token's `pos`.
- The parser tries every non-terminal as a start; the first parse that consumes
  all tokens wins.

## The node

The single uniform unit of the whole system:

```js
{ [$]: Symbol.for('aci.node'), kind, name, branch: [child nodes], state }
```

Every stage reads nodes and adds branch nodes / state. `node(kind, name, branch, state)` creates one.

## Pipeline — five phases

`brainFrom(input, langs)` runs sequentially; each phase consumes the previous
output and is exposed separately in `result.phases`.

```
understand → think → solve → express → structure
   phrase      reason   infer   reply      parse
```

`result` shape:

```js
{
  input: string,
  roots: [node...],            // final output (structured sentence, or per-word roots)
  phases: { understand, think, solve, express, structure }  // each an array of roots
}
```

### 1. understand — perception + recognition

Climbs a fixed ladder:

- `existence(signal)` — `void` if blank; else **one root per white-space token**
  (`multi` flag when >1).
- `thing` — names the thing by its identity; records `identity`, `charCount`.
- `quality` — sensory branches `visual` and `sound` (phonetics derived purely from
  the symbol sequence, e.g. vowel/consonant — no language knowledge).
- `form` → `symbol` — visual shape placeholder chain.
- `recognizeLanguage(roots, langs)` — for each token, find every loaded language
  whose letter set contains all of the token's letters and whose vocabulary
  resolves the word. Records a `language` node with `matches`:
  ```js
  { lang, word: { text, pos, meaning } | null, roles: [...] }
  ```

### 2. think — reason over the understood meaning

Adds a `thought` node: `{ language, wordKnown, pos, meaning }` from the
language match. Single factual recollection; no entity reasoning here.

### 3. solve — infer entity and emotion (innate reasoning)

Builds the `response` node from the meaning, then reasons about what kind of
thing it is from the **part of speech** (never from data fields):

- `pos === 'interjection'` → `entity(living)` → `entity(person)` + `emotion(kind)`
  (an interjection is a social act from a living person).
- `pos === 'numeral'` → `entity(nonliving)`.

### 4. express — derive the reply

`deriveReply(n, sentence)` produces a **string**, reasoned from the understood
structure — never read from data:

- interjection → `"Hello!"`
- numeral → `` `It is ${meaning}.` ``
- verb → `` `Yes, it ${meaning}.` ``
- sentence response → `"I understand."`
- otherwise → `` `I recognise "${meaning}".` '' or `'...'`

### 5. structure — grammar-driven phrase building (pure CFG parse)

`structurePhrase(roots, langs)`: when there are ≥2 recognized words, tag each
with its `pos`, then run a **generic CFG parser** against the grammar from data.

- `parseFrom` / `parseSequence` — leftmost recursive-descent with memoization.
- Terminals match token POS; non-terminals expand by their data rules.
- Start symbols = every grammar key (tried in order); first full-token parse wins.
- On success, returns a **single `sentence` root** whose branch is the phrase
  tree (`subject`, `predicate`, `verbComplement`, ...), whose leaves are the
  already-solved per-word roots.

Example, input `"a cat is two"`:

```
sentence
├── subject      → thing:a (article) + thing:cat (noun)
└── predicate    → thing:is (verb) + verbComplement → thing:two (numeral)
```

Unparseable / single-word input is returned unchanged (per-word roots).

## Loading — `src/index.js` and `src/languages.js`

- `src/brain.js` is **pure** — no `runtime:fs`.
- `src/languages.js` — `buildLanguage(data)` compiles a data file into a lookup
  object (`isLetterSymbol`, `lookupWord`, `grammar`, `roles`).
- `src/index.js` — server-only bootstrap: `brain(input)` loads the `languages/`
  dir via `runtime:fs` (probing `../languages/`, `../../languages/`, `./languages/`
  to work both raw and bundled) and calls `brainFrom(input, langs)`.

## Public API

```js
import { brainFrom, node } from './brain.js';
brainFrom(input, langs)  // pure; returns { input, roots, phases }
node(kind, name, branch, state)

import { brain } from './index.js';   // server-only convenience
await brain("hi")                     // loads languages internally
```

## Demo

- `demo/server.js` — ES-Runtime HTTP server. `POST /brain` `{ "q": "... " }`
  returns the full brain result; serves the static site.
- `demo/src/main.js` — UI (`@opentf/micro-ui`): input box, phase tabs, and a
  tree renderer. The **Express** tab shows only the final reply string
  (`expressOutput`) instead of the JSON tree.

> Note: the UI currently exposes 4 tabs (Understand/Think/Solve/Express). The
> 5th phase, **Structure**, exists in `result.phases.structure` but has no
> dedicated tab yet.
