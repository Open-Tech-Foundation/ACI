# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

### Added

- Twelve ancestor words in `languages/en.json` — animal, plant, organism, human,
  person, food, fruit, substance, object, thing, number, action — each naming a
  world term that already existed but had no word pointing at it. Claims stop
  being tautologies: `"a cat is an animal"` is true, `"a tree is an animal"` is
  false, `"an apple is a thing"` resolves across six links.
- The article `an`, without which none of those claims can be said.
- `numeral` as a subject rule, so `"three is a number"` parses.

- `expressions` in `languages/*.json` — how a language voices each of the brain's
  acts, with `{meaning}` filled from what was understood. `lang.express(intent,
  vars)` renders one; an intent the language has no entry for is left unsaid.

- `judge` phase: a signal naming a relation between two terms makes a claim, and
  the brain checks it against the world. It adds a `truth` node
  (`{ subject, relation, object }`), reading the claim off the order of the things
  it perceived rather than off any grammar symbol.
- The word `is` names the world's own `is` relation (term 294), so `"a cat is a
  cat"` is true and `"the apple is a tree"` is false — decided by walking the
  world, not by a rule in the engine.
- `result.expression` — the one reply to the whole signal, its branch holding what
  the brain said about each thing.

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

- The demo has two tabs instead of one per phase: **Expression**, what the brain
  said and the act it chose, for input/output testing; and **Tree**, the whole
  accumulated tree of objects, for debugging. Phase tabs described today's
  pipeline; these two describe the brain, and survive a new domain.

- The brain chooses its expressive act by **walking the world**, not by the part
  of speech: a term reaching `anchors.communication` is greeted, `anchors.number`
  counted, `anchors.relation` confirmed. A word filed as a noun whose term is a
  communication is greeted all the same. With no world loaded, every thing is
  `recognise`.
- `anchors` gains `communication` (256) and `number` (100).

- **The brain holds no replies.** `express` now decides only an *intent* — one of
  `nothing`, `greet`, `count`, `confirm`, `recognise`, `understood`, `affirm`,
  `deny`, `unknown` — and the language the signal was recognized as supplies the
  words. An `express` node is named after the act; `state.says` is what that
  language made of it, and is `null` when the language offers nothing. No reply
  text remains anywhere in `src/`.

- `express` runs **last**, on the structured and judged signal, so the brain
  replies to the whole rather than to each word of it. Pipeline is now
  understand → think → solve → structure → judge → express.
- `world.isA(id, ancestorId, rel)` walks whichever relation it is asked about; it
  still defaults to `is`.

- `hi` / `hello` name world term 277 (`greeting -> communication -> action`), so a
  greeting is now an `action` node rather than a living person.
- `solve` derives thing / property / relation / action from the world's four top
  anchors, and only a thing is living or nonliving.

### Fixed

- Every multi-word signal lost its first word's reply: `compose` put the phrase
  result on the opening root, which then replied for the phrase instead of for
  itself, so `"one two three"` answered `["I understand.", "It is 2.", "It is 3."]`.
  It now answers `["It is 1.", "It is 2.", "It is 3."]` with one expression above
  them.

- `symbol()` matched any node merely *named* `shape`, so the input word "shape"
  had its whole perception subtree replaced. It now matches a `form`'s shape.
- `"I understand."` was unreachable: `express` took the first `response` branch,
  which `solve` had already filled with the word's own meaning. It now looks up
  the response named `sentence`.
- `compose` appended one shared node object to every root. The phrase result is
  now carried once, by the root that opens it.
- A signal of nothing but space was perceived as a thing. It is now `void`, while
  a signal of marks alone still exists.
- Word lookup was gated on a hardcoded `/^[a-zA-Z]+$/`, so a non-Latin language
  file could never resolve a word. The loaded letter set is now the only gate.
- Vowels were hardcoded as `aeiou` in the core. They come from
  `symbols.vowel` in the language data, and `sound` is perceived only where a
  loaded language recognizes a symbol.
- `allRoles` keyed the role map by word text rather than part of speech, filling
  it with empty sets. Roles are now the data's symbol types only.
- Language files are read in name order, so load order no longer depends on the
  filesystem.
- Tokenizing and quoting used Latin character classes; both are now Unicode.
- `demo/server.js`: a malformed `/brain` body returns 400 instead of rejecting
  inside the handler, and a static path that climbs out of the served directory,
  however encoded, is refused.
- The demo could not read the world model: `demo/esdev.json` granted read on
  `.` and `../languages` only, so `data/world.json` was denied and the load was
  swallowed — every node lost its category while the CLI kept them. The grant now
  includes `../data`, and a missing world is reported instead of degrading in
  silence.
- `demo/src/main.js` labelled a tab Express while rendering the structure phase,
  and had no tab for structure at all. Each of the five tabs now shows its own
  phase, and the tree shows the world term a node names.
- `demo/server.js` served the whole `demo/` folder — sources, `node_modules` and
  all — when started outside esdev, because the source `index.html` sits next to
  the module. Only a built site is served now; `demo/` is told apart by the esdev
  config it holds, and with no build the server says so and answers `/brain`
  alone.
- `demo/src/main.js`: a failed request shows an error instead of leaving the page
  silently unchanged.
- `package.json` `cli` and `demo` scripts pointed at `bin/aci.js`, which does not
  exist. `cli` now runs `bin/ask.js`, and the dead `demo` script is gone.

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

- `bin/ask.js` and the `cli` task. It was a dev harness, never a product — no
  `bin` field, not in `files` — and it carried a second tree renderer that had
  already drifted from the demo's. The demo site is now the only way to run the
  brain by hand.

- `deriveReply`, which held every reply as a string inside the engine.

- `compose`, which duplicated what `structure` does and was the cause of the lost
  first reply.

- `alphabet` from the language data — it duplicated `symbols.letter.characters`,
  which is the field the loader actually reads.
- `loadLanguage` and `loadLanguagesFromFiles`, which nothing called.
- The unused `multi` flag on an existence node.

- The part-of-speech fallback in `solve`, and the `emotion` node it produced. A
  word that names no world term now gets no category — the brain no longer
  guesses one from the part of speech.

- `brainFrom(input, langs, world)` now takes the world; `brain(input)` loads it
  from `data/world.json`.
- `solve` derives `entity` by walking the world to the brain's anchors when the
  word names a term, so `cat` and `tree` are living and `apple` is not, from the
  `is` chain rather than a part-of-speech case. Words with no term (`hi`) keep
  the existing part-of-speech fallback.
