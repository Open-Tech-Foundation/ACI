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

The findings this campaign has turned up — what was fixed, what is open, and
what each waits on — are kept in `INTERNALS.md`, together with the decisions
taken along the way. This file stays what it was: the audit of what the engine
can infer.

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

- **Knowledge of a domain, pumped in from outside.** Answering `a player scored
  50 runs in 10 balls` the way somebody who knows cricket would — what a run
  is, what facing a ball means, what the two say together — is knowledge of a
  game and not a primitive of the brain. It waits on a `rules` primitive solid
  enough to be taught from outside, so that given the rules of a thing the
  brain follows them to an answer. Until that stands, a domain's knowledge has
  nowhere to live, and building any of it into the engine would be teaching the
  core one world's particulars. The shape of that sentence is a separate matter
  and is recorded in `INTERNALS.md`.

- Component/material refinement: component, material, member and portion are
  still conflated.
- `nature` remains world knowledge until its intended meaning is specified; it
  is not a replacement root for existence.
- Broad English coverage, multi-word nouns and parser ambiguity work remain
  paused while the semantic foundation is strengthened.
- `basic-failures.test.mjs` and `src/brain.gap.test.mjs` are diagnostic logs,
  not reliable regressions. Their valid cases should migrate into asserted
  capability tests as the corresponding primitive lands.
