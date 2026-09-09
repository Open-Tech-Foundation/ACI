# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

### Removed

- **`flight`, `reserve` and `cancel`**, added while reaching for the booking
  case and never confirmed as concepts. Nothing referenced them.

### Added

- **Whoever did it is introduced.** A new name standing where a language puts
  the one doing was never made, so an action was recorded with no doer and
  `who gave a book?` answered nothing. A word standing on a part's side of a
  doing is now as much a part as one a preposition points at.
- **A recorded action can be pointed at.** `the giving` stands for the doing
  that happened rather than for doing in general, so a fact about an action —
  or a record standing for it — is an ordinary link with that action in a slot.

- **A total is worked out when it is asked for.** Where nothing was measured of
  a thing itself, what it holds is measured instead — three crates of two
  kilograms each is six kilograms — and a fourth crate moves the answer without
  anything being written down. Only for what a thing measures, never for what
  it holds: how many pears a basket holds is not answered by looking inside the
  apples.

- **Told there is none is held apart from nobody having said.** `none` is the
  amount zero, so `tarun has no apples` records a count of zero on the kind
  instead of a positive link that answered `has an apple?` with *Yes*. A count
  of zero stands against the claim that there is one; a count above zero stands
  for it, so three apples is an apple. The zero-count link is the empty slot: a
  place for the kind with nothing in it, which a later arrival fills.

- **A standing instruction is held, and keeps applying.** A condition the brain
  cannot yet reach is no longer thrown away: what was said is kept as a
  standing instruction — a term joining two claims — and when the condition
  comes to stand, what stands on it follows. The instruction stays after it
  fires, because it governs whatever turns up next as well. A condition the
  world stands against is never kept; it can never come to stand.

- **`work` can be done, not only had.** `kumar works for alpha` is understood,
  and `kumar works for chennai?` is not answered from `alpha is in chennai` —
  two stored facts, and nothing joins them.
- **`first` asks for the far end of an ordering**, the way `biggest` asks for
  the far end of a scale. `arrive` is a word the brain knows.
- **A doing is not one of the things a claim holds between.** `sara arrived
  before john` was writing `arrive -> before -> john` onto the shared `arrive`
  concept; it now relates sara and john and leaves the concept alone. A side
  that is only a doing still stands — walking is faster than running.

- **A relation may be two relations followed one after the other.** The world
  can now say that one relation followed by another gives a third, and the walk
  derives the fact when asked rather than writing it down. `father-of-father`
  gives `grandfather` and `father-of-sibling` gives `father`, so `tom is the
  grandfather of maya?` answers from three told facts. Transitivity is the case
  where a relation composes with itself and keeps its own flag.
- **Where one thing lies from another.** `north`, `south`, `east` and `west`
  are relations, each transitive and asymmetric with the opposite as its
  converse, and the eight cross-axis compositions say that moving along one
  axis leaves the other where it was: `the kitchen is north of the study?`
  answers from `north of the hall` and `east of the study`.
- **A word naming both a kind of thing and a relation is the thing**, unless
  `of` after it says which is meant. `two sisters` counts sisters; `the sister
  of maya` names sisterhood.

- **A relation named with `of` is read as a relation.** `tom is the father of
  sam` now records `father(tom, sam)` instead of two wrong `has` links, and
  `who is the father of sam?` answers `tom`. Kinship terms named only a kind of
  human; `father` now also declares itself a relation, `of` straight after a
  relation-naming word is that relation's syntax rather than a side of it, and
  a new pass resolves `the father of sam` to whoever stands in that relation
  wherever the signal has a hole.

- **Colours can describe as well as name.** Fifteen colour words, and `good`,
  `bad`, `beautiful`, `true`, `false`, `far` and `near`, were listed as nouns
  only, so `the blue box` did not parse.
- **`inside` is one concept.** The position term is now also a placement
  relation, declared a subrelation of `in`; both are transitive, so a thing
  inside something inside something is inside it.

- **A gerund reads as a thing as well as a doing.** English's `-ing` ending now
  gives both readings, so `a bicycle is faster than walking` is understood. A
  derivation rule may name more than one part of speech, the way a word already
  could.

- **`src/graph.test.mjs`** — the ten cases the conversation graph is being
  landed against, asserted behaviourally. Three pass today; the file is red
  until the rest lands.

### Fixed

- **Actions may sit in either slot of a fact** in the conversation graph
  design. The note claiming nothing relates an action to another action was
  wrong: `Sara arrived before John` relates two arrivals, and that is how order
  is said when no clock time is given.

### Added

- **Actions can be pointed at, and commands, in the conversation graph design.**
  A recorded action is identified and can sit in a target slot, so a fact about
  it, a query over it, and a record standing for it are all ordinary links — no
  action-to-action relation. A command is an action owed of whoever was told.
  All 69 corpus sentences now place in the design.


- **One empty slot in the conversation graph design.** The three spellings for
  a slot that names a kind and holds no instance are unified as `null`; what
  the emptiness means (`count: 0`, `owed`, or nothing said) is carried by the
  rest of the action.


- **Obligation in the conversation graph design.** A standing instruction
  produces a fact, an action to be done, or an action owed; `owed` belongs to
  what is produced, not to the instruction. What is owed is computed when
  asked — from the records when the condition is a state, from the recorded
  history when it is an occurrence — never written out per record.


- **Standing instructions are their own kind in the conversation graph design.**
  A rule never occurred and has no place in the recorded history, so it no
  longer counts as an action. It holds a condition and what stands on it, and
  what it produces is a fact, an action to be done, or an action owed of
  someone.


- **Absence and derived values in the conversation graph design.** Being told
  there is none (`holding(i7, document, null, count: 0)` — an empty instance
  slot with a count of zero) is now distinct from nobody having said anything.
  A derived value such as a total is computed when asked and never stored, with
  the recorded action list serving as the history to look back through.


- **Identity now has one deterministic algebra.** `same` is reflexive,
  symmetric and transitive, and equivalent term representatives substitute at
  the world-query boundary through classification, ordinary relations,
  explicit denials and quantity state without merging ids or copying facts.
  Open answers collapse equivalent subjects to the least stable id.
  `different` remains a general symmetric, irreflexive relation and now follows
  identity substitution instead of serving only bespoke kind exclusion.
  Source validation and atomic learning reject denied identity closure,
  contradictory facts across aliases, competing functional values, and any
  attempt to identify different or mutually exclusive kinds. Exact computed
  numeric equality remains unchanged. Opaque-vocabulary world, validation and
  brain-integration tests prove that none of these semantics depend on English.

- **38 new world terms.** Emotions (hate, surprise, excitement, boredom,
  loneliness, trust, worry, like), knowledge concepts (knowledge, belief,
  information, problem, solution, value, culture), actions (cry, feel, forget,
  help, learn, need, play, remember, sing, sit, stand, teach, try, want),
  family (grandparent), people, food (cookie, chocolate, chicken), color
  (gray), and time (today, tomorrow, yesterday).

- **52 new English words.** Pronouns (we, us, our, whose), verb forms for
  all new actions, adjectives (pretty, beautiful, fat, thin, dark, light,
  sharp, smooth, rough, deep, cheap, expensive, safe, dangerous, young, old,
  new, big, small, long, short, fast, slow, hot, cold, warm, cool, heavy,
  hard, soft, clean, dirty, quiet, loud, rich, poor, strong, weak, full,
  empty, busy, free, true, false, right, wrong, important, simple, difficult,
  easy, happy, sad, angry, afraid, sick, healthy, nice), and degree word
  (most).

- **New grammar rules.** Existential (`there predicate`), comparative
  (`degree adjective`), passive, and imperative sentence patterns.

- **New expression frames.** Farewell, thank, apologize, request, offer,
  and compliment intents.

### Fixed

### Added

- **What a thing holds is a thing, not a number written on an edge.** A box
  holding four balls linked straight to the kind `ball` with a `4` on the link.
  A number on an edge is not a node: there was nothing standing for *those
  four*, so there was nowhere to say they are big and no telling them from
  another four in another box. What is held is now a thing of its own — it is a
  ball, and it is however many it is — and the holder links to that. Counting
  reads through it unchanged: five bats and two balls in a shop are still five,
  two, and seven things. Weighing five hundred grams makes no such thing: that
  count says how much against a unit, and there is nothing there to describe.

- **A number reaches past what describes the thing it counts.** `a box has four
  big balls` was answered with "I don't know": the number stood beside `big`,
  and a number beside a property says how *much*, not how many — an apple does
  not have three weights. But it was not measuring bigness, it was counting
  balls, and the balls were one word further on. Both the count and the check
  for measuring now look past what describes a thing to the thing described,
  by the same walk, so the two cannot disagree about which was meant. English
  also gained the sentence shape for it, which it had never had.

- **The engine no longer names one of English's grammar rules.** Asking whether
  a why-question had a full predication behind it, the brain looked for a part
  called `verbComplement` — English's name for that rule. Hindi's file happens
  to use the same name, which hid the coupling; a language that called it
  anything else would have failed silently and for no reason it could see. A
  grammar rule may now declare that it *completes* what is said of a thing, the
  way it can already declare that it is a whole or names a referent, and the
  brain reads the mark. It knows only that some part does that job, never what
  any language calls it.

- **A count is answered under the word the question used.** Told a basket
  *holds* three apples and asked what it *has*, the brain answered three. The
  world kept the two apart all along — it was the count reading that reached
  through the broad relation both are ways of saying, so either word found the
  other's fact. It now reads under the word asked, and under any word the world
  declares says the same thing the other way round: being in a thing and its
  holding you are one fact, so a pond that holds a thousand stones still
  answers how many stones are in it. A word merely beside another under
  something broader is not followed.

- **A kind is counted across everything that holds it.** Told a box has four
  balls and then that a box has three, the brain made two boxes — and answered
  `how many balls?` with three, the one it had heard of last. It could count
  boxes, because those exist once and it counts what exists; it could not add
  up what several things hold. Now it does, which is what counting a kind
  means. Only what exists once is added: a kind carrying a count says how many
  any one of them holds — a hand has five fingers — and adding those across the
  world would count hands nobody mentioned. What one thing in particular holds
  is still asked for by saying so.

- **A word that narrows which one was meant is kept.** `tilly is a big cat`
  recorded only that she is a cat: the narrowing picked out which cat and was
  then thrown away, so the brain did not know she was big. A narrowing is
  rightly not a claim of its own — `the blue one is warm` says nothing new
  about blue — but where a thing is said to *be* a narrowed kind, the narrowing
  is a thing it is. Both facts are now taken in, and a denial takes in neither.

- **Said of all of a kind, it is now said of each thing that is one.** Told
  `all cats are white` and `Tom is a cat`, the brain did not know whether Tom
  was white — which is most of what saying it of all of them was for. The
  denial already read the right way round, saying a particular cat is not white
  when told none are, and that asymmetry is what showed it was a defect rather
  than something left out. What is said of a kind is now read of everything
  that is one of it, down the whole ladder: told all animals are white, a cat
  is white too. Saying it of *some* of them is untouched, because that makes
  one of them and says it of that one, never reaching the kind at all.

- **Holding is one thing the world says, not a list the engine keeps.** A
  basket *holds* apples and a person *has* them, and the two were unrelated
  relations — so the brain carried the pair `[hold, has]` hardcoded in seven
  separate places, a list in code standing in for a fact about the world. The
  world now says both are ways of saying one holding, and a count is read
  through the narrower ways, so the seven become one. Which word a count was
  written under is still the word it is revised under.

- **What passes between two hands is watched arriving.** Told only that Ravi
  gave two apples to Sam, the brain had Ravi down to three and could say
  nothing of Sam — it wanted a count for him from before, and nobody had given
  one. But the apples were followed across, so what arrived is what he holds.
  A lone adding is not that: nothing left anywhere, nothing was watched
  arriving, and a holding nobody has spoken of stays unspoken.

- **One thing passing between two is two changes, not one.** An action caused a
  single operation worked at a single end, so `Ravi has 5 apples` followed by
  `He gives 2 apples to Sam` left Ravi still holding five: giving was declared
  to cause `plus`, which arrives at a destination, and nothing took anything
  away from where it came from. The world now says giving causes both, and that
  what a give comes from is whoever gives it — the same way it already said
  what a get goes to is whoever did it. The brain works every operation an
  action causes, each at the end its operation belongs to, and knows nothing
  about giving. Where nothing was known of what an end held, nothing is claimed
  of what it holds now, and the other end is untouched by that.

- **The brain can be asked for the far end of an ordering.** `Which is
  heaviest?` answered "state" — the ending marking an extreme was dropped, so
  the question read as "what is heavy?". English now says only that an ending
  marks an extreme, as it says an ending compares; the world holds the
  comparison made on that quality and holds it as an ordering, and the brain
  walks it to the one nothing stands beyond. It reads through a declared
  converse, so things said to be older than one another answer `which is
  youngest?` from the other end of the same facts. Where several are unbeaten
  there is no one far end and the brain names none.

- **A claim may be a thing the brain holds.** Until now a claim could only be an
  edge between two terms, so nothing could be said *about* one — which is why a
  checked claim had to be copied out of memory as a loose triple to be kept in
  mind, why a rule had nowhere to live, and why what someone knows could be
  checked but never held. A claim is now held the way an occurrence already
  was: something that exists once, which is an instance of what it claims, and
  which says which two things stand in it. Nothing new carries it — a relation
  is a term, a role is a relation, denying the claim is the `not` every link
  already has, and when it was claimed is the `at` every link already has.
  Holding a claim does not make it so: the world is not made to agree with it.

### Fixed

- **Being called something is a fact, not a field.** A name lived in two scalar
  fields on the term, and the world's own opening line — that a term is an id
  and its links, never a word, and that `name` is a label nothing reads — was
  not true: meeting a named thing again read that label. So a name could not be
  denied, dated, shared, or be one of several, and asking `what is john?`
  answered "john" because the code testing whether a thing was named tested a
  field. The name is now a term of its own, carrying what the signal wrote, and
  the thing is joined to it by `name` — one more fact among its facts.

- **A name given is no longer pinned at the top of the ladder, and a comparison
  says what it may join.** `john is taller than mike` left john as an instance
  of `thing` — which carries nothing, since everything is one, and which the
  world holds apart from every particular kind of thing, so john could never
  afterwards be found to be any of them. `what is john?` answered "john".
  One thing given a name with nothing said of what it is now exists as no kind
  at all, which is the truth of it. A kind is still placed, since a kind with
  nothing above it hangs off nothing.
  What a thing is, it is still only told. Comparing a physical property of two
  things does not say what either of them is: `what is john?` answers that it
  does not know, because nobody said, and he could be a pig.

- **A comparison is made on a state, and the state is what it carries.** Every
  comparison collapsed to a bare `more`, so `taller` and `heavier` recorded the
  same fact: told John was taller than Mike, the brain agreed he was heavier.
  The world now names the comparison made on each state, and that is what a
  fact holds — so the two no longer collide, `Is Mike shorter than John?` is
  answered from the same fact through the comparison's declared converse, and
  saying it back composes from the state rather than from a listed word.

  No state is ranked above another: hot and cool are two states of one scale,
  not an ordering, and which is being compared on is the whole of what a signal
  said. A comparison declares its own direction against what a scale measures,
  which is a property of the comparison and not of the states. A scale is only
  for what is measured — `louder` and `deeper` compare without one.

- **A comparison used to be worked out from the state and its scale, not listed
  word by word.** Every comparative was a hand-written entry carrying the relation and
  the scale itself — sixteen of them — so `taller` was refused outright while
  `heavier` was learned, and `softer` and `darker` are refused still. English
  now says only that an ending compares; the world says which scale measures a
  state and which of its states are the scale's greater ones and which its
  lesser. `warmer` and `colder` fall out of that without either being named,
  and a state sitting in the middle of several is as plain as one at an end.
  The written-out comparatives remain, because they are also how the language
  says a comparison back.

- **Vocabulary: `taller`, `wet`, `dry`, `notebook`.** `taller` was the one
  comparative with no entry, so `John is taller than Mike` was refused outright
  while `heavier` was learned; it now mirrors `shorter` on the same scale.
  `wet` and `dry` join the world as opposed states, the way `hot` and `cold`
  already stand, and `notebook` as an object. All of it is language and world
  data — the engine is unchanged, and another language needs none of it.

- **A word it does not know stops it before any verdict.** `a box is zzzzz than
  a book` answered "No." — a confident denial of a claim it had never read.
  Saying which word stopped it sat at the end of the chain, after every verdict,
  so anything that reached a standing first won. It now comes before all of
  them: a claim the brain could not read is not a claim it can answer.

- **A word that leaves the brain nothing is no longer answered as though it
  landed.** Said alone, only a thing does any work: it becomes what is spoken
  of, so `tank` then `what is it?` answers `container`. A relation joins two
  things and neither is there; an action is done by someone to something and
  nobody is there; a property is had by something and nothing is there. After
  any of those the brain holds exactly what it held before — `spoken` stays
  null and nothing is in focus — yet it reported having recognized the word.
  It now says it does not understand, which is the whole of what happened.

- **The brain says the thing, not the gloss it was filed under.** Recognising
  `dog` answered `I recognise "canine animal"` — the dictionary definition read
  back out. The term is now handed to the language, which says it in its own
  word for it, the same road every other answer already took.

- **The brain can count the individuals it was told about.** Told `tilly is a
  cat` and `misha is a cat`, asked `how many cats?`, it said it did not know.
  It only ever counted a quantity someone had given it outright — `a box holds
  three cats` — and `world.individualsOf` was reached from possessives alone.
  A kind belongs to the world and is still never counted out; an individual is
  only ever something the brain was told about, since the authored world holds
  none at all, so counting them reads back what was said to it. What a thing
  holds is still answered first where it holds any.

- **A relation said by itself is recognized, not agreed with.** Every bare
  relation went to a frame that pasted its dictionary gloss into `Yes, it
  {meaning}.` — `is` gave "Yes, it to be.", `in` gave "Yes, it in.", and none
  of them were agreeing to anything: a relation joins two things and neither
  was there. An action said by itself was already simply recognized; a relation
  now is too.

- **Saying something is there no longer names a thing `there`.** English's
  grammar carried a rule for the existential — `there predicate` — but the word
  `there` was never written into the language, so the rule could never fire.
  `there` was the one symbol in the whole English grammar with nothing to match
  it. The word fell through to the path that takes an unknown word standing
  where a thing stands as a name being given, so `there is a dog` made an
  individual called "there" and `what is there?` answered "dog". The word is
  now declared, the rule fires, and the sentence reaches the predicate it was
  written for. What an existential subject *means* is not yet read — the brain
  says it does not understand rather than inventing something, which is the
  honest answer until the reading lands.

- **A learned fact is no longer weighed twice.** Every learning turn walked the
  whole world twice over: once in the brain, weighing the proposed change, and
  again in the shape check after it was written. Both are O(world), so learning
  N facts cost O(N²) — 80ms per fact at 2822 terms, 385ms at 20k. The world
  read back from the store is what the brain just weighed, not a new source, so
  it is now built rather than walked again. A differential test pins the two
  readings of the invariants against each other so the remaining wall cannot
  drift from the one it stands in for.

- **The brain no longer proposes a link to a term that is not there.** Its wall
  checked every other invariant the shape check does but not this one, so a
  dangling endpoint was caught only by the store's foreign key, mid-write.

- **A knowledge file may say what a term is, not only what it links to.**
  `individual` and `disjoint` were the only two marks a later source could not
  add to a term the base world already held: the other eight were carried over
  and checked for contradiction, these two were dropped without a word. So a
  knowledge file could not make a world term one of a kind, or a kind whose
  children exclude each other.

- **A fact reached by acting on a standing instruction is now kept.** When an
  instruction the brain had agreed to could finally be acted on, what it
  learned in doing so was handed to the caller and never written, and the
  instruction was dropped from the thread in the same breath — so the fact was
  gone for good. Both ways a turn can reach a fact now go through one door.
  (This path is unreachable while `knowledge/following.json` stands, so the
  repair is by inspection; see the note below.)

- **The order terms were written in can no longer reach an answer.** A file
  authors its terms in whatever order reads well and the store hands them back
  by id, and `data/world.json` is not in id order — so the same world walked
  through the file and through the store gave `members` the same set in a
  different order, and one answer path hands that list straight out. The world
  now settles one order for itself when it is built, so nothing that reads it
  can tell which door it came through.

- **A name the authored world brings back no longer stops the brain opening.**
  A name given in conversation and later shipped by `data/world.json` left two
  terms claiming one name, and seeding died on a raw unique-constraint error
  with the store unusable until cleared by hand. The authored world is the
  vocabulary everyone shares, so it takes the bare word; memory keeps the thing
  under the `name#id` the brain already gives an individual it makes without a
  name of its own, with its links and everything else intact.

- **A growing world no longer silently loses its own new terms.** Memory is
  numbered from the top of the authored world, and so is the next authored
  term, so a world that grows reaches ids that memory already took. The seed
  upsert skipped those rows, and the authored term never reached the brain —
  no error, no warning. A learned term standing where an authored one is about
  to land now steps aside to a free id above both worlds, and every learned
  link naming it moves with it. Ids carry no meaning outside the store, so
  nothing learned is lost; re-seeding the same world twice changes nothing.

- **Reading a symmetric relation or a converse no longer walks the whole
  world per term.** Asking one term what points at it was a pass over every
  term and every link, and `members` asked it of every term in turn, so a
  single `members` call over a symmetric relation cost a full quadratic sweep
  of the world — a second per call on the authored world, and the dominant
  cost of every signal that reached one. The reverse edges of a relation are
  now compiled once and kept, in the order the terms themselves are in.
  Answers and their order are unchanged; a world test pins that reading a
  relation from many terms gives exactly what reading each alone gives.

- **Reverse facts are no longer rejected for every relation.** The judge used
  to treat any existing object-to-subject edge as a universal loop, even when
  the relation declared no such constraint. Independent facts may now be
  learned in both directions for ordinary relations. Reverse temporal and
  strict-part facts remain contradictions through declared `asymmetric`
  semantics, while subtype cycles remain rejected atomically by the dedicated
  classification invariant. Language-neutral and persisted-conversation tests
  cover the allowed bidirectional case and the protected strict cases.

- **Living and non-living refinements now work as ordinary predicates.** The
  same closed, language-owned labels used by a focused classification choice
  can now ask or state whether an explicit subject has either refinement.
  `is dog a living thing?` and the declared compound `is dog a living-thing?`
  affirm from the organism path; stones affirm non-living; the root `thing`
  remains unknown; contradictions are refused; and explicit negation reverses
  the requested refinement. The core inspects only semantic `classifies`
  labels and the world model, with an opaque-vocabulary test proving that the
  English phrase and parser symbols are not core primitives.

- **A force affects physical things only when the universe holds it.** Physical
  inference previously activated every term classified as a force, even in a
  world whose universe held none. The core now requires the universe to hold
  either the particular force or a kind containing it before any caused
  property propagates. Tests remove the universe's force link to prove gravity
  becomes inert, then admit gravity specifically to prove its weight effect
  returns without admitting every possible force.

- **Unknown life status is no longer classified as non-living.** The entity
  primitive now distinguishes world-proven life, world-proven exclusion from
  life, and an open-world unknown. Known organisms such as trees remain living;
  objects, substances and abstract numbers remain non-living through explicit
  world exclusion; a bare root such as `thing` remains unknown. A focused
  living/non-living choice over that unknown returns `unsure`, learns nothing,
  and behaves identically with renamed words and parser symbols.

- **A bare recognized entity now establishes conversational focus.** Topic
  tracking previously considered only claims, answers, learned state and events,
  so `honey` was recognized but a following `what is it?` had nothing to point
  at. `spokenOf()` now accepts the solved entity branch of one bare thing as the
  topic, without inferring from part of speech. Actions, properties, unknown
  signals and signals naming several things still establish no guessed topic.
  Tests cover `honey` followed by the pointer question and prove a later greeting
  does not replace that entity focus.

- **Language ambiguity now exposes evidence elimination.** Resolution gates
  previously narrowed candidates internally but an unresolved ambiguity still
  reported every original reading, including ones current evidence had already
  rejected. Each gate now records removed candidates with their language,
  tokenization and eliminating primitive. Ambiguous nodes expose only survivors
  in `candidates` plus an `eliminated` audit trail; resolved language nodes carry
  the same trail inside `resolution`. A three-language test proves partial
  grammar elimination remains visible without forcing a choice.

- **Conversation language resolves only surviving ambiguity.** `brainFrom()` now
  returns the language selected for the current signal and accepts a previously
  established language as circumstance. After grammar, meaning and world gates,
  that opaque language id may select one remaining candidate; it cannot revive
  a candidate rejected by current evidence. Runtime conversation threads carry
  the last language the brain actually selected across ambiguous or unrecognized
  turns, independently per conversation. Tests cover reversed source order,
  stale context losing to grammar, and the public result field.

- **Known meaning and world grounding can resolve a grammar tie.** After
  structural filtering, the brain now retains candidates whose every token is
  a declared word, readable figure or already known name; exactly one complete
  meaning selects its language. If meanings still tie, exactly one candidate
  whose referenced concepts exist in the supplied world is selected. These are
  ordered elimination gates rather than scores, and their decisions are
  recorded as `resolution.by: meaning` or `world`. Reversed-order E2E tests use
  an entity/action signal and an entity/relation/property question.

- **A uniquely coherent grammar can resolve language ambiguity.** Competing
  whole-signal readings are now thought and parsed independently without
  judging or learning them. A language is selected only when its grammar alone
  consumes the complete signal; zero or several successful parses proceed to
  later evidence without an arbitrary choice. The chosen language node records
  `resolution.by: grammar` and every candidate token sequence, making the
  decision inspectable and independent of source order. Tests cover a unique
  parse, reversed language order, an equal-parse tie and a zero-parse tie.

- **Competing complete language readings no longer inherit file priority.**
  The first loaded language previously won whenever several languages could
  each recognize the entire signal. The brain now selects a language only when
  exactly one complete reading exists. Competing readings are retained on an
  explicit `language: ambiguous` node, including each language's own token
  sequence in canonical language-name order, while language-specific sound,
  vocabulary, grammar, question mood, expression and learning remain inactive.
  Tests cover one-word versus three-word readings, reversed source order and
  conflicting question conventions.

- **Installed languages cannot alter another language's perception.**
  Tokenization previously combined standalone-symbol rules from every loaded
  language, while sound perception combined their vowel sets; one language
  could therefore split or reclassify another's word before recognition. Each
  language is now tried independently for a whole-signal reading in stable
  order. The selected language alone supplies tokens, recognition and
  phonetics, and a candidate may not gain a reading by discarding raw letters
  or numbers. Incompatible symbol systems remain unrecognized rather than
  forming a mixed signal. Tests protect edge marks, an embedded `+`, opposing
  vowel declarations and mixed-language input.

- **Question mood follows the recognized language, not every loaded one.** A
  punctuation mark previously made a signal a question when any installed
  language called it one. Mood now consults only the language carried by the
  understood signal; mixed or unrecognized input receives no borrowed question
  convention. With conflicting languages loaded, an E2E test proves `?` is a
  statement and is learned while the recognizing language's `!` asks the same
  fact and leaves memory unchanged.

- **Word order comes from the signal's language with no implicit direction.**
  Marker and action-part inference previously consulted the first loaded
  language, while a missing `marking` declaration silently became English-like
  `after`. Both leaks are removed: the core resolves order from the one language
  carried by the signal and assigns none for mixed/unrecognized input. A whole
  language using role markers, new/known markers, determiners or possessors must
  declare `marking`; languages without neighbour markers need not. An E2E test
  places a reversed-order language second behind conflicting order data and
  verifies the correct agent/source event and response language.

- **Number-word composition is a declarative reduction, not a named English
  strategy.** The core no longer recognizes `multiplicative-additive` or
  assumes that a round value is a multiple of ten. A language now supplies an
  ordered list of rules over universal numeric primitives: relative order,
  divisibility of either side, addition and multiplication. The first matching
  rule wins and no match keeps the words separate. English declares its former
  behavior in data; an end-to-end alternate vocabulary uses base-five grouping
  without a core change. Invalid rules and inexact results are refused.

- **Context chooses word readings through one language-neutral primitive.**
  Four separate paths for English `did`, elliptical `one`, dual-use `that` and
  idea-reference `so` are replaced by declarative `select` constraints in the
  language. The core now matches only universal context—first position,
  denial/proposition before, pointer/predicate/determiner after, and modifiers
  crossed—then takes the first matching reading or the declared fallback.
  The old `where` field and `ellipsis` cognitive function are removed. Tests
  rename all four words and prove identical selection, including arithmetic,
  modifier-crossing reference, embedded claims, standalone pointers, idea
  recall, past questions, denial and prior-action fallback.

- **Parts of speech and grammar names are opaque to reasoning.** The core no
  longer branches on English parser labels such as noun, article, pronoun,
  possessive, conjunction, interjection, complementizer, modal, subject or
  item. Language data now declares cognitive word functions, the parser
  position of unknown names, shared syntax functions, and referent/whole phrase
  roles. A regression suite renames every terminal and non-terminal symbol and
  proves unchanged results across classification, denial, holding, modality,
  quantification, embedded claims, descriptions, new names and several verbs.

- **Turns and persistence are deterministic and atomic.** The runtime now
  serialises the complete load/reason/allocate/write/thread transition, joined
  and concurrent learnings share one collision-free allocator, and SQLite
  commits a learned change as one transaction. A failed write is rolled back
  and never acknowledged; supplied source objects are no longer mutated while
  knowledge is assembled.

- **A proposed world change is validated as one whole.** Joined clauses can no
  longer evade cycle prevention or reuse an id, and merged knowledge refuses
  classification cycles, opposite-polarity facts and incompatible same-moment
  quantities. Positive and denied kind facts now inherit consistently.

- **Mention, scope and truth are kept distinct.** Unknown names become only
  generic candidate things until an accepted proposition gives them a kind;
  modal, claim-about-claim, unmet conditional, denied and refused mentions do
  not leak facts. `some` assertions create an existential witness instead of
  universalising the kind. Empty answers remain unknown rather than becoming
  `none`, asserted quantities participate in truth checks, and contradictory
  polarity cannot enter a source.

- **Relations and changing state have explicit semantics.** `is` remains
  transitive while other relations follow one edge unless their term declares
  `transitive: true` (now set for cause, part and order). Current quantities and
  placements use the latest logical stamp without erasing history, and an event
  must match the queried time—a future event no longer proves a past one.

- **Language data controls language behavior without lossy arithmetic.** Whole
  proposition boundaries are grammar metadata rather than the rule name
  `clause`; positional auxiliary selection and number-word composition are also
  declared by the language. Decimal and large-integer input, computation and
  output remain exact rather than crossing JavaScript's unsafe `Number` range.

- **A third-person `it` on speaker-side focus stands for what is held.**
  `I have 3 chocolates / what is it?` answered with the bearer (`person`)
  because a pointer lands on one `spoken` id and the bearer is that id.
  The brain now carries the word's `person`/`number` through to the thought
  and, where a bare `it` lands on a speaker-side bearer holding exactly one
  kind, resolves to the held kind instead. Bearer-only threads (`a cupboard
  has three cup / what is it?` → `cupboard`) are unchanged, and `who am i?`
  still asks name (`none` where unnamed) while `what am i?` asks kind
  (`human`).

- **Plural pointers join speaker-side focus.** `them`/`these`/`those` now
  carry `person: third, number: plural` in `en.json`, and the speaker-side
  shift applies at the word (so `wash them` reaches the held kind, with the
  event's `spoken` following the held thing) as well as in bare identity
  questions. `one`/`ones` ellipsis, verb anaphora (`do`/`does`/`did`),
  clause `so`, `neither`, and `this`/`that` proximity remain open.

- **A pointer with no previous topic looks left in its own signal.** `it`
  naming nothing (fresh thread) takes the nearest thing already understood
  earlier in the same signal — `a violin is loud and it is old` learns the
  violin is old — while forward reference (`it is heavy and a drum is cold`)
  still names nothing. Pointers already resolved from a previous topic keep
  reaching across signals (`into it`), so role-marked cross-signal uses are
  unchanged.

- **Elliptical `one`/`ones` stand for the focused kind.** `one` holds two
  readings (numeral, pronoun) and `ones` is a plural pronoun; after a
  determiner the pronoun reading is taken (`the one is warm` after a clarinet
  is introduced learns it of the clarinet), otherwise the numeral stands (`one
  plus one` still counts). Grammar gains `article pronoun` for the binding.

- **A description before `one` restricts, claims nothing.** Nouns,
  adjectives and degrees between a determiner and an ellipsis head (`the
  sweet one`, `the brass one`) never offer their own fact: grammar binds
  `article adjective/noun pronoun`, ellipsis settles across the modifier
  chain, and judging drops restrictors from claims (conjunctions untouched,
  so togetherness still offers every side). `the sweet one is hot` takes in
  one fact, not two. Presupposition (`the sweet one` also saying the head is
  sweet) is not taken in — constitution is not kind, and that distinction is
  open.

- **Person pointers `she`/`he`.** They were absent from the language data
  entirely (unheard). They now point like any spoken pointer
  (`sana is a nurse / is she tall?` resolves, answering `unsure` where the
  property is unknown rather than guessing). Plural `they`, verb anaphora
  (`did`), clause `so` and `neither` need multi-entity focus memory and stay
  open.

- **A clause subject prefers its own signal over a prior topic.** A
  third-person pointer opening a new clause after a conjunction (`a bassoon
  is loud and it is old` with a topic set) now resolves to the current
  signal's nearest thing, leaving the prior topic untouched. Pointers
  elsewhere keep their previous resolution, so role-marked uses (`take one
  lamp from it`) still reach across signals. That a clause is a fresh start
  is the brain's; which words join clauses is the language's (`conjunction`).

- **Focus is a ranked list, and plural `they` reaches all of it.** The
  runtime holds focus per conversation (latest first: what was spoken of,
  what it holds, earlier topics; capped at eight) and hands it back each
  turn; the brain reads it and returns the new one. `they`/`them` in claims
  and questions expand to every non-speaker topic — `lara is a doctor /
  nina is a teacher / are they strong?` lays one fact apiece and answers
  both together. Single-topic and speaker-side behavior is unchanged, and
  events still take one target each.

- **Clause anaphora: `so` asks the last idea again.** `so` holds two
  readings (listed, idea-pointer to a new `idea` mark), settled by position
  after a pronoun or a doing. Every verdict joins focus as a triple, and an
  asked `so` lays the latest triple against the world afresh — held,
  against, absent — answering like any question and asserting nothing.
  Telling an idea, or asking with none in mind, stays unanswered.

- **Thanks is a doing.** `thank`/`thanks` name a plain action, so `thank you`
  is heard and taken in as an occurrence instead of dying unheard. No new
  reply frames: acknowledging thanks stays open.

- **Contractions derive denied.** `n't` strips to its stem carrying denial
  (`don't` is `do` denied — `can't`/`won't` stay irregulars), and grammar
  binds subject-led auxiliary shapes (`i don't like it` records the denied
  doing instead of going unheard; intransitive `does not fly` likewise).

- **Doubling and halving are worked.** New innate unary ops with world terms
  and anchors (`double 5` → ten, `halve 9` → 4.5, `half of 10` → five);
  grammar voices function-led partitives, and a bare operation's `of` reads
  as syntax rather than a joint. Exact in whole parts like the other four.

- **Modals join doings.** Grammar binds `modal verb` predicates and fronted
  `modal subject verb` questions, so `a cat can swim` is checked
  arm's-length like any modal claim — taken in never, unknown no longer.
  Ability itself needs capability knowledge and stays open.

- **Superlatives derive; descriptions restrict noun heads too.** `-er` and
  `-est` read off adjectives (`biggest` reaches `big` through doubled
  consonants, tried only on a miss — both lookups exact, listed words win),
  `big`/`small`/`long` read as adjectives as well as nouns, and grammar
  binds `article adjective noun`. A description before a plain noun head
  restricts it like an ellipsis head (`the biggest wren eats fish` puts the
  wren, never bigness, on the record); conjunctions still join. Better/best
  and noun–noun compounds stay open.

- **Definite accommodation.** `the` with nothing to be the of yet makes one
  where state is given (`the library has 12 books` learns) — making one is
  not picking. Several, and there is no `the` (still unsure); `the` reuses
  the one while `a` makes another. Spec example updated.

- **A bare pointer voices nothing.** `i`/`you`/`it` standing alone no longer
  recite dictionary meanings (`I recognise "the one it came from"`).
  Counts and confirms of where one lands still speak; a pointer to an
  ordinary thing says nothing by itself.

- **Action counts read occurrences.** Event part amounts persist on the
  record, `how many dates am i carrying?` parses, and the amount comes off
  the matching occurrence — individuals pin it down, the kind beside the
  quantity word says what was carried, latest stamped wins. Full
  action-questions answer counts or nothing, never kinds; denied occurrences
  never count.

- **Partitive counts read state against the thread's bearer.** `how many of
  them` parses (`preposition pronoun` subjects) and counts the one kind its
  bearer holds — the first individual in focus, else whoever was spoken of.
  Taking all leaves zero; a kind nowhere held, and carrying without holding,
  answer nothing. Counts voice in figures where the signal is written that
  way (`of` is another way to write, not a name).

- **Repair repeats the topic.** Asking what was said (`what did you say?`,
  however inflected) answers with the thing in mind — never its kind, never
  a guess — where any communication doing meets a hole. Nothing in mind
  answers nothing. Runs before holes are answered one apiece.

- **`that` points as well as subordinates; `this`/`that` rank by proximity.**
  `that` holds two readings settled by what follows (a claim keeps the
  complementizer, otherwise it is a far pointer); `this`/`these` read near,
  `those`/`that` far, over thing-topics in focus. `it`/`them` stay neutral.
  Imperative pronoun objects (`put that…`) stay open.

- **A possessive determining its head never offers, answers, or plays.**
  `my` before `cat` marks whose and drops from facts, parties, and answers;
  standing as head (`its`, `the film's` before the joint) it stays. Fresh
  individuals read their kind off the call node, never the bare fallback.

- **A tensed `be` yields to a doing after it.** `i will go` records going
  with its future moment instead of learning `doctor is go`; plain `be`
  still joins (`planting is a work`).

- **Better/best/worse/worst are plain adjectives of their poles.** Heard and
  restricting like any description — never phantom individuals, never
  comparisons without a scale to stand them on.

- **A hole seeking how or when takes no pointer for an answer.** `when is
  it` is none, not the topic's kind; kinds answer as ever, and bare
  `why is a cat` still asks like what does.

- **More superlatives derive.** `tall`/`heavy`/`warm`/`red` read as
  adjectives too, with `-ier`/`-iest` rules; noun–noun compounds stay open.

- **`why` over a full predication stays unanswered.** `why` asks across
  causes (new `on` link to the cause anchor) with grammar to bind it, and a
  `why`-hole over a claimed complement returns absence instead of answering
  about kinds. Bare `why is a cat` still asks like what does; causal memory
  itself stays open.

- **Told agreement re-offers the last idea as fact.** `i think so` lays the
  focused triple back through the fact machinery with its own denial —
  nothing new where it holds, contradiction refused where denied — and the
  think-doing itself goes unrecorded. Fact helpers now live at judge scope
  so agreement runs before the action path takes the signal.

- **Agreement with a denial: `neither` copies it onto a new agent.**
  The `neither` term is never a doer — it drops from the parts, and a lone
  target left agentless by inversion becomes the agent. Combined with the
  prior-action copy, `nora did not wash a pan / neither did theo` records
  theo's denied doing. Denied occurrences go on the record as not having
  happened, and never answer as if they did.

- **Properties in object place take no article.** `a tuba is loud`, never
  `a loud`: the claim frame no longer counts a property as one of a kind.
  Subject place is untouched — what a thing has been called stays with it,
  so learned properties can never unkind their bearer.

- **Verb anaphora: `did` repeats the last action.** `did` holds two
  readings (sentence-initial auxiliary, post-subject prior-action pointer to
  a new `prior` mark); position settles which, and settling drops the other
  so nothing re-reads it. The pointer resolves to the latest action-kind in
  focus — kinds, never occurrences — and unspoken parts ride over from that
  action's latest occurrence with the new agent (`pippa washed a pot / miro
  did too` records miro washing it). Grammar voices `did too` via a bare
  `degree` complement.

- **`did` with `not` stays an auxiliary.** Denial forces the listed reading
  (`pippa did not wash a pot` never repeats anything), closing a hole where
  position alone would have read prior-action into a denial.

- **Named givings and worked sums join focus.** `x is 5` now puts five in
  mind (naming feeds the topic, not just the conversation record), so a
  following `what is it?` resolves instead of landing nowhere. Worked sums
  go back latest-first — as their term where named, as their bare value
  where the world names nothing — so each `add` works from the last result
  (`5, 11, 71, 72…`) and a value-pointer is never stolen back by neighbours
  in its own signal. Kind-questions still answer kinds (`what is x?` →
  `number`, per spec).

- **A `what-is` walk ending at bare `thing` names the thing itself.**
  `I have 3 chocolates / what is it?` resolved to the held kind but answered
  `thing`, its only known parent. Where the walk finds nothing but the
  generic `thing` anchor, the brain now answers with the subject term itself
  (said by its symbol where the language has no word), so it says
  `chocolates`. Specific answers, kind-restricted questions and empty walks
  are unchanged.

- **The demo ran without anything under `knowledge/`.** Its permission list
  granted `../languages` and `../data` and not `../knowledge`, so the one file
  that says what this instance is called was never read — *what is your name?*
  answered *none* through `tsr dev` and *ACI* everywhere else.

- **A source that cannot be read says so.** A directory that is not there
  contributes nothing, and that is ordinary; being told it may not be read is
  not, and both were swallowed alike. The brain would answer from less than it
  was given and never mention it, which is the one thing a brain whose answers
  are meant to trace back to readable data must not do quietly.

### Changed

- **A write is executed, not queried.** Every insert and delete went through
  `query`, which allocates a cursor to read rows back from — and a write hands
  back none. Nothing measurable now that the seed goes in whole, since few
  single writes are left; it is the right shape all the same.

- **A world is put in whole, not a row at a time.** Seeding an authored world
  cost one trip to the driver per row — 5562 of them, about 530 ms, on every
  open. Every statement costs the same trip whether it writes one row or five
  thousand, so each kind of row is now written in one statement handed all of
  them. The same writes, in the same order: 530 ms becomes about 40 ms. This is
  not durability — the store under a test is in memory and never touches disk.

- **A language is checked once, not on every rebuild.** The brain is rebuilt
  from source whenever it learns something and whenever it forgets, and each
  rebuild merged and re-checked every word of every language to find out that
  nothing about them had moved. Only the world moves; the languages are made
  ready once and handed back. A learn or a forget costs 15 ms instead of 23.

  Together: the suite runs in 24 s where it took 57 s. Understanding a signal
  was never the cost — that is about 2 ms, and is unchanged.

### Added

- **Property predication is now distinct from classification.** The
  language-neutral `predication` relation connects an entity to a property
  without putting that entity on the property's subtype ladder. Broad copular
  queries remain compatible, but `sky predication blue` no longer entails
  `sky is property`. New property statements use the dedicated relation,
  authored colour and period facts are migrated, and compatible legacy broad
  property links receive the same bounded semantics. Predication targets are
  validated as properties in sources and atomic learned overlays.

- **Classification now distinguishes kind specialization from individual
  membership.** The world anchors `subtype` and `instance` as separate
  language-neutral relations beneath the compatible broad `is` surface.
  `subtype` is strict and transitive; `instance` is direct and irreflexive.
  Their paths compose in the broad kind walk, but instance membership itself
  never becomes transitive. New conversational learning stores the strongest
  applicable relation, while legacy world links keep their existing behavior.
  Invalid endpoints and mixed classification cycles
  are rejected in sources and atomic learned overlays.

- **Relations can now imply subject and object kinds through domain and range.**
  The language-neutral `domain` and `range` anchors let relation terms declare
  their subject and object constraints. Positive facts contribute inferred
  classifications without copying `is` links; negative facts contribute none.
  Subrelations inherit their parents' constraints and declared converses swap
  the two sides. Claims that conflict with denied or exclusive kinds are
  refused, as are malformed declarations, individual constraint targets and
  inconsistent authored or atomic learned knowledge.

- **Relations can now specialize other relations.** The world anchors a strict,
  transitive `subrelation` primitive, and relation terms connect to broader
  relations through ordinary world links. A fact under a narrower relation is
  consequently readable under every broader relation without copying edges;
  the reverse implication does not hold. Broader denials constrain narrower
  claims, and broader symmetry, transitivity, asymmetry, irreflexivity and
  functionality govern child facts. Declared converses are normalized at the
  same semantic boundary. Cyclic hierarchies and hierarchy links whose
  endpoints are not relations are rejected. Cached hierarchy closure keeps
  ordinary relation queries independent of total ontology size.

- **Relations can now declare a single current object per subject.** A relation
  marked `functional: true` makes an established different object stand against
  a competing claim, and atomic learning/source validation rejects competing
  values. Untimed values are static; time-stamped values retain history while
  truth and open answers expose only the latest moment. Symmetric functional
  relations enforce the constraint at both endpoints, and facts stored through
  a declared converse are normalized before the constraint and current-time
  selection run. The characteristic is language-neutral, merges across
  knowledge sources, migrates old SQLite stores, and survives round-trip
  persistence. No existing world relation is marked functional without a
  justified universal constraint.

- **Relations can now declare reflexive and irreflexive self-semantics.** A
  `reflexive: true` relation entails one self-edge for every existing term
  without storing those edges; `irreflexive: true` makes a positive self-claim
  stand against the world. Asymmetry entails irreflexivity. Impossible mixed
  declarations, positive irreflexive self-links and denied required reflexive
  self-links are rejected in authored sources and atomic learned overlays.
  `same` now declares reflexivity and `different` declares irreflexivity.
  Query, open-answer, source-merge, SQLite migration and round-trip tests cover
  the characteristics with opaque relation names.

- **Relations can now declare symmetry as world knowledge.** A relation term
  marked `symmetric: true` makes one positive or negative edge readable from
  either endpoint without storing a duplicate mirror. Truth checks, open-ended
  answers, inherited claims and converse handling share the characteristic;
  mirrored facts with conflicting polarity or quantity are rejected. `same`
  and `different` now carry the justified declaration. Source merging, shape
  validation, SQLite schema migration and round-trip persistence preserve it,
  with opaque relation tests proving no relation name is inspected.

- **Primitive coverage now has an audited, dependency-ordered roadmap.**
  `PRIMITIVES.md` distinguishes implemented inference from vocabulary-only
  concepts across identity, classification, relations, propositions,
  composition, space, time, state, events, causality, quantity, modality and
  knowledge. It records existing correctness defects separately from missing
  primitives, defines deterministic acceptance probes, keeps existence as the
  terminal root, and explicitly tracks the deferred component/material and
  language work.

- **Material structure now connects entity knowledge to the universe model.**
  `matter` sits under the existing `physical-thing` branch, with objects,
  substances and organisms beneath it while energy remains a distinct physical
  category. Elements are substances; atoms and molecules are objects. The
  existing transitive `part` relation is now asymmetric and has the generic
  converse `made-of`, connecting atom → element → matter → universe without
  confusing composition with classification. The universe holds matter as it
  already holds existence and force. Consequently the ordinary question walk
  now follows `honey → food → substance → matter → physical → thing →
  existence`, while living/nonliving remains an orthogonal world-derived
  classification. Tests cover material taxonomy, energy separation, converse
  and transitive composition, the complete knowledge walk, and living versus
  nonliving entities.

- **Before and after now form strict temporal order in the existing world.**
  Both are world relations classified under `order`, while `past`, `now` and
  `future` remain moments under the existing `time` model. Their converse,
  transitive and asymmetric properties are data, not relation-name branches in
  the core. The generic world walk now composes edges stated from either
  converse direction, so `morning before afternoon` plus `evening after
  afternoon` entails `morning before evening`. Reverse questions deterministically
  deny, reverse assertions and atomic multi-clause cycles are refused, and the
  knowledge door rejects asymmetric self-links, opposing pairs and transitive
  cycles. Store schema migration and round-trip support preserve asymmetry.
  Ontology, conversation, mixed-direction inference, validation, persistence
  and regression tests cover the complete path.

- **Focused entities can answer primitive classification choices.** A language
  may mark alternative labels as the closed `living` and `nonliving` entity
  refinements and provide its own speech for each. The core derives the current
  topic's refinement from the world, selects exactly one offered alternative,
  and learns nothing from the choice. `honey / living thing or non-living
  thing` now answers `non-living thing`; `tree` answers `living thing`. With no
  focused entity the understood choice remains unanswered instead of falling
  through as an accidental assertion. Exact declared compounds take precedence
  over an embedded standalone symbol, while undeclared arithmetic such as
  `5-2` still tokenizes and evaluates normally. Shape, E2E, arithmetic and
  opaque-language tests cover closed labels, both entity classes, missing
  focus, output ownership and parser-symbol neutrality.

- **The residue, where it fits.** tell, watch, put and stand happen, with
  told and stood before now; taken, given, thrown, sung and driven stand as
  the doing done (known names a state, and no machinery reads a state done to
  something); closed is the past of closing; soft, clear, fine, ready, wrong
  and alone tell and ask back; alive names life the way afraid names fear. New
  kinds where they are true: home and area are places; job, service, research
  and test are work and happenings; member, kid, parent, guy, neighbor and
  boss are persons; community, team, party and government are groups; history
  is a story, education a process, news communication; afternoon, weekend,
  holiday and birthday are periods; medicine is a substance, headache is pain;
  appointment is an event, email a message; photo is an object, score a
  result; clothes, shoes and bike join clothing, clothing and vehicles; flu is
  a state. Left out: multi-word kind names no sentence can say (`body part`),
  doubling plurals, superlatives, high, low, early, late, real, whole, own,
  best, better, worse, worst and much.

- **Sixty states and qualities, said as adjectives.** Size takes large,
  little, huge, tiny, vast, wide, narrow, deep, shallow, thick and thin; age
  takes new, old, young, modern and ancient; temperature takes chilly and
  freezing; speed takes fast, slow and quick; quality takes ugly, easy, hard,
  difficult, simple, rich, poor, sweet, sour, bitter, salty, safe and
  dangerous; glad and sorry name the poles they already answered with, afraid
  names fear, proud names pride, and clean is said a third way for the
  cleanliness being washed leaves. Larger, newer and wider compare on their
  scales. Left out where nothing holds them: superlatives, and high, low,
  early, late, real, whole, own, alive and dead.

- **A word may carry when, or that a signal is asking, without naming
  anything.** English writes `do`, `does` and `did` that way, and the brain had
  none of them — *how many cookies do i have?* died on a word. An auxiliary
  names nothing, is never the joint, and the claim under it is read exactly as
  it would be without it. Which end of a count was said first is word order, so
  the brain tries both: *how many crayons do i have* and *i have how many
  crayons* are the same question.

- **Asked whether something happened, the brain looks rather than records.**
  *did i see a film?* answered *I understand* and put another seeing on the
  record. Being asked is not being told: it looks through what it was told
  happened, where every part the signal names is played by the same one
  occurrence, and answers yes or no. Finding none is not finding it did not
  happen — it says it does not know.

- **No regular past is written down.** The rule against enumeration reached
  nouns and not verbs: 87 past forms were listed by hand. An ending may now say
  what part of speech it makes and when it puts the doing, English derives
  `-ing`, `-ed`, `-d` and `-ied`, and 49 forms a rule already reached are gone
  from the lexicon. The irregulars stay listed, which is what listed is for —
  a listed word always wins.

- **A thing's name may be told with `'s`.** *the film's name is arrival* was
  not understood: possessive was something only a pronoun could be. An ending
  may now say what part of speech it makes, English derives `'s` into one, and
  the grammar takes an article before it. A bare noun before a noun is still
  not a possession — *apple tree* is not the tree's apple.

### Fixed

- **Something that happened says what was spoken of.** Only a fact taken in, a
  standing or an answer named what a signal was about, so *i saw a film* left
  nothing for the next signal to point back at and *its name is arrival* landed
  on nobody. What was done to is what was spoken of.

- **A thing spoken of as one of its kind is one of them.** *a film* in
  something that happened was the kind itself, so what was seen was films and
  there was no one film to name. The `new` mark already made one where a count
  needed a bearer; a doing makes one the same way. A thing made this way was
  never called anything, so it is said by what it is — *who kicked the ball*
  answers *boy*, not *boy#12*.

- **A possessive landing on nothing names nothing.** Told nothing to point at,
  `its` was dropped and the word it marked stood alone — *its name is arrival*
  made a claim about the name relation itself. The signal names nothing there
  now, and nothing is named on the back of it.

- **A number beside a word nothing knows counts it.** *i have 3 crayons* kept
  the having and threw the three away, because the count is read off a term the
  world holds and the word was only being named in that same breath. Counted, a
  word nothing knows names a kind — there are three of them, so they are not
  one thing.

- **A pointer lands on one thing, never on a kind.** Where the runtime says a
  signal came from a kind, the one of it is who is meant, so what a sender was
  told to have is what they are found to have.

- **The demo says who is talking to it.** It passed only the conversation, so
  `i` landed on nobody and everything a sender said of themselves was dropped
  under *I understand.* It now says the signal came from a person, which is the
  runtime's to say and never the brain's to assume.

- **A kind on its own is not counted out in public.** Asked how many of a kind
  cold, the brain counted its own shelves — *how many mammal* answered with
  what the world holds terms for. The world is for understanding, not
  inventory: a kind with nothing spoken of is not counted, and the brain says
  it does not know. What a thing holds is another matter and is read as
  before — *the crate holds how many lamps* still answers, and so does *a week
  has how many days*.

- **Asking names nothing.** A hole stands for what the signal does not say, so
  a signal carrying one is asking, not giving — `who has the telescope` named
  a telescope and answered *I understand.* It names nothing now, answers what
  it found and takes nothing in, with or without a question mark.
- **A comparison is said back as the comparing.** The standing joins the things
  by more-or-less, and the claim was said back that way — *an alice more a
  bob*. The standing carries the scale the signal compared on, the language
  gives the word that compares on it, and a `compare` frame says it: *alice is
  bigger than bob*.
- **What is not one of a kind takes no article.** The claim frame gave every
  side one — *a gravity is a force*, *a water is a liquid*. A name takes none,
  and a word may say its term stands bare (`bare`); which form one of a kind
  takes against what follows stays the language's.

### Added

- **Forty-five more doings, three of them second senses.** happen, provide,
  lose, pay, include, continue, set, create, allow, spend, grow, win, offer,
  remember, consider, appear, buy, wait, serve, die, send, expect, stay,
  reach, kill, remain, teach, need, become, smile, laugh, cry, call, try,
  keep, seem, find, turn, show, put, let and live go under work, said both
  ways; love, change and lead name a second thing the way saw does, settled
  the same way. Irregulars listed where deriving cannot reach them (lost,
  paid, spent, grew, grown, won, bought, taught, sent, kept, found, became,
  shown); the rest derive. Stayed out where the name is taken: meet (a
  gathering), learn (knowledge), mean (a sense), feel (a state) and leave
  (left is a direction).

- **Ten more doings, statives filed like the rest.** talk, like, want, help,
  start, play, move, believe, bring and sit go under work, said both ways —
  what was wanted is on the record as what happened. Regular pasts derive and
  are not written; brought and sat, being irregular, are.

- **Every doing in all its forms.** Third-person forms for thirty doings —
  brushes, combs, fishes, forms, gives, hands, heads, irons, knows, lights,
  marks, milks, names, orders, parts, pens, phones, pictures, places, plants,
  reads, says, ships, signs, speaks, takes, trains, waters — each keeping the
  noun it shares a spelling with, so `bears are mammals` still reads as bears.
  Past participles said, fallen, eaten, drunk, gone, seen, spoken, written and
  born, for what auxiliaries ask. `use` and `uses` name the use relation the
  way `have` names having, and `used` derives.

- **Everyday function words.** `but`, `nor` and `yet` join the way `and`
  does, and `so` goes with a state the way `very` does. Ten bare
  prepositions — at, about, over, after, before, between, through, during,
  above, off — stand where `than` does, naming nothing. `when` and `why` ask
  like `what`; `shall` holds a claim at arm's length like `might`; `each` and
  `both` say every one, `either` and `any` say some.

- **A thousand new everyday things, and words for all of them.** Birds, fish,
  insects, mammals, trees, flowers, foods and clothing roughly double;
  reptiles, tools, buildings, persons, sports, music, devices, body parts and
  containers grow by the dozen; games, toys, landforms, sky, colours, fabrics,
  gems, cheeses, spices and drinks fill out; fifteen more doings — ache, boil,
  nod, pour, rinse, roast, scrub, sip, sneeze, snore, whisper, yawn, shiver,
  stagger, tickle — go under work, said both ways with their pasts written
  out. Every new term is sayable, and no plural is written down anywhere: the
  three derivation rules reach them all. The world holds 2616 terms.

- **Which of two, joined by `or`.** `which` is a hole like `what`, and `or`
  joins as a choice rather than a togetherness — one of them is the answer,
  not each. Asked across a comparison, every pairing is worked the way any
  comparison is: `which is smaller 8 or 0` answers `zero`, measured things
  answer the same way, and a worked tie answers `neither`. Nothing is
  taken in either way.

- **Devices, music, more feelings and weather, singing and dancing.** `device`
  holds its first kinds — radio, television, camera, speaker, headphones,
  charger, battery, printer, microwave, freezer and fan — and `screen` and
  `keyboard` move there from object, still objects either way. `music` holds
  song, tune, drum, guitar, piano, violin, flute and trumpet, and stands bare
  the way gravity does. Shame, pride, envy, pity and guilt join feeling; hail,
  drizzle, rainbow and sunshine join weather. `singing` goes under work with
  sing said both ways and `sang` written out; `dance` stood unsaid and is now
  said both ways with `danced`. The world holds 1519 terms.

- **Meals, beverages, rooms, more furniture, four more doings.** `meal` under
  food holds breakfast, lunch, dinner, supper, snack and brunch; `beverage`
  under liquid holds lemonade, cocoa, milkshake and smoothie; nursery, study
  and pantry are the first kinds of room, which now says its children apart;
  pillow, rug, stove, oven, fridge, curtain and blanket join furniture, and
  `shelf` moves there from object — still an object either way. `cooking`,
  `driving`, `cleaning` and `fixing` go under work, said both ways with their
  pasts written out (`cook` already was; `build` stays out, the building is
  already a place). The world holds 1490 terms.

- **An hour has sixty minutes, a minute sixty seconds.** A day already held its
  hours; the chain runs down the same way, so asking what an hour or a minute
  holds answers with what was counted.

- **A day has twenty-four hours.** A week already held seven days and a year
  twelve months; a day now holds twenty-four hours, so asking how many hours it
  has answers with what was counted.

- **`hurt` as a doing.** `hurt` named only the feeling at the bad pole, so `"i
  hurt myself"` was not understood. The world gains `hurting` under work, and
  the word names both — the feeling and the doing it also is — settled the way
  `saw` is. `hurts` says it of one other, and the past needs no writing: it is
  spelled `hurt`, the way `cut` is.

- **A thing may be whose.** `my cat` is not cats — it is the one cat the sender
  has, and what is said of it is said of that one. Which word says whose is the
  language's; whom it points at is the circumstance's. Where the world holds
  one such thing that is the one meant; where it holds none and the signal is
  telling, one is made and given to whoever it belongs to; where it holds more
  than one there is no *the* to resolve and the brain does not pick. `of` says
  the same the long way round.

- **A hole may say what kind of answer it wants.** `what colour is the car`
  asks after the car and will take only a colour for an answer; everything
  else the car is stays true and is not the reply. The kind asked after is not
  one of the things asked about.
- **A hole standing where something played a part asks which thing played it.**
  `who kicked the ball` looks through what the brain was told happened for one
  where the named parts match, and answers with whatever played the part the
  hole stands in. A hole is known by its mark, not by naming nothing — a word
  may both stand for what is not said and name the relation it asks across.
- **`where`**, a hole that asks across being in something, the way `who` asks
  across a name.

- **A thing may be given a name.** A word no language lists and no world holds,
  standing where a thing stands and said to be of a kind, is a name being
  given: `"luna is a cat"` says there is a cat called luna, and the brain
  hands it back as a thing there is one of. It is met again by what it is
  called — the world is asked for a term of that name, which is how a name
  given in conversation is found later.

  A name for a thing is the world's, not the conversation's: the thing goes on
  being there after the talking stops. That is what tells it apart from `x is
  5`, where the name belongs to the conversation.

  A word nothing knows also stands as a thing now, since standing where a
  thing stands is what a name does — but it stays unknown until something says
  what it is.

- **Comparatives.** `heavier`, `bigger`, `hotter`, `faster`, `older` and their
  opposites, with `than`. A comparative names the comparing and says which
  scale it compares **on** — a new field a word may carry — so the same two
  things answer differently to *heavier* and *bigger*, and neither reads the
  other's scale. With no scale said, two scales that disagree are no answer.
- **Reflexives.** `myself`, `yourself`, `itself` — the marks the pointers
  already carried. Nothing else was needed: one thing may play two parts in
  what happened, and always could.
- **`causes`, `caused`, `because`.** The world already held causing; English
  could not say it. A cause reaches as far as the causing goes, so a storm
  causing a wind and a wind a fire is a storm causing a fire, unasked — a
  relation is walked as far as it runs. `because` joins two claims and both
  are answered; that the second is *why* the first is not written down, a
  claim not being a thing the world can hold.

- **Two number words side by side are one number.** `twenty` and `five` were
  both in the language and nothing made them twenty-five. `think` now reads
  them together, the way it already reads a sign against a number: a round one
  with a smaller one after it is added, a smaller one before a round one
  multiplies it, and a run of them is taken as it is read — `one hundred
  twenty five` is 125. Figures are already whole as written and are never run
  together, so `3 4` is still two things.
- **220 more everyday things**, and the shelves they needed: clothing, toy,
  game, sport, shape, money, device, settlement. Ball, shirt, coin, circle,
  city, wall, roof, football. The world holds 1347 terms.

- **What was so before.** State has always been stamped and never written
  over — the history was there and nothing could reach it. Asked on the past
  side of now, the brain now steps back a stamp: `"the crate holds how many
  lamps?"` and `"the crate held how many lamps?"` are the same question asked
  of two moments. Nothing is remembered on purpose; the record was never
  erased in the first place.

- **`think` reads the words side by side, not only one at a time.** Having
  thought each word on its own, it looks at them together and takes as one the
  ones that are really one thing, reshaping the tree before anything else sees
  it. The first of these: a sign written against a number is part of the
  number — `-500` is five hundred below nothing, and `-500 + 700` is 200.

  Only a **sign** may be written that way. A word for taking away stands
  before what it takes and is not part of it, so `"subtract one nail from it"`
  still takes one. Which of its words are the name of a thing and which are
  another way to write it is the language's to say, and it already said so.
- **A name may be given an amount the world never named.** No term names five
  hundred, and `"x is 500"` holds it all the same — a name keeps what it was
  given, term or amount.

- **Instruction following.** A condition put on something to *do* is an
  instruction, not a question. Where the brain cannot reach the condition yet,
  it does not shrug — it agrees to follow, and says so.

  It keeps none of it. The instruction is handed back like what was last
  spoken of, the runtime holds it for that conversation, and brings it round
  again after every later signal. Where something has moved and the condition
  can be reached at last, acting on it is the brain's answer:
  `"if x > 10, then say big else say small"` is *Ok.*; `"x is 5"` after it is
  *small*; `"x is 15"` is *big*. An instruction given in one conversation is
  nothing to another.

- **`else`, `say`, `>` and names for values** — the four things `"if x > 10
  then say big else say small"` needed.

  `else` gives a condition its other side: where something **stands against**
  the condition, what the signal puts after `else` stands instead. A condition
  the brain cannot work out is neither — it did not fail, it was never
  reached — so neither side follows and the brain says it does not know.
  Either side may be a whole signal or a thing on its own, and a thing put
  where a claim would go is the thing to say.

  An act of saying, with nobody doing it, says what it was given to say — so
  `"say big"` answers *big*. Nothing is worked out and nothing looked up.

  `>` and `<` are other ways to write `more` and `less`, not what they are
  called.

  **A word may be given a name for a value** and stand for it after. `"x is 5"`
  gives; `"x > 10"` asks — giving is done with the weakest joint there is, so
  the two never run into each other. A name belongs to the **conversation**,
  not to the world: the brain keeps none of it, hands it back like what was
  last spoken of, and another conversation was given no such name.

- **A signal may say that one claim follows from another.** `if` puts a claim
  as a condition and `then` says what follows. Neither is made: the brain
  checks the condition, and only where that already stands does what follows
  stand too — checked in its turn, and taken in if it is new. Where the
  condition does not stand, nothing follows and nothing is taken in, the
  condition itself least of all. Two wholes standing together are a join only
  where nothing puts one as the condition of the other.

- **A signal may speak *of* a claim rather than make one.** A word may say that
  what follows is a claim and not a thing — English says `that` — and what
  follows stands whole, the way a joined clause does.

  The brain checks the claim it was told about, because that is what it was
  told about, and **takes nothing in**. Saying you know something is not
  telling the brain it is so, and asserting it would be putting words in the
  sender's mouth:

  Told `"ice is a liquid"` it takes it in; told `"i know that ice is a liquid"`
  it checks the claim and its world is unchanged. Nothing is turned down
  either, because nothing was offered. This is the one
  primitive under conditionals, modals and knowing-that alike: a claim that is
  not about the world but about another claim.

- **A thing is in a state; a scale measures the state; a unit is what the
  scale reads in.** The world said `hot is a temperature` — a thing being a
  kind of what measures it, like a warmth being a kind of thermometer.
  `hot`, `warm`, `cool`, `cold`, `heavy`, `light-weight`, `big`, `small`,
  `long`, `short` and `tall` are **states** now, and the scale that reads each
  of them says so: temperature measures hot, weight measures heavy, and a
  degree measures a temperature.

  **Where a state begins on its scale is not fixed.** Heavy and light are said
  against whatever is being compared — a heavy apple is lighter than a light
  stone — so a measured thing is not thereby named, and the brain does not
  name it.

- **Scale — what a property takes its values on.** A value is an amount of a
  unit, and a unit says which property it is of: `gram` and `kilogram` measure
  weight, `metre` size, `second` time, `degree` temperature. A thing is
  measured on a scale — `"an apple weighs ten gram"` — and the amount is what
  is kept.

  `more` and `less` stop being arithmetic. They stand two **things** on one
  scale and let the amounts say which is further along; two numbers are only
  the case where the world can already say which is greater. An apple of ten
  grams is heavier than a stone of five, whatever anyone called either of them.

  **What a thing has been called decides nothing.** Told a stone is heavy and
  an apple lightweight, `"a stone more an apple?"` is *I don't know* — the
  names are regions of a scale, and which region a value falls in depends on
  what it is read against. A thing nothing has measured has no place on the
  scale at all.

  Two units are not one scale until something says how they stand: five
  kilograms and ten grams do not compare yet.

- **The universe, above existence.** The world had no top: `existence` was the
  root and the four ways of being sat under it. It now sits inside a
  `universe`, and what the universe has besides is **force**. A force is no
  longer filed as a kind of abstract thing — it is not a thing, it is what the
  universe has and does.
- **What a force does, everything physical has.** A new way for the brain to
  know something, and it does not come down the ladder the way a kind's facts
  do — it comes from the universe inward. Nobody has to say a stone is heavy
  for the brain to know a stone has weight: a stone is physical, the universe
  has gravity, and what gravity causes is weight. The world already held
  `gravity causes weight` and `gravity causes fall`; both now reach every
  physical thing, and neither reaches a number or an idea.

  That a force reaches the physical and nothing else is the brain's — no world
  has to say a number is weightless. Which forces there are and what each
  causes stays the world's.

  Having a property is not being at one end of it: a stone **has weight** and
  is not thereby **heavy**. How much of a property a thing has is still
  unknown, and still needs telling.

- **23 more words that name two things.** `saw` proved the mechanism; the world
  now holds the doing that shares a spelling with a thing it already held —
  `planting`, `watering`, `lighting`, `ironing`, `fishing`, `marking`,
  `forming`, `placing`, `handing`, `training`, `shipping`, `parting`,
  `bearing`, `combing`, `brushing`, `milking` under work; `signing`, `naming`,
  `ordering`, `phoning`, `penning` under communication; `picturing` under
  perception; `heading` under motion. A term's name is one to a term, so the
  doing is named for itself and English spells it the way it spells the thing.
  Each is sayable both ways, with the past written out.
  `src/homonyms.test.mjs` puts all 24 through every case.

- **A word may name more than one thing, and the signal settles which.** A saw
  is a tool, and it is also what someone did with their eyes. An entry in a
  language may hold several readings; every one of them is carried through
  `understand` and `think`, because there the brain has a word and not yet a
  signal, and picking then would be guessing.

  `solve` settles it, where the whole signal is in hand. A signal names things
  and needs something joining them — a relation, or a doing. Where nothing
  does, and a word could have been a doing all along, that is what it was:

  ```
  i saw an apple             a person and a fruit, and nothing between them
                             until `saw` is read as the seeing it also is
                             → see#593, agent: person, target: apple, past

  a saw is a tool?           `is` joins them → Yes, the tool
  i cut an apple with a saw  `cut` is the doing → the saw is what it was
                             done with
  ```

- **What a tool is for.** `tool is object` was all the world said of one, so
  the brain could not know a saw is a thing a person uses to do work. `use` is
  a relation now, and a tool is used for work — inherited down the kind, so a
  knife is for work and an apple is not. English says it with `for`, the way it
  says where a thing stands: `"a saw is for work?"`, `"a saw is for what"`.
  Being used for work is not being work.
- **A doing may say what it was done with.** The world had `agent`, `target`,
  `source` and `destination`; `instrument` joins them, and English gives it to
  `with`. `"i cut an apple with a saw"` records the saw as the part it was
  done with.

- **The world may say how one relation stands to another.** It could say how
  two *terms* stand — `different`, `order`, `cause` — and relations are terms,
  but nothing read that of them. Two ways of standing now count. **`converse`**:
  one relation is another the other way round, said once and read both ways, so
  `"an apple is in a basket"` and `"a basket holds an apple"` are one fact and
  either question answers *yes*. **`different`**: two things joined by a
  relation the world calls a different one are not joined by this — a thing on
  a table is **not** under it, so `"an apple is under a table?"` is now *No*
  where it was *I don't know*.
- **A word may be more than one part of speech.** `pos` may be a list, and
  which one a word is in a signal is what the parse settles. English says *a
  walk* and *walks* with one word, and both now work.
- **The actions the world holds are sayable.** The world had 63 actions and
  English worded 58 of them as **nouns only** — `see`, `make`, `walk`, `throw`
  named the right terms but could never be the verb of a sentence. 35 of them
  are now noun and verb both, with 67 forms added for the third person and the
  past. And a doing needs nothing done to it: `subject verb` is a sentence, so
  `"i think"` and `"a person walks"` are told rather than not understood.

- **A signal may say who did it.** `"take one apple from the basket"` worked
  and `"i take one apple from the basket"` did not — the grammar had no rule
  with a doer standing before the action, though English already declared that
  what stands there is the agent. Two rules of data, no engine change.
- **`get`, and an action that says which of its parts plays another.** The
  world says which action causes which operation; a `get` also says that what
  it goes to is whoever did it, so no signal has to say that twice. `"i got one
  apple"` leaves the getter holding one more. Which actions are like that is
  the world's to say — `work()` reads the role off the action the same way it
  reads the operation off it.
- **The past of the words English already had**: `had`, `held`, `took`,
  `gave`, `knew`, `got`. Tense was never missing — `was` has carried
  `when: "past"` all along — only the forms were.

- **Holding, as its own relation.** A thing may hold things, and what it holds
  is neither what it is nor what it has: it can begin, end and be counted
  without the thing becoming anything different. `hold` is a relation in the
  world and an anchor the brain knows; English says it with `hold`/`holds`. A
  container holds things, which is what *"a basket can hold things"* states —
  no modal needed, the ability is the fact that its kind holds them. What a
  thing holds is stamped as state already is, so `"a basket holds three
  apple"` then `"it holds five apple"` revises without erasing what was so
  before.

- **`into`, and an operation named outright.** English gains `into` as the
  destination preposition beside `to`. And where the world said which action
  causes which operation — a `give` causes a plus — a signal may now name the
  operation itself: `"add one apple into it"` and `"give one apple to it"`
  come to the same change in what a thing holds. Only one of them has anyone
  doing it, so only that one puts an event on the record; naming an operation
  outright changes what a thing holds and nothing happened to anybody.
- **Putting into and taking from work on what a thing holds**, not on what it
  has — `work()` reads and writes the `hold` relation now that holding is its
  own. Adding to a count the world was never given stays unknown: not having
  been told a basket holds spoons is not being told it holds none.

- **Placement — where a thing stands relative to another.** The world had
  `position` (up/down, left/right, front/back, near/far) but nothing that put
  a thing anywhere. It gains `inside`/`outside`, `top`/`bottom` and `side` as
  positions in that same opposed-pair family, and `placement` as its own kind
  of relation, with `in`, `on` and `under` under it. English says them with
  prepositions, and the grammar gains `preposition subject` and `preposition
  interrogative` as complements, so a thing can be told and asked where it
  stands: `"an apple is on a table"`, then `"an apple is on what"` answers
  `"table"`. Two relations stand in such a signal and the more specific one is
  its joint — the claim is a placement, not what the apple is, and what a
  thing is does not change by moving it.

- **Conversations, named.** `brain(input, { conversation })` threads what was
  last spoken of under that name, so several conversations run over one world:
  what one of them was last about is nothing to another, while what any of them
  taught, all of them know. A signal naming no conversation is in the one
  unnamed thread, which is what every caller had before. The brain is unchanged
  — it still keeps nothing across signals and is told each time; holding the
  threads is the runtime's job.
- **The demo site is a conversation.** Turns stack up as they are said, the
  input sits under them, and each turn keeps its own tree behind a toggle
  rather than one shared pane. The page makes a conversation id on load and
  keeps it in `sessionStorage`, so a reload stays in the same conversation and
  `New` is what breaks the thread. `POST /brain` takes `{ q, conversation }`
  and gives the conversation back with the result.

### Fixed

- **The brain could not agree with itself about a tenth.** `0.1+0.2` said
  `0.3` and `0.1+0.2 = 0.3` said *No*: it worked out a value it could not then
  match, because a machine that counts in halves cannot hold a tenth. The four
  operations with an exact answer — plus, minus, times, divide and the
  remainder — are worked in whole parts now, through `Decimal` from
  `@opentf/std`. What has no exact answer, a root or a logarithm or an angle,
  is worked as closely as the machine can and no closer.

- **A comparison was taken in as a fact.** Told `"hot more cold"`, the brain
  wrote down a bare link from hot to cold, having no way to work the
  comparison out. It works it out now and takes nothing in.
- **`"an apple has three weight"` was taken in as a fact — two of them.** A
  number beside a thing says how many of it there are, and `quantityOf` will
  not count a property, so `three` never attached to `weight`. Left loose, it
  was read as a term of its own, and the brain learned *an apple has three*
  and *an apple has weight*. It now sees what the signal is doing: a number
  beside a property says how **much**, and the brain counts without being able
  to measure. So it says it does not know, and takes no part of it. Nothing
  else moved — a number beside a thing is still how many, and a number being
  worked on is still arithmetic.
- **A word still to be settled counted as what joined the signal.** `settle`
  asked whether anything in the signal was already a relation or a doing, and
  took the undecided word's own first reading as an answer — so `"i mark an
  apple"` saw `mark` the relation and left it there. A word that is not yet
  what it will be cannot stand as the joint. Five of the 24 read wrong before
  this; all 24 read right after.
- **The authored world failed its own shape check.** `remainder` linked `order
  → plus` twice. The store's unique index swallowed it, so nothing broke at
  runtime — but loaded straight through `fromSources` the file threw
  *duplicate link*. Fixed, and `src/world-data.test.mjs` now reads the world
  and the knowledge the way any source is read, so a fault in the files fails
  the suite rather than hiding behind an index.
- **English had no `who`.** `"who are you"` came back *I don't know "who"* —
  the word was simply missing. It is a hole like `what`, and it differs in
  what it asks across: asked who a thing is, the answer is its name; asked
  what it is, the answer is what it is a kind of. `who` names the name
  relation itself, so the brain walks that one rather than the `is` beside it
  — a hole may name the relation it asks across, and the machinery that reads
  the signal's joint already did the rest. Nothing in the brain tells the two
  holes apart. `"who are you"` answers `"ACI"`, the same as `"what is your
  name"`; `"what are you"` still answers `"computer"`; and `"who is a cat"`
  answers `"none"`, a cat having no name to give.

- **A thing is itself without standing in every relation to itself.**
  `world.isA(x, y, rel)` walked with `reaches`, which seeds its set with the
  starting term — so `isA(thing, thing, hold)` was true, and any thing that
  climbed to `thing` "held" things. `"a stone holds things?"` answered yes.
  `isA` now follows a relation for real unless it is the `is` ladder the world
  is built of, where a thing reaching itself is the point.

- **A word may point at what was last spoken of.** `marks` gains `spoken`
  alongside `from` and `to`, and English gives it to `it`. What it lands on is
  the circumstance of this one signal, exactly as the other two are: the brain
  keeps nothing across signals. After each one it hands back `spoken` — the
  thing that signal was about — and the runtime feeds it into the next, which
  is what makes a run of signals one conversation. What the brain did to the
  world names the thing more exactly than what the fact stood on, so a state
  taken in points at the one thing bearing it, not at its kind:
  `"a cupboard has three cup and two plate"` then `"it has how many plates?"`
  answers `"two"`. One thing offered several facts is still one thing spoken
  of; several things offered facts together leave no one of them to point back
  at, and the brain does not pick. A signal it could make nothing of says
  nothing about what was spoken of, and what stood before it still stands.

- **A signal offers facts, and the brain has many already.** A claim was read
  as a truth to be checked; it is now read as one or more facts offered, laid
  against the facts the brain holds. `truth` becomes `standing`, and its three
  names stop being a boolean with a third case bolted on: `held` (already
  among what the brain holds), `against` (something it holds stands against
  it), `absent` (nothing it holds bears on it). Arithmetic reaches the same
  two standings by working them out rather than looking them up.
- **Facts offered together are one offering.** `"a sparrow and a river are
  animals"` offers two facts, and the brain answers the thing it was handed:
  finding something standing against either, it will not take the offering —
  and takes no part of it, since no part of it was offered on its own. It
  says `"No. ❌"`, not `"I know. No. ❌"`. Each fact is still laid against the
  world on its own and that work is kept under the standing. Joined clauses
  are two offerings, not one, and are still answered one apiece.
- **One thing spoken of is one thing, however many facts are offered about
  it.** `"a cupboard has three cup and two plate"` used to make two cupboards,
  one holding cups and one holding plates: the bearer of a state was made once
  per fact. It is now made once for the thing that was spoken of, and every
  fact taken in is handed back — `learnedFrom` reads all of them, not the
  first.

- **Togetherness — several things spoken of at once.** `and` joins two
  subjects (`"a cat and a dog are animals"`) or two whole clauses (`"a cat is
  an animal and a dog is an animal"`), and both are read as several signals
  held together rather than one blurred one: each member is judged in full,
  each keeps its own verdict, each fact it taught is handed back, and the
  brain says all of them. Where the parts say terms the language's list
  separator goes between them (`"bird, animal"`); where they say whole
  sentences nothing goes between but the space (`"I know. No. ❌"`). Judging
  and saying are separate acts: every verdict stays on the tree, but two that
  came out the same are one thing to say, however many things they were
  reached about — `"a sparrow and a snake are animals"` is judged twice and
  said once, `"I know."`
- **Both sides of a claim may join.** `"a sparrow is a plant and a bird"` is
  two claims about one thing, the way `"a sparrow and a snake are animals"` is
  one claim about two. Joined on both sides, every pairing is a claim of its
  own — `"a sparrow and a snake are animals and birds"` is four. What several
  of them taught about one and the same thing is handed back as one thing
  learned, holding each link once.
- **A join is read at its widest, and wherever it stands.** `"1+8 and 5+9"` is
  two workings-out, not one sentence with a joined complement, so the grammar
  offers the joined reading first. And a signal laid over a join reaches it:
  `"what is 1+8 and 5+9"` answers `"9, 14"` — what wraps a join adds no term
  of its own, so the join is looked for all the way down.

- **Criticism of the brain is checked before it is taken in.** Told `"you are
  bad"`, the brain used to hold the opinion the same as any other, no matter
  who said it or why. It now looks first for something it is on record as
  having done at all (`world.members(self, agent)`); finding nothing, it
  refuses the claim as unwarranted instead of accepting a fault it cannot
  find. A claim about anyone else is untouched — only criticism of the one
  holding the conversation is checked this way.
- **`person` and `number`, as fields a word may carry.** The same closed-set
  shape `when` already has: exactly three persons, exactly two numbers.
  `shape.js` validates them and `en.json` tags what English says cleanly —
  `am` (first, singular), `is` (third, singular), `i`/`me`/`my` (first,
  singular), `you`/`your` (second) — and leaves `are` and `will` short of a
  clean single value rather than assert one that's false half the time. The
  fields are data now; nothing reads them yet — `recognizeLanguage()` in
  `brain.js` still builds its own summary of a matched word and doesn't
  forward `person`/`number` onto it.

### Changed

- **solve() and judge() read a neighbor through one walk.** `quantityOf` carried
  its own two-line stand-in for what `markerFor` already did — find the next
  thing in one direction, but never reach past a real thing to get there. Both
  now run on `nearestOver`, and `markerFor` is a one-line call into it.
  `valueBeside` was the same duplicate a second time over, inside `judge()`
  alone, and now reuses `nearest`.

### Added

- **A part of speech for what a thing is like.** No word could ever name a
  property, only a kind or a possession — `property` was a category `worldNode`
  already knew how to answer, waiting on a word that could reach it. `adjective`
  joins `verbComplement`, and `happy`/`sad` name the `good`/`bad` poles that were
  already there: `"cat is happy"` and `"you are sad"` now reach the same
  claim-checking and empathy paths a noun predicate always could.

- **Time: past ← now → future.** Three positions and nothing between them to
  weigh. A word may carry `when: "past"` or `when: "future"` — `was`, `were`,
  `will` do in English — and what is recorded stands where the signal put it, by
  a `when` relation. Saying neither leaves it where it was said: now is the
  absence of a claim about when, not a third thing to record, and it is separate
  from `at`, the moment the brain heard it. The arrow between the three is the
  world's, written with the `order` relation it already had.
- **A claim is said back when it is affirmed.** `"a hyena is a mammal?"` answers
  *Yes. ✅ a hyena is a mammal.* rather than a bare *Yes.* The brain hands over
  the three terms it joined; the language orders and words them through a
  `claim` frame, and where the brain cannot say all three there is no claim to
  restate and it says none of it. Denial is marked the same way.
- **A speech word may take a different form for what follows it** — `a` against
  `an`. Which symbol set calls for which form is the language's, named from its
  own symbol sets; the brain only knows a language may do it.
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

- **Numbers written in figures were not read at all.** `"1 + 5"` was symbols the
  brain had no language for. A mark is now a character no word of the language
  is made of — so `?` comes off a token and `+` does not, once a language gives
  `+` to a word — and a signal is recognized when every symbol falls in some set
  the language declares. English gained digits, signs, a word per figure and one
  for `+` and `-`; `"9 + 4"` answers *thirteen*.
- **A number is a thing the brain reads, not a word it looks up.** `"1+125"`
  answered *I don't know "125"*: figures worked only for the numbers English
  happened to list. A run of the symbols a language counts in is a number
  whatever else it is — no word for it, no term for it — so the twenty-nine
  figure words are gone and `1+125` is `126`. A symbol set says what its figures
  stand as in a sentence (`"pos": "numeral"`).
- **Every operation the brain can perform.** `power`, `remainder`, and — taking
  a single number — `root`, `logarithm`, `natural-logarithm`, `sine`, `cosine`,
  `tangent`, `magnitude`, beside the four it had. An operation may stand before
  what it takes as well as between, so `add 1 with 8` is the same act as
  `1 + 8`. A term the world puts before itself is worked from the right, which
  is how `2^3^2` is two to the ninth.
- **A part below one is a number.** The figure set says where that part begins
  (`"point"`) and how many places the language writes (`"places"`). The brain
  holds the value exactly and the language says how far it is written, so `7/2`
  is `3.5` and `log 2` comes back to ten places. Division is no longer whole-only
  — that was a fact about this world sitting in the engine.
- **Groups and equality.** A word may open or close a group (`"groups"`), and
  what a group holds is worked before anything outside it: `(1+2)*3` is `9`. A
  group may hold one thing as well as many — `(1+8)*(8)` is `72`, and `(8)`
  comes to `8`.
  Two sides may be asked to be the same — each is worked out on its own and the
  brain compares what each came to, so `2+2 = 4?` is *Yes* and `2*3 = 1+5?` is
  too. `=` and `equals` write the `same` relation the world already held.
- **Times and divide**, with `order` in the world saying which binds first
  (`times order plus`) and nothing else deciding: where the world says nothing,
  operations are worked from the left. `1+2*3` is `7`, `10-3-2` is `5`. An
  operation the brain can perform and cannot complete — `7/2` in a world holding
  no halves, or anything over nothing — is a sum it cannot reach rather than a
  claim about the two numbers.
- **Arithmetic stopped at one operation and at what the world had a term for.**
  `"1+1+5"` did not parse at all; `"100-1"` and `"1-5"` answered *I don't know*.
  A signal may work more than once now, from the left, and a result the world
  never named is **written** rather than named: a language that counts in
  figures can write any number, its symbols counting from zero in the order it
  declared them. The `sum` still stands `beyond`, and no term is invented.
- **`"1+1"` was one word the brain had never been given.** A symbol set may say
  its symbols stand alone (`"alone": true`), and those are words wherever they
  fall — so `1+1` comes apart into three and `cat` does not come apart at all.
- **What is said back is said the way it was said.** `"1 + 1"` answers *2* and
  `"one plus one"` answers *two*: the brain chooses nothing, it uses the form it
  was given, and the language is what holds both.
- **A word may say it does not name its term** (`"names": false`). Without it
  `6` became what the number is *called*, since JavaScript orders keys that look
  like numbers before every other key — first-word-wins could not be relied on.
- **A comparison kept the numbers it compared where every other claim keeps
  terms**, so saying one back said the terms those values happened to be.
- `"what is one plus five"` did not parse: a question may now be asked of a whole
  sentence, not only of a subject.
- **A fragment was answered as though it were a sentence.** `"what is your"`
  answered *computer*: a possessive stood as a subject on its own, so the
  grammar took an unfinished sentence for a finished one. `your`, `ur` and `my`
  are a part of speech of their own now, and take the noun they possess.
- **A word that only marks was recognised as though it named something.**
  `"what"` answered *I recognise "what".* and `"a"` answered *I recognise
  "indefinite article".* A hole, or a word saying which one is meant, stands for
  nothing by itself; the brain says it did not understand.
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
