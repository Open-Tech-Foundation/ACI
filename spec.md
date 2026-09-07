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

### Foundational invariants

- **Deterministic turns:** one admitted turn observes and commits one complete
  predecessor state; ids and logical timestamps are allocated once in that turn.
- **Atomic knowledge:** a multi-fact signal and its database write either enter
  whole or not at all. Validation precedes acknowledgement.
- **Scoped truth:** asserted, denied, hypothetical, modal, conditional and
  existential propositions are distinct; mentioning a thing is not asserting it.
- **Open-world judgement:** held, against and absent stay distinct. Unknown is
  neither false nor the object `none`, and opposite polarities cannot coexist.
- **Semantic graphs:** only declared transitive relations close over paths;
  classification has no cycles, and inherited positive and negative facts follow
  the same kind ladder.
- **Temporal state:** current state is the latest logical fact, history is never
  double-counted, and event questions respect the event's stated time.
- **Language independence:** grammar labels and particular words carry no hidden
  engine behavior; semantic metadata supplies whole-proposition boundaries,
  contextual readings and number-word composition.
- **Exact values:** exact arithmetic never crosses a lossy binary-number boundary.
- **Immutable inputs:** assembly and reasoning never mutate authored or supplied
  source objects.

| the brain owns | the data owns |
|---|---|
| the four ways to exist: thing / property / relation / action | which term is which |
| the refinements of a thing: living / nonliving / person | that a cat is an animal |
| how to walk a relation, and how to parse a rule | the relations, and the rules |
| the acts it can express: greet, count, confirm, recognise, learn, understood, affirm, deny, empathy, glad, unheard, unsure, unknown | the words each act is voiced in |
| that a word may point, and that what it points at is the signal's own circumstance | which words point, and where each one points |
| that what harms is refused, and the walk that decides it | which terms are bad, and what causes them |
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
- a word saying `names` anything but `false`
- a word that points and also names a term of its own
- a grammar naming a start symbol that has no rule
- a positive and denied copy of the same fact
- a classification cycle, including one formed only after sources are merged
- two quantities for the same fact at the same moment

Silently accepting half a source is how a brain ends up reasoning over knowledge
it does not have. Errors name the file at fault, not the merged whole.

### Where knowledge comes from

By convention, loaded once at startup:

```
languages/*.json   the languages — several files may speak one
data/world.json    the base world
knowledge/*.json   anything taught on top of it, world-shaped
```

**A language is extendable the way the world is.** Files that share a `name` are
one language: a later one may add words, symbols, frames, derivations and
grammar rules to what an earlier one declared, and a rule already there is added
to rather than replaced — another way to say a sentence is one more alternative.
It may not say anything twice differently; that is a contradiction, and it is
refused. So a service ships the vocabulary of its own tools, and an instance is
given its own name, without either of them owning the file that holds the
alphabet.

A single file therefore need not carry a whole language — `checkLanguage` checks
one file, `checkWholeLanguage` checks what they add up to, exactly as
`checkWorld` and `checkWhole` do for the world.

`knowledge/*.json` takes the same shape as the world. A file there may add new
terms, and may add links to terms the world already has; it may **not** redefine
a term, move an anchor, or reassign a relation — two sources disagreeing is a
contradiction, and the brain refuses rather than picking a winner.

Because a term may then hold several links of one relation, a walk considers
**all** of them. The world is a graph, not a tree. Classification (`is`) is a
transitive ladder. Every other relation is direct unless its world term declares
`"transitive": true`; cause, part and order do, while holding and placement do
not acquire facts merely because two links happen to form a chain.

Assembly is immutable: validating or merging a source never changes the object
the caller supplied. A disagreement is reported rather than resolved by source
order.

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
  "numbers": {
    "composition": [
      { "order": "descending", "multipleOf": { "side": "left", "value": 10 }, "operation": "add" },
      { "order": "ascending", "multipleOf": { "side": "right", "value": 10 }, "operation": "multiply" }
    ]
  },
  "unknown": { "pos": "noun" },    // parser position for a newly heard name
  "syntax": {                        // cognitive functions of parser positions
    "noun": "modifier",
    "adjective": "modifier",
    "degree": "modifier"
  },
  "marking": "after",               // a marker is before the referent
  "parts": { "before": "agent", "after": "target" },
  "words": {
    "hi":    { "pos": "interjection", "meaning": "greeting",     "concept": 277 },
    "cat":   { "pos": "noun",         "meaning": "feline animal","concept": 83 },
    "is":    { "pos": "verb",         "meaning": "to be",        "concept": 294 },
    "two":   { "pos": "numeral",      "meaning": "2",            "concept": 115 },
    "i":     { "pos": "pronoun",      "meaning": "from",         "marks": "from" },
    "my":    { "pos": "possessive",   "meaning": "from",         "marks": "from", "functions": "possessor" },
    "you":   { "pos": "pronoun",      "meaning": "to",           "marks": "to" },
    "it":    { "pos": "pronoun",      "meaning": "it",           "marks": "spoken" },
    "one": [
      { "pos": "numeral", "meaning": "1", "concept": 114 },
      { "pos": "pronoun", "meaning": "one", "marks": "spoken",
        "select": { "after": "determiner", "across": "modifier" } }
    ],
    "who":   { "pos": "interrogative","meaning": "who",  "marks": "unknown", "concept": 138 }
  },
  "expressions": {                   // how this language voices each brain act
    "greet":      "Hello!",
    "count":      "It is {meaning}.",
    "confirm":    "Yes, it {meaning}.",
    "claim":      " {subject} {relation} {object}.",
    "compare":    " {subject} is {relation} than {object}.",
    "recognise":  "I recognise \"{meaning}\".",
    "understood": "I understand.",
    "affirm":     "Yes.",
    "deny":       "No.",
    "unknown":    "..."
  },
  "grammar": {                       // context-free grammar (all in data)
    "start": "sentence",             // the only symbol a whole signal may parse as
    "rules": {
      "sentence":       { "whole": true, "rules": ["interjection", "interjection sentence", "subject predicate"] },
      "subject":        { "referent": true, "rules": ["noun", "article noun", "numeral noun"] },
      "predicate":      { "rules": ["verb verbComplement"] },
      "verbComplement": { "rules": ["noun", "numeral", "article noun"] }
    }
  }
}
```

Each word carries `pos` (part of speech), `meaning`, and optionally `concept` —
the id of the world term it names. It may also carry `marks` (what it points at
or says of its neighbour), `negates`, `role` (which part its neighbour plays),
`when`, `select`, `functions`, `names`, `groups`, `person` and `number`.
`select` chooses one reading from universal context constraints: `position`
may be `first`; `before` may be `denial` or `proposition`; `after` may be
`pointer`, `predicate` or `determiner`; and `across: "modifier"` permits a
backward search across descriptions. `any` gives alternatives. The
first constrained reading that matches wins; with none, the first unconstrained
reading is the deterministic fallback. A selecting entry must have multiple
readings and exactly one such fallback, or the source is refused. Thus language
data describes the context without teaching the engine a particular auxiliary, pronoun,
complementizer or idea-reference word. `functions` names a closed cognitive
role—condition, determiner, enclosure, joining, modality, modifier or
possession—that affects inference independently of the word's parser position.
A language declares `marking` as the side of a marker on which its neighbouring
referent appears: English `from the basket` places the referent `after` the
marker. This field is required when a word assigns a role, marks a new/known
referent, or acts as a determiner or possessor. Otherwise no direction is
invented. `parts` separately maps each side of an action to the role an
unmarked thing plays.
A word may say its term
stands bare, with no article (`bare`), the way a mass of water is not one
water. A word may join what it joins as a choice rather than a togetherness
(`choice`): one of them is the answer, not each. There is **no** `type`,
`emotion`, or `reply` — the brain derives those.

**A word may be more than one part of speech.** `pos` may be a list, and which
one a word is in a signal is what the parse settles — English says *a walk* and
*walks* with one word. POS and non-terminal values are opaque parser symbols:
renaming every one of them cannot change a judgement. `unknown.pos` says where
a newly heard possible name fits; the core supplies no implicit noun fallback.
`syntax` maps parser positions to cognitive functions where every word in that
position shares one.

**A word may name more than one thing.** An entry may hold several readings,
each with its own `pos` and `concept` — a saw is a tool, and it is also what
someone did with their eyes. Every reading is carried through `understand` and
`think`; `solve` settles which.

**Number-word composition belongs to the language.** `numbers.composition` is
an ordered list of rules over two adjacent word-values. A rule declares their
`order` (`ascending`, `descending`, `equal` or `any`), may require one `side` to
be `multipleOf` a positive exact value, and chooses the primitive `operation`
(`add` or `multiply`). The first matching rule wins; none means the words remain
separate. English declares descending multiples of ten as addition and
ascending right-side multiples of ten as multiplication. The engine holds
comparison, divisibility, exact addition and exact multiplication, but no
English scale, base or named composition strategy.

**A word may say which scale it compares on** (`on`): *heavier* is more, on
weight.

**A hole may name the relation it asks across.** `marks: "unknown"` makes a
word a hole; a `concept` on it says what the hole asks after. So `who` names
the `name` relation and `what` names nothing, and asked who a thing is the
brain walks to its name while asked what it is it walks to what it is a kind
of. Nothing in the brain tells the two apart — the machinery that prefers the
more specific relation as the signal's joint does the whole job.

### Symbols, marks and figures

**A mark is a character no word of this language is made of.** Nothing declares
them: `?` ends no English word, so it comes off a token; `+` stops being a mark
the moment a language gives it to a word. A signal is recognized when every
symbol falls in some set the language declares — its letters, its digits, its
signs — and at least one is a symbol its words are made of, so a signal of
nothing but marks is recognized as no language at all. The brain does not hold
that words are made of letters.

**A symbol set may say its symbols stand alone**: `"alone": true`. Those are
words wherever they fall, so `1+1` comes apart into three and `cat` does not
come apart at all.

**A language's `question` symbol set distinguishes asking from telling.** The
brain reads the final raw symbol only against the language carried by the
recognized signal. A question symbol belonging to some other loaded language
cannot change the signal's mood, cause an answer, or prevent a statement from
being learned. A mixed or unrecognized signal supplies no language-specific
question mark and is conservatively treated as telling.

**A word may say it does not name its term**: `"names": false`. `6` and `six`
are one number and only one is what it is called. First word wins otherwise —
but not by file order, which JavaScript does not keep for keys that look like
numbers.

**What is said back is said the way it was said.** A signal written in figures
is answered in figures; the brain chooses nothing, it uses the form it was
given, and the language is what holds both.

**A number is read, not looked up.** A run of the symbols a language counts in
is a number whatever else it is — including a part below one, where the language
declares where that part begins (`"point": "."`) and how many places it writes
(`"places": 10`). **The brain holds the value exactly; the language says how far
it is written**. Integers beyond JavaScript's safe-number range and exact decimal
results remain decimal strings at the API boundary rather than passing through a
binary `Number`, so `log 2` comes back to ten places and nothing is rounded
before it has to be — no word lists `125` and no term names it, and
`1+125` is still `126`. The language says which symbols it counts in and what
they stand as in a sentence; reading them is the brain's own, and so is what
follows from two of them.

**A machine that counts in halves cannot hold a tenth.** The operations with an
exact answer — plus, minus, times, divide, remainder — are worked in whole parts
through `Decimal` from `@opentf/std`, so a tenth and two tenths make three
tenths and the brain can match what it works out. What has no exact answer — a
root, a logarithm, an angle — is worked as closely as the machine can and no
closer.

A signal may work **more than once**: `1 + 2 × 3` names two operations. **Which
is worked first is the world's**, said with the same `order` it puts numbers in
— `times order plus` — and where it puts neither before the other they are
worked from the left. A term the world puts before **itself** (`power order
power`) is worked from the right instead, which is how `2 ^ 3 ^ 2` is two to the
ninth. A word may **open or close a group** (`"groups": "open"`),
and what a group holds is worked before anything outside it.

Two sides may be asked to be **the same**: each is worked out on its own and the
brain compares what each came to, so `2+2 = 4?` is *Yes* and `2*3 = 1+5?` is too.
An operation the brain can perform and cannot complete (`7 ÷ 2` in a world
holding no halves) is a sum it cannot reach, never a claim about the two
numbers.

A result the world has no term for is **written, never named**. Nothing says a
world must name every number, and a language that counts in figures can write
any of them — its symbols count from zero in the order it declared them, so how
many there are is the base. The `sum` still stands `beyond` what the world
names; no term is invented for it.

```
1+1                  2
7 / 2                3.5
2 ^ 3 ^ 2            512       a power meets a power from the right
root 9               3
log 2                0.3010299956
add 1 with 8         9         the same act, said the other way round
1 + 2 * 3            7         times binds first
(1 + 2) * 3          9         and a group binds tighter still
2 + 2 = 4?           Yes. ✅
10 - 3 - 2           5         and nothing binds tighter than nothing
1 + 125              126       a number no word lists
one plus one         two
100 - 1              99        the world names no ninety-nine
1 - 5                -4        nor anything below nothing
what is 1 + 5        6
what is 1            number
```

### Derivations

A word not listed may still be one this language **derives** from a word that is:
take the ending off, put back what it replaced, look again.

```jsonc
"derivations": [
  { "ending": "'s",  "becomes": "",  "of": "noun", "pos": "possessive" },
  { "ending": "ies", "becomes": "y", "of": "noun" },
  { "ending": "es",  "becomes": "",  "of": "noun" },
  { "ending": "s",   "becomes": "",  "of": "noun" },
  { "ending": "ing", "becomes": "",  "of": "verb", "pos": "verb" },
  { "ending": "ing", "becomes": "e", "of": "verb", "pos": "verb" },
  { "ending": "ied", "becomes": "y", "of": "verb", "pos": "verb", "when": "past" },
  { "ending": "ed",  "becomes": "",  "of": "verb", "pos": "verb", "when": "past" },
  { "ending": "d",   "becomes": "",  "of": "verb", "pos": "verb", "when": "past" }
]
```

This is the rule against enumeration applied to the lexicon: **no plural is
written down anywhere, and no regular past.** Rules are grammar and there are
a handful of them; the words they reach are every noun and every verb in the
language.

- a **listed** word always wins over a derived one, which is where the
  irregulars live: `saw`, `ate`, `sang` are written down, `cleaned` is not
- `of` keeps a rule to one part of speech, so `as` does not become the article `a`
- `pos` says what part of speech the ending **makes**, where that is not what
  the stem was: `'s` turns a noun into a possessive, so `the film's name` is
  the name of the film and not a film called name
- `when` says where the ending puts the doing, so a past read off an ending is
  the same past a listed word carries
- derivation is exact — an ending either applies or it does not, and nothing is
  guessed. `wandered` reaches `wander`, and no language listing `wander` means
  the word is unheard, not approximated
- the word carries `derived: { from, ending }`, so what happened is visible

### Speech and expressions

`expressions` gives a **sentence frame** per intent — not a sentence. The brain
hands over the *terms it means*; the frame is filled with the words this language
has for them:

- a slot naming a role in `speech` takes that language's own function word
- a slot holding a **term id** takes `wordFor(term)` — this language's word for it
- `{meaning}` is filled from what the brain understood

```jsonc
"speech":      { "self": "I", "one": { "before": { "vowel": "an" }, "otherwise": "a" } },
"expressions": { "unsure": "{self} don't {relation}." }
```

A speech word may take **a different form for what follows it** — `a` against
`an`. That a language may do this is all the brain knows; which of its own
symbol sets calls for which form is the language's, and it names them itself.

Not every frame is an act. **`claim`** is the claim said back: the brain hands
over the three terms it joined and the language orders and words them, so
`"a hyena is a mammal?"` answers *Yes. ✅ a hyena is a mammal.* What is one of
a kind takes its article, said against what follows it; what is not — a name
the brain knows, or a word the language says stands bare — does not, so
`"gravity is a force?"` is answered without one. Where the brain
cannot say all three — a term this language has no word for — there is no claim
to restate and it says none of it, rather than a sentence with a hole in it.

A comparing said on one scale is said back as the comparing, not as the
more-or-less it was worked through: the standing carries the scale, the
language gives the word that compares on it, and the **`compare`** frame says
it, so `"alice is bigger than bob?"` answers *Yes. ✅ alice is bigger than
bob.*

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
    { "id": 83, "name": "cat",      "links": [{ "rel": 294, "to": 24 }] },
    { "id": 249, "name": "order", "transitive": true, "links": [{ "rel": 294, "to": 4 }] }
  ]
}
```

`name` is a debug label; **nothing in the engine reads it**. Ids are atoms,
compared only for equality — that is what keeps the world language-neutral.
Two language files may point at the same term (`cat` / `chat` -> `83`) and the
brain reasons identically over both.

`transitive: true` is semantic world knowledge about a relation term, not a
property inferred from its name. Ids, term values, quantities and logical times
must be safe JSON integers; larger signal values remain exact strings rather
than entering numeric world fields. Links may additionally carry `not`,
`quantity` and deterministic logical time `at`; opposite polarities and
same-time quantity disagreements are invalid knowledge.

### Grammar semantics

The grammar is a context-free grammar. Each entry is a non-terminal with a list
of `rules`; a rule is a whitespace-separated sequence of symbols.

- A symbol is a **non-terminal** if it is a key in `grammar.rules`.
- A symbol is a **terminal** if it is not a key — it must match a token's `pos`.
- Parsing starts at `grammar.start` only. The first parse that consumes **all**
  tokens wins; a fragment that parses as some other non-terminal is not a parse.
- A non-terminal may declare `whole: true` when its children are independent
  propositions. Judgement uses that semantic flag, never a rule label such as
  `clause`; renaming a grammar symbol therefore cannot change reasoning.
- A non-terminal may declare `referent: true` when it binds one referential
  phrase. Description restriction reads this role, never names such as
  `subject` or `item`.
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
  spoken: termId | null,       // what this signal was about, for the next one
                               // to point back at; null where there was none
                               // or more than one
  names: { [word]: { of, value } },  // what this conversation has given a name
  told: string | null,         // an instruction it agreed to and could not yet
                               // act on, for the runtime to bring round again
  phases: { understand, think, solve, structure, judge, express }
}
```

The six are six: `solve` reasons over each word on its own — what the world says
it is, whether a number stands beside it, whether a word marks it — while
`judge` reasons over the whole signal, which only exists once `structure` has
bound it. They share one mechanism, `nearestOver`, for finding a neighbour
without reaching past a thing that is not the one being looked for; sharing a
walk is not being one phase.

## Kinds and individuals

A term names a **kind** — `basket`, `apple`, `mammal`. A term marked
`individual: true` **exists once**, and simply `is` its kind. Everything else
about a term is the same either way, so nothing in the engine needed changing to
hold one.

**State belongs to an individual, never to a kind.** Told that a basket holds
three apples, the brain does not conclude that *baskets* hold three apples: it
takes the basket being spoken of, and makes one if there is not one yet. The
individual is created by the brain, handed back in `learned` like any other
knowledge, and given the next free id — deterministic, so the same signals in the
same order give the same individuals.

```
> basket has three apple      I know.     ← made basket#308, and gave it the apples
> a basket is an object?      Yes.        the kind is untouched
> how many container?         one         one kind of container, not two
```

`world.oneOf(kind)` resolves a kind to the one individual of it. Where there is
none, or more than one, there is no *the* to resolve and the brain does not guess
which was meant.

### Marking one, or the one meant

A word may carry `marks` — what it points at rather than names. `"new"` says one
is being introduced, `"known"` that the one already spoken of is meant. That a
signal can do either is the brain's; **which word does it is the language's**,
and in `en.json` it is `a` / `an` against `the`. (`"unknown"` marks a hole, and
`"from"` / `"to"` point at where the signal came from and went.)

```
> a basket has three apple          made basket#308
> a basket has two apple            made basket#309 — another basket
> the basket has how many apple?    I don't know.   two of them, and no way to pick
> the library has 12 books          made library#310 — none to pick between
```

Nothing exists once merely by being spoken of: a claim about kind
(`"a basket is an object?"`) marks nothing and makes nothing. An individual is
made only where state is given to it. `the` accommodates where nothing is yet
— making one is not picking — and refuses where several are.

### Pointing

Some words hold nothing of their own: `i`, `you`, `this`, `that`, `now`, `then`.
Every language has them and **no world can define them**, because what they land
on is different every time they are said. They point at the **circumstance of
the signal**, and the circumstance arrives with the signal:

```js
brainFrom(input, knowledge, { from, to, spoken })
```

Three owners, and none of them may be the other:

- **that a word may point** is the brain's, and it is all the brain knows. A
  word carrying `marks: "from"`, `"to"` or `"spoken"` names no term of its own
  — the door refuses one that tries.
- **which words point where** is the language's: `i` / `me` / `my` against
  `you` / `your`, and `it` for what was last spoken of.
- **what they land on** is the runtime's, and it is per signal. A person, a
  device, a service, another brain — the brain never asks what kind of thing it
  is talking to, and holds no term for it.

`from` is whatever sent the signal; `to` defaults to the brain's own `self`
term, since having received a signal is not an assumption. **Told nothing, the
brain does not guess**: the pointer lands nowhere, the word names nothing, and a
question built on it is unanswered rather than answered wrongly.

```
> i am a machine?   { from: 45 }     Yes.    45 is a computer, and a computer is a machine
> i am a machine?   { from: 508 }    No.     508 is a doctor
> i am a machine?   —                ...     nothing was said about where it came from
```

**What was last spoken of** is the third, and it is what makes a run of signals
a conversation. After each signal the brain hands back `result.spoken` — the
thing that signal was about — and the runtime feeds it into the next. What the
brain did to the world names the thing more exactly than what the fact stood
on, so a state taken in points at the one thing bearing it, not at its kind.
One thing offered several facts is still one thing spoken of; several things
offered facts together leave no one of them to point back at, and the brain
does not pick. A signal it could make nothing of says nothing about what was
spoken of, and what stood before it still stands.

```
> a cupboard has three cup and two plate    I understand.
> it has how many plates?                   two
```

The brain keeps none of this. Holding the thread is the runtime's act, and
holding **several** threads is how two conversations run over one world: what
one was last about is nothing to the other, while what any of them taught, all
of them know. A signal naming no conversation is in the one unnamed thread.

`this` / `that` and `now` / `then` are the same mechanism unfinished: more
pointer names, more circumstance fields, no redesign. The clock is already there
for `now`.

### Identity

What the brain is, is world data like anything else — three links, and not a
line of code:

```
self      is   computer        computer  is  machine
self      has  mind            computer  has memory
```

It is a computer before it is a machine — not every machine is one — and its
memory is not its own: every computer has one, and this is a computer. So
`"you are an organism?"` is *No.* by exclusion, `"you are a machine?"` is *Yes.*
by walking two links, and neither answer is held anywhere as a reply.

Its **name** is not among them, because a name is not the same kind of fact. It
belongs to this one instance, so the runtime loads it **into memory**, in the
shape everything else takes:

```jsonc
// knowledge/identity.json
{ "terms": [
  { "id": 562, "name": "the name", "symbol": "ACI", "links": [{ "rel": 294, "to": 138 }] },
  { "id": 296, "name": "self",     "links": [{ "rel": 138, "to": 562 }] }
] }
```

`"what is your name?"` is then an ordinary question over the `name` relation —
nothing in the engine treats it specially — and it answers `ACI`. Loaded
nothing, the brain answers with its `unknown` intent rather than treating absence
as the known object `none`.

A **`symbol`** on a term is the characters it is said as where no language has a
word for it. A name is the same in every language, so it is held with the thing
rather than in any of them, and `name` stays a label the engine never reads.

## Time

```
past  ←——  now  ——→  future
```

Three positions and nothing between them to weigh. **That there are sides** is
the brain's; **which word puts a signal on one** is the language's — a word may
carry `when: "past"` or `when: "future"`, and `was` / `were` / `will` do in
English; **which term each side is** is the world's, through its anchors. The
arrow itself is the world's too, written with the `order` relation it already
had: `past order now`, `now order future`.

What is recorded stands where the signal put it, by the `when` relation:

```
> i was hurt    { from: 441 }

hurt#568  at 0
  is      → hurt
  when    → past
  agent   → 441
  target  → 441
```

Saying neither leaves it where it was said, and nothing is written: **now is the
absence of a claim about when**, not a third thing to record. This is separate
from `at`, which is the moment the brain heard it — a signal about the past is
still heard now.

The brain has a clock, and it is innate: `world.now()` is one past the latest
moment anything was stamped with. **It ticks on what happens, not on any outside
time**, so the same signals in the same order always give the same moments — a
question is not an event and does not advance it.

Every state link carries `at`. Revising a count does not overwrite the earlier
one: it comes after it, and what was so before stays on the record.

```
> a basket has three apple        at 0
> take one apple from the basket  at 1
> give two apples to the basket   at 2

world.heldOver(basket#308, has, apple)
  → [ { quantity: 3, at: 0 }, { quantity: 2, at: 1 }, { quantity: 4, at: 2 } ]
world.held(...)  → 4
```

### What was so before

State is stamped and never written over, so the history is already there. Asked
on the **past side of now**, the brain steps back a stamp: `the crate holds how
many lamps?` and `the crate held how many lamps?` are the same question asked of
two moments. Nothing is remembered on purpose; the record was never erased.

### Counting

Asked how many of a kind, with **something being spoken of**, the question is
about that thing — and where it holds none of what was asked after, the brain
does not know. It does not go and count what it holds of its own instead:
whoever is talking to it knows nothing of its shelves and never asked. Where
**nothing** is being spoken of, it still does not count them: the world is for
understanding what a kind is, not an inventory to read back in public, so a
kind on its own is not counted and the brain says it does not know.

What a thing holds is counted across the kinds it holds — nothing says a shop
holds *things*, it holds bats and balls, and those are things. Asked after
several kinds at once, the count is all of them together. A count needs no term
for its number: no world names every number, and a thousand stones is still a
thousand.

## Where the world is kept

`src/store.js` keeps the world in SQLite. **The brain never comes here.** It is
handed a world and asks that world questions — `isA`, `linked`, `held`, `excludes`
and eleven others — and never reads a term directly, so where the answers come
from is not its business. The store is one implementation of that port.

Nothing is trusted for being in a table: the store reads the world back in the
same `{ anchors, relations, terms }` shape every other source uses, and it goes
through `checkWorld` / `checkWhole` like any of them. The schema is a **second**
wall, not a replacement — `unique (name)` on a term, foreign keys on both ends of
every link, and a unique link tuple.

```
data/aci.db        the world, seeded once from the json below
data/world.json    the world as authored — the seed, and the export format
```

The authored world is **laid down again on every open**, not only the first: a
world grows — a term added, a link moved, one renamed — and a store written
before that would otherwise keep the old world for ever. What was **seeded** is
replaced; what was **learned** is left exactly where it is, so a memory that
survived a restart is not thrown away to get the new world in. A term dropped
from `data/world.json` is the one thing that lingers, since something learned
may still point at it.

Persistence is **opt-in**, by naming a path in `ACI_STORE`. A run that was not
told to remember uses an in-memory store, so it is never haunted by one that was.

```
$ ACI_STORE=data/aci.db  …
> a cart has nine needle             I know.
> take four needles from the cart    five
                              — a new process, told nothing —
> the cart has how many needles?     five
```

`runtime:db` is asynchronous, so every statement is drained and closed before the
next. A complete turn—load, reason, allocate ids, persist, and update its
conversation—is serialised. Concurrent calls therefore have the same result as
the same calls made in their admitted order. Every learned change is one SQLite
transaction: a failed term or link rolls the whole change back, and no reply
acknowledges knowledge that was not committed.

## Memory

Two kinds, and they behave differently:

| | what it is | when told otherwise |
|---|---|---|
| **kind** — *a cat is a mammal* | permanent | refused as a contradiction |
| **state** — *the basket has three apples* | true now | **revised**; the world moved on |

State is a `quantity` on a stamped link. Telling the brain a different count at
a later logical moment is not disagreeing with it: the earlier link remains as
history and the latest is current. Two different quantities at one moment are a
contradiction. Asking `"basket has how many apple?"` reads what is so now.

```
> basket has how many apple?   I don't know.
> basket has three apple       I know.        ← kept
> basket has how many apple?   three
> basket has two apple         I know.        ← kept
> basket has how many apple?   two
```

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
- `moodOf(input, roots, langs)` — asks only when the last raw symbol belongs to
  the recognized language's `symbols.question` set; otherwise tells. Loaded
  language order cannot lend another language's punctuation to this signal.

### 2. think — reason over the understood meaning, then read the words together

Each word is thought of on its own first: what the language says it is, and
what it names. Then the brain looks at them **side by side** and takes as one
the ones that are really one thing, reshaping the tree before anything else
sees it.

- **A sign written against a number is part of it.** `-500` is five hundred
  below nothing. Only a sign — a word for taking away stands before what it
  takes and is not part of it, and the language already says which of its
  words are a thing's name and which are another way to write it.
- **Two number words side by side may be one number.** The recognized language's
  ordered `numbers.composition` rules decide whether and how they compose.
  English declares that a descending multiple of ten adds and an ascending
  right-side multiple of ten multiplies, so `one hundred twenty five` is 125.
  Another language may declare another base, order and operation without a core
  change. A composed result must remain an exact safe integer. Figures are whole
  as written and are never run together.

A word may name **more than one thing** — a saw is a tool and it is also what
someone did with their eyes. Every reading is carried out of `think`, because
there the brain has a word and not yet a signal, and picking then would be
guessing. `solve` settles it.

### 2a. think — reason over the understood meaning

Adds a `thought` node: `{ language, wordKnown, pos, meaning, concept }` from the
language match. Single factual recollection; no entity reasoning here.

### 3. solve — settle what the words are, name what has no name, infer the rest

**Settling a word that may be meant two ways.** A signal names things and needs
something joining them — a relation, or a doing. Where nothing does, and a word
could have been a doing all along, that is what it was: `i saw an apple` names
a person and a fruit and nothing between them until `saw` is read as the seeing
it also is. Where something already joins them — `i cut an apple with a saw` —
every word stands as it was first thought, and the saw is the tool. A word
still to be settled cannot itself be what joins the signal.

Before that general relation/action fallback, `solve` applies each ambiguous
reading's declarative `select` constraint to the complete signal. One generic
matcher handles first position, context before or after, alternatives, and a
modifier-crossing search. It compares only cognitive/world categories; it does
not inspect a word's spelling or parser symbol. The selected reading is final,
so the later fallback cannot reinterpret it.

**Whose a thing is comes first.** A possessive is a pointer: `my`, `your`,
`its`, and any noun the language derives one from. Whom it points at is the
circumstance's, and told nothing to point at it names nobody — so what it marks
is nobody's, and the brain does not read past it to the word alone. This is
settled before anything is named, or a claim resting on a pointer that landed
on nothing would still leave a name behind.

**Naming a thing.** A word no language lists and no world holds, standing where
a thing stands and spoken of as though it were one, is a name being given. The
candidate referent is made here as only a generic thing, before anything is
judged, so what else the signal says of it is said of **it** and not of nothing:
`john has 3 apples` names john and gives him the apples in one breath. Its more
specific kind, polarity and quantity come only from the proposition the brain
later accepts. A name for a thing is the
world's — it goes on being there after the talking stops — and it is met again
by what it is **called**, the world being asked for a term of that name.
Asking is not giving: a signal carrying a hole names nothing, with or without
a question mark, so `who has the telescope` leaves no telescope behind — a
question answers what it found and takes nothing in.

Names are committed only when an accepted fact or event refers to them. A name
mentioned inside a modal, a claim-about-a-claim, an unmet conditional, or a
refused/denied offering cannot leak an entity or kind into memory.

A name given a **number** is the conversation's instead: `x is 5` gives x five,
and giving is done with the weakest joint there is, so `x > 10` asks rather
than gives.

### 3a. solve — infer entity and emotion (innate reasoning)

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

**Which term names the relation.** A term may *be* a relation and still be what
a claim is **about** — `"gravity is a force"` once named three of them. So a
relation counts as the claim only when there is something on each side for it to
hold between; where the signal has a hole that requirement is dropped, since a
question may put its hole anywhere. The weakest relation, `is`, is the signal's
joint and is never one of the things joined.

**A claim may be about anything that exists**, not only about a thing: gravity is
a force, red is a colour, and neither is a thing.

**A hole** is a word the language *marks* as standing for what the signal does
not say (`marks: "unknown"`), not merely a word with no term behind it — every
article and preposition is one of those. A hole is known by its **mark**, not
by naming nothing: a word may both stand for what is not said and name
something of its own.

A hole may say **which relation it asks across** — `who` names the name
relation, `where` names being in something, and `what` names nothing, so it
walks whatever the signal's joint is. It may say **what kind of answer it
wants**, either by standing beside a word for it (`what colour is the car`) or
by carrying it (`how` asks after the way a thing is); everything else the thing
is stays true and is not the reply. And a hole standing **where something played
a part** in what happened asks which thing played it — `who kicked the ball`
looks through what the brain was told happened for one whose named parts match.

**Denial.** A word may carry `negates: true`. That a claim can be denied is the
brain's; which word does it is the language's. A signal that denies claims the
opposite of what it states, and a link may carry `not: true` — a record that the
relation does **not** hold. A denied link joins nothing: nothing is reached
across it.

This is the difference between ignorance and knowledge:

```
> a basket is a tool?        I don't know.   no path, and nothing said otherwise
> a basket is not a tool     I know.         ← kept as a denial
> a basket is a tool?        No.             now it knows
> a basket is an object?     Yes.            the denial did not cut anything else
> a cat is not an animal     No.             refused; the world says otherwise
```

**A thing holds what its kinds hold.** Only the `is` chain is walked for its
own sake; every other relation is inherited down it. `"you have a memory?"` is
*Yes.* because a computer has one, and nothing about this instance says so.

**A signal may turn its joint to the front.** `is a cat an animal?` says both
sides after it, and the first of them is the one the rest is said of. An
operation standing before everything it takes is not a joint at all but a thing
being done, and an operation between two sides is worked out rather than joined
across: in `1+1 > 1` the joint is the comparing.

**A greeting standing before a whole signal** is said alongside it, not in it.

**A signal offers facts.** It carries no truth value. It hands the brain one or
more facts, and the brain has many already to lay each one against. Two terms
and a relation offer one; things joined offer as many as the sides pair into.

Each offered fact gets a `standing` node with `{ subject, relation, object,
negated }`, and a standing is **not a boolean with a third case bolted on** —
it is what the brain found among its own facts:

| | what it found |
|---|---|
| `held` | the fact is already among what it holds: the subject, or anything it is a kind of, reaches the object by that relation |
| `against` | something it holds stands against the fact — the world denies that link, or the two terms **exclude** each other and the fact is about kind |
| `absent` | nothing it holds bears on the fact either way |

Failing to find a path is **not** something standing against. Only a denial or
an exclusion is.
`world.excludes(x, y)` is true when anything `x` is a kind of stands `different`
to anything `y` is a kind of, **or** when they descend by different children of a
term marked `disjoint: true` — a parent saying its children are kinds apart from
one another, so one marking does the work of every pair — the `different` relation, declared in the world
like any other. Exclusion settles claims about **kind** only: a cat and a mind
are different kinds, but *having* one is not *being* one.

**Denied, the fact offered is the other one.** What the brain holds stands
against a denial of it, and what it holds against, a denial is among.

**Offered a fact nothing bears on → the brain takes it in.** A `learn` node,
handed back as `result.learned` in the one shape all knowledge takes. One signal
may take in more than one fact, and every one is handed back; what several of
them said about one and the same thing comes back as **one** thing learned,
holding each link once. The brain keeps nothing: `brainFrom` stays pure, and
remembering is the runtime's act.

A claim that would **close a loop** is refused instead — a relation already
running from the object to the subject cannot also run back, so a `refuse` node
is added and nothing is learned. The proposed learning is checked as one overlay
on one immutable snapshot, so two individually harmless joined clauses cannot
create a cycle, duplicate an id/name, or contradict one another when combined.

A **contradicted** claim is refused the same way, with `refuse: contradiction`.
So teaching the brain `"a cat is two"` no longer corrupts it: a cat is a kind of
physical thing, two is a kind of abstract thing, and those stand `different`.

A claim can be consistent with the world and still be one the brain should not
answer with. That is the harm filter's job, and it runs last — see **§ Harm**.

### Several things at once

A word may **join** two wholes of the same size. Which word does it is the
language's (`pos: "conjunction"`), and the grammar says where one may stand.

**Joined subjects or objects are one offering.** `"a sparrow and a river are
animals"` offers two facts, `"a sparrow is a plant and a bird"` two more, and
joined on both sides as many as the sides pair into. The brain lays every one
against the world and that work stays under the standing — but what it was
handed was **one thing**, and one thing is what it answers. Finding something
standing against any of them, it will not take the offering, and takes **no
part of it**, since no part of it was offered on its own.

```
> a sparrow and a snake are animals     I know.
> a sparrow and a river are animals     No.      ← and nothing is learned
> a story and a question are art        I understand.   ← both facts taken in
```

**Joined clauses are two offerings**, not one, and each is answered on its own.
The join is read at its **widest** — `"1+8 and 5+9"` is two workings-out, not
one sentence with a joined complement — and it is found **wherever it stands**:
a signal laid over a join reaches it, so `"what is 1+8 and 5+9"` answers both.

A join may be a **choice** rather than a togetherness: which word joins them
that way is the language's, and English says `or`. Asked across a comparison,
each pairing is worked the way any comparison is, and where one of them holds
against all the rest, that one is the answer — `"which is smaller, 8 or 0"`
answers `"zero"`, and takes nothing in. Where every pairing works out and none
does, it is a tie, and the answer is neither of them. Told nothing it could
not work, the parts are answered one apiece, as before.

**Judging and saying are separate acts.** Every verdict stays on the tree, but
saying one twice says nothing the first did not: two that came out differently
are both said, two that came out the same are one thing to say.

```
> a sparrow is an animal and a river is an animal    I know. No.
> 1 and 2 and 3 are what                             number      ← three answers, one said
```

Parts that say a **term** are joined by what the language puts between listed
things; parts that say a **whole sentence** are joined by nothing but the
space, each having already ended the way the language ends one.

### Holding and placement

**Holding** is neither being nor having: what a thing holds can begin, end and
be counted without the thing becoming anything different. `hold` is a relation
in the world and an anchor the brain knows. What a thing holds is state, and
state is stamped, so it changes without erasing what was so before.

Which things hold is the world's to say, and it needs no modal to say it: *a
container holds things* is the fact, and *"a basket can hold things"* is that
fact read back. `"a stone holds things?"` is *I don't know*, nothing having
said so.

**Placement** is where a thing stands relative to another. The world had
positions — up/down, left/right, front/back, near/far — but nothing that put a
thing at one; `placement` is its own kind of relation holding `in`, `on` and
`under`, over positions that now include inside/outside, top/bottom and side. A
language says a placement with a preposition, so a complement may be one.

Two relations stand in `"an apple is on a table"`, and the more specific is the
signal's joint: the claim is a placement, not what the apple is. **What a thing
is does not change by moving it.** A new stamped placement becomes its current
place while every earlier placement remains available as history.

**What is put into a thing is what it comes to hold.** The world says which
action causes which operation — a `give` causes a plus — and a signal may name
the operation itself instead, which is the same change reached without anyone
doing it. Nobody did an operation a signal named outright, so nothing happened
to anybody, and no event goes on the record:

```
> a basket holds three apple      I understand.
> add one apple into it           four        ← no event; only what it holds
> give one apple to it            four        ← someone gave it; an event
> add one spoon into it           I don't know.
```

The last is the same rule that governs everything else: not having been told a
basket holds spoons is not being told it holds none.

### How many of a kind a claim is about

Told nothing, a claim is about the kind itself, which is every one of it.
A word may say otherwise: **all** and **every** say so outright; **no** says of
a kind what a denial says of it; and **some** is not the kind — what the kind
reaches, some of it reaches, and some of it may reach what the kind does not,
so it is never denied merely for a path the kind has not got.

When an existential claim is learned, it creates one anonymous individual of
the kind and records the fact on that witness. It never writes the fact onto the
kind itself: `some birds are white` does not entail `all birds are white`.

`nobody` is not a body: it is a person, and the word denies what is said of one.

### Scale, state and measure

A thing is **in a state**; a **scale** measures the state; a **unit** is what
the scale reads in. Hot, warm, cool, cold, heavy, light and the sizes are
states; temperature measures hot, weight measures heavy, and a degree measures
a temperature.

**A value is an amount of a unit**, and a unit says which property it is of.
A thing measured on a scale keeps the amount, and that is what compares:
`more` and `less` stand two **things** on one scale and let the amounts say
which is further along. Two numbers are only the case where the world can
already say which is greater; each side of a comparison is worked out on its
own first.

**What a thing has been called decides nothing.** Told a stone is heavy and an
apple light, `a stone more an apple?` is *I don't know* — the names are regions
of a scale, and which region a value falls in depends on what it is read
against. Where a state begins on its scale is not fixed.

A **comparative** names the comparing and says which scale it compares **on**:
the same two things answer differently to *heavier* and *bigger*, and neither
reads the other's scale. Two units are not one scale until something says how
they stand.

**How much is not how many.** A number beside a property says how much, and the
brain counts without being able to measure, so it says it does not know rather
than taking the number for a thing there are three of.

### The universe, and what its forces do

Everything that is, is inside a **universe**, and what the universe has besides
is **force**. A force is not a thing — it is what the universe has and does.

**What a force does, everything physical has.** This does not come down the
ladder the way a kind's facts do; it comes from the universe inward. Nobody has
to say a stone is heavy for the brain to know a stone **has weight**: a stone is
physical, the universe has gravity, and what gravity causes is weight. That a
force reaches the physical and nothing else is the brain's — no world has to say
a number is weightless. Which forces there are, and what each causes, is the
world's.

Having a property is not being at one end of it. A stone has weight and is not
thereby heavy.

### A claim about a claim

A word may say that what follows is a **claim and not a thing** — English says
`that` — and what follows stands whole, the way a joined clause does.

The brain **checks** the claim it was told about, because that is what it was
told about, and **takes nothing in**: saying you know something is not telling
the brain it is so, and asserting it would be putting words in the sender's
mouth. Nothing is turned down either, because nothing was offered.

**A condition.** `if` puts a claim as a condition and `then` says what follows;
`else` gives it its other side. Neither is made: the brain checks the condition,
and only where that already stands does what follows stand too. Where something
**stands against** the condition, what comes after `else` stands instead. A
condition the brain cannot reach is neither — it did not fail, it was never
reached — so nothing follows. Either side may be a whole signal or a thing on
its own, and a thing put where a claim would go is the thing to say.

**An instruction.** A condition put on something to *do* is an instruction, not
a question, and what the brain answers is whether it will follow it. Its memory
holds the answer — written where its own name is written, by whoever runs it,
not by whoever is talking to it. Told outright that it does not follow, it says
no, and nothing said to it changes that. Where nothing denies it, it agrees, and
the instruction is handed back for the runtime to bring round again when
something has moved.

### What is said of a thing

`good` and `bad` are qualities, and a quality may be a **kind** of one — `nice
is good`. A claim whose object stands at a pole that way is **not the world's to
hold**: it is what one sender says of one thing.

```
> the shelf is nice        { from: 508 }     I know.

nice#564  at 3
  is      → nice
  agent   → 508          whoever sent it
  target  → shelf        what they said it of

> a shelf is nice?                           I don't know.
```

The world is not made to agree. One sender's verdict never becomes everyone's
fact, and the brain keeps **what was said**, not what follows from it — the
denial in `"the ladder is not nice"` rides on the record as `not`, and nothing
is turned into its opposite.

With **nobody to hold it** there is nobody whose it is, so an opinion arriving
with no `from` is refused rather than taken.

None of this is a new shape: it is an individual with parts and a moment, the
same as anything else that happened. And it is not a *feeling* — a feeling is a
term of its own, and a claim about one (`"up is a fear"`) is a claim about kind
like any other. The world's own valence is authored; only what is said of a
thing is held.

**Empathy** is understanding what someone feels and seeing it from where they
stand. Both halves are the record's already: what they said is held, and it is
held as *theirs*. So the act is only the last step — what was said stands at the
bad pole, and was said of whoever said it:

```
> i am hurt        { from: 508 }     Sorry. 😔
> i am nice        { from: 508 }     Good. 🙂       the other pole, the other act
> the wheel is hurt                  I understand.  said of something else
> i am not hurt                      I understand.  they denied it
```

Two walks decide it, and nothing is weighed: **one pole, one act**. The words
are the language's, exactly as `Hello!` is — `"empathy": "Sorry. 😔"` sits in
`en.json`, and `src/` holds no more of it than it holds `"Yes."`. The brain
still hands over the term that was said and its own `know`, so a language may
voice more than this one does; English chooses not to.

**A relation the brain can perform → it performs it.** Arithmetic is **innate**.
Put it to the two questions: *would it change in another language?* No. *Would it
change if the world were different?* No. So it belongs in the engine, and the
world's whole part in it is saying **which term names which number** — a `value`
on the term. What follows from two numbers is the brain's own.

The operations it can perform are its own, one arithmetic act each: `plus`,
`minus`, `times`, `divide`, `power`, `remainder`, and — taking a single number —
`root`, `logarithm`, `natural-logarithm`, `sine`, `cosine`, `tangent`,
`magnitude`. The world says which term names which, and nothing else about them.
An operation may stand **between** the numbers it takes or **before** them, so
`add 1 with 8` is the same act as `1 + 8`. Where there is no answer at all —
nothing over nothing, the root of less than nothing, the logarithm of nothing —
it says so rather than reaching for one.

| the signal names | the brain does | node |
|---|---|---|
| an operation it can perform | works it, then finds the term for the result | `sum` |
| `anchors.more` / `anchors.less` | compares the values | `standing` |
| `anchors.same` | works out each side and compares what they came to | `standing` |

A result the world has no term for is **not invented**: the `sum` node is
`beyond`. The world once had no term for 13 and `"nine plus four"` stopped
there; it has one now, and the same signal answers *thirteen* — what the brain
can say grows with the world and never with the engine. Where the result is a
number the language can write in its own figures it is written, since writing a
number is not naming it: `"0 - 5"` is `beyond` and still says *-5*. Where it is
neither — `"9 / 0"`, `"2 ^ 4000"` — the brain says it does not know.

**An action → something that happened**, unless the signal is *about* it. A
relation named between two things is the signal's joint, and the joint is never
one of the things joined — so `"catch is bad"` is a claim about catching, not a
catching. An action is otherwise not a claim between two terms; it has *parts*. What happened is recorded as an **individual** — of its
kind, with the parts things played in it, and with a moment — so nothing new was
needed to hold it. An event is an individual like any other.

```
take one apple from the basket
  take#332  at 1
    target      → apple ×1
    source      → basket
```

The parts are `agent`, `target`, `source`, `destination` — relations like any
other. Which thing plays which:

- a word may **say so**: `from` makes a source, `to` a destination. That things
  play parts is the brain's; which word assigns which part is the language's.
- what no word says, the brain reads off the **order** things were perceived in
  — and **which side is which is word order, so the language declares it**:
  `"parts": { "before": "agent", "after": "target" }`. English puts the doer
  first; a verb-final language does not, and the brain names neither side
  itself. Told nothing, it assigns no part by order at all.
- a marker need not touch what it marks — `from the basket` puts an article
  between — so the brain walks away from the thing over words that name nothing,
  and stops at the next thing. A marker never reaches past one.
- **which side** a marker governs is word order, so the language declares it:
  `"marking": "after"`. A whole language containing neighbour-marking words is
  invalid without this declaration. The direction is read from the language
  that recognized the signal, not the first language loaded; mixed or
  unrecognized signals provide no direction to guess from.
- a thing spoken of as **one of its kind** is one of them: `a film` in
  something that happened is one film, made here, so what happened happened to
  that one and the signal after this one has something to point back at. A
  thing made this way was never called anything, so it is said by what it
  **is** — a `boy#12` is said back as *boy*.

**Asked whether something happened → the brain looks, and records nothing.**
Being asked is not being told, and answering is not doing. Every part the
signal names must be played by the same one occurrence, and a part played by a
thing of a kind answers to the kind — `did i rinse a cup` is answered by any
rinsing of any cup. The occurrence must also match the side of now the question
asks about; a future occurrence is not evidence that it happened in the past.
Finding none is not finding it did not happen: the standing
is `absent`, and the brain says it does not know.

**A word may carry when, or that a signal is asking, without naming anything.**
English writes `do`, `does` and `did` that way. Such a word names nothing, is
never the joint, and the claim under it is read exactly as it would be without
it — which is why `how many crayons do i have` and `i have how many crayons`
are the same question. Which end of a count was said first is word order, and
the brain tries both.

**An action the world says causes an operation → the brain carries it out.**
The world links an action term to an operation term by `cause` — `take` causes
`minus`, `give` causes `plus`. Nothing in the engine knows what either word
means; it reads the link, works the arithmetic on what the thing holds, and keeps
the result. Adds a `did` node with `{ action, operation, holder, thing, before,
amount, after }`.

Which thing it works on comes from the parts: **taking draws from its source,
giving adds to its destination.**

A result the world cannot name is **not held**: taking more than is there is
refused and the state is left alone. What the brain refuses is not recorded as
having happened either. Where it simply cannot tell what followed, the event
stands — it was told something occurred, and that much is so.

```
> basket has three apple        I know.
> take one apple from basket    two       3 take 1 → 2
> take two apple from basket    zero      2 take 2 → 0
> take one apple from basket    No.       0 take 1 → -1, refused
> basket has how many apple?    zero      untouched
> give three apple to basket    three     0 give 3 → 3
```

**A quantity word, a thing, and something unresolved → how many.** The brain
counts the terms that link to the kind and names the count with `world.termFor`.
Adds a `count` node with `{ of, members, total }`.

**One term and something unresolved → a question.** The term the brain was given
is the one being asked about, **wherever in the signal the hole fell** — a
language puts its question words where it likes, and the brain does not need to
know where. Adds an `answer` node with `{ subject, relation, found }` — what the term links
to by that relation, **all of it**, and what it links to *by being what it is*:
the walk climbs the `is` chain and gathers every rung, so a computer's memory is
this brain's memory without anyone writing the link twice. A thing that has
three things has three; saying the first would be picking one, and the brain
does not pick. What stands between them said one after another is the language's
(`speech.list`). A walk that comes back empty keeps an empty `found` and is
expressed as unknown. Absence of evidence is not the known term `anchors.none`,
and neither is it a denial.

A **name** is not a case of its own: `"what is your name?"` walks the `name`
relation like any other, and answers with what memory holds. A term the language
has no word for is said by its `symbol`, and where it has neither there is
nothing to say.

A question the world cannot fill leaves `found` empty, and so is one the language
cannot say — a term it has no word for leaves the brain with nothing to answer
with. The node **stays on the tree** either way — what the brain looked for and
did not find is worth as much as what it found — and the signal is expressed as
`unknown` rather than answered emptily.

```
what is your name?     ACI       self  --name--> a term said as "ACI"
what is a cat?         animal    cat   --is-->   animal
a cat is what?         animal    same answer, hole at the other end
you have what?          mind, memory        self  --has--> both of them
a cat is an animal?    Yes.      two terms, so a claim
```

### 5a. judging a claim against the world

A signal that names a **relation** between two terms makes a claim, and the brain
checks it. `judge(roots, world)` reads the claim off the order of the things it
perceived — never off a grammar symbol, since phrase names come from data and mean
nothing to the brain:

- find the first thing whose term reaches `anchors.relation`
- take every term that claims on each side of it, and pair them
- `world.isA(subject, object, relation)` decides each pairing

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
| was refused, for any reason | `deny` |
| said something bad of whoever sent it | `empathy` |
| said something good of whoever sent it | `glad` |
| told it something it did not hold | `learn` |
| told it something it already held | `understood` |
| asked a claim the world bears out | `affirm` |
| made a claim the world denies | `deny` |
| left something held or something happened | `learn` |
| asked something it could not fill | `unsure` |
| held a word this language has no entry for | `unheard` |
| was a single thing | that thing's intent |
| was bound and nothing came of it | `unknown` |

There is **no default act, and no silence**. Nothing falls through to *I know*
for want of anywhere else to go: taking something in (`learn`) is not the same
as having held it (`understood`). And nothing falls through to *…* either — a
question it cannot fill says it does not know, and a signal it could not get
through says **which word stopped it**:

```
> a hyena is a hunter      I don't know "hunter".
> a hyena is a mammal      I know.
```

That word is not a term and has no meaning to give. What the brain has of it is
what it was sent, and it hands those symbols to the language to voice.

`speak(intent, meaning, language, langs)` then asks **that language** for the
words, and builds the node:

```js
node('express', intent, [], { says, meaning, language })
```

The node's **name is the act**; `state.says` is what that language made of it.
A language with no entry for the intent leaves `says` as `null`, and the brain
says nothing — it has no words of its own to fall back on. Void input recognizes
no language at all, so it is always unsaid.

## Harm

The brain owns the walk and the veto; the world owns what is bad. Nothing in
`src/` names a single harm, and a world that calls nothing bad has nothing here
to refuse — the filter is inert until a world, or something taught, gives it a
pole to walk to.

```
harms(t)  =  isA(t, anchors.bad)  or  anything t causes harms
```

There are two things the brain hands back, and both are gated:

- **an act** it would carry out — refused before anything is worked out, so what
  harms did not happen and does not go on the record as having happened;
- **the term it would answer with** — the `answer` node stays on the tree, since
  what the brain found is still what it found; saying it is the act it will not
  perform.

Either way it adds `refuse: harm`, and a refusal is the **last word**: it sits at
the head of the intent chain, not inside it, so it wins whatever else would fit.

It is a **filter and never a weighting**. Nothing is compared, nothing is scored,
no answer is preferred over another: a term reaches the pole or it does not.
There is no walk toward `good`, and `anchors.good` is read nowhere — a brain that
went looking for good would be choosing, and choosing is weighing.

Knowing is not doing. The brain still learns what is bad, still confirms it when
asked, and still holds every link it held before; what it will not do is act on
it or answer with it.

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
  `{ anchors, baseRelation, term, isA, linked, excludes }`. `isA` walks the base
  classification relation transitively; another relation is direct unless its
  term declares `transitive: true`. Every walk terminates defensively on cycles.
- `src/index.js` — server-only bootstrap: `brain(input)` loads `languages/`,
  `data/world.json` and `knowledge/` via `runtime:fs` (probing relative candidates
  to work both raw and bundled), assembles them with `fromSources`, and calls
  `brainFrom(input, knowledge)`. `demo/server.js` is its only caller.

## Public API

```js
import { brainFrom, node } from './brain.js';
brainFrom(input, knowledge, { from, to, spoken })  // circumstance optional; pure

import { fromSources } from './knowledge.js';
fromSources({ world, knowledge, languages })  // validates, merges
node(kind, name, branch, state)

import { fromWorldData } from './world.js';
fromWorldData(data)      // { anchors, baseRelation, term, isA, linked, excludes }

import { openBrain, brain } from './index.js';   // server-only convenience
await brain("hi", { from, conversation })        // loads languages internally
```

`isA(id, ancestor, rel)` follows the relation for real. A thing is itself, but
it does not stand in **every** relation to itself: only the `is` ladder the
world is built of counts a term as reaching itself. That ladder and relations
whose terms declare `transitive: true` follow full paths; every other relation
checks one edge. This is why *a stone is a stone* and *a stone holds a stone* are
not the same answer.

`openBrain(url)` keeps the store and the conversation threads. `conversation`
names a thread; told none, the signal is in the one unnamed thread.

## Demo

The demo site is the **only** way to run the brain by hand. There is no CLI: a
second surface meant a second tree renderer, and the two drifted. One surface,
two views.

- `demo/server.js` — ES-Runtime HTTP server. `POST /brain`
  `{ "q": "...", "conversation": "..." }` returns the full brain result and the
  conversation it was in; serves the static site.
- `demo/src/main.js` — UI (`@opentf/micro-ui`): a conversation. Turns stack up
  as they are said, the input sits under them, and each turn keeps its own view
  of the tree.

  - what the brain said (`result.expression.state.says`), with the act it
    chose, the language it spoke, and whether it learned. This is the
    input/output view: say a signal, read the answer.
  - **Tree** — `render(turn.result.roots)` behind a toggle on that turn: the
    whole accumulated tree of objects with every node's state. This is the
    debugging view, and it is per turn because the answers are.

  The views are deliberately not per-phase. The phases are a property of
  today's pipeline; expression and state are properties of the brain, and hold
  for any domain the brain later takes on. `result.phases` remains in the
  payload for tests and programmatic use.

  The page makes a conversation id on load and keeps it in `sessionStorage`, so
  a reload stays in the same conversation and **New** is what breaks the
  thread. `crypto.randomUUID` is not there outside a secure context, so the id
  is drawn from `crypto.getRandomValues`.

**The dev loop watches `demo/` only.** Changes to `src/`, `languages/` or
`data/` neither rebuild nor restart it, and the server reads its language and
knowledge files once at startup — so a change to the brain or its data needs
the server restarted, not rebuilt.
