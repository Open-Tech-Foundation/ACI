# ACI

A reasoning engine that is not a transformer. There are no weights and no
training run: ACI answers by walking a graph of words, relationships and rules,
and it can show you every step it took to get there.

```
brain("Hi")
  understand/match     "Hi" -> hi (exact, 1.00)
  understand/resolve   language=en concept=greeting emotion=friendly confidence=1
  think/plan           strategy=respond concept=greeting
  think/rule           carry-emotion fired — the concept's affect travels with the response
  solve/template       greeting -> "Hello!"
```

That trace is not a debug flag. In a symbolic engine the trace *is* the
explanation, so a wrong answer can be walked back to the exact edge or rule that
caused it — and fixed by editing one line, not by retraining.

## Quick start

```sh
pnpm install
tsr test          # 80 tests
tsr cli           # a scripted conversation in the terminal
tsr dev           # the demo site at http://localhost:5173
```

## The pipeline

`brain()` is three stages, each exported separately so each can be inspected and
tested on its own.

| Stage | Takes | Gives | May read |
| --- | --- | --- | --- |
| `understand()` | text | meaning | memory only — it is pure |
| `think()` | meaning | a plan | memory **and the conversation so far** |
| `solve()` | a plan | an envelope | memory only |

Only `think()` may consider the conversation. That is what lets a second "Hi"
answer *"Hello again!"* without `understand()` having to know that turns exist.

```js
import { createBrain } from "aci";

const aci = createBrain();
aci.brain("Hi").response;  // "Hello!"
aci.brain("Hi").response;  // "Hello again!"
```

## Memory

A typed, directed property graph. Knowing something means a node and an edge
exist; learning is `addEdge`.

```
word:en:hi ──in_language──> language:en
           ──denotes─────> concept:greeting ──evokes────────> emotion:friendly
                                            ──responds_with─> template:greeting:0
```

Node types are `language`, `word`, `concept`, `emotion`, `template`. Edge types
are `in_language`, `denotes`, `evokes`, `responds_with`, `synonym_of`, `is_a`.
Every traversal names a constant from `schema.js` rather than a string literal —
a typo in a literal returns zero neighbours and looks like "the model didn't know
that", which is the hardest bug to see in a system like this.

`Memory` imports nothing from the host, so it runs under `--deny-all`.
Persistence lives in `memory/persist.js` so that it, and not the core, carries
the capability requirement.

## The envelope

Every path through the engine — a confident answer, a fallback, a failure —
returns the same shape. Callers never branch on "did it work"; they read `type`
and `confidence`.

```json
{
  "v": 1,
  "input": "Hi",
  "response": "Hello!",
  "type": "greeting",
  "actions": [],
  "data": { "language": "en", "concepts": ["greeting"], "emotion": "friendly", "valence": 0.6, "unknown": [] },
  "meta": { "confidence": 1, "strategy": "respond", "rules": ["carry-emotion"], "matched": [...] },
  "trace": [...]
}
```

## Understanding typos and phrases

The vocabulary index scores candidates with Jaro-Winkler and Levenshtein
together — edit distance is unforgiving about length, prefix similarity is where
real typos live — and lets a Soundex collision nudge the result without ever
deciding it alone. Phrases are matched longest-first, so `how are you` resolves
as one unit rather than three unrelated words.

```js
aci.brain("hellooo").type;    // "greeting"
aci.brain("thankss").type;    // "gratitude"
aci.brain("how are you").type // "wellbeing_query"
```

## Teaching it

No retraining, no reload. The word becomes a node, the concept link becomes an
edge, and the next lookup finds it.

```js
aci.brain("howdy").type;                            // "unknown"
aci.learn.word("howdy", { concept: "greeting" });
aci.brain("howdy").type;                            // "greeting"
```

Rules are data too, and carry their own explanation into the trace:

```js
aci.learn.rule({
  id: "greeting-repeat",
  stage: "think",
  priority: 120,
  because: "already greeted earlier in this conversation",
  when: { "plan.concept": "greeting", "context.seen.greeting": { $gte: 1 } },
  then: (c) => { c.plan.response = "Hello again!"; },
});
```

The graph answers *what this means*; rules answer *what to do about it*. Meaning
is stable and policy changes constantly, so one should not require editing the
other.

## Capabilities

esrun grants nothing by default. The engine and the CLI need one grant, to load
their own modules:

```sh
esrun --allow-imports bin/aci.js "Hi"
```

Reading or writing a memory file is the only thing that needs more
(`--allow-read`, `--allow-write`), and only if you call `save()` or `load()`.

## Tasks

`tsr` runs everything from the repository root, which is deliberate: esdev and
esrun jail the filesystem to the directory they start in, and the demo imports
the engine from `../../src`. Run `esdev test` inside `demo/` and that import
escapes the sandbox and fails.

| Task | What it does |
| --- | --- |
| `tsr test` | every `*.test.js`, each in its own process |
| `tsr dev` | the demo site, rebuilt and hot-patched on save |
| `tsr cli` | a scripted conversation, with traces |
| `tsr build` | the publishable library into `dist/` |
| `tsr site` | the demo site into `demo/dist/` |
| `tsr ci` | test, then both builds |

## Layout

```
src/
  brain.js          understand() / think() / solve()
  envelope.js       the one output contract
  trace.js          the record of why
  text/             normalization and tokenizing
  match/            edit distance, phonetics, the vocabulary index
  memory/           the graph, its schema, the seed, persistence
  rules/            the rule engine and the default policy
bin/aci.js          the terminal client
demo/               the Micro-UI demo site
```

Built on the [ES Runtime](https://esrun.opentechf.org) with
[Micro-UI](https://github.com/Open-Tech-Foundation/Micro-UI).
