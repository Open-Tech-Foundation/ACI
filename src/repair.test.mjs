import { test, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// Repair: asking what was said repeats the topic in mind, never the kind.
// Same signals in the same order give the same answers on every machine.

const { brain, forget } = openBrain("sqlite::memory:");

test("what did you say repeats the topic", async () => {
  await forget();
  await brain("i carry 3 mangoes", { from: 508 });
  const r = await brain("what did you say?");
  assertEquals(r.expression.name, "answer");
  assertEquals(r.expression.state.says, "mango");
  await forget();
});

test("ungrammatical repair still repairs", async () => {
  await forget();
  await brain("i carry 3 mangoes", { from: 508 });
  assertEquals((await brain("what did you said")).expression.state.says, "mango");
  await forget();
});

test("repair with nothing said says nothing", async () => {
  await forget();
  assertEquals((await brain("what did you say?")).expression.name, "unknown");
  await forget();
});
