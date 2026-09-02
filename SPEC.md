# ACI — Specification

This document is the agreed foundation of the model. It is written in layers:
each layer is built only on the layer below it, and nothing in a lower layer
knows that the layers above it exist.

The rule for this document: **we do not build what is not written here.** If
something is needed and is not in the spec, it goes into the spec first, as a
decision, and then it gets built. Nothing is added silently.

Status of each section is marked:

- **Settled** — agreed, implementable.
- **Proposed** — written up for agreement, not yet built.
- **Open** — a question we have deliberately not answered yet.
- **Deferred** — understood, agreed to leave for later.

---

## 1. What ACI is

ACI is a deterministic response model. Given what it has been taught and what
has happened to it so far, the same input produces the same output, every time.

**Status: Settled.**

It is not a prediction system. There are no probabilities, no confidence
scores, no similarity rankings, no "best match", no training loss, no learned
weights. Nothing in the model may produce an answer that was not put there by
training. If the model cannot answer, that is a fact about its training, not a
failure to be smoothed over by a guess.

---

## 2. Layer 0 — the primitives

This is the bottom. Everything else in the system is derived from these four
things. There are no words here, no text, no language, no images, no emotions.
The brain at this layer cannot tell you what a word is, because a word is not a
thing that exists yet.

**Status: Proposed.**

### 2.1 Signal

A **signal** is an atom that arrives at the brain from outside it. The brain
did not produce it.

A signal has no content, no structure, and no meaning. Its only property is
identity: the brain can tell one signal apart from another. We write signals as
names (`touch`, `hi`) purely so that we can read this document; the name is not
part of the signal.

A signal arrives on a **channel** — the sense it came in through. `{ sense:
"touch" }` is one signal on the `sense` channel.

There is exactly one reserved signal: `unknown`. Any arriving signal the brain
has not been taught becomes `unknown`. This is not an error case. It is a
signal like any other, and it can be trained like any other.

### 2.2 State

The brain is, at every moment, in exactly **one state**.

A state is also just an atom with an identity. It has no value, no number, no
scale, no intensity. A state is not "how positive" anything is.

The brain is never in no state. Training declares which state the brain starts
in.

### 2.3 Effect

An **effect** is the only kind of fact that can be taught:

```
(state, signal) -> state
```

Read as: *when I am in this state and this arrives, I am then in that state.*

This is the entire training substrate. There is no other kind of training data
in Layer 0.

**Totality rule:** if no effect has been taught for the current `(state,
signal)` pair, the state does not change. Nothing is inferred, nothing is
approximated, nothing is invented. A signal that has no taught effect on you
simply does not move you.

### 2.4 Expression

An **expression** is a read-out of the current state:

```
state -> signal
```

The brain does not decide what to express. It expresses the state it is in.

**Totality rule:** a state with no taught expression emits nothing. Silence is a
legitimate output.

### 2.5 What is deliberately absent

- No emotions. See §5.
- No words, text, tokens, languages, spelling or matching. See §6.
- No numbers anywhere: no weights, scores, valences, intensities or priorities.
- No wildcards or defaults in effects. Every effect is taught explicitly for a
  specific `(state, signal)` pair. Compression of repetitive effects is a real
  problem and is left **Open** (§8).

---

## 3. Layer 0 — the brain

**Status: Proposed.**

`brain()` is a definite process. It always runs the same three steps, in the
same order, with no branching between them.

| Step | The question it answers | Reads | Writes |
|---|---|---|---|
| `understand()` | *What is this?* | learned memory | — |
| `think()` | *What does it do to me?* | learned memory, current state | current state |
| `solve()` | *What do I do, being in this state?* | learned memory, current state | the expression |

- **`understand(incoming)`** resolves the incoming atom to a known signal, or
  to the reserved signal `unknown`. It makes no decision and changes nothing.
- **`think(state, signal)`** applies the effect and moves the brain to its next
  state. This is the only step that changes the brain.
- **`solve(state)`** reads out the expression for the state it is now in.

There is no fourth step and no path around these three.

### 3.1 A turn is a sequence

A turn may carry more than one signal. Signals are applied **one at a time, in
the order they arrived**, each moving the brain from wherever the previous one
left it. The expression is read out once, at the end of the sequence.

This is where meaning comes from. Meaning is not attached to a signal; meaning
is *where the sequence leaves you*. The same first signal followed by different
later signals ends somewhere else, and therefore expresses something else.

### 3.2 Worked example — the original loop

```
input   { sense: "touch" }
        start state: idle
        taught:  effect(idle, touch) -> comfort
                 express(comfort)    -> feel
output  { express: "feel" }
```

### 3.3 Worked example — why tone changes meaning

Given the same opening signal `hey`:

```
hey                  idle -> greeted            express -> hello
hey, stop, that      idle -> greeted -> ... -> alarmed
                                               express -> something else
```

Nothing about `hey` changed. The sequence went further, so it ended somewhere
else. The brain does not need a notion of "tone" to behave differently — the
difference is the walk.

---

## 4. Memory

**Status: Settled** (the three-way split), **Proposed** (what each holds).

The brain has three memories, and they are not interchangeable.

| | What it holds | Lifetime | Storage |
|---|---|---|---|
| **Learned** | signals, states, effects, expressions — what it was taught | persistent | runtime sqlite |
| **Experience** | the transitions that actually happened to it | persistent | runtime sqlite |
| **Context** | the state it is in right now | ephemeral, this session | in process |

**Learned** is the only memory `brain()` reads to decide anything.

**Context** is the current state, carried from turn to turn. It is the whole of
"what is happening now"; there is no second context object.

**Experience** is written by `think()` on every transition, and — for now — is
never read back. See §7.

---

## 5. Emotion

**Status: Settled.**

There are no built-in emotions, and there is no fixed alphabet of them.

An emotion is what we call a **state** when it has been trained to behave like
one. `comfort` is not a special kind of thing in the model; it is a state atom
with effects taught into it and an expression taught out of it. The model does
not know the word "emotion" and never will at this layer.

This is why no emotion list needs to be agreed before we build: the set of
states is whatever training declares, and it grows by teaching, not by
extending the engine.

---

## 6. Language

**Status: Deferred to Layer 1.**

Text, words, phrases, spelling variants and languages do not exist in Layer 0.

Layer 1 will be a translator with one job: turn incoming text into a **sequence
of signals** that Layer 0 already understands, and turn an expressed signal back
into text. Layer 0 will not know that this happened.

Nothing about Layer 1 is agreed yet. In particular, whether an unrecognised
word resolves by spelling similarity — or resolves to `unknown` and stops — is
**Open**, and the answer must not introduce scoring into Layer 0.

---

## 7. Self-learning

**Status: Deferred, by decision.**

Experience is recorded but never feeds back into learned memory. The brain
knows only what it was taught. This keeps the guarantee in §1 literally true:
what we train is what comes out.

Whether experience should ever become learning is a later decision, taken
explicitly, with its own section in this document.

---

## 8. Open questions

1. **Effect compression.** Every effect is currently taught per `(state,
   signal)` pair, so teaching "this signal upsets me no matter where I am"
   means one row per state. A default or wildcard would fix this, but it is a
   new concept and would weaken the "nothing is inferred" rule. Not answered.
2. **One state or several.** The brain holds exactly one state. A real mind
   holds more than one thing at once. Left at one until a concrete need shows
   up.
3. **Output shape.** The eventual structured output — `response`, `type`,
   `actions`, `data` — is not part of Layer 0, which emits a single expressed
   signal. Where that structure is assembled is not decided.
4. **Layer 1 word resolution.** See §6.

---

## 9. Layers

| Layer | What it adds | Status |
|---|---|---|
| 0 | signal, state, effect, expression; `brain()`; three memories | Proposed — building next |
| 1 | text in and out; the mapping from words to signals | Not started |
| 2 | languages as groupings over Layer 1 | Not started |
| 3 | structured output (`response`, `type`, `actions`, `data`) | Not started |
| 4 | experience feeding back into learning | Deferred |

---

## 10. Relationship to the current code

The code presently in `src/` was written before this specification, against a
language-first design. It starts at text, treats emotion as a label hanging off
a concept, and carries a confidence score. It does not implement Layer 0 and
will not be patched into it — Layer 0 is small enough to build correctly, and
the old core is replaced rather than adapted.

Parts that survive on their own merits (the demo shell, the task runner setup,
the persistence approach) are kept and re-pointed.

---

## Revision history

- **2026-09-02** — First version. Layer 0 primitives defined below emotion:
  signal, state, effect, expression. Emotion settled as a use of state rather
  than a primitive. Self-learning deferred. Language deferred to Layer 1.
