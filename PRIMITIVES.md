# Primitive foundation audit

This is the implementation checklist for the deterministic brain. It records
what the engine can actually infer, not merely which words or terms happen to
exist in a data file.

The admission test for a primitive remains:

1. Would it change with the language? If so, it belongs in language data.
2. Would it change with the world? If so, it belongs in world knowledge.
3. Only the invariant operation that survives both tests belongs in the core.

One exception is recorded deliberately. Time's steps — a day is twenty-four
hours, a week seven days, a year twelve months, and which years are leap — live
in the core, though they would fail the second test. There is one time scale
and every brain shares it, and a brain that must be taught the calendar cannot
reason about time at all. Weight does not follow: a world picks kilograms or
pounds, so its steps stay world knowledge, and the core converts either way by
walking steps and multiplying. Which term is which unit is still the world's,
through the anchors.

`existence` is intentionally the terminal ontology root. `nature` is therefore
not required above it. Physical nature may be world knowledge about the
universe; the nature or essence of an entity may later be an ordinary relation.

## Campaign priorities

Work proceeds on **clean deterministic inputs** first: a canonical statement
(one fact, or a short deterministic chain) followed by a plain hole question.
The admission test above still applies to every candidate — the bar is
inference, not vocabulary.

**Out of scope for now** — language-specific and phrase-specific constructs:
particular phrasings, dangling prepositions, passive voice and conversational
fillers whose only obstacle is wording rather than an underlying inference.
Inputs that fail only because a word or term would live in language or world
data are likewise set aside.

The five known failing files — `causal`, `foundation`, `homonyms`, `names`
and `universe` — are the current regression baseline. Fixes must not regress
them and must not add failures elsewhere.

Verified clean-input gaps, from the `scan-clean` probe (previously
`.probe/scan-clean.mjs`), in the order they surfaced:

1. **Extreme other end.** _Fixed_ — `who arrived last?` answers the far end of
   an ordering the way `who arrived first?` answers the near, read through the
   ordering's declared converse (`last` joins `first` the other way round).
2. **Aggregate comparison.** `who has more apples?` was `unsure` after
   `john has 5 apples`, `sam has 3 apples`, despite `how many apples does
   john have?` answering. Comparison now ranks a counted set's holders and
   answers `more` from the top and `less` from the bottom of the held counts.
3. **`of`-compound questions.** `the capital of france is paris` is stored,
   yet `what is the capital of france?` and `is paris the capital of
   france?` both answer `unknown`. The compact form `france capital what`
   already answers, so only the `of` phrasing is unresolved.
4. **A doing inside an ordering.** _Fixed_ — `sara arrived before john`
   related sara to john and never recorded that either arrived, so `did sara
   arrive?` answered `I don't know` in a conversation that had just said so.
   An ordering whose word sits on a doing now keeps the happening for each of
   them — who did it, where (told no place, the brain's own **somewhere**),
   and when — beside the ordering that still reads its two ends. The far-end
   readings (`who arrived first/last?`) that the ordering answered before are
   unchanged.

## Status legend

- **Implemented**: represented, reasoned over, validated and covered by tests.
- **Partial**: a sound useful subset exists, but the primitive is not general.
- **Missing**: a word or term may exist, but no corresponding inference exists.
- **Deferred**: useful knowledge or language coverage, not a foundation blocker.

## Capability matrix

| Foundation | Status | What works now | What is still foundationally missing |
|---|---|---|---|
| Existence | Implemented | Four modes exist: thing, property, relation and action. `existence` is their root. | No higher answer is expected for `what is existence?`; adding another label only moves the root. |
| Identity | Implemented | Stable term ids, named individuals, deterministic id allocation, self and contextual pointers. `same` is reflexive, symmetric and transitive; equivalent representatives substitute through classification, relations, denials and quantity state without copying facts. `different` is a general symmetric, irreflexive relation and numeric equality remains exact. | Rich identity criteria for changing objects and events belong with the later state/event foundations. |
| Classification | Partial | Explicit transitive `subtype`, direct `instance` and non-classifying `predication` relations retain a compatible broad `is` surface; inherited positive and negative facts, disjoint kinds, cycle rejection, kind versus individual metadata, and open-world living/nonliving/unknown judgement. | Legacy authored classification edges remain accepted and interpreted during migration. General class intersection, union and complement are not represented. |
| Relations | Partial | Direct, declared-transitive and subrelation walks; converse, symmetric, reflexive, irreflexive, functional, domain and range semantics; explicit denial, asymmetry and contradiction checks. | Inverse-functional semantics. |
| Propositions and logic | Partial | Held, against and absent are distinct; negation is explicit; multi-fact learning is atomic; conjunction, immediate conditions and basic quantifier scope work. A claim is already a term of its own — subject, object, the relation it claims and its polarity — and `cause` relates one claim to another. | No relation but cause and the instruction pair reaches a claim, and no language says one: `i know the door is open` is not read. Stored rules, variables, implication chains, general disjunction, biconditionals and proof explanations are missing. |
| Composition | Partial | Transitive strict `part` and converse `made-of`; atom, molecule, element and matter connect to the universe. | Component, material, member and portion are conflated. Direct part, cardinality, structural role and required versus optional parts are absent. |
| Space | Partial | `in`, `on` and `under` facts; current placement with retained history; position labels such as left/right and near/far. | Binary spatial relations, containment topology, overlap/contact, distance values, reference frames and motion paths. `in` is currently also the converse of general holding. |
| Time | Partial | Deterministic logical ticks, retained history, past/now/future, strict transitive before/after and coarse event time. | Duration, intervals, start/end, simultaneity, overlap, event-to-event order, exact temporal references and arbitrary historical queries. |
| State and change | Partial | Quantity and placement revisions are timestamped; latest state is selected; arithmetic actions produce before/after counts. | General value-at-time, transition, becomes, starts/stops, persistence, termination, preconditions and postconditions. Ordinary properties do not yet share one state model. |
| Events and actions | Partial | Occurrence individuals with logical time and agent, target, source and destination roles; occurrence and participant questions. | Event identity, duration, event composition, goals, plans, capability, generic preconditions/results and multi-target effects. |
| Causality | Partial | Generic transitive cause queries; selected actions map to arithmetic effects; physical force consequences are inferred. | Causes cannot relate proposition or event objects. Direct versus indirect cause, enabling, prevention, intervention, causal time and stored explanation are missing. |
| Quantity | Partial | Exact arithmetic, order, comparisons, counts, all/some/none scope, integer state quantities and same-unit measurement comparison. A comparison's algebra and its converse follow from the scale it compares on, rather than being authored per word. | `many` and `few` have no relative semantics. Ranges, ratios, cardinality constraints, dimensions and unit conversion are missing. Thus the brain cannot infer “many parts.” |
| Properties and measurement | Partial | Property/state/scale/unit terms, non-classifying property predication, relation-level domain/range typing and measured comparison on a shared unit. | A general attribute-value model, typed values, single-valued properties and conversions. Measured-state modeling is not yet unified with ordinary predication. |
| Modality | Partial | Modal clauses are held at arm's length and never asserted as facts. What a thing is able to do is an ordinary fact the world keeps, inherited down the kind ladder and never up it. | Possible, impossible, necessary and actual have no distinct semantics; every modal but `can` merely checks current knowledge. |
| Knowledge and evidence | Partial | Internal truth status, explicit denials, atomic checked memory, embedded-claim checking and sender-scoped opinions. | First-class claims, knower-specific knowledge/belief, evidence, source provenance, justification and reliability. |

## Correctness repairs before expansion

These are defects in existing foundations, so they take priority over adding
more world vocabulary.

- [x] Make living classification open-world: `living`, `nonliving` or
  `unknown`. Absence of an organism path is not proof of non-life.
- [x] Require a force to be held by the universe before its effects propagate
  to every physical thing. A held force-kind admits its classified members;
  classification by itself activates nothing.
- [x] Remove the generic reverse-edge-as-loop assumption. Reverse facts are
  contradictory only for relations whose algebra says so; symmetric relations
  must be learnable.
- [x] Settle one term order in the world however it arrives. A file authors
  its terms in whatever order reads well and the store hands them back by id;
  `data/world.json` is not in id order, so `members` gave the same set in a
  different order through the two doors, and one answer path hands that list
  straight out.
- [x] Carry `individual` and `disjoint` from a knowledge file onto a term the
  base world already holds. Every other mark was carried and checked; these two
  were dropped in silence.
- [x] Keep what a standing instruction learns when it finally fires. The fact
  was handed to the caller and never written, and the instruction was dropped
  in the same turn, so it had nowhere left to come from. Unreachable while
  `knowledge/following.json` stands, and repaired by inspection.
- [x] Stop a growing world losing its own new terms to memory. Learned ids are
  taken from the top of the authored world, and so is the next authored term;
  the seed upsert skipped the collision in silence, and a name the world later
  brought back stopped the brain opening at all.
- [x] Validate an accepted fact without rewalking the whole world. The walk
  was the brain's own, not the door's: `checkWhole` is already skipped for a
  world read back unchanged, but every accepted fact was weighed by re-deriving
  the whole world's relation algebra from every term — 49ms at 2929 terms, and
  half of a learning turn. A change joins a world that was already whole, so
  each rule now starts from what the change touches and asks the world for the
  steps out from there: 0.1ms, and no longer growing with what is known. A
  learning turn went from ~90ms to ~37ms. Reading the world back out of the
  store has since gone too — the brain grows the world it already holds — and
  what remains is rebuilding its indexes, 14ms of every 34ms turn and still
  O(world) per fact. Indexes that grow with a change rather than being built
  again are the next thing to take out of the loop.
- [x] Decide what a derived fact does when the world denies it. Settled: a
  denial stands. What somebody said outweighs what the brain worked out, so a
  derived fact is never written over a denial and never answers in its place —
  and the brain says that what it was told and what follows from what it was
  told disagree, so a wrong rule cannot hide behind the exception it makes.
  Nothing to build until rules land; the rule they must follow is this one.
- [x] Make the ordering the scale's rather than the word's. Sixty-three
  comparison relations, one per adjective, meant `hotter` and `warmer` were
  two orderings on one scale and a chain said half in each reached nothing.
  Forty collapse into fifteen; the twenty-three on no scale keep their own.
  Direction is the state's and the end read from is the word's.
- [x] Join a scale to the thing it is a scale of. `light`, `sound` and `heat`
  were held as kinds of energy and `temperature` as a property, with no
  relation able to say a property is a property of something — so `bright` and
  `dark` reached `state` and stopped, and `darker` could not read `brighter`
  backwards. Not through seeing: a candle is dimmer than a lamp in an empty
  room.
- [x] Make `measure` run one way. It was authored in both directions at once —
  thirty-three links saying a state measures its scale, twenty saying a scale
  measures its states — and the brain read the second, which only five
  properties carried. Forty-four of the sixty-three comparisons reached no
  scale, and `taller`, `wider` and `longer` all reached `size`. A gram
  measures weight and weight measures heavy; nothing is measured by what it
  measures. `length` also held four quantities at once, and now width, depth
  and thickness are their own.
- [ ] Keep grammar/parser ordering risks deferred while language work is
  paused. They are deterministic for identical ordered data, but some choices
  still depend on authored alternative order.

## Dependency-ordered roadmap

### 1. Truth and relation substrate

- [x] Repair three-valued living classification.
- [x] Add declarative symmetric relation semantics.
- [x] Add declarative reflexive and irreflexive relation semantics.
- [x] Add declarative functional relation semantics where justified.
- [x] Add subrelation semantics and lift narrower facts into broader relations.
- [x] Add relation domain and range semantics.
- [x] Separate subtype and instance membership without losing the existing
  broad kind walk.
- [x] Separate property predication from the classification ladder while
  preserving the broad copular query surface.
- [x] Give `same` equivalence semantics and `different` general symmetric,
  irreflexive semantics.

Every later primitive depends on trustworthy identity, typing and relations.

### 2. First-class propositions and rules

- [x] Represent a proposition as data with subject, relation, object and
  polarity. Done ahead of this plan and not recorded: `the door is open
  because the wind is strong` already writes two `claim` terms, each holding
  `claim-subject`, `claim-object` and the relation it claims, and joins them
  by `cause`. Scope is not represented.
- [x] Make a proposition a legal endpoint of *any* relation. A signal that
  speaks of a claim now writes the claim down and joins whoever holds it to it
  by whatever the signal joined them with. English says one with `know that`,
  and the world holds the relation that names. What a relation over a claim
  *means* — knowledge against belief, evidence, modality — remains phase 5's.
- [x] Ask back over a claim. A question naming somebody holding one asks
  after the holding, not after what the claim says, and the hole may stand
  where the holder does.
- [x] Store safe conditional rules and derive them deterministically with an
  inspectable proof path. Rules were already stored and already fired; what
  was missing was the path. A claim an instruction reaches is joined to the
  claim that met its condition, so a worked-out fact says what it followed
  from and a chain is walked back a step at a time.
- [~] Add variables and quantifier scope without closed-world inference. A
  rule naming a kind holds of every one of that kind, and what met its
  condition is what its consequence is about — one thing bound across both
  halves. Scope beyond that, and a variable standing where no kind is named,
  are not represented.

The two repairs above — incremental validation, and denial versus derivation —
come first. The first is a cost that becomes structural here; the second is a
semantics that rules cannot be written without.

### 3. Unified time, state and change

- [x] Represent moments and intervals, duration, start/end and simultaneity —
  *the chrono*. An ordering the conversation holds now lives on a single chain
  of moments, one member-set and one before-link each, and the pairwise `order`
  fact row is no longer written (`feat(core): the chrono is the one store for
  ordering, not order rows`). A moment rows may also carry an absolute `at`
  (seconds since an arbitrary nought), so the calendar's own arithmetic
  (`calendar.js`: `momentOf`, `calendarOf`, `UNITS`, `IN_SECONDS`) can say a
  clock time and a duration against the same scale. Intervals below are two
  moments whose `at`s differ; simultaneity is one moment with two members.
- [ ] Read clock times into absolute moments. What exists today, probed:
  `sara arrived in the morning` already writes `event(..., at morning[518])` on
  the action row — the event carries its coarse period — and an `at` measure
  lands on the row too: `the backup started at ten hours and fifteen minutes`
  writes `at 10 hour[220]`, so a doing already carries a clockable count. A
  clock reading like `the clock reads ten hours and fifteen minutes` holds both
  `time: 10 hour` and `time: 15 minute` on the node, so the composition
  `calendar.js` needs is already spoken by the engine in pieces; what a reading
  has yet to do is join hours and minutes into one minute-of-day, add the
  morning/afternoon offset, place that on the chrono moment's `at`, and say it
  back (`when did the backup start?` answers nothing today). Construction notes:
  the compound numeral grammar does not pass the teens (`nine fifteen`,
  `eleven fifteen` are `unknown` while `ten thirty` and `nine forty five`
  count), the `when` interrogative (concept 567) has no answering path, and the
  answer-side numeral-to-saying path spells a quantity as figures rather than
  as hours and minutes.
- [ ] Add durations, `start`/`end` and offsets. `ran for thirty five minutes`
  needs a doing that is a stretch: its start moment and its end moment, and the
  difference read as `how long did the backup run?`. `ten minutes after the
  backup finished` is the same arithmetic run forward from a known `at`. The
  ordering half is speakable now — the operations vocabulary (backup, update,
  crash, restart, finish) is authored, each doing records its event, and
  `the server started before the backup` stands once on the chrono with the
  reverse refused (`feat(core): the operations vocabulary records its doings on
  the chrono`). The stretch and its length are in too — `ran for` holds the
  amount (`how long` reads it back), `when did it finish` composes start plus
  it, and the span between two clocked doings answers as minutes (`how many
  minutes after the server started did the crash happen`) — with `feat(core):
  name the numbers twenty-one to ninety-nine` supplying the words a compound
  minute needs. The offset and the band are in too: `N before/after X started`
  records the doing's clock on the record (shown above as part-of), and the
  band `more than N before/after X` compares the gap and answers yes or no.
  What still waits on the phase is the offset that stands without a clock to
  read — `later`, and writing a clock when the placed doing was never told when
  it happened.
- [ ] Generalize quantity/placement history into value-at-time state.
- [ ] Add transition, becomes, starts, stops and persistence semantics.
- [ ] Connect event time and causal order to the same temporal model.

### 4. Space and composition

- [~] Introduce binary spatial relations and containment/topology. `left of`
  and `right of` are orderings, strict and running through by being ones, and
  a relation the world classifies as an ordering no longer says so itself.
  Containment, overlap, contact and the other axes are not represented.
- [ ] Separate `component-of`, `made-of-material`, `member-of` and portions.
- [ ] Distinguish direct part from transitive part.
- [ ] Add composition cardinality and structural roles.
- [ ] Only then author facts such as wheel component-of car and car made of
  metal.

### 5. Cause, modality and epistemics

- [ ] Replace the force shortcut with general, world-declared causal rules.
- [ ] Model cause/effect, enable/prevent and precondition/result.
- [ ] Add actual/possible/impossible/necessary and capability semantics.
- [ ] Add knower, belief, evidence and provenance over first-class claims.

Phase 2 makes a proposition something a relation can point at; this phase is
where those relations get their meaning. The split is deliberate — do not read
phase 2 as delivering epistemics.

### 6. Quantity and measurement

- [ ] Add dimensions, compatible-unit conversion, ranges and ratios.
- [ ] Define cardinality constraints and relative `many`/`few` semantics.
- [ ] Connect quantities to collections and composition without guessing.

## Deterministic acceptance probes

Each implementation chunk must add language-neutral unit tests plus end-to-end
tests. The expected semantic outputs below are intents, independent of the
words a language uses to voice them.

| Entity/action input | Expected output after its phase lands |
|---|---|
| unknown focused entity → living/non-living choice | `unsure`, not `nonliving` |
| tree → living/non-living choice | `living` |
| car → living/non-living choice | `nonliving` once its object classification proves exclusion from organism |
| dog → `is … living` predicate | `affirm` through organism classification; no language phrase in core |
| root thing → `is … living` predicate | `unsure`, preserving open-world status |
| A relates-to B, then B relates-to A, with no strict characteristic | second fact → `learn` |
| A connected-to B, with connected-to symmetric | B connected-to A → `affirm` |
| A reflects A, with reflects reflexive | `affirm` without a stored self-edge |
| A differs-from A, with differs-from irreflexive | `deny`; no learning |
| A has-value B, then A has-value C, with has-value functional | second timeless fact → `deny`; memory unchanged |
| A has-value B at t1, then C at t2 | current query → C; B remains history |
| A taps B, with taps a subrelation of touches | A touches B → `affirm`; no copied fact |
| Alice drives car, with drives domain person and range vehicle | Alice is person; car is vehicle → `affirm`; no copied type facts |
| Fido instance dog; dog subtype animal | Fido is animal → `affirm`; Fido instance animal → `unsure` |
| sky predication blue; blue subtype colour; colour subtype property | sky is blue → `affirm`; sky is property → not held, never inferred |
| A before B, then B before A | second fact → `deny`; memory unchanged |
| wheel component-of car | car has-component wheel → `affirm` through its declared converse |
| car made-of-material metal | wheel made-of-material metal → `unsure` unless a composition rule proves it |
| heating causes water becomes hot | asking why water is hot returns the stored cause/proof, not a guessed answer |
| event A before event B with known timestamps | `affirm` from the shared temporal model |
| one kilogram equals one thousand grams | `affirm` only through declared compatible-unit conversion |

## Reported, not yet fixed

Examples that came back wrong, with what each waits on.

- `x is taller than nila` learns nothing, and `who is the tallest?` answers
  `nila`. English declares `x`, `y`, `z` as nouns marked *named*, and the
  name-giving rule requires what follows to be a number only for words nothing
  knows — a word already marked *named* skips the check, so `x` is bound to the
  relation `more-tall` itself. A name stands for something: what a name is
  given must be a thing or an amount, never a joining. Small, and ready.

- `x is my friend` records `holding(me, friend)` and a separate node for `x`,
  with nothing joining them. Being somebody's friend is a relation between two
  people; it is read here as having one, and a third node is made for the
  friend itself. Waits on nothing but the reading.

- `where is the apple now?` after `put one into a basket` answers `I don't
  know`. The putting is on the record as a doing with a destination, and
  nothing turns it into a placement. Waits on what a doing results in.

- `how many times did i greet you?` is not understood, and `did i greet you?`
  says `I don't know` with the greeting on the record. Nothing counts
  occurrences of a doing, and a question marking the past is matched against a
  coarse stamp rather than the moment the doing happened at. Waits on the
  temporal foundation.

- `when did nila arrive?` says `I don't know` with the arrival on the record,
  its when written twice over — past, and yesterday by name. The question now
  asks after when and names the part it wants, and still nothing answers: the
  walk that reads a doing's parts does not reach this one. A fact now answers
  from either of its ends; a doing's parts still answer from one.

- `there are seven days in a week` and `how many days are there in a week?` are
  not read, though `a week has seven days` and `how many days does a week have?`
  both work. English declares only `there predicate` — enough for `there is a
  dog`. Adding rules for the longer forms makes them parse into nonsense
  (`measure(day, in)`), so what is missing is the reading, not the rule: what a
  signal saying something is *there* says about what holds it.

- `what is mobile?` answers `toy`. The world holds one `mobile`, authored among
  the toys; the phone sense is not there. Adding it makes the first English
  word with two noun senses, which nothing settles without context. Waits on
  word sense from context.

- `the update started ten minutes after the backup` reads and orders (`mine`,
  the moment after), but `when did the update start?` still answers nothing:
  the offset never becomes the doing's clock reading. `the update started ten
  minutes *after the backup finished*` is not understood at all — an
  `after`-clause naming another doing's end has no reading. Waits on
  composing offset + reading into a moment.

- The numbers twenty-one through ninety-nine are now in the language and the
  world (terms 54021–54099, ten-to-one compounds), so `thirty-five minutes`
  and `ten 25` word and figure readings both join a clocked day. The gap they
  left is closed: what reported the earlier entries is fixed. Remaining
  number gaps still wait on the same machinery for 101+ and for `took`.

- `the update took 25 minutes` loses the amount: `took` is the past of take
  (give/take 283), so the duration goes nowhere. The durative `took` sense is
  a second reading of one word; waits on word sense from context.

- `the server restarted twenty minutes later` is not understood: no `later`
  word exists in the language data. Waits on the offset composition above.

- The span between two clocked doings now answers: `how many minutes after the
  server started did the crash happen?` reads each doing's clock off the record
  and answers `110 minutes` (nine fifteen to eleven five); asked of a doing's
  end, the end is the other side of the gap (`how many minutes before the crash
  did the update finish?` answers `fifteen minutes` from a start ten fifteen
  plus a thirty-five minute run). The question must ask in a clock's units —
  asked *when* one of the doings was (`when did the crash happen after the
  server started`) the gap is a different question and does not answer. Two
  gaps remain. A bare `before the crash` with no second doing alongside is not
  read: `how many minutes before the crash happened?` is `unknown`, and the
  `by how much` form (`the update finished before the crash by how much?`)
  asks without naming a unit, so nothing spans it.

- The temporal clause and the band are in. A `more than N`-clause that frames a
  connected pair is read at last, because English now says it: the grammar
  admits a preposition over a subject and a verb (`after the server started`),
  a quantity in front of the clause (`two hours after the server started`), and
  the verb-comparative before the quantity (`more than two hours after the
  server started`). With the grammar the deeming comes with it. Told `the
  crash happened two hours after the server started`, the crash's clock derives
  from the server's start and reads back (`eleven fifteen`, and the offset
  reads back `two hours`), the same for `before`; with no clock for the placed
  doing nothing is guessed. Asked `did the crash happen more than two hours
  after the server started?` the gap is compared against the reach and the
  answer is yes or no (`No. ❌`, while `more than 100 minutes` and `less than
  two hours` affirm). One piece of the band family still waits: `is thirty
  minutes more than ten minutes?` does not deem — comparisons that are not a
  yes/no over a span still work only on bare numbers. And `the server restarted
  twenty minutes later` and `the update started ten minutes after the backup`
  still do not parse: `later` has no word, and the offset needs the source
  doing's clock read off the record with nothing said about it happening.

## The event primitive, part built

An event is a bounded stretch of time with people in it and doings inside it.
Three things tell it from an ordinary doing, and one of the three is in.

- **Extent — in.** English can say how long: `the meeting lasted two hours`
  holds `measure(meeting, hour) {count: 2}`, the same fact shape as a rope
  being two metres, on the time scale. Said with `took` it is not read — `took`
  would need choosing between taking a thing and taking a length of time, by
  what completes it, which is the word-sense work that is parked.

- **Extent, asked back — not in.** `how long was the meeting?` and every
  phrasing of it come back unanswered, though the fact is held. What is left of
  the near-end class: a fact answers from either end now, but what a doing
  holds is not reached by asking after it.

- **Membership — not started.** Being at a meeting is not doing it and not
  having it done to you. Nothing in the brain says a thing is one of those in
  an event.

- **Containment — not started.** Nothing says one doing happened inside
  another, so `nila spoke during the meeting` has nowhere to put the during.
  This is what makes events the place nesting starts.

One shape deviation to settle with it: a measure said with a verb leaves a
fact and a stray node for the number, where the same measure said as `the rope
is 2 metres long` lands as a quality on the thing.

## Deferred, not forgotten

- Component/material refinement remains tracked under roadmap phase 4.
- `nature` remains world knowledge until its intended meaning is specified; it
  is not a replacement root for existence.
- Broad English coverage, multi-word nouns and parser ambiguity work remain
  paused while the semantic foundation is strengthened.
- `basic-failures.test.mjs` and `src/brain.gap.test.mjs` are diagnostic logs,
  not reliable regressions. Their valid cases should migrate into asserted
  capability tests as the corresponding primitive lands.
