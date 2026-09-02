# ACI

A deterministic response model. Given what it has been taught and what has
happened to it so far, the same input produces the same output, every time.
There are no probabilities, no confidence scores, no similarity rankings and no
learned weights anywhere in it.

`SPEC.md` is the agreed design and comes before the code. Nothing gets built
that is not written there first.

## Layer 0

The bottom of the model is four atoms, and everything above it — words,
languages, emotions — is built out of them.

| | |
|---|---|
| **Signal** | something arrived. It has an identity and nothing else: no content, no meaning |
| **State** | the brain is in exactly one, always. No value, no scale, no number |
| **Effect** | `(state, signal) -> state`. The only kind of fact that can be taught |
| **Expression** | `state -> signal`. A read-out, not a decision |

`brain()` is a definite process over them — `understand()`, then `think()`,
then `solve()`, always in that order.

A turn may carry several signals, applied one at a time. Meaning is where the
walk ends, not what any one signal is:

```
hey                idle -> greeted            -> "hello"
hey stop that      idle -> greeted -> alarmed -> "back-off"
```

Nothing about `hey` changed. The walk went further.

Two rules keep it total, so the brain can never fail and never guess:

- No effect taught for a pair, and the state does not change.
- No expression taught for a state, and it says nothing. Silence is an answer.

## Using it

```js
import { createACI } from "aci";

const aci = createACI();
aci("touch");           // "feel"
aci(["hey", "stop"]);   // "back-off"
```

A session is one brain, and its state carries from call to call — which is why
two identical inputs can come out differently.

Teach it something else and it behaves differently, because nothing is built in:

```js
const aci = createACI({
  teach: (learned) =>
    learned
      .begins("asleep")
      .effect("asleep", "touch", "awake")
      .expresses("awake", "who's there"),
});
```

## Running it

Everything goes through [`tsr`](https://tsr.opentechf.org/), from the repository
root.

| | |
|---|---|
| `tsr test` | the whole suite |
| `tsr cli` | walk the specification's examples in a terminal |
| `tsr dev` | the demo site, with reload |
| `tsr build` | the library into `dist/` |
| `tsr site` | the demo site into `demo/dist/` |
| `tsr ci` | test, then both builds |

Built on [ES Runtime](https://esrun.opentechf.org/) — ESM only, no Node
builtins, and deny-by-default permissions. The engine imports nothing from the
host and runs under `--deny-all`; only `src/memory/store.js`, which persists to
sqlite, needs anything.

## Layout

| | |
|---|---|
| `SPEC.md` | the design. Read this first |
| `src/aci.js` | the front door: send it something, it answers |
| `src/brain.js` | understand, think, solve |
| `src/memory/` | learned, experience, and the sqlite store |
| `src/train/example.js` | the specification's examples, as training |
| `spec/` | behaviour tests, which know only the front door |
| `demo/` | a page that draws the walk and lists everything taught |

There are two kinds of test on purpose. `spec/` must survive any rewrite of the
internals; the tests beside each module are expected to be thrown away with the
code they describe.
