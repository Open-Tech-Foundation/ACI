import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// A store of its own, that nothing else can reach.
const { brain, forget } = openBrain("sqlite::memory:");
const PERSON = 29;

function parts(r) {
  const event = (r.roots[0].branch || []).find((b) => b.kind === "event");
  return event ? event.state.parts : null;
}

test("a reflexive points where the signal already pointed", async () => {
  await forget();
  // Myself is whoever sent it, the same as `i` is. Nothing else was needed:
  // one thing may play two parts in what happened, and always could.
  const played = parts(await brain("i cut myself", { from: PERSON }));
  assertEquals(played.length, 2, "a doer and something it was done to");
  assertEquals(played[0].of, PERSON);
  assertEquals(played[1].of, PERSON, "and they are the same one");
  assert(played[0].role !== played[1].role, "playing two parts, not one");
  await forget();
});

test("a doing to something else is unchanged", async () => {
  await forget();
  const played = parts(await brain("i cut a mango", { from: PERSON }));
  assertEquals(played[0].of, PERSON);
  assert(played[1].of !== PERSON, "the mango is not the one who cut it");
  await forget();
});

test("told nothing about who is speaking, a reflexive points nowhere", async () => {
  await forget();
  assertEquals(parts(await brain("i cut myself")), null,
    "the brain does not guess who did it to whom");
  await forget();
});

test("what was last spoken of may do something to itself", async () => {
  await forget();
  await brain("a shop has 5 bats");
  const played = parts(await brain("it washes itself", { from: PERSON }));
  assert(played != null, "something happened");
  assertEquals(played[0].of, played[1].of, "and it was to the one doing it");
  await forget();
});
