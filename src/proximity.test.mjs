import { test, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// Proximity: `this` reaches the nearest topic, `that` the farthest one.
// Same signals in the same order give the same answers on every machine.

const { brain, forget } = openBrain("sqlite::memory:");

async function twoTopics() {
  await forget();
  const first = await brain("a forge holds coal");
  const second = await brain("an anvil holds sand");
  return { first, second };
}

test("that reaches the farther topic", async () => {
  const { first } = await twoTopics();
  const r = await brain("what is that?");
  assertEquals(r.expression.name, "answer");
  assertEquals(r.spoken, first.spoken);
  await forget();
});

test("this reaches the nearest topic", async () => {
  const { second } = await twoTopics();
  const r = await brain("what is this?");
  assertEquals(r.expression.name, "answer");
  assertEquals(r.spoken, second.spoken);
  await forget();
});

test("that as a claim's party points back", async () => {
  await forget();
  const first = await brain("a forge holds coal");
  const r = await brain("that is in fire");
  assertEquals(r.expression.name, "learn");
  assertEquals(r.spoken, first.spoken);
  await forget();
});
