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

The two known failing files — `causal` and `homonyms` — are the current
regression baseline. Fixes must not regress them and must not add failures
elsewhere.

Verified clean-input gaps, from the `scan-clean` probe (previously
`.probe/scan-clean.mjs`), in the order they surfaced:

1. **Extreme other end.** _Fixed_ — `who arrived last?` answers the far end of
   an ordering the way `who arrived first?` answers the near, read through the
   ordering's declared converse (`last` joins `first` the other way round).
2. **Aggregate comparison.** `who has more apples?` was `unsure` after
   `john has 5 apples`, `sam has 3 apples`, despite `how many apples does
   john have?` answering. Comparison now ranks a counted set's holders and
   answers `more` from the top and `less` from the bottom of the held counts.
3. **`of`-compound questions.** `the capital of france is paris` does not
   parse at all (the tell itself answers `I don't understand`), and neither
   do the asking forms. The compact form `france capital what` already
   answers, and `the father of sam is bob` parses and answers correctly — so
   the gap is in how the grammar reads the `of` phrase for certain nouns
   (capital lacks the relation structure that `father` has). Not fixed.
   The `part`/`made-of` members of the family are the same trade, but from
   the word `of`: English maps the preposition `of` to the `has` relation,
   so `is the car made of the wheel?` parses as a holding (`car has wheel`)
   and answers `unsure`, `what is the wheel part of?` does not parse at all,
   and `the wheel is not part of the car` neither. The inference underneath
   is whole — the world declares `part converse made-of`, and asking with the
   declared word `made-of` affirms from the far side (`is the car made-of the
   wheel?` after `the wheel is part of the car`). What blocks each of these is
   the word `of` and the fronted/trailing phrase, not the converse.
4. **A doing inside an ordering.** _Fixed_ — `sara arrived before john`
    related sara to john and never recorded that either arrived, so `did sara
    arrive?` answered `I don't know` in a conversation that had just said so.
    An ordering whose word sits on a doing now keeps the happening for each of
    them — who did it, where (told no place, the brain's own **somewhere**),
    and when — beside the ordering that still reads its two ends. The far-end
    readings (`who arrived first/last?`) that the ordering answered before are
    unchanged.
5. **A yes/no question with `not`.** _Fixed_ — `is a cat not an animal?`
    after being told the cat is an animal now answers `No`, and `is the door
    not open?` after being told the door is not open answers `Yes`. The
    sentence grammar now reads `verb subject negation verbComplement`, so the
    negation between the copular verb and its complement is part of the
    question, and the denial standing in the world decides the verdict the
    same way a positive ask does.
6. **A hold told of a thing, asked back.** _Fixed_ — `the basket has three
   apples` writes the hold on the bearer the brain made for the basket, and
   the authored basket links nothing, so `what does the basket have?` found
   no answer. Asked a hold of a thing, the WHAT-reading now also reads the
   bearer — the one of the kind, or any one of it — and answers what it
   holds. Where the world's ladder answers only the generic `thing` a
   container holds, the specifics this conversation told take its place.
   The same bearer sat behind every side of the hole, not just the WHAT:
   `does the basket have any apples?` answered `unsure`, and `what has
   apples?` nothing. The yes/no verdict and the holder walk read the bearer
   the way the count always did — a basket of three apples holds an apple —
   so `what has apples?` answers the basket, `who has a book?` answers sam
   (`who` names somebody, so a thing never answers it), and a count of a
   kind is a hold of it.
7. **A placement asked from the place's side.** _Fixed_ — `the book is on
   the table` then `is the table under the book?` answered `unsure`, though
   `the book` on the table *is* the table under the book. The world declares
   `on converse under` the way it already declared `in converse hold`, and
   the far side reads back: `is the table under the book?` affirms, and
   `what is under the book?` answers the table. The world's `different`
   between on and under still denies a thing on a table being under it.
8. **A name, asked what it was given.** `sam is three` binds the word `sam` to
   the conversation's three — nothing is written to the world — and the ask
   `is sam three?` answered `unknown`, having no claim to read and never
   checking the binding the runtime handed back. Fixed: asked with the word it
   was given, the brain reads the binding the way the signal that made it did —
   `is sam three?` affirms, `is sam nine?` and `sam is six?` deny, and a term
   asked of a number name (`is sam a cat?`) is not the read and says nothing.
   Only a number read is answered; the identity read (`is sam sam?`) is a
   separate surface.

9. **A property, asked who or what holds it.** `the fire is red` writes a
   predication the conversation holds, but `what is red?` read the nature of
   red up the world's ladder (`colour, property`) and never the conversation's
   holder — the engine knew the fire stood to red, only the reader did not
   look for it. Fixed: asked with `who`, `what`, or `which`, a property tells
   the thing this conversation put it on: `the fire is red`, `what is red?`
   answers `fire`; `sara is tall`, `who is tall?` answers `sara`. A fresh
   question — nobody holds it — still reads the nature (`colour, property`).
   A kind keeps the far-end reading: `what is a heron?` is `bird`, not
   `mira`, the thing holding it. Two holders both show (`fire, door`), and
   the measure reader asks the same way.

10. **A who-word before an intransitive doing.** `sara arrived` put sara on
    the record as the arrival's doer, but `who arrived?` answered `I don't
    understand.` — an intransitive doing has no part but its doer, and the
    question-namer required another part to read at all. Fixed: a who-word
    alone before the doing reads the doing's own doer — `who arrived?`
    answers `sara`, and `sara, john` when two arrived. A doing whose doer was
    never told (asked fresh) answers nothing, and who-asks with a target read
    as before (`who washed the car?`). A `who spoke?` after `sara spoke`
    still says nothing: speaking says nothing about the world, and the
    conversation keeps it without taking it in.

11. **A named place is said without the article of a kind.** Told a person is
    in a city, `where is he?` answered `in a delhi` — the world's cities are
    places that exist once, and English says their words bare, so the answer
    carried a kind's article that a name must not. The `in` was never the
    artifact: `where is the key?` is answered `in a drawer`, `in chennai`,
    `at fair` — a place is said as a place, the way it holds and what it
    holds to. It was the article. Fixed in language data: the world's
    authored cities (delhi, dublin, paris, tokyo, ...) say bare, as the
    admission test puts the article's form with the language. `bruno is in
    dublin` answers `in dublin`, and after `ravi is in chennai` then `ravi is
    in delhi`, `where is ravi?` answers `in delhi` — the later placement
    current, the earlier history. The two baseline tests that shaped this are
    now green; the causal and homonyms failures remain.

12. **A count of a thing is never negative.** Told `sam has -2 apples` the
    brain took it in and answered `-2` — holding minus five of a thing is no
    state the world holds, and a static count below zero is where the random
    world refuses it: a transfer may leave a holder with less than it began,
    but the state of holding is never counted below zero. Fixed in the
    fact-teller: a negative count told over a holding relation is refused
    (`No. ❌`). Zero and positive counts stand as ever; a measure may still
    read below zero — `the temperature is -5 degrees` answers — since a
    temperature is a measure, not a count.

13. **The contracted modal denial is read.** `a bird cannot swim` used to
    answer `I don't understand` while `a bird can not swim` learned and
    `can a bird swim?` then denied. The split goes through the claim-denial
    path, but `can't` was never reached: the `n't` derivation takes the
    ending off, and taking `n't` off `can't` leaves `ca` — the `n` of the
    contraction has merged into the vowel. And `cannot` is no stem of
    anything, so nothing derived it. English's two spellings of the denial
    are now their own words: `cannot` and `can't` each carry the two
    readings of `can`, with the denial on both, so before a doing they say
    a thing cannot do it and the claim reads (and is learned) the way
    `can not` is. `a bird cannot swim` is taken in, `can a bird swim?`
    denies, and asked of an untouched ability the brain says the honest
    `unsure`.

14. **A doing on the far end of an ordering happens as itself.** `a plank fell
    after a meeting` records the falling and, beside it, the meeting *falling*
    — `event(a1, type: fall[262])`. An ordering whose word sits on a doing puts
    a happening on each of its two ends, and both ends are given the near
    side's verb. Where the two ends really do share the verb that is right —
    `sara arrived before john` is two arrivals — but a meeting does not fall.
    The far end should happen as what it is: the meeting is an event of its
    own, already on the record, and the ordering should place that happening
    rather than invent a second one of the near side's kind. Not fixed. The
    neighbouring case where the far end is an amount of time is fixed — a unit
    that measures time is never a party to an ordering, and one doing told how
    long after keeps one happening and carries the amount.

15. **A reason clause standing first loses its word.** `since a plank fell, a
    road is wet` is taken in and both sides are recorded, but the joining is
    not: the leading conjunction is stripped before the tree is built, so
    nothing carries the reason function and the two clauses stand side by side
    with no cause between them. The same is true of `because a plank fell, a
    road is wet`. Said the other way round — `a road is wet since a plank
    fell` — the joining reads and the reason's row holds the effect's. Adding
    a `conjunction clause sentence` rule changes nothing, because the word is
    gone before the rule is reached. Not fixed. What is quietly wrong rather
    than merely missing is that the signal answers `I understand` while
    dropping what the word said.

16. **A reason said as a thing rather than a clause.** `a road is wet because
    of a plank` and `the delay was due to traffic` name the reason with a noun,
    not a clause. `because of` is read today as `because` followed by `of`, so
    it leaves `cause(road, plank)` — the wrong way round, since the plank
    caused the wetness and not the road the plank — and a stray second row on
    `wet` beside it. `due to` is not read at all: `due` becomes a thing of its
    own. Both want the reason to be a thing standing against a claim, which is
    a side the cause primitive does not yet have — it knows a reason that is
    something being so and a reason that is something happening. Not fixed.
    The clause-joining words are whole: because, since, as, so, therefore,
    thus and hence all reach the one primitive.

17. **How much of a state a thing has, where nobody told it.** `is the coach
    late?` answers from the gap between the moment a doing was set for and the
    moment it happened, and `is the room hot?` from a temperature told of the
    room — both worked out, neither stored. `how late is the coach?` does not
    answer, though `how hot is the room?` does. The difference is where the
    amount sits: a measure the conversation was told is written into the world
    this conversation reasons over, and the how-much reading looks there, while
    an amount the brain works out lives only in the graph. So the reading finds
    the told ones and never the derived ones. Not fixed. It is the same seam as
    the node slot was — one meaning with two homes — and the fix is for the
    how-much reading to ask the graph, not for the derived amount to be written
    into the world beside the told ones.

18. **A closed set, assigned one to one.** Three owners, three pets, each owner
    exactly one and no two the same; told who does *not* own what, name who
    owns the third. The brain holds every denial it is given and draws nothing
    from them, because what it lacks is not a word but a primitive: that a set
    is closed, that its members are assigned one to one, and that eliminating
    all but one leaves that one. Elimination over a closed set is the whole of
    the inference, and the puzzle is three rounds of it — Bob is neither dog
    nor fish, so Bob is the cat; Alice is not the cat and the cat is taken, so
    Alice is dog or fish; Charlie takes what is left. Not built. Worth settling
    first whether deterministic constraint propagation belongs in the engine at
    all, or whether the narrow case — as many slots as fillers, denials
    eliminating — is the closed subset to build. Separately and smaller: the
    puzzle is one problem stated across four sentences, and the brain reads one
    signal at a time.

19. **A doing said back reads awkwardly.** `why did the dog run?` after `a gate
    became open so a dog ran` answers `gate became an open` — the right cause,
    said badly. A change is put back into words as the occurrence it was, and
    the state it took is said as though it were a thing that could be counted.
    What a doing did is a frame English does not yet have: the answer wants to
    be the claim the change left — `a gate is open` — rather than the changing
    itself. Not fixed, and it is the saying and not the finding: the reason is
    reached, and only the words for it are wrong.

20. **A hole standing first asks after nothing.** `sam ate what?` answers
    `apple`; `what did sam eat?` answers `I don't know`, and the two are one
    question. The doing is on the record with both its parts — the doer answers
    (`who ate the apple?` says sam) and the whole of it verifies (`did sam eat
    an apple?` affirms) — so nothing is missing from the memory. What fails is
    the part a fronted hole is taken to play: the reader gives each word a part
    by which side of the doing it stands on, and where the signal's shape hands
    it no sides to read, neither the hole nor the doer is given one and the
    question asks after nothing. The flip that already exists for this — a hole
    before the doing reads the far part where a doer already stands before it —
    never runs. Not fixed, and it is the same for every doing: `what did sam
    give?`, `what did mira build?`.

    Traced further: the parts *are* assigned, and to the wrong word. The reader
    takes the first word that reaches a doing to be the doing, and in `what did
    sam eat?` that word is `did` — so `sam` and `eat` both land after it and
    the hole lands before it, which is how a question about what was eaten gets
    read as a question about who did it. English has `did` two ways, an
    auxiliary saying when and a verb pointing back at a doing already spoken
    of, and the auxiliary reading is chosen only at the front of a signal or
    before a denial. Standing after a hole it is neither, so the verb reading
    wins and the auxiliary's whole purpose — to say when and step aside — is
    lost. Widening that choice and skipping an auxiliary when looking for the
    doing were both tried and neither was enough on its own; the selection
    wants settling before the reader can be.

21. **What has so much of a quantity.** _Fixed_ — `what is 2 metres long?`
    answered `1 metre`, a number where a thing was asked for: a quality's
    holder was read off the conversation's facts and a measure's was not,
    though a measure is a fact of the same shape. It answers `rope` now, asked
    of no thing that stands at the amount it says it does not know, and `how
    long is the rope?` still answers `two metres` — the words are nearly the
    same and only one of them names a hole where the thing goes.

22. **A giving is not answerable as something that happened.** `sam gives 2
    books to jerry` is on the record from every side but one: `who gave the
    books?` answers sam, `who has the books?` answers jerry, `how many books
    does jerry have?` answers two — and `did sam give books to jerry?` answers
    `I don't know`. Every other doing verifies (`did sam eat an apple?`, `did
    the plank fall?`), and so does the other transfer (`did hema put a mug on a
    ledge?`) — but that one answers through the placement it left, `mug on
    ledge`, not through the doing. A giving leaves a holding rather than a
    placement, and nothing looks there. So a transfer is verified by what it
    left behind and only one of the two things it can leave is looked for.
    _Fixed_, and it was neither of those: a doing told plainly carries no time
    of its own, and the reading refused it for want of a past mark nobody ever
    wrote. `sam gives 2 books to jerry` is in the present and `did sam give`
    asks of the past, so the two never met. Asked whether something happened,
    what answers is that it did; a doing told at another time still says so and
    is still refused. The other transfer answered all along through the
    placement it left, which hid this.

    One thing remains, and it belongs with the fronted hole: a name the
    conversation has never met reaches nothing in a question and is dropped, so
    `did sam give books to hema?` is read as `did sam give books?` and affirms.
    Told who hema is first, it answers `I don't know` as it should, and so does
    `did jerry give books to sam?` — the roles are read, the unmet name is
    not.

23. **A question about something that happened never reaches what stands to
    it.** `hema is in the accident` writes `member(n2, a1)` and `is hema in the
    accident?` affirms from it, but `who is in the accident?` answers `I don't
    know` — and the same question over a thing works both ways (`what is in the
    box?` answers the book). The reader that walks what stands to a thing is
    never called for a happening: the question is routed to the readers that
    look for parts played in a doing, which is the wrong question to ask of an
    accident somebody was merely in. The reader itself now meets a happening at
    its row, so what is missing is the routing and not the walk. Not fixed.

Following the same triage and noted, not fixed — the newest scan's findings,
each with its root, and each outside the clean-inference bar:

- **Identity between names (`tom is sam`).** The engine reads `X is Y` as
  classification by design — `tom is sam` makes sam a kind that tom is one
  of, and `is sam a person?` then answers `unsure`, which is correct under
  that reading. English's identity reading of an un-articled name after `is`
  is a semantic expansion, not a missing inference; there is no corpus
  phrasing yet, and the tests that vary it (the baseline homonyms failure
  and the naming tests) would have to be re-tuned. Told fresh with both
  names bare (`tom is sam` with no prior noun), the sentence does not parse
  at all — the same naming-grammar gap as the `of` compounds. Not chased.
- **Composite placement (`the book is on the desk`, `the desk is in the
  room`, `is the book in the room?` → `unsure`).** The walk composes nothing
  across heterogeneous placements; reading a composed placement needs a
  world-declared composition (on ◦ in ⇒ in) the way converse and subrelation
  are declared, plus a chained read. That is a feature of its own, in the
  world's keeping — physics, not core, and not a one-hop gap.
- **`of`-stranding (`what is a wheel part of?` → `I don't understand`).**
  The `of` topic already covers the compound (`the capital of france is
  paris`) and the trailing preposition; `is a wheel part of a bicycle?`
  affirms, so the inference is whole and the obstacle is the grammar of the
  stranded preposition. Documented above (item 3).
- **Stative vs transitive `because` (`the door is open because the wind is
  strong` works; `the bell rings because bob pressed the button` does not).**
  The because-clause grammar admits a predicate-adjective clause after the
  word, not a full past-tense transitive doing with its object. Grammar, in
  the language's keeping.

Following the same scan and noted, not fixed — language or phrase rather than
inference: the trailing-preposition forms (`what is a cup in?`, `how many
apples are in the basket?` — the dangling preposition the `of` notes above
describe); hyponym exclusion (`is a mammal a cat?` answers an honest
`unsure`, there being no exclusion reply); the age words `older`/`younger`,
which are language data without right companions yet; and the
indefinite-article container (`a basket has four apples` reads once `the` is
said).

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
  server started`) the *clock of the one the question names* is the answer
  (`eleven hours`), the doing in the sentence's own subject read off the tree
  since the walk puts the focus first. Two gaps remain, both phrase-specific.
  A bare `before the crash` with no second doing alongside is not read: `how
  many minutes before the crash happened?` is `unknown`. And the `by how much`
  form (`the update finished before the crash by how much?`) trails three
  words — by, how, much — with no concepts and no grammar rule, so the

  sentence does not parse into anything a span can name; it is noted and
  left.

- The temporal clause and the band are in. A `more than N`-clause that frames a
  connected pair is read at last, because English now says it: the grammar
  admits a preposition over a subject and a verb (`after the server started`),
  a quantity in front of the clause (`two hours after the server started`), and
  the verb-comparative before the quantity (`more than two hours after the
  server started`). With the grammar the deeming comes with it. Told `the
  crash happened two hours after the server started`, the crash's clock derives
  from the server's start and reads back (`eleven fifteen`, and the offset
  reads back `two hours`), the same for `before`; with no clock for the placed
  doing nothing is guessed. The offset also reads where the grammar rule was
  already there without it: `the update started ten minutes after the backup`
  answers nine fifty from a backup told to start at nine forty — the `numeral
  noun preposition subject` form has no verb of its own, but the placed doing
  carries one. Asked `did the crash happen more than two hours after the
  server started?` the gap is compared against the reach and the answer is
  yes or no (`No. ❌`, while `more than 100 minutes` and `less than two hours`
  affirm). And measures compare on their scale at last: `is thirty minutes
  more than ten minutes?` affirms, `are two hours more than one hundred
  minutes?` affirms (the units convert before the numbers are read), `is
  thirty minutes less than one hour?` affirms. One piece of the family still
  waits: `the server restarted twenty minutes later` does not parse — `later`
  has no word in the language data.

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
