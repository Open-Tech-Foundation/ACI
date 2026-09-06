import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// Counting what was done: an action question with a quantity word reads the
// amount off the matching occurrence — never guessed, never from thin air.
// Same signals in the same order give the same answers on every machine.

const { brain, forget } = openBrain("sqlite::memory:");

test("how many dates am i carrying reads the occurrence", async () => {
  await forget();
  await brain("i carry 3 dates", { from: 508 });
  assertEquals(
    (await brain("how many dates am i carrying?", { from: 508 })).expression.state.says,
    "three",
  );
  await forget();
});

test("action count with no occurrence invents no number", async () => {
  await forget();
  const r = await brain("how many dates am i carrying?");
  assert(!/[0-9]/.test(r.expression.state.says ?? ""), "no number voiced from nothing");
  assertEquals(r.learned, null);
  await forget();
});

test("action count for whoever did nothing is unknown", async () => {
  await forget();
  await brain("i carry 3 dates", { from: 508 });
  await brain("dev is a sailor");
  assertEquals(
    (await brain("how many dates is dev carrying?", { from: 508 })).expression.name,
    "unsure",
  );
  await forget();
});
