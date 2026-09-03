# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

### Added

- World model (`data/world.json`): 293 terms linked by a reified `is` relation,
  carrying no language — a term is an id and its links, and `name` is a debug
  label the engine never reads.
- `src/world.js` — `fromWorldData(data)` compiles the world into
  `{ anchors, term(id), isA(id, ancestorId) }`; `isA` walks the `is` chain and
  terminates on cycles.
- `anchors` in the world data name which term realizes each of the brain's
  innate categories (`living`, `person`). The brain owns the category and the
  reasoning; the world owns the membership.
- `grammar.start` in `languages/*.json` names the one symbol a whole signal may
  parse as; the rules moved under `grammar.rules`.
- `concept` on a word in `languages/*.json` — the term that word names. It is
  the only bridge from a symbol to the world.

### Changed

- `hi` / `hello` name world term 277 (`greeting -> communication -> action`), so a
  greeting is now an `action` node rather than a living person.
- `solve` derives thing / property / relation / action from the world's four top
  anchors, and only a thing is living or nonliving.

### Fixed

- The CFG parser now enumerates every parse of a symbol at a position instead of
  committing to the first alternative, so `sentence -> interjection sentence`
  works: `"hi hi"` and `"hi a cat is two"` parse where they previously fell back
  to loose word roots.
- A left-recursive rule in a language file yields no parse instead of overflowing
  the stack and taking the request down.
- Parsing starts only at `grammar.start`, so a fragment like `"a cat"` — a valid
  `subject` but no sentence — is no longer returned labelled as a sentence. The
  structured root is named after the start symbol that matched.

### Removed

- The part-of-speech fallback in `solve`, and the `emotion` node it produced. A
  word that names no world term now gets no category — the brain no longer
  guesses one from the part of speech.

- `brainFrom(input, langs, world)` now takes the world; `brain(input)` loads it
  from `data/world.json`.
- `solve` derives `entity` by walking the world to the brain's anchors when the
  word names a term, so `cat` and `tree` are living and `apple` is not, from the
  `is` chain rather than a part-of-speech case. Words with no term (`hi`) keep
  the existing part-of-speech fallback.
