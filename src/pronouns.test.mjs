import { test, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// Person pointers: `she`/`he` land on the topic like any spoken pointer,
// without guessing what is unknown about them.

const { brain, forget } = openBrain("sqlite::memory:");

test("she with nothing to land on names nothing", async () => {
  await forget();
  assertEquals((await brain("is she tall")).expression.name, "unknown");
  await forget();
});

test("she reaches the focused person, unknown stays unknown", async () => {
  await forget();
  await brain("sana is a nurse");
  const r = await brain("is she tall?");
  assertEquals(typeof r.spoken, "number");
  assertEquals(r.expression.name, "unsure");
  await forget();
});

test("he reaches the focused person, unknown stays unknown", async () => {
  await forget();
  await brain("kavi is a pilot");
  const r = await brain("is he tall?");
  assertEquals(typeof r.spoken, "number");
  assertEquals(r.expression.name, "unsure");
  await forget();
});

test("a bare pointer voices nothing, even resolved", async () => {
  await forget();
  assertEquals((await brain("i", { from: 508 })).expression.name, "unknown");
  assertEquals((await brain("you", { from: 508 })).expression.name, "unknown");
  await forget();
});

test("a pointer landing on a number still counts it", async () => {
  await forget();
  await brain("x is 5");
  assertEquals((await brain("it", { from: 508 })).expression.name, "count");
  await forget();
});
