import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// Contractions derive: `don't` is `do` denied, never an unheard word.
// Same signals in the same order give the same answers on every machine.

const { brain, forget } = openBrain("sqlite::memory:");

test("don't denies instead of going unheard", async () => {
  await forget();
  const r = await brain("i don't like it", { from: 508 });
  assertEquals(r.expression.name, "learn");
  assert(r.learned != null, "the denial goes on the record");
  const events = [];
  const walk = (n) => {
    if (n.kind === "event") events.push(n);
    (n.branch || []).forEach(walk);
  };
  r.roots.forEach(walk);
  assert(events.some((e) => e.state.not === true), "recorded as not having happened");
  const learned = JSON.stringify(r.learned);
  assert(learned.includes('"not":true'), "kept as a denial: " + learned.slice(0, 200));
  await forget();
});

test("separate does not denies an intransitive doing", async () => {
  await forget();
  const r = await brain("a dog does not fly");
  assertEquals(r.expression.name, "learn");
  assert(r.learned != null, "the denial goes on the record");
  assert(
    JSON.stringify(r.learned).includes('"not":true'),
    "kept as a denial",
  );
  await forget();
});
