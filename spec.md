# ACI — Brain Implementation Spec

A deterministic "human brain in computer form". The brain perceives a signal,
reasons about it, and produces a reply — with **no hardcoded language knowledge
in the core**. All language knowledge arrives as external data files.

## Core principle: pure brain, data-driven

The split is strict and enforced:

- **`src/brain.js`** — the pure engine. It owns only *innate concepts*: the four
  ways anything can exist (thing / property / relation / action) and the
  refinements of a thing (living / nonliving / person). It contains **zero**
  hardcoded vocabulary, words, or grammar rules.
- **`languages/*.json`** — external data. Supplies words (POS, meaning, and the
  world term the word names) and a context-free grammar. The brain *applies*
  whatever it is given; it never knows a language's name or rules itself.
- **`data/world.json`** — external knowledge: what exists and how it relates.
  It holds **no language** — a term is an id and its links. The brain owns the
  categories (`living`, `person`); the world says which term realizes each, via
  `anchors`.

Anything the brain cannot infer structurally must come from data; anything data
provides must only *instantiate* the brain's innate concepts — never hand the
brain its answers (e.g. a word's entity type or reply string is **not** in the
data; the brain derives those).

## Data format — `languages/*.json`

```jsonc
{
  "name": "english",                 // label used only as a name
  "symbols": {
    "letter":      { "characters": "abcdefghijklmnopqrstuvwxyz" },
    "vowel":       { "characters": "aeiou" },
    "punctuation": { "characters": ". , ! ? ; : ' \" - ( ) [ ]" }
  },
  "words": {
    "hi":    { "pos": "interjection", "meaning": "greeting" },
    "cat":   { "pos": "noun",         "meaning": "feline animal" },
    "is":    { "pos": "verb",         "meaning": "to be" },
    "two":   { "pos": "numeral",      "meaning": "2" }
  },
  "grammar": {                       // context-free grammar (all in data)
    "start": "sentence",             // the only symbol a whole signal may parse as
    "rules": {
      "sentence":       { "rules": ["interjection", "interjection sentence", "subject predicate"] },
      "subject":        { "rules": ["noun", "article noun", "numeral noun"] },
      "predicate":      { "rules": ["verb verbComplement"] },
      "verbComplement": { "rules": ["noun", "numeral", "article noun"] }
    }
  }
}
```

Each word carries `pos` (part of speech), `meaning`, and optionally `concept` —
the id of the world term it names. There is **no** `type`, `emotion`, or
`reply` — the brain derives those.

## Data format — `data/world.json`

```jsonc
{
  "anchors": {                                  // brain categories -> term ids
    "thing": 2, "property": 3, "relation": 4, "action": 5,
    "living": 10, "person": 29
  },
  "relations": { "is": 294 },                   // the relation is itself a term
  "terms": [
    { "id": 10, "name": "organism", "links": [{ "rel": 294, "to": 6 }] },
    { "id": 83, "name": "cat",      "links": [{ "rel": 294, "to": 24 }] }
  ]
}
```

`name` is a debug label; **nothing in the engine reads it**. Ids are atoms,
compared only for equality — that is what keeps the world language-neutral.
Two language files may point at the same term (`cat` / `chat` -> `83`) and the
brain reasons identically over both.

### Grammar semantics

The grammar is a context-free grammar. Each entry is a non-terminal with a list
of `rules`; a rule is a whitespace-separated sequence of symbols.

- A symbol is a **non-terminal** if it is a key in `grammar.rules`.
- A symbol is a **terminal** if it is not a key — it must match a token's `pos`.
- Parsing starts at `grammar.start` only. The first parse that consumes **all**
  tokens wins; a fragment that parses as some other non-terminal is not a parse.
- The parser enumerates *every* way a symbol can match at a position, so an
  enclosing rule can reject a short match and take a longer one.
- A left-recursive rule yields no parse rather than overflowing the stack.

## The node

The single uniform unit of the whole system:

```js
{ [$]: Symbol.for('aci.node'), kind, name, branch: [child nodes], state }
```

Every stage reads nodes and adds branch nodes / state. `node(kind, name, branch, state)` creates one.

## Pipeline — six phases

`brainFrom(input, langs, world)` runs sequentially; each phase consumes the previous
output and is exposed separately in `result.phases`. **Express runs last**, on the
structured signal, so the brain replies to the whole and not only to each word.

```
understand → think → solve → structure → judge → express
  perceive    recall   infer    parse      check   reply
```

`result` shape:

```js
{
  input: string,
  roots: [node...],       // final output (structured signal, or per-word roots)
  expression: node,       // the one reply to the whole signal; its branch holds
                          // what was said about each thing
  phases: { understand, think, solve, structure, judge, express }
}
```

### 1. understand — perception + recognition

Climbs a fixed ladder:

- `existence(signal)` — `void` if the signal is empty or nothing but space; else
  **one root per white-space token**. A signal of marks alone (`"?"`) still
  exists — it simply holds no word.
- `thing` — names the thing by its identity; records `identity`, `charCount`.
- `quality` — sensory branches `visual` and `sound`. `sound` appears only when a
  loaded language recognizes a symbol; which symbols are vowels comes from that
  language's `symbols.vowel`, never from a built-in alphabet.
- `form` → `symbol` — visual shape placeholder chain.
- `recognizeLanguage(roots, langs)` — for each token, find every loaded language
  whose letter set contains all of the token's letters, and look the word up in
  its vocabulary. The letter set is the only gate; no alphabet is assumed. Records a `language` node with `matches`:
  ```js
  { lang, word: { text, pos, meaning, concept } | null, roles: [...] }
  ```

### 2. think — reason over the understood meaning

Adds a `thought` node: `{ language, wordKnown, pos, meaning, concept }` from the
language match. Single factual recollection; no entity reasoning here.

### 3. solve — infer entity and emotion (innate reasoning)

Builds the `response` node from the meaning, then reasons about what the word
names by walking the world's `is` chain to the brain's anchors:

- reaches `anchors.thing` → `entity(nonliving)`, or `entity(living)` when it also
  reaches `anchors.living`, refined by `entity(person)` at `anchors.person`
- reaches `anchors.action` → `action`
- reaches `anchors.property` → `property`
- reaches `anchors.relation` → `relation`

So `cat` (→ animal → organism) and `tree` (→ plant → organism) are living, `apple`
(→ fruit → food → substance) is not, and `hi` (greeting → communication → action)
is an **action** rather than any kind of thing.

A word that names no term gets no category. The brain does **not** guess from the
part of speech.

### 4. structure — grammar-driven phrase building (pure CFG parse)

`structurePhrase(roots, langs)`: when there are ≥2 recognized words, tag each
with its `pos`, then run a **generic CFG parser** against the grammar from data.

- `parsesFrom` / `parseSequence` — recursive descent returning **all** parses of
  a symbol at a position, memoized. Seeding the memo before recursing makes a
  left-recursive rule terminate with no parse instead of crashing.
- Terminals match token POS; non-terminals expand by their data rules.
- The only start symbol is `grammar.start`; the first parse consuming all tokens
  wins.
- On success, returns a **single root named after the start symbol**, whose
  branch is the phrase tree (`subject`, `predicate`, `verbComplement`, ...) and
  whose leaves are the already-solved per-word roots.

Example, input `"a cat is two"`:

```
sentence
├── subject      → thing:a (article) + thing:cat (noun)
└── predicate    → thing:is (verb) + verbComplement → thing:two (numeral)
```

Input `"hi hi"` recurses through `interjection sentence`:

```
sentence
├── thing:hi (interjection)
└── sentence → thing:hi (interjection)
```

Unparseable input — including a fragment like `"a cat"`, which is a `subject` but
no `sentence` — is returned unchanged as per-word roots. So is single-word input.

### 5. judge — check the claim against the world

A signal that names a **relation** between two terms makes a claim, and the brain
checks it. `judge(roots, world)` reads the claim off the order of the things it
perceived — never off a grammar symbol, since phrase names come from data and mean
nothing to the brain:

- find the first thing whose term reaches `anchors.relation`
- take the nearest term reaching `anchors.thing` on each side of it
- `world.isA(subject, object, relation)` decides

It adds a `truth` node (`true` / `false`) with `{ subject, relation, object }`.

This is what connects the *word* `is` to the world's own `is` relation: `en.json`
gives `is` the concept `294`, and term 294 is the relation the world's links are
made of. So `"a cat is a cat"` is **true**, `"the apple is a tree"` is **false** —
decided by walking the world, not by any rule in the engine.

### 6. express — derive the reply

Runs on the judged, structured signal. Every `thing` gets its own reply from
`deriveReply(n)`, reasoned from what it is — never read from data:

- interjection → `"Hello!"`
- numeral → `` `It is ${meaning}.` ``
- verb → `` `Yes, it ${meaning}.` ``
- otherwise → `` `I recognise "${meaning}".` '' or `'...'`

`expression(roots)` then derives the **one** reply to the whole signal, keeping the
per-thing replies in its branch:

- the signal made a claim → `"Yes."` / `"No."`
- the signal was bound into a whole → `"I understand."`
- a single thing → that thing's own reply
- nothing bound them → `'...'`, with every part still under it

## Loading — `src/index.js` and `src/languages.js`

- `src/brain.js` is **pure** — no `runtime:fs`.
- `src/languages.js` — `fromData(data)` compiles a data file into a lookup object
  (`isLetterSymbol`, `isVowelSymbol`, `lookupWord`, `grammar`, `roles`).
  `loadLanguageDirectory(dir)` reads `*.json` **in name order**, so the brain sees
  the same languages in the same order on every machine.
- `src/world.js` — `fromWorldData(data)` compiles the world into
  `{ anchors, term(id), isA(id, ancestorId, rel) }`. `isA` walks whichever relation
  it is asked about (the `is` relation by default) and terminates on cycles.
- `src/index.js` — server-only bootstrap: `brain(input)` loads the `languages/`
  dir and `data/world.json` via `runtime:fs` (probing relative candidates to work
  both raw and bundled) and calls `brainFrom(input, langs, world)`.

## Public API

```js
import { brainFrom, node } from './brain.js';
brainFrom(input, langs, world)  // pure; returns { input, roots, phases }
node(kind, name, branch, state)

import { fromWorldData } from './world.js';
fromWorldData(data)      // { anchors, term(id), isA(id, ancestorId, rel) }

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
