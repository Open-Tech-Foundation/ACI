# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `SPEC.md`, the evolving specification. Defines Layer 0 below emotion —
  signal, state, effect and expression — settles emotion as a use of state
  rather than a primitive, defers language to Layer 1 and self-learning to
  Layer 4, and records the open questions.
- Layer 0: `brain()` as `understand()` → `think()` → `solve()`, over four
  atoms. A signal is an identity and nothing more, the brain is in exactly one
  state, an effect is `(state, signal) -> state`, and an expression reads the
  state out. No words, no text, no numbers.
- Totality without fallbacks: a pair with no taught effect leaves the state
  alone, and a state with no taught expression is silent. Nothing is ever
  inferred or approximated in place of what was not taught.
- Contradictory training is refused when it is taught, so the brain's next move
  can never be a choice.
- A turn is a sequence of signals applied one at a time, which is where meaning
  comes from: the same opening signal walked further ends somewhere else.
- Three memories: learned (what it was taught), experience (what happened to
  it, written and never read back), and the current state as live context.
- `runtime:db` sqlite behind both persistent memories, kept in
  `src/memory/store.js` so the rest of the engine runs under `--deny-all`.
- Lessons are data, in `data/lessons/`, loaded by `src/memory/lesson.js`, which
  refuses a malformed one rather than ignoring it. Nothing under `src/` contains
  a word or a state name.
- The engine ships with no vocabulary and no default training: `createACI`
  requires `teach`, and placeholder words used by the tests and the CLI live in
  `fixtures/`, outside `src/`.
- `createACI()`, a front door that takes what an integrator actually sends —
  `{ signal: "touch", place: "shoulder" }`, `{ signal: "text", message: "…" }` —
  and answers `{ express }`. Internal atom names never cross it.
- Reception: the channel, then the detail values in sorted order of their field
  names. Field names are not signals, because only what actually arrived should
  become one.
- `spec/`: behaviour tests written against the front door alone, so the
  internals can be rebuilt without editing them.
- `tsr audit`, which walks a brain's training exhaustively and reports what it
  amounts to: unreachable training, silent and stuck states, how many different
  things it can say, and which signals carry context. No sampling and no scores
  — every number is a fact about what was taught.
- `bin/aci.js`, a terminal client that walks the specification's examples.
- A Micro-UI demo that draws the walk and lists everything the brain was taught.
- 86 tests, of which 23 are behaviour tests that know nothing about the
  internals.

### Removed

- The language-first engine that predated `SPEC.md` — words, concepts, fuzzy
  matching, rule priorities, response templates and a confidence score. It
  started at text and treated emotion as a label hanging off a concept, so it
  was replaced rather than adapted.

[Unreleased]: https://github.com/Thanga-Ganapathy/ACI/commits/main
