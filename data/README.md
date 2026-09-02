# data

Everything the model is taught lives here, not in the code. Nothing under
`src/` contains a word, a state name or a lesson.

## `lessons/`

One JSON file per lesson, in the shape of the primitives:

```json
{
  "start": "idle",
  "effects":     [{ "state": "…", "signal": "…", "next": "…" }],
  "expressions": [{ "state": "…", "signal": "…" }]
}
```

`src/memory/lesson.js` loads one into learned memory; `src/memory/store.js`
persists learned memory to sqlite. A lesson file is the editable source, the
database is the runtime store.

`lessons/illustration.json` holds placeholder words used by the tests and the
CLI. It is **not** the model's knowledge and no real training has begun.
