import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// A doing after `will` is future, not kind: `i will go` records going with
// its moment, never `doctor is go`.
// Same signals in the same order give the same answers on every machine.

const { brain, forget } = openBrain("sqlite::memory:");

test("will plus a doing records a future doing", async () => {
  await forget();
  const r = await brain("i will go", { from: 508 });
  const events = [];
  const walk = (n) => {
    if (n.kind === "event") events.push(n);
    (n.branch || []).forEach(walk);
  };
  r.roots.forEach(walk);
  assertEquals(events.length, 1);
  assertEquals(events[0].state.action, 264);
  assertEquals(events[0].state.when, 566);
  const holder = (r.learned.terms || []).find((t) => t.id === 508);
  assert(
    !(holder == null ? false : (holder.links || []).some((l) => l.to === 264)),
    "no kind-fact about going on the holder",
  );
  await forget();
});
