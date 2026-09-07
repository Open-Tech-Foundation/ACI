<div align="center">

# ACI

A brain that can't make things up

*An [Open Tech Foundation](https://opentechf.org/) project*

</div>

> A deterministic brain: it perceives a signal, reasons about it over explicit
knowledge, and replies. Signals move it between states, and it expresses the
state it is in.

```
> a shelf holds 4 stamps             I understand.
> the shelf holds how many stamps?   four
> take 1 stamp from the shelf        I understand.
> the shelf holds how many stamps?   three
> how many kettles?                  I don't know.
```

That last line is the point. There is no generative path anywhere in it: an
answer is a term the world holds, said with a frame the language gives. Where
it has not been told, it has nothing to say, and says that instead. The same
signals in the same order give the same answer on every machine.

Nothing above was taught to it beforehand. Name a thing and it is met again by
what it is called, and what its kind reaches, it reaches:

```
> tilly is a heron        I understand.
> tilly is an animal?     Yes. ✅ tilly is an animal.
> tilly is a fish?        No. ❌
> what is tilly           heron
```

`tilly` is a term now, made when the signal named it. Nobody wrote *heron is an
animal* for this: the world says a heron is a bird and a bird is an animal, and
the brain walked it. The *no* is the same walk — the world holds birds and
fishes apart, so the claim is not unknown, it is denied.

> [!WARNING]
> **Experimental — a research preview, not a product.** Early stage and moving:
> the engine, the data shapes and the public API all change without notice, and
> what it understands today is a small closed set of basics. English only. Do
> not build on it yet.

The world it has been given so far: 2771 terms, 3017 links between them, 3185
words, 158 grammar alternatives.


## Potential Use Cases

| Use case                                      | Why ACI fits                                                                 |
| --------------------------------------------- | ---------------------------------------------------------------------------- |
| 🏭 **Industrial rules & automation**          | Deterministic decisions over explicit machine state, rules, and constraints  |
| 🤖 **AI agent safety layer**                  | Constrains LLM agents with deterministic, auditable reasoning                |
| 🧾 **Compliance & policy checking**           | Applies explicit policies consistently and produces inspectable reasoning    |
| 🏦 **Financial eligibility & rules**          | Same inputs and knowledge produce the same decision                          |
| 🏥 **Clinical & protocol decision support**   | Reasons only from explicitly available knowledge and avoids invented facts   |
| 🧑‍💻 **Software configuration & operations** | Reasons over known dependencies, system state, and deployment constraints    |
| 🎓 **Educational tutoring**                   | Provides explainable answers derived from a defined knowledge model          |
| 🎮 **Game & NPC world logic**                 | Maintains consistent world state and deterministic rules                     |
| 🌐 **Multilingual knowledge systems**         | Separates language from knowledge and reasoning                              |
| 📦 **Product & configuration engines**        | Applies constraints to determine valid products, options, and configurations |


## Try it

```sh
tsr dev
```

It prints the address it came up on. Then talk to it on that page, or directly:

```sh
curl -sX POST localhost:4199/brain -d '{"q":"a kettle is a thing?"}' |
  jq -r .expression.state.says
# Yes. ✅ a kettle is a thing.
```

The whole reply is the tree it reasoned over, `says` is the last line of it.

## Every answer traces back

One signal, through the six phases, as the engine hands them back:

```
understand  a  kettle  is  a  thing          perceived, and matched to a language
think       ...+thought                      what each word may mean
solve       ...+response,entity,relation,mark  what they mean together
structure   sentence[subject, predicate]     parsed against the language's grammar
judge       sentence[..., standing]          the claim laid against the world
express     "Yes. ✅ a kettle is a thing."   the verdict, voiced
```

Nothing in that path is a weight or a probability. Every step is on the tree
the brain hands back, and every term in it names a line of JSON you can open.

## Develop

```sh
tsr test    # 681 tests across 84 files (esdev)
tsr build   # library build to dist/
tsr ci      # test + build + site
```

## How it works

- `src/brain.js` — the pure engine: six phases
  (`understand → think → solve → structure → judge → express`) over innate
  primitives only. No English in it: the words, the grammar and the facts are
  all data.
- `languages/*.json` — words, grammar, and reply frames.
- `data/world.json` — what exists and how it relates.
- `knowledge/*.json` — anything taught on top, same shape as the world.
- `spec.md` — the full implementation spec and design rules.
- `CHANGELOG.md` — what changed, per release.

The two rules everything answers to: the brain hardcodes no particulars, and a
source that does not fit the shape in `src/shape.js` is refused, never trimmed.

## License

MIT — see [LICENSE](./LICENSE).
