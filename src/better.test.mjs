import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// Better and best are plain adjectives of their poles, heard and restricting
// like any description — never namable things, never comparisons without a
// scale to stand them on.
// Same signals in the same order give the same answers on every machine.

const { brain, forget } = openBrain("sqlite::memory:");

test("the better one reaches the focused kind, naming nothing", async () => {
  await forget();
  await brain("a heron is grey");
  const r = await brain("the better one is warm");
  assertEquals(r.expression.name, "learn");
  assert(!JSON.stringify(r.learned).includes('"name":"better"'), "no phantom individual");
  assertEquals((await brain("is a heron warm?")).expression.name, "affirm");
  await forget();
});

test("best and worst are heard", async () => {
  await forget();
  await brain("a heron is grey");
  assertEquals((await brain("the best one is warm")).expression.name, "learn");
  await forget();
  await brain("a heron is grey");
  assertEquals((await brain("the worst one is cold")).expression.name, "learn");
  await forget();
});
