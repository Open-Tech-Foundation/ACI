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
- `concept` on a word in `languages/*.json` — the term that word names. It is
  the only bridge from a symbol to the world.

### Changed

- `brainFrom(input, langs, world)` now takes the world; `brain(input)` loads it
  from `data/world.json`.
- `solve` derives `entity` by walking the world to the brain's anchors when the
  word names a term, so `cat` and `tree` are living and `apple` is not, from the
  `is` chain rather than a part-of-speech case. Words with no term (`hi`) keep
  the existing part-of-speech fallback.
