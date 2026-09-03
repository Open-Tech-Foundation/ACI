# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

### Added

- **Time: past ← now → future.** Three positions and nothing between them to
  weigh. A word may carry `when: "past"` or `when: "future"` — `was`, `were`,
  `will` do in English — and what is recorded stands where the signal put it, by
  a `when` relation. Saying neither leaves it where it was said: now is the
  absence of a claim about when, not a third thing to record, and it is separate
  from `at`, the moment the brain heard it. The arrow between the three is the
  world's, written with the `order` relation it already had.
- **Nothing is answered with silence.** `"..."` was what a signal got whenever
  the brain could not place it — including one held up by a single word it had
  never been given. It says which word now (`I don't know "hunter".`), handing
  the language the symbols it was sent, since that word is no term and has no
  meaning to give. A question it cannot fill says it does not know, and a signal
  it could not get through says it did not understand.
- **An act for each pole, and no default act at all.** *I know* was where
  everything fell that had nowhere else to go — a claim learned, an opinion
  held, a signal nothing came of. Taking something in is now `learn`
  (*I understand.*) and having already held it is `understood` (*I know.*); a
  signal the brain did nothing with says so instead of claiming knowledge. Said
  of whoever said it, the bad pole is `empathy` (*Sorry. 😔*) and the good one
  `glad` (*Good. 🙂*).
- **Empathy**, an act of its own. Understanding what someone feels and seeing it
  from where they stand — both halves of which the record already holds, so the
  act is the last step: what was said stands at the bad pole, and was said of
  whoever said it. `"i am hurt"` from a sender answers *Sorry. 😔*,
  where the same said of something else, denied, or at the other pole is simply
  understood. Two walks decide it and nothing is weighed: one pole, one act, and
  the words are the language's — `"empathy": "Sorry. 😔"` sits in `en.json`
  exactly as `Hello!` does.
- **What is said of a thing is held as the sender's.** `good` and `bad` are
  qualities and a quality may be a kind of one (`nice is good`); a claim whose
  object stands at a pole that way is not the world's to hold. It is kept as an
  individual — of what was said, by whoever sent it, about what they said it of,
  at a moment — so one sender's verdict never becomes everyone's fact, and
  `"a shelf is nice?"` is still *I don't know*. What was said is kept, never what
  follows from it: a denial rides on the record as `not`. An opinion arriving
  with no `from` has nobody whose it is, and is refused.
- **The harm filter.** The brain owns the walk and the veto, the world owns what
  is bad: a term harms when it *is* bad or causes something that harms, and
  nothing in `src/` names a single harm — the filter is inert until a world, or
  something taught, gives it a pole. Both outputs are gated, an act it would
  carry out and the term it would answer with, and a refusal is the last word
  whatever else would fit. No walk toward `good`: a brain going looking for it
  would be weighing, and `anchors.good` is read nowhere.
- `patient` is `target` — the part an action is done to, without the hospital.
- **A term may carry the `symbol` it is said as**, for what no language
  translates. A name is the same in every language, so it is held with the thing
  rather than in any of them — and `name` stays a label the engine never reads.
  `name` is now a declared relation, so memory may hold what a thing is called.
- **A language is extendable the way the world is.** Files sharing a `name` are
  one language, and a later one may add words, symbols, frames, derivations and
  grammar rules to what an earlier declared — a rule already there is added to,
  since another way to say a sentence is one more alternative. Saying anything
  twice differently is a contradiction and is refused. So a service ships the
  vocabulary of its own tools, and an instance is given its own name, without
  owning the file that holds the alphabet. `checkLanguage` now checks one file
  and `checkWholeLanguage` what they add up to, as `checkWorld` and `checkWhole`
  already did for the world.
- **Pointing.** `i`, `me`, `my`, `you`, `your` hold nothing of their own: a word
  carrying `marks: "from"` or `marks: "to"` names no term, and lands on the
  circumstance of the signal it arrived in — `brainFrom(input, knowledge,
  { from, to })`, supplied by the runtime. Every language has such words and no
  world can define them, so nothing about who is talking is held anywhere: a
  person, a device, a service, all the same to the brain. Told nothing, it does
  not guess — the pointer lands nowhere and the question goes unanswered.
- **Identity, as links and no code.** `self is computer`, `self has mind`, with
  `machine` and `memory` as terms, `computer` under `machine` — not every machine
  is a computer — and `computer has memory`, since a memory is not this
  instance's to claim. So *are you an organism?* is **No.** by exclusion, *are
  you a machine?* is **Yes.** by walking two links, and *do you have a memory?*
  is **Yes.** by being a computer.
- **A thing holds what its kinds hold.** Only the `is` chain is walked for its
  own sake now; every other relation is inherited down it, on questions and on
  claims alike. A walk that comes back empty answers `none` — nothing is what it
  has, the way zero is what a count of nothing counts.
- `i`, `me`, `my` and `am` in English. The letter `i` gives up the word to the
  pronoun, as the letter `a` already gave it up to the article.

- **`src/store.js` — the world kept in SQLite**, seeded once from
  `data/world.json` and read back in the same shape every other source uses, so it
  is validated on the way out like any of them. The schema is a second wall, not a
  replacement: `unique (name)` on a term, foreign keys on both ends of every link,
  and a unique link tuple.
- **Memory survives a restart.** Persistence is opt-in by naming a path in
  `ACI_STORE`; a run not told to remember uses an in-memory store and is never
  haunted by one that was. `forgetLearned` drops what was taught and leaves what
  was seeded.

### Removed

- **The brain's name, as a word.** `ACI` was a word in `languages/en.json`
  naming the self term, so every instance of the engine answered to one name
  shipped in the box, and a name question was a case of its own in the engine.
  A name is a fact about one instance: the runtime loads it **into memory** in
  the shape everything else takes (`knowledge/identity.json`), `"what is your
  name?"` is an ordinary walk over the `name` relation, and an instance loaded
  nothing answers `none` rather than inventing a name.

### Fixed

- **A store written before the world grew kept the old world for ever.** It was
  seeded only when empty, so every term, link, anchor and relation added since
  was invisible to a run that remembered anything. The authored world is laid
  down again on every open now, and what was learned is left exactly where it
  is. A store predating the `symbol` column gains it on open.
- `have` was not a word — only `has` — so `"you have a memory?"` did not parse.
- **Word order was the engine's.** Which side of an action holds the doer was
  decided in `src/brain.js` by position, which is English and not much else — a
  verb-final language had it backwards. The language declares it now
  (`"parts": { "before": "agent", "after": "target" }`), the brain names neither
  side, and told nothing it assigns no part by order at all.
- A question was answered with the first thing found and the rest dropped, so a
  brain that has a mind **and** a memory said only *mind*. It says all of what it
  found; what goes between them is the language's (`speech.list`).
- A question the brain could not even form was answered *I know.* — the bound
  fallback did not look at whether it had been asked something.
- An action in a signal was carried out even where the signal was *about* it, so
  a claim naming one was swallowed and recorded as a happening. The joint is
  never one of the things joined: a relation named between two things is a claim.
- A name the language cannot say was answered with nothing at all — an empty
  string, dressed as an answer. A question the language cannot voice is a gap
  like one the world cannot fill, and the brain says it does not know.
- A link with no moment could be written twice: SQLite holds two nulls to be
  different, so the unique index did not catch it. The column is never null now.
- Every test owns entities no other test touches, and the brain-level tests no
  longer call a global `forget()` — under concurrent runs one test could wipe
  another's facts mid-way.

- The world roughly doubles: **554 terms, 542 words, 95% sayable.** Reptiles and
  amphibians, twenty-five mammals, birds, fish, insects; vegetables and more fruit;
  furniture, vehicles, buildings, tools, landforms, weather, seasons; nineteen
  kinds of person, including the family words; numbers to twenty and the round
  hundreds.
- `disjoint: true` on a term: its children are kinds apart from one another, so
  one marking replaces every pair of `different` links that would otherwise have
  to be written. Thirty parents carry it.

### Fixed

- `material` duplicated `substance`, which already held the solids. Its children
  moved under `solid` and the duplicate is gone — it had made `ice is a material?`
  answer *No.*

- **Roles, and events.** An action is no longer a claim between two terms: what
  happened is recorded as an **individual** — of its kind, with the parts things
  played in it, and with a moment. Nothing new was needed to hold it; an event is
  an individual like any other, so `learned` may now hand back more than one term.
- `agent`, `patient`, `source` and `destination` as relations, with anchors. A
  word may assign a part (`from` a source, `to` a destination) and what no word
  says is read off the order things were perceived in. A marker may reach over
  words that name nothing but never past another thing.
- `marking` on a language: which side of a marker the thing it marks falls on.

### Fixed

- `give` worked on whatever other thing happened to be in the signal rather than
  on its destination. It was right by luck and is now right by construction.
- What the brain refuses is no longer recorded as having happened.

- **Negation.** A word may carry `negates: true` and a link may carry
  `not: true`. The brain could deny a claim it had checked; it could not *hold* a
  negative fact, so `not X` was unthinkable. Now a denial is knowledge: telling it
  `"a basket is not a tool"` turns `"a basket is a tool?"` from *I don't know* into
  *No.* A denied link joins nothing, and a denial the world contradicts is refused.

- The world reaches into the physical: `force` with `gravity` under it, `push` and
  `pull` as work, `up`/`down`/`left`/`right`/`front`/`back` and `near`/`far` as
  positions, plus `earth`, `ground`, `sky`, `mass` and `speed`. Gravity causes
  falling and weight; pushing and pulling cause motion; falling goes down and
  rising goes up. Twelve pairs of opposites now exclude each other.
- Words for every plainly-named term the world already held: **312 words, and 92%
  of terms sayable, from 17%.** Colours, sizes, temperatures, feelings, periods,
  motions, body parts and qualities were all stocked shelves nothing could name.
- `marks: "unknown"` on `what` and `how`, so a hole is a word the language marks
  as one rather than any word with no term behind it.

### Fixed

- A claim may be about anything that exists, not only about a thing. `"gravity is
  a force?"` answered nothing at all, because the brain would only make claims
  between things.
- A term that *is* a relation could be mistaken for the relation a claim is made
  by. A relation now counts as the claim only where there is something on each
  side of it, and the copula is never one of the things joined.

- **Time.** Every state link carries `at`, and `world.now()` is the brain's clock:
  one past the latest moment anything was stamped with. It ticks on what happens,
  not on any outside time, so the same signals in the same order give the same
  moments. Revising a count no longer overwrites the earlier one — `world.heldOver`
  gives what a thing held, in order, and `world.held` gives the latest.

- `derivations` in `languages/*.json`: a word not listed may be derived from one
  that is, by taking an ending off and putting back what it replaced. Three rules
  reach every plural noun in English and **no plural is written down anywhere**.
  A listed word always wins, `of` keeps a rule to one part of speech so `as` does
  not become the article `a`, and the word carries `derived: { from, ending }`.

- `marks` on a word: `"new"` introduces one, `"known"` means the one already
  spoken of. That a signal can do either is the brain's; which word does it is the
  language's, and `a` / `an` / `the` now say so in `en.json`. Two `a basket`s make
  two baskets, and `the basket` with two of them means nothing — the brain says it
  does not know rather than picking one.

- **Individuals.** A term marked `individual: true` exists once and `is` its kind.
  State now belongs to one of these, never to a kind: told a basket holds three
  apples, the brain makes a basket rather than concluding that baskets hold
  apples. Individuals are created by the brain, handed back in `learned` like any
  other knowledge, and given the next free id, so the same signals in the same
  order give the same individuals.
- `world.isIndividual`, `individualsOf`, `oneOf` and `nextId`. Counting a kind
  counts kinds and skips the things that exist once.

- Actions that change state. The world links an action to the operation it causes
  by `cause` — `take` causes `minus`, `give` causes `plus` — and the brain works
  the arithmetic on what a thing holds and keeps the result. Nothing in the engine
  knows what taking is. A result the world cannot name is not held: taking more
  than is there is refused and the state is left alone.
- `take` and `give` words, `from` and `to` as prepositions, and a grammar rule for
  the form.

- **State, and memory of it.** A link may carry a `quantity`: what a thing holds
  now, as against what it is. Telling the brain a different count revises it
  instead of being refused as a contradiction, and `"basket has how many apple?"`
  reads what is so now. `world.held(subject, rel, object)` is the lookup.
- A number spent saying how many of something there are is no longer treated as
  one of the things being spoken about, so `"basket has three apple"` makes its
  claim about the apple rather than about the three.
- `basket` (307) under container, and words for `basket` and `container`.

- **Arithmetic, as a brain primitive.** Adding, subtracting and comparing are
  computed by the engine, not walked over links: they would not change in another
  language or another world, so by the spec's own two questions they belong in
  the brain. The world's whole part is a `value` on a number term saying which
  number it names — `world.valueOf` and `world.termFor` are the bridge.
- `plus`, `minus`, `more` and `less` as relations a signal can name, with anchors.
  `"two plus three?"` answers *five*; `"one less three?"` answers *Yes.*
- A result the world has no term for is not invented: `"nine plus four?"`
  computes 13 and then says it does not know what to call it.

- **Counting — the brain's first operation.** It could walk links and check
  claims; it could not do anything. It now counts the terms that link to a kind
  and names the count with `world.termFor`. `world.members(id, rel)` gives what
  links to a term, the other way from `linked`.
- `order` links across zero..ten, recording the sequence of the numbers.
- "how many X?" answers with the number term walked to: seven mammals, five
  fruit, one bird, zero elephants. Where the chain runs out the brain says it does
  not know rather than inventing a number it has no term for.
- Words for four through ten and zero, without which the count could be made but
  not said.

- A number standing beside a thing now says how many of it there are: `solve`
  hangs a `quantity` node off the thing. Before this, `"two dog"` was two
  unrelated things and the count was dropped — `"two dog is an animal?"` made its
  claim about `dog` alone, with term 115 appearing nowhere. Read off the order,
  from either side, and a number is never a count of itself.

- `mammal`, and `tiger`, `elephant`, `hyena` under it; `pear` and `orange` under
  fruit. `cat`, `dog`, `cow` and `human` re-parented onto `mammal`, and `sparrow`
  onto `bird`, so the chains say what they mean.
- Nineteen exclusion links among the new kinds, so a sparrow is not a mammal and
  a pear is not an orange.
- Words for twenty-seven terms, most of which the world already held and could
  not say: cow, snake, sparrow, fish, insect, mango, banana, flower, grass,
  knife, hammer, pen, phone, computer, book, moon, star, cloud, tool, vehicle,
  building.

- Disjointness. `truth` has three values instead of two: `true`, `false`, and
  `unknown`. Failing to find a path is no longer reported as denial — only terms
  that **exclude** each other make a claim false. `world.excludes(x, y)` walks
  the `different` relation, which the world already declared and never used, and
  exclusion settles claims about kind only.
- The ontology's own top-level splits as `different` links: physical/abstract,
  object/substance/organism, animal/plant.
- The `unsure` intent, voiced in `en.json` as "I don't know."
- A contradicted claim is refused rather than learned, so teaching the brain
  `"a cat is two"` no longer makes a cat reach `number`.

- Memory. Told a claim it does not hold, the brain learns it and hands it back as
  `result.learned`, world-shaped. The brain keeps nothing — `brainFrom` stays
  pure — and `src/index.js` re-assembles knowledge through the same `fromSources`
  door as every other source, so a memory that will not pass the shape check is
  not kept. `forget()` returns the brain to what it was born and taught.
- A claim that would close a loop is refused rather than learned, with a `refuse`
  node saying so: a relation already running from the object to the subject
  cannot also run back.
- A question the world cannot fill keeps its `answer` node with `found: []` and
  is expressed as `unknown`. What the brain looked for and did not find stays on
  the tree.

- The brain answers questions. A signal naming a relation with one term and
  something unresolved is a question, and `judge` solves for the hole instead of
  checking a claim: `"what is a cat?"` and `"a cat is what?"` both answer
  *animal*, because the term given is the one being asked about wherever the hole
  falls. Adds an `answer` node and the `answer` intent.
- `what`, `your` / `ur` / `you`, and `name` in `languages/en.json`, with grammar
  rules for a fronted question and a pronoun subject.
- `anchors.name`: a question over the name relation answers with **what this
  language calls the term**. The brain's own name is not a fact it holds — it is
  the word naming its `self` term, so `"what is your name?"` answers `ACI` in
  English and would answer otherwise in another language file.
- `world.linked(id, rel)` — what a term links to directly, where `isA` asks
  whether it reaches something.
- `world.baseRelation` — `is` is the weakest claim a signal can make, so any
  other relation a signal names takes precedence over it.

- `src/shape.js` — the one shape all knowledge must take. Every source, internal
  or external, is validated by the same rules before the brain sees it, and a
  source that does not fit is **refused, never trimmed to fit**: dangling links,
  duplicate ids, anchors pointing nowhere, unknown fields, words with no meaning,
  a grammar whose start has no rule. Errors name the file at fault.
- `knowledge/*.json` — knowledge taught on top of the base world, world-shaped,
  loaded by convention at startup. A file may add terms and add links to terms the
  world already has; it may not redefine a term, move an anchor, or reassign a
  relation.
- `src/knowledge.js` — `fromSources({ world, knowledge, languages })` validates
  every source, merges, and returns what the brain takes.

- `src/relations.test.mjs` — proof that the engine reasons over any relation, not
  only `is`: two relations across the same terms, each walked separately, each
  running one way. `wing parts bird` is true while `wing is bird` is false.

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

- The brain no longer hands the language a finished sentence to store. It hands
  over the **terms it means**, and `expressions` gives a frame filled with this
  language's words for them: a slot naming a role in the new `speech` map takes a
  function word, a slot holding a term id takes `wordFor(term)`. `"I don't know."`
  is written nowhere — it is the speaker word, the frame's negation, and whatever
  this language calls term 285. `anchors.know` names that term.
- `"I understand."` became `"I know."`, composed the same way, and more accurate:
  the brain is reporting that it already holds the claim.

- `brainFrom(input, knowledge)` takes **one** argument for everything it knows,
  and will not grow another: a new source is a new file in `languages/`,
  `knowledge/` or `data/`, assembled by the runtime.
- `isA` follows **all** links of a relation rather than the first, so a term may
  hold links from the world and from knowledge at once. The world is a graph.

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
