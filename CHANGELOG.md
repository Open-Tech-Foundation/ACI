# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `brain(signal)`, which asks **what is this?** of a word and of every char in
  it, then asks the same question of each answer until nothing answers back.
- `existence` as the one primitive: the single thing nothing else explains, so
  every chain either reaches it or stops short.
- Four endings, none of which is a failure — `bottom` reached `existence`,
  `untaught` got an answer nobody explained, `unknown` was never seen, and
  `circular` explains itself. The brain always reports how far it got.
- `data/world.json`, everything the brain knows, including the alphabet.
- `bin/ask.js`, a terminal client — `tsr cli -- hi`.
- A site where a word is typed and every chain is drawn.

### Removed

- The previous engine (`src/`), client (`bin/`), data (`data/`), demo code and
  `SPEC.md`. Understanding was a flat word-to-kind dictionary with no
  recognition steps, and solving was a JavaScript branch per question shape, so
  neither survived and both were deleted rather than adapted.

[Unreleased]: https://github.com/Thanga-Ganapathy/ACI/commits/main
