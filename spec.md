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
| that it answers a communication, counts a number, confirms a relation | which term is a communication, a number, a relation |

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
  categories; the world says which term realizes each, via `anchors`. Every
  judgement the brain makes — what is alive, what a signal claims, what to
  express — is a walk over this graph.

Anything the brain cannot infer structurally must come from data; anything data
provides must only *instantiate* the brain's primitives — never hand the brain a
conclusion. A word's data says what it *is* (`pos`, `meaning`, `concept`); it
never says what the brain should decide about it. The brain derives `living` by
walking the world, and `deny` by checking a claim — neither is a field anyone can
set.

## Knowledge — one shape, one door

Every source the brain reasons over passes the same check before it is seen, and
**a source that does not fit is refused, never trimmed to fit**. Internal and
external knowledge use the identical door: `data/world.json` and a file taught
from outside are validated by the same rules, in `src/shape.js`.

Refused, not tolerated:

- a link to a term that does not exist, or by a relation that does not exist
- a duplicate term id
- an anchor or relation pointing at no term
- an unknown field, anywhere
- terms with no relation declared to walk them
- a word with no `pos` or no `meaning`; a language with no `symbols.letter`
- a grammar naming a start symbol that has no rule

Silently accepting half a source is how a brain ends up reasoning over knowledge
it does not have. Errors name the file at fault, not the merged whole.

### Where knowledge comes from

By convention, loaded once at startup:

```
languages/*.json   one file per language
data/world.json    the base world
knowledge/*.json   anything taught on top of it, world-shaped
```

`knowledge/*.json` takes the same shape as the world. A file there may add new
terms, and may add links to terms the world already has; it may **not** redefine
a term, move an anchor, or reassign a relation — two sources disagreeing is a
contradiction, and the brain refuses rather than picking a winner.

Because a term may then hold several links of one relation, `isA` walks **all**
of them. The world is a graph, not a tree.

### The brain takes one argument for all of it

```js
brainFrom(input, knowledge)     // knowledge = { world, languages }
```

The signature does not grow to admit a new source. A new source is a new file in
one of those directories; `fromSources()` assembles and validates, and the
runtime — never the brain — does the reading.

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

### Speech and expressions

`expressions` gives a **sentence frame** per intent — not a sentence. The brain
hands over the *terms it means*; the frame is filled with the words this language
has for them:

- a slot naming a role in `speech` takes that language's own function word
- a slot holding a **term id** takes `wordFor(term)` — this language's word for it
- `{meaning}` is filled from what the brain understood

```jsonc
"speech":      { "self": "I" },
"expressions": { "unsure": "{self} don't {relation}." }
```

So `"I don't know."` is written **nowhere**. It is the speaker word, the frame's
own negation, and whatever this language calls term 285 (`know`). Rename that
word and the reply follows; write another language file and the same brain state
comes out `"yo no saber."` This is the rule against enumeration: frames are
grammar and there are few of them, words are lexicon and there are many, and no
whole sentence is ever stored.

The brain picks the intent and the terms; the language picks every word. An
intent with no entry is simply not said — the engine has no words to fall back
on, not even for not knowing.

## Data format — `data/world.json`

```jsonc
{
  "anchors": {                                  // brain categories -> term ids
    "thing": 2, "property": 3, "relation": 4, "action": 5,
    "living": 10, "person": 29,
    "communication": 256, "number": 100
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
  learned: { terms } | null,   // what it accepted, for the runtime to keep
  phases: { understand, think, solve, structure, judge, express }
}
```

## Memory

The brain does not remember. It hands back what it accepted, and `src/index.js`
— the runtime — decides whether to keep it, re-assembling knowledge through the
same `fromSources` door as every other source. A memory that will not pass the
shape check is not kept.

```
> a cat has what?      ...            it does not know
> a cat has a mind     I understand.  ← learned
> a cat has what?      mind
> a cat has a mind?    Yes.
```

`forget()` returns the brain to what it was born and taught.

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

Where a **number** stands beside a thing, it says how many of that thing there
are, and `solve` hangs a `quantity` node off it. The brain reads this off the
order of the things it perceived — a language may put the number on either side,
and the brain does not need to know which. A number is never a count of itself.

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

### 5. judge — check a claim, or answer a question

A signal that names a relation is either **asserting** something about two terms
or **asking** about one. Either way the brain reads it off the order of the
things it perceived — never off a grammar symbol, since phrase names come from
data and mean nothing to the brain.

Which relation is being spoken of: `is` is the weakest claim a signal can make,
so **any other relation named takes it**. `"what is your name"` names both `is`
and `name`; `name` wins.

**Two terms → a claim.** The nearest term either side of the relation. Adds a
`truth` node with `{ subject, relation, object }`, and it has **three** values:

| | when |
|---|---|
| `true` | `world.isA(subject, object, relation)` |
| `false` | the terms **exclude** each other, and the claim is about kind |
| `unknown` | neither — the world neither holds it nor forbids it |

Failing to find a path is **not** proof of the opposite. Only exclusion is.
`world.excludes(x, y)` is true when anything `x` is a kind of stands `different`
to anything `y` is a kind of — the `different` relation, declared in the world
like any other. Exclusion settles claims about **kind** only: a cat and a mind
are different kinds, but *having* one is not *being* one.

**Told a claim it does not hold → the brain learns it.** A `learn` node, handed
back as `result.learned` in the one shape all knowledge takes. The brain keeps
nothing: `brainFrom` stays pure, and remembering is the runtime's act.

A claim that would **close a loop** is refused instead — a relation already
running from the object to the subject cannot also run back, so a `refuse` node
is added and nothing is learned.

A **contradicted** claim is refused the same way, with `refuse: contradiction`.
So teaching the brain `"a cat is two"` no longer corrupts it: a cat is a kind of
physical thing, two is a kind of abstract thing, and those stand `different`.

> **Still not guarded:** the harm filter (§ harm). A claim can be consistent with
> the world and still be one the brain should not take.

**A quantity word, a thing, and something unresolved → how many.** The brain
**counts**, which is its first operation: `world.count(n)` steps along the
`order` relation once per thing, starting from `anchors.zero`, and returns the
term it lands on. It does not compute a number — it walks to one, the same way it
walks to a kind, and stops where the world's chain stops. Adds a `count` node
with `{ of, members, total }`; where the chain runs out the node is `beyond` and
the brain says it does not know rather than inventing a number it has no term
for.

**One term and something unresolved → a question.** The term the brain was given
is the one being asked about, **wherever in the signal the hole fell** — a
language puts its question words where it likes, and the brain does not need to
know where. Adds an `answer` node with `{ subject, relation, found, of }`:

- `of: "link"` — `world.linked(subject, relation)`, what the term links to directly
- `of: "name"` — the relation reaches `anchors.name`, so the answer is what *this
  language* calls the term. The brain's own name is not a fact it holds anywhere:
  it is the word naming its `self` term in the language being spoken.

A question the world cannot fill leaves `found` empty. The node **stays on the
tree** — what the brain looked for and did not find is worth as much as what it
found — and the signal is expressed as `unknown` rather than answered emptily.

```
what is your name?     ACI       self  --name--> (the word for it)
what is a cat?         animal    cat   --is-->   animal
a cat is what?         animal    same answer, hole at the other end
aci has what?          mind      self  --has-->  mind
a cat is an animal?    Yes.      two terms, so a claim
```

### 5a. judging a claim against the world

A signal that names a **relation** between two terms makes a claim, and the brain
checks it. `judge(roots, world)` reads the claim off the order of the things it
perceived — never off a grammar symbol, since phrase names come from data and mean
nothing to the brain:

- find the first thing whose term reaches `anchors.relation`
- take the nearest term reaching `anchors.thing` on each side of it
- `world.isA(subject, object, relation)` decides

This is what connects the *word* `is` to the world's own `is` relation: `en.json`
gives `is` the concept `294`, and term 294 is the relation the world's links are
made of. Nothing in the engine decides the answer; the walk does.

```
a cat is an animal      Yes.   83 →294→ 24    cat → animal
a tree is an animal     No.    33 →294→ 24    tree → plant → organism
an apple is a thing     Yes.   79 →294→ 2     apple → fruit → food → substance
                                              → physical-thing → thing
a person is a human     Yes.   29 →294→ 26
a human is a person     No.    26 →294→ 29    the relation runs one way
```

### 6. express — choose an intent, and let the language voice it

Runs on the judged, structured signal. The brain decides **what it means to
express**; it never decides the words.

`intentOf(n, world)` picks one of the brain's own acts by walking the world to
its anchors. **The part of speech plays no part** — a word filed as a noun whose
term is a communication is still greeted, because what a thing *is* is a fact
about the world, not about the language that named it.

| the term reaches | intent |
|---|---|
| nothing was there | `nothing` |
| `anchors.communication` | `greet` |
| `anchors.number` | `count` |
| `anchors.relation` | `confirm` |
| anything else, with a meaning | `recognise` |
| no meaning at all | `unknown` |

A word with a meaning but no term is `recognise`: the brain knows what was said
without being able to place it in the world. With no world loaded at all, every
thing is `recognise` — the brain has nothing to reason over.

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
- `src/shape.js` — `checkWorld` / `checkWhole` / `checkLanguage`. The one door.
- `src/knowledge.js` — `fromSources({ world, knowledge, languages })` validates
  every source, merges the knowledge files into the world, and returns what the
  brain takes.
- `src/languages.js` — `fromData(data)` compiles a data file into a lookup object
  (`express`, `isLetterSymbol`, `isVowelSymbol`, `lookupWord`, `grammar`, `roles`).
  `loadLanguageDirectory(dir)` reads `*.json` **in name order**, so the brain sees
  the same languages in the same order on every machine.
- `src/world.js` — `fromWorldData(data)` compiles the world into
  `{ anchors, baseRelation, term, isA, linked, excludes }`. `isA` walks whichever relation
  it is asked about (the `is` relation by default) and terminates on cycles.
- `src/index.js` — server-only bootstrap: `brain(input)` loads `languages/`,
  `data/world.json` and `knowledge/` via `runtime:fs` (probing relative candidates
  to work both raw and bundled), assembles them with `fromSources`, and calls
  `brainFrom(input, knowledge)`. `demo/server.js` is its only caller.

## Public API

```js
import { brainFrom, node } from './brain.js';
brainFrom(input, knowledge)     // pure; returns { input, roots, expression, phases }

import { fromSources } from './knowledge.js';
fromSources({ world, knowledge, languages })  // validates, merges
node(kind, name, branch, state)

import { fromWorldData } from './world.js';
fromWorldData(data)      // { anchors, baseRelation, term, isA, linked, excludes }

import { brain } from './index.js';   // server-only convenience
await brain("hi")                     // loads languages internally
```

## Demo

The demo site is the **only** way to run the brain by hand. There is no CLI: a
second surface meant a second tree renderer, and the two drifted. One surface,
two views.

- `demo/server.js` — ES-Runtime HTTP server. `POST /brain` `{ "q": "... " }`
  returns the full brain result; serves the static site.
- `demo/src/main.js` — UI (`@opentf/micro-ui`): an input box and **two** tabs.

  - **Expression** — what the brain said (`result.expression.state.says`), the act
    it chose and the language it spoke, and beneath them what it said about each
    thing. This is the input/output view: type a signal, read the answer.
  - **Tree** — `render(result.roots)`, the whole accumulated tree of objects with
    every node's state. This is the debugging view: when an answer is wrong, the
    step that got it wrong is visible here.

  The tabs are deliberately not per-phase. The phases are a property of today's
  pipeline; expression and state are properties of the brain, and hold for any
  domain the brain later takes on. `result.phases` remains in the payload for
  tests and programmatic use.
