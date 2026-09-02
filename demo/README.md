# ACI demo

Ask it something. It answers from what it holds, or says it does not know, and
shows which facts the answer came from.

```sh
tsr dev     # from the repository root, not from here
```

It must run from the root: esdev jails the filesystem to the directory it starts
in, and this page imports the engine from `../../src` and its knowledge from
`../../data`, so what the page runs is what the tests run.

The right panel is everything the brain holds — taught in plain type, worked out
by its rules in italics.
