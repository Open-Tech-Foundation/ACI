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

**Status: Settled, and built.**

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

A taught effect may lead back to the state it started in. That is a taught
self-loop and it is *not* the same as no effect having been taught — the two
look identical from outside, so anything reporting on a walk must ask what was
taught rather than compare the two states.

**Conflict rule:** teaching a second, different effect for a pair that already
has one is a fault in the training, and is refused when it is taught. Two
answers for one pair would make the brain's next move a choice, and the model
does not make choices. Teaching the same fact again is not a conflict.

### 2.4 Expression

An **expression** is a read-out of the current state:

```
state -> signal
```

The brain does not decide what to express. It expresses the state it is in.

**Totality rule:** a state with no taught expression emits nothing. Silence is a
legitimate output.

The conflict rule applies here too: a state expresses one thing, and a second,
different expression for it is refused at teaching time.

### 2.5 What is deliberately absent

- No emotions. See §5.
- No words, text, tokens, languages, spelling or matching. See §6.
- No numbers anywhere: no weights, scores, valences, intensities or priorities.
- No wildcards or defaults in effects. Every effect is taught explicitly for a
  specific `(state, signal)` pair. Compression of repetitive effects is a real
  problem and is left **Open** (§8).

---

## 3. Layer 0 — the brain

**Status: Settled, and built.**

`brain()` is a definite process. It always runs the same three steps, in the
same order, with no branching between them.

| Step | The question it answers | Reads | Writes |
|---|---|---|---|
| `understand()` | *Something happened — what kind?* | learned memory | — |
| `think()` | *What was it, given where I am?* | learned memory, current state | current state |
| `resolve()` | *What do I express?* | learned memory, current state | the expression sequence |

- **`understand()`** recognises *that* something happened, and of what kind. It
  knows it was touched; it does not yet know by a person or by a thing. It
  decides nothing and changes nothing.
- **`think()`** works out *what* happened, from where the brain already is —
  the same touch from a stranger and from a boss are not the same event. This
  is the only step that moves the brain.
- **`resolve()`** is the final engine. It expresses a **sequence**, not a
  single thing:

  ```
  [ { signal: "felt" }, { msg: "hello" } ]
  ```

  Everything the answer has to combine is combined here.

There is no fourth step and no path around these three.

### 3.0 The brain does not act

The brain only ever responds. It runs nothing, waits for nothing, schedules
nothing and watches nothing. The runtime around it acts on what it said, the
way a coding agent's harness acts on a tool call.

```
runtime → signal → brain → response → runtime acts → (later) signal → brain
```

Asked to stop an oven after ten minutes, the brain answers with a request to
set a timer. The runtime sets it. Ten minutes later the runtime sends a signal
back in. The brain was never waiting — it answered twice.

So the brain stays a pure function: `(state, signal) → (state, response)`.
That is what keeps it deterministic, and it is why tools can be anything at all
without changing the model.

**Channels are not part of the brain.** It does not ship with senses. A kitchen
bot declares `temperature`, a chat service declares `text`; the brain assumes no
body and no particular way of being reached.

**Skills** are things the brain can *use* to answer rather than things that
arrive. Asked the time, it does not sense the time — it asks for it. Not yet
designed.

**A task is not a primitive.** A request to do something arrives as a signal
like anything else; the brain understands it *as* a task, and resolves it into
what the runtime should do — set a timer, watch for a signal, raise an alarm.

**Built incrementally.** A signal does not have to be understood fully to be
useful: `touch` answering `signal(feel)` and nothing more is a complete step.
Meta, qualities and composition arrive when the model is restricted without
them, never in advance.

### 3.1 The front door

Everything above is how the model works. What it *does* is one thing: you send
it what arrived, and it answers.

Nobody integrating this model should have to know its internal atom names. They
send what their hardware or their interface actually observed, in a fixed
shape — `signal` names the channel it arrived on, and any other field is detail
about it:

```
const aci = createACI();

aci({ signal: "touch", place: "shoulder" });
// -> { express: "feel" }

aci({ signal: "text", message: "hey stop that" });
// -> { express: "back-off" }

aci({ signal: "touch", place: "shoulder" }, { signal: "text", message: "hey" });
// one turn, both inputs, in the order given
```

`{ express }` is what it has to say — `null` for silence, which is a real
answer and not a failure.

**Training is required and there is no default.** The model ships with no
vocabulary at all — it does not know what `touch` is, or that words exist. The
words in this document are illustrations for the reader; nothing has been
trained yet.

**No lesson lives in code.** Everything the model is taught is data, under
`data/`, loaded at run time (§4.1). Nothing under `src/` contains a word, a
state name or a lesson. The only two named strings in the engine are the
reserved signal `unknown` (§2.1) and the `signal` field of the input shape
(§3.2), and both are protocol rather than knowledge.

A session is one brain, and its state carries from call to call. That is not an
implementation detail — it is the whole reason two identical inputs can come
out differently.

This surface is the contract. The behaviour tests in `spec/` are written
against it and nothing else, so Layer 0 can be rebuilt underneath them without
touching a line. If a refactor requires editing one of those tests, the
behaviour changed, and that belongs in this document first.

### 3.2 Reception

**Status: Settled, and built.**

Reception is the one place that turns what an integrator sent into signals. It
spells each input out as atoms, in a fixed order: **the channel, then the detail
values, taken in sorted order of their field names** so that two integrators who
write the same fields in a different order get the same answer.

```
{ signal: "touch", place: "shoulder" }        ->  touch  shoulder
{ signal: "text", message: "hey stop that" }  ->  text  hey  stop  that
```

Field *names* are not spelled out, and that is the whole rule: **only what
actually arrived becomes a signal.** `shoulder` arrived. `place` did not — it is
how the integrator labelled the field, and manufacturing a signal out of it
would hand the brain something nobody sent.

A value carrying several words becomes several atoms, and nothing else happens
to it: no lowercasing, no punctuation stripping, no spelling correction, no
synonyms. All of that is Layer 1 (§6). Until Layer 1 exists, `Hey` and `hey` are
two different atoms and the brain says so.

A consequence worth stating: a channel that carries no meaning of its own — like
`text` — still arrives as an atom, so a brain must be taught that it recognises
it and is not moved by it. That costs one row per state, per such channel.
Channels are few, so it stays small, but it is the same shape as the problem in
§8.

### 3.3 A turn is a sequence

A turn may carry more than one signal. Signals are applied **one at a time, in
the order they arrived**, each moving the brain from wherever the previous one
left it. The expression is read out once, at the end of the sequence.

This is where meaning comes from. Meaning is not attached to a signal; meaning
is *where the sequence leaves you*. The same first signal followed by different
later signals ends somewhere else, and therefore expresses something else.

### 3.4 Worked example — the original loop

```
input   { sense: "touch" }
        start state: idle
        taught:  effect(idle, touch) -> comfort
                 express(comfort)    -> feel
output  { express: "feel" }
```

### 3.5 Worked example — why tone changes meaning

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

**Status: Settled, and built.**

The brain has three memories, and they are not interchangeable.

| | What it holds | Lifetime | Storage |
|---|---|---|---|
| **Learned** | signals, states, effects, expressions — what it was taught | persistent | runtime sqlite |
| **Experience** | the transitions that actually happened to it | persistent | runtime sqlite |
| **Context** | the state it is in right now | ephemeral, this session | in process |

**Learned** is the only memory `brain()` reads to decide anything.

### 4.1 Where a lesson lives

A lesson is data, in `data/lessons/`, in the shape of the primitives:

```json
{
  "start": "idle",
  "effects":     [{ "state": "…", "signal": "…", "next": "…" }],
  "expressions": [{ "state": "…", "signal": "…" }]
}
```

`src/memory/lesson.js` loads one and refuses anything malformed — an unknown
key, a missing field, contradictory rows — rather than ignoring it. The file is
the editable source; sqlite is the runtime store.

Layer 1's languages (§6) will live here the same way, as data.

**Context** is the current state, carried from turn to turn. It is the whole of
"what is happening now"; there is no second context object.

**Experience** is written on every transition, including the ones where nothing
moved, because a signal that failed to move you is still something that
happened. It is — for now — never read back. See §7.

Writing to it must never delay an answer, so the sqlite log queues its writes
rather than blocking on them. The writes are chained, so they land in the order
they happened, and a reader can wait for them to settle.

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

**Status: Proposed. This is Layer 1, and it is next.**

Words, spellings, synonyms and languages do not exist in Layer 0 and never
will. Layer 1 is a **translator at the edges**, and the brain is not told it
exists.

### 6.1 The shape of it

Two taught tables, one per direction:

```
form   -> signal     "hi", "hello", "hey", "Hey", "Hi!"  ->  hey
signal -> form       hello  ->  "Hello"
```

That is the same shape as everything in Layer 0: a lookup that is total by
having an `unknown`, with no scoring anywhere. Spelling variants and synonyms
are the *same mechanism* — many forms, one signal — so `hi` and `hello` needing
one entry each is not a special case of anything.

Anything with no entry becomes `unknown`, exactly as now. **No spelling
similarity, no phonetic matching, no nearest-neighbour.** If we want `helo` to
mean `hey`, somebody teaches it. That is the price of §1, and it is the right
price: a model that reaches for the nearest thing is guessing, and the previous
engine's worst failures were all of that kind.

### 6.2 A phrase is not a signal

`how are you` does **not** become one signal. It becomes three — `how`, `are`,
`you` — and the walk through them is what carries the meaning.

This matters. The engine that stood here before matched the longest known
phrase, and that is exactly how `how are you not going` came to be answered as
a question about wellbeing: the phrase was ripped out of its context and the
rest discarded. Under Layer 0 there is nothing to rip out. The words arrive in
order, each moving the brain from wherever the last one left it, and a sentence
that goes somewhere unexpected simply lands somewhere else.

So **the state space is where grammar lives**, and it is grammar the model was
taught rather than grammar somebody coded.

### 6.3 Tone

Punctuation is a signal like any other. `hey` and `!` are two atoms, and the
walk `hey -> !` ends somewhere other than `hey` alone. §3.5's example — the same
greeting reading as friendly or as annoyed — needs no notion of tone in the
model at all.

### 6.4 What this buys — languages are interchangeable

The brain is language-independent, because it never sees a word. A language is
nothing but a pair of edge tables. Two languages whose words map onto the same
signals will make the same brain behave identically, and **translation falls
out for free**: read in through one table, write out through another, with no
part of the model in between knowing that anything was translated.

This is the strongest argument for the architecture, and it should be tested as
soon as Layer 1 exists: teach a second language over the same brain, and assert
that both give the same answer to the same meaning.

### 6.5 Open within Layer 1

- **Choosing the language.** Detecting it from the input is a scoring problem
  and is therefore out. The session names its language, or a form maps to
  `(language, signal)` and a form claimed by two languages with different
  signals is a conflict refused at teaching time. Not decided.
- **Case and punctuation.** Whether `Hey`, `hey` and `hey!` are one form or
  three is a teaching decision, not an algorithm. Leaning towards: they are
  separate forms, and a language may teach them onto the same signal.

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

1. **Effect compression — the sharpest one.** Every effect is taught per
   `(state, signal)` pair, so "this signal means the same wherever I am" costs
   one row per state. This is no longer theoretical: it showed up the moment
   reception became real, because a channel like `text` that means nothing in
   itself has to be taught as inert in every state (§3.2). Left alone, teaching
   cost grows as *states × signals*, and Layer 1 multiplies both.

   A default or wildcard effect would fix it, and would weaken "nothing is
   inferred" — a default is a claim about pairs nobody taught. **This is the
   next concept the model will need, and it is a decision to take deliberately
   rather than let leak in.** `tsr audit` reports the numbers that say when.
2. **One state or several.** The brain holds exactly one state. A real mind
   holds more than one thing at once. Left at one until a concrete need shows
   up.
3. **Output shape.** The eventual structured output — `response`, `type`,
   `actions`, `data` — is not part of Layer 0, which emits a single expressed
   signal. Where that structure is assembled is not decided.
4. **Layer 1 word resolution.** See §6.
5. **A detail's role.** `{ place: "shoulder" }` and `{ avoiding: "shoulder" }`
   reach the brain identically, because reception spells out values and not
   field names (§3.2). A role is structure, and Layer 0 has no structure, only
   atoms in order. Whether roles ever need to reach the brain is not decided.

---

## 9. Layers

Each layer is built only on the one below it, and nothing in a lower layer
knows the layers above it exist.

| Layer | What it adds | What it buys | Status |
|---|---|---|---|
| 0 | signal, state, effect, expression; `brain()`; reception; three memories | a brain that answers deterministically, and can never guess | **Built** |
| 1 | forms ↔ signals: words, spellings, synonyms, punctuation | it can be spoken to, and a sentence is a walk rather than a lookup (§6) | **Next** |
| 2 | languages as named pairs of Layer 1 tables | the same brain in any language, and translation for free (§6.4) | after 1 |
| 3 | structured output — `response`, `type`, `actions`, `data` | an integrator can act on an answer, not just read it | after 1 |
| 4 | effect compression, whatever we decide it is (§8.1) | training that grows with what is taught, not with the square of it | when §8.1 forces it |
| 5 | experience feeding back into learning | it changes from what happened to it | deferred by decision (§7) |

Layer 4 is placed after 3 on purpose: the cost problem should be measured under
a real vocabulary before we choose a cure for it.

---

## 10. The code

| Path | What it is |
|---|---|
| `src/aci.js` | the front door (§3.1) — the only thing `spec/` is allowed to know |
| `src/brain.js` | `understand`, `think`, `resolve` and a session |
| `src/memory/learned.js` | signals, states, effects, expressions |
| `src/memory/experience.js` | the log, in process |
| `src/memory/store.js` | both persistent memories in runtime sqlite |
| `src/memory/lesson.js` | loads a lesson from data into learned memory |
| `data/lessons/` | what it is taught, as data. No lesson lives in code |
| `fixtures/illustration.js` | wiring that loads the placeholder lesson for tests and the CLI |
| `spec/` | behaviour tests, written against the front door alone |
| `demo/` | a page that draws the walk and lists everything taught |

`brain.js`, `learned.js` and `experience.js` import nothing from the host, so
they run under `--deny-all`. Only `store.js` needs a capability, which is why
persistence lives apart from thinking.

Two kinds of test, deliberately:

- **`spec/`** knows only that you send the model something and it answers. These
  must survive any rewrite of the internals. They run on a placeholder lesson
  today, so they assert the shape of the contract rather than knowledge, and
  will be rewritten when real training begins.
- **the `*.test.js` beside each module** knows everything, and is expected to be
  thrown away with the code it describes.

The language-first engine that stood here before this specification — words,
concepts, fuzzy matching, rule priorities, a confidence score — was removed
rather than adapted.

---

## 11. Evaluating it

**Status: Proposed. Partly built — `tsr audit`.**

A prediction system is evaluated by how often it is right. That question does
not apply here: this model is right by construction, because it only ever says
what somebody taught it to say. So the useful questions are different ones.

### 11.1 What counts as intelligence here

Generalisation in a prediction system means answering something close to what it
saw. There is no "close to" in this model, so generalisation has to mean
something else, and it does:

> **Intelligence, for ACI, is reaching states nobody walked it to.**

Training teaches individual effects. A walk composes them. When a sequence of
signals nobody ever taught as a sequence arrives at a state that answers
sensibly, the model has done something it was not told to do — without guessing,
and without ceasing to be deterministic. That is the whole bet, and it is
measurable.

### 11.2 The ladder

Each rung is a thing the model can do that the one below it cannot.

| | It can… | Test |
|---|---|---|
| 0 | answer at all | `spec/` today |
| 1 | be spoken to in words | Layer 1 |
| 2 | answer the *same* words differently, because of what came before | an **ambiguous signal** exists (§11.3) |
| 3 | answer a combination nobody taught as a combination | a walk of *n* signals reaching a sensible state with no *n*-signal training |
| 4 | say the same thing in another language | Layer 2, §6.4 |
| 5 | change from what has happened to it | Layer 5, deferred |

We are on rung 0 and the example training does not yet reach rung 2 — which
`tsr audit` says out loud.

### 11.3 The instruments

`tsr audit` walks the training exhaustively — no sampling, no test set — and
reports:

| Measure | What a bad number means |
|---|---|
| **reachable / unreachable** | training nothing can ever arrive at. Dead rows |
| **silent** | reachable states that say nothing. Fine on purpose, a hole by accident |
| **stuck** | reachable states that say nothing and lead nowhere. The brain falls in and never speaks again. Should be zero |
| **answers** | how many different things it can ever say. Its whole expressive range |
| **ambiguous** | signals that can turn the answer into more than one thing. **This is rung 2.** Zero means the model is still a lookup table |
| **conditional** | signals that act somewhere and not elsewhere. Weak context |
| **inert** | signals that never change the answer anywhere. Usually framing, sometimes a mistake |

Two more that are not built yet, and should be:

- **Teaching cost.** Rows taught per behaviour gained. If it climbs, §8.1 is
  overdue. This is the number that says when the model needs its next primitive.
- **Discrimination.** A list of input pairs that *should* answer differently and
  pairs that *should* answer the same, asserted. Unlike everything above it
  needs human judgement about what ought to happen, which is exactly why it is
  worth writing down.

### 11.4 What we will not measure

No accuracy, no F1, no benchmark suite, no held-out set. Those measure how well
a system guesses. If ACI ever needs them, something has gone wrong upstream of
the numbers.

---

## Revision history

- **2026-09-02** — The brain does not act (§3.0): it responds, and the runtime
  acts on the response, so the brain stays a pure function and nothing outlives
  a turn inside it. Channels are declared by the integrator, not shipped with
  the model. Skills named as a separate idea. A task is a signal understood as
  one, not a new primitive.
- **2026-09-02** — `solve()` is `resolve()`, and it expresses a sequence rather
  than one signal. The three steps restated: understand recognises the kind,
  think resolves what it was from context, resolve composes the answer. Signals
  stay a small closed set; meta and qualities are extensions taken only under
  pressure.
- **2026-09-02** — Lessons became data (§4.1): nothing under `src/` contains a
  word or a state name any more.
- **2026-09-02** — The engine ships with no training and no vocabulary;
  `createACI` requires `teach`. Placeholder words moved out of `src/`.
- **2026-09-02** — Reception (§3.2): the front door takes what an integrator
  actually sends, and only what arrived becomes a signal. Layer 1 designed
  (§6): forms map to signals, a phrase is a walk and not a lookup, and
  languages become interchangeable edge tables. Evaluation defined (§11), with
  `tsr audit` built. Effect compression promoted to the sharpest open question
  now that reception has made it concrete.
- **2026-09-02** — Layer 0 built. Added the front door (§3.1) and the split
  between behaviour and unit tests, the conflict rule for contradictory
  training, the taught-self-loop clarification, and what experience records.
- **2026-09-02** — First version. Layer 0 primitives defined below emotion:
  signal, state, effect, expression. Emotion settled as a use of state rather
  than a primitive. Self-learning deferred. Language deferred to Layer 1.
