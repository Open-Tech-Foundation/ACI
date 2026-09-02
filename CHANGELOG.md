# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `brain()` as `understand()` → `think()` → `solve()`, each exported and testable
  on its own. Only `think()` may read conversation state.
- `Memory`: a typed, directed property graph of languages, words, concepts,
  emotions and response templates, with a closed set of edge types. Imports
  nothing from the host, so it runs under `--deny-all`.
- Vocabulary index combining Jaro-Winkler, Levenshtein and Soundex, with a
  trigram inverted index for candidate retrieval, so typos resolve to the word
  that was meant.
- Longest-first phrase matching, so `how are you` is understood as one unit.
- Rule engine with declarative conditions (`$in`, `$has`, `$gte`, `$empty`,
  `$exists`, `$not`, …), priorities and short-circuiting; rules carry a
  `because` that reaches the trace.
- A single response envelope returned by every path through the engine.
- `Trace`: a step-by-step record of how an answer was reached.
- Runtime learning through `learn.word()`, `learn.respond()`, `learn.relate()`
  and `learn.rule()` — no retraining step.
- Seed knowledge for English: 10 concepts, 7 emotions, 32 words and phrases with
  spelling variants, and a response for every concept.
- JSON persistence in `memory/persist.js`, kept apart from the core so only it
  carries the filesystem capability.
- `bin/aci.js`, a terminal client that runs on `--allow-imports` alone.
- A demo site built with Micro-UI that renders the full traversal from words to
  answer, and can teach the engine a new word without a reload.
- 80 tests across the engine and the demo's view model.

[Unreleased]: https://github.com/Thanga-Ganapathy/ACI/commits/main
