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
