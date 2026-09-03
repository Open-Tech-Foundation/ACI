# ACI — Brain Implementation Spec

A deterministic "human brain in computer form". The brain perceives a signal,
reasons about it, and produces a reply — with **no hardcoded language knowledge
in the core**. All language knowledge arrives as external data files.

## Core principle: the brain stays primitive

**The brain hardcodes nothing. It only infers.**

This is the rule the whole design answers to, and it is not negotiable. The
engine may hold *primitives* — the categories anything can fall into, and the
acts the brain can perform. It may hold **no particulars**: not a word, not a
meaning, not a rule of grammar, not a reply, not a fact about the world. Every
particular arrives as data, and the brain reaches its output by walking that
data, never by looking an answer up in itself.

Two questions settle whether something belongs in the engine:

1. **Would it change if the signal came in another language?** Then it is
   language data, not brain. Words, grammar, and *replies* all fail this test.
2. **Would it change if the world were different?** Then it is world data, not
   brain. What a cat is, what is alive, what follows from what — all fail it.

What survives both is primitive, and only that may be written in code.

| the brain owns | the data owns |
|---|---|
| the four ways to exist: thing / property / relation / action | which term is which |
| the refinements of a thing: living / nonliving / person | that a cat is an animal |
| how to walk a relation, and how to parse a rule | the relations, and the rules |
| the acts it can express: greet, count, confirm, recognise, understood, affirm, deny, unknown | the words each act is voiced in |

A concrete case, because this is the one that keeps being got wrong: the brain
**never holds a reply**. It decides only *what it means to express* — an intent
such as `affirm`. The language it recognized supplies the words for that intent,
from `expressions` in its own data file. A language that offers nothing for an
intent leaves it unsaid, and the brain is silent rather than falling back on
words of its own. `"Yes."` lives in `languages/en.json`; there is no string like
it anywhere in `src/`.

The split is strict and enforced:

- **`src/brain.js`** — the pure engine. It owns only *innate concepts*: the four
  ways anything can exist (thing / property / relation / action), the refinements
  of a thing (living / nonliving / person), and the acts it can express. It
  contains **zero** hardcoded vocabulary, words, grammar rules, or replies.
- **`languages/*.json`** — external data. Supplies words (POS, meaning, and the
  world term the word names) and a context-free grammar. The brain *applies*
  whatever it is given; it never knows a language's name or rules itself.
- **`data/world.json`** — external knowledge: what exists and how it relates.
  It holds **no language** — a term is an id and its links. The brain owns the
  categories (`living`, `person`); the world says which term realizes each, via
  `anchors`.

Anything the brain cannot infer structurally must come from data; anything data
provides must only *instantiate* the brain's primitives — never hand the brain a
conclusion. A word's data says what it *is* (`pos`, `meaning`, `concept`); it
never says what the brain should decide about it. The brain derives `living` by
walking the world, and `deny` by checking a claim — neither is a field anyone can
set.

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
    "hi":    { "pos": "interjection", "meaning": "greeting",     "concept": 277 },
    "cat":   { "pos": "noun",         "meaning": "feline animal","concept": 83 },
    "is":    { "pos": "verb",         "meaning": "to be",        "concept": 294 },
    "two":   { "pos": "numeral",      "meaning": "2",            "concept": 115 }
  },
  "expressions": {                   // how this language voices each brain act
    "greet":      "Hello!",
    "count":      "It is {meaning}.",
    "confirm":    "Yes, it {meaning}.",
    "recognise":  "I recognise \"{meaning}\".",
    "understood": "I understand.",
    "affirm":     "Yes.",
    "deny":       "No.",
    "unknown":    "..."
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

### Expressions

`expressions` maps each of the brain's intents to the words this language voices
it in. `{meaning}` is filled from what the brain understood. The brain picks the
intent; the language picks the words. An intent with no entry here is simply not
said — the engine has no words to fall back on.

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

### 6. express — choose an intent, and let the language voice it

Runs on the judged, structured signal. The brain decides **what it means to
express**; it never decides the words.

`intentOf(n)` picks one of the brain's own acts from what the thing was
understood to be:

| the thing | intent |
|---|---|
| nothing was there | `nothing` |
| an interjection | `greet` |
| a numeral | `count` |
| a verb | `confirm` |
| anything else with a meaning | `recognise` |
| no meaning | `unknown` |

`expression(roots, langs)` then picks the one act toward the whole signal:

| the signal | intent |
|---|---|
| made a claim the world bears out | `affirm` |
| made a claim the world denies | `deny` |
| was bound into a whole | `understood` |
| was a single thing | that thing's intent |
| was never bound | `unknown` |

`speak(intent, meaning, language, langs)` then asks **that language** for the
words, and builds the node:

```js
node('express', intent, [], { says, meaning, language })
```

The node's **name is the act**; `state.says` is what that language made of it.
A language with no entry for the intent leaves `says` as `null`, and the brain
says nothing — it has no words of its own to fall back on. Void input recognizes
no language at all, so it is always unsaid.

## Loading — `src/index.js` and `src/languages.js`

- `src/brain.js` is **pure** — no `runtime:fs`.
- `src/languages.js` — `fromData(data)` compiles a data file into a lookup object
  (`express`, `isLetterSymbol`, `isVowelSymbol`, `lookupWord`, `grammar`, `roles`).
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
