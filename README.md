# ACI

A deterministic brain in computer form: it perceives a signal, reasons about
it over explicit knowledge, and replies — with no hardcoded words, grammar, or
facts in the core. Every answer traces back to data you can read. It cannot
hallucinate; where it does not know, it says so.

Early stage, open source as research preview. English only, small but growing
world.

## Try it

```sh
tsr dev
```

Then talk to it at the demo page, or directly:

```sh
curl -X POST localhost:4199/brain -d '{"q":"a cat is an animal?"}'
```

## Develop

```sh
tsr test    # full suite (esdev)
tsr build   # library build to dist/
tsr ci      # test + build + site
```

## How it works

- `src/brain.js` — the pure engine: six phases
  (`understand → think → solve → structure → judge → express`) over innate
  primitives only.
- `languages/*.json` — words, grammar, and reply frames (external data).
- `data/world.json` — what exists and how it relates (external data).
- `knowledge/*.json` — anything taught on top, same shape as the world.
- `spec.md` — the full implementation spec and design rules.
- `CHANGELOG.md` — what changed, per release.

The two rules everything answers to: the brain hardcodes no particulars, and
a source that does not fit the shape in `src/shape.js` is refused, never
trimmed.

## License

MIT — see [LICENSE](./LICENSE).
