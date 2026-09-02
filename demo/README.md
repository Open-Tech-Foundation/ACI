# ACI demo

Layer 0 with nothing hidden: send it some signals, and the walk they take is
drawn in the middle — the state it was in, what each signal did to it, and the
read-out at the end. On the right is the whole of what the brain was taught,
which is the whole of what it can possibly answer.

```sh
tsr dev     # from the repository root, not from here
```

It must run from the root. esdev jails the filesystem to the directory it starts
in, and this page imports the engine from `../../src` so it always exercises the
code in this repo rather than a built copy.

Built with [Micro-UI](https://github.com/Open-Tech-Foundation/Micro-UI): six
custom elements in `src/main.js`, state in its `store`, and no framework.
`src/walk.js` turns a turn into the rows the panel draws, has no DOM in it, and
is covered by `tsr test`.

The page does not import `src/memory/store.js`: persistence needs `runtime:db`,
which a browser does not have, and the brain does not need it to think.
