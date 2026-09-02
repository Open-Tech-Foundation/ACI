# ACI demo

The engine with its reasoning on show: type something, and every step from your
words to the answer is drawn on the right — which word matched and how well,
which language and concept it resolved to, which rules fired and why, and the
envelope it all produced.

```sh
tsr dev     # from the repository root, not from here
```

It must run from the root. esdev jails the filesystem to the directory it starts
in, and this page imports the engine from `../../src` so it always exercises the
code in this repo rather than a built copy.

Built with [Micro-UI](https://github.com/Open-Tech-Foundation/Micro-UI): four
custom elements in `src/main.js`, state in its `store`, and no framework.
`src/chain.js` turns an envelope into the rows the panel draws and is covered by
`tsr test`.
