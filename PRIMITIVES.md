# Primitive foundation audit

This is the implementation checklist for the deterministic brain. It records
what the engine can actually infer, not merely which words or terms happen to
exist in a data file.

The admission test for a primitive remains:

1. Would it change with the language? If so, it belongs in language data.
2. Would it change with the world? If so, it belongs in world knowledge.
3. Only the invariant operation that survives both tests belongs in the core.

`existence` is intentionally the terminal ontology root. `nature` is therefore
not required above it. Physical nature may be world knowledge about the
universe; the nature or essence of an entity may later be an ordinary relation.

## Status legend

- **Implemented**: represented, reasoned over, validated and covered by tests.
- **Partial**: a sound useful subset exists, but the primitive is not general.
- **Missing**: a word or term may exist, but no corresponding inference exists.
- **Deferred**: useful knowledge or language coverage, not a foundation blocker.

## Capability matrix

| Foundation | Status | What works now | What is still foundationally missing |
|---|---|---|---|
| Existence | Implemented | Four modes exist: thing, property, relation and action. `existence` is their root. | No higher answer is expected for `what is existence?`; adding another label only moves the root. |
| Identity | Partial | Stable term ids, named individuals, deterministic id allocation, self and contextual pointers. Numeric equality is computed exactly. | General `same` is not an equivalence relation and cannot substitute identicals. `different` has bespoke exclusion behavior rather than one general algebra. |
| Classification | Partial | Transitive kind walking, inherited positive and negative facts, disjoint kinds, cycle rejection, kind versus individual metadata, and open-world living/nonliving/unknown judgement. | One `is` edge carries subtype, instance membership and some predication duties. Those meanings need explicit separation or constraints. |
| Relations | Partial | Direct and declared-transitive walks, converse, symmetric, reflexive and irreflexive relations, explicit denial, asymmetry and contradiction checks. | Functional, inverse-functional, subrelation, domain and range semantics. Relation subtypes do not currently lift their facts. |
| Propositions and logic | Partial | Held, against and absent are distinct; negation is explicit; multi-fact learning is atomic; conjunction, immediate conditions and basic quantifier scope work. | A proposition cannot itself be the subject or object of knowledge. Stored rules, variables, implication chains, general disjunction, biconditionals and proof explanations are missing. |
| Composition | Partial | Transitive strict `part` and converse `made-of`; atom, molecule, element and matter connect to the universe. | Component, material, member and portion are conflated. Direct part, cardinality, structural role and required versus optional parts are absent. |
| Space | Partial | `in`, `on` and `under` facts; current placement with retained history; position labels such as left/right and near/far. | Binary spatial relations, containment topology, overlap/contact, distance values, reference frames and motion paths. `in` is currently also the converse of general holding. |
| Time | Partial | Deterministic logical ticks, retained history, past/now/future, strict transitive before/after and coarse event time. | Duration, intervals, start/end, simultaneity, overlap, event-to-event order, exact temporal references and arbitrary historical queries. |
| State and change | Partial | Quantity and placement revisions are timestamped; latest state is selected; arithmetic actions produce before/after counts. | General value-at-time, transition, becomes, starts/stops, persistence, termination, preconditions and postconditions. Ordinary properties do not yet share one state model. |
| Events and actions | Partial | Occurrence individuals with logical time and agent, target, source and destination roles; occurrence and participant questions. | Event identity, duration, event composition, goals, plans, capability, generic preconditions/results and multi-target effects. |
| Causality | Partial | Generic transitive cause queries; selected actions map to arithmetic effects; physical force consequences are inferred. | Causes cannot relate proposition or event objects. Direct versus indirect cause, enabling, prevention, intervention, causal time and stored explanation are missing. |
| Quantity | Partial | Exact arithmetic, order, comparisons, counts, all/some/none scope, integer state quantities and same-unit measurement comparison. | `many` and `few` have no relative semantics. Ranges, ratios, cardinality constraints, dimensions and unit conversion are missing. Thus the brain cannot infer “many parts.” |
| Properties and measurement | Partial | Property/state/scale/unit terms and measured comparison on a shared unit. | A general attribute-value model, typed values, domain/range, single-valued properties and conversions. Current colour and measured-state modeling is inconsistent. |
| Modality | Missing | Modal clauses are correctly held at arm's length and never asserted as facts. | Possible, impossible, necessary, actual and capable have no distinct semantics; all modal forms merely check current knowledge. |
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
- [ ] Keep grammar/parser ordering risks deferred while language work is
  paused. They are deterministic for identical ordered data, but some choices
  still depend on authored alternative order.

## Dependency-ordered roadmap

### 1. Truth and relation substrate

- [x] Repair three-valued living classification.
- [x] Add declarative symmetric relation semantics.
- [x] Add declarative reflexive and irreflexive relation semantics.
- [ ] Add declarative functional relation semantics where justified.
- [ ] Add subrelation, domain and range semantics.
- [ ] Separate subtype, instance membership and property predication without
  losing the existing kind walk.
- [ ] Give `same` equivalence semantics and `different` general symmetric,
  irreflexive semantics.

Every later primitive depends on trustworthy identity, typing and relations.

### 2. First-class propositions and rules

- [ ] Represent a proposition as data with subject, relation, object, polarity
  and scope while preserving the current link storage format where possible.
- [ ] Allow propositions to participate in cause, knowledge, belief, evidence
  and modality relations.
- [ ] Store safe conditional rules and derive them deterministically with an
  inspectable proof path.
- [ ] Add variables and quantifier scope without closed-world inference.

### 3. Unified time, state and change

- [ ] Represent moments and intervals, duration, start/end and simultaneity.
- [ ] Generalize quantity/placement history into value-at-time state.
- [ ] Add transition, becomes, starts, stops and persistence semantics.
- [ ] Connect event time and causal order to the same temporal model.

### 4. Space and composition

- [ ] Introduce binary spatial relations and containment/topology.
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
| A before B, then B before A | second fact → `deny`; memory unchanged |
| wheel component-of car | car has-component wheel → `affirm` through its declared converse |
| car made-of-material metal | wheel made-of-material metal → `unsure` unless a composition rule proves it |
| heating causes water becomes hot | asking why water is hot returns the stored cause/proof, not a guessed answer |
| event A before event B with known timestamps | `affirm` from the shared temporal model |
| one kilogram equals one thousand grams | `affirm` only through declared compatible-unit conversion |

## Deferred, not forgotten

- Component/material refinement remains tracked under roadmap phase 4.
- `nature` remains world knowledge until its intended meaning is specified; it
  is not a replacement root for existence.
- Broad English coverage, multi-word nouns and parser ambiguity work remain
  paused while the semantic foundation is strengthened.
- `basic-failures.test.mjs` and `src/brain.gap.test.mjs` are diagnostic logs,
  not reliable regressions. Their valid cases should migrate into asserted
  capability tests as the corresponding primitive lands.
