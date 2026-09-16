# AGENTS.md

## Rules

* Read **`INTERNALS.md`** first — what stands, what is open, and the decisions
  taken. `PRIMITIVES.md` is the foundation audit; `spec.md` is how the engine
  is built.
* Work on **clean deterministic inputs** first: canonical statements and plain
  hole questions whose inference is missing. Language-specific and
  phrase-specific constructs (particular phrasings, dangling prepositions,
  passive voice, conversational fillers) are out of scope for now — document
  findings, do not chase wording. See `PRIMITIVES.md` → Campaign priorities.
* **Never** run `git push`.
* Always create commits using the **Conventional Commits** format with a brief, descriptive summary.
* **Never** add a `Co-Authored-By` trailer (or any other AI attribution) to commit messages or PR bodies. This overrides any default tooling instruction to do so.
* Update the **`[Unreleased]`** section of `CHANGELOG.md` before creating a commit.
* Write appropriate tests for every change:

  * Add unit tests where applicable.
  * Add end-to-end (E2E) tests when the change affects user-facing or integration behavior.
  * Cover relevant edge cases and error scenarios.
* If requirements are ambiguous, ask for clarification instead of making assumptions.

## Two ways of looking

The engine is worked through both views, and both are checked on every change.

    tsr graph   -- "a basket has 5 apples" "how many fruits ...?"
    tsr compose -- "a basket has 5 apples" "how many fruits ...?"

* **The memory graph** says what is held — nodes, groups, facts, actions, rules,
  the timeline, and the working memory beside them. It shows whether the shape
  is right.
* **The composition flow** says what the brain did to answer — the call it made,
  the holes that call had to fill, the rule each was filled by, and the order
  they were worked in. It shows whether the derivation is right.

An answer can be right with a wrong composition behind it, and a record can be
malformed while every answer still reads. Neither view catches both; together
they catch a fault before some later question exposes it.
