# ACI

A deterministic problem-solving system. Not a general-purpose AI model.

Type a word. It asks **what is this?** of the word and of every char in it,
then asks the same question of each answer, until nothing answers back.

```
hi     hi -> word -> language -> communication -> passing-information -> action -> existence -> null
h      h  -> char -> visual-form -> form -> shape -> existence -> null
i      i  -> char -> visual-form -> form -> shape -> existence -> null
```

`existence` is the bottom. It is the one thing nothing else explains, which is
what makes it the primitive — every chain ends there or stops short and says
where it stopped.

Four endings, and none of them is a failure:

| | |
|---|---|
| `bottom` | reached `existence`. Nothing is under it |
| `untaught` | an answer came back that was never itself explained |
| `unknown` | never seen this at all |
| `circular` | it explains itself |

Everything it knows is in `data/world.json`. Nothing is inferred, guessed or
learned.

## Running it

Everything goes through [`tsr`](https://tsr.opentechf.org/), from the
repository root.

| | |
|---|---|
| `tsr test` | the suite |
| `tsr cli -- hi` | ask about a word in the terminal |
| `tsr dev` | the site, with reload |
| `tsr build` | the library into `dist/` |
| `tsr site` | the site into `demo/dist/` |
| `tsr ci` | test, then both builds |

## Layout

| | |
|---|---|
| `src/brain.js` | asks what is this, over and over |
| `data/world.json` | everything it knows |
| `bin/ask.js` | the terminal client |
| `demo/` | the site |
