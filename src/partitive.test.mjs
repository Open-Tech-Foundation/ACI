import { test, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// Partitive counts: `how many of them` counts the focused kind against the
// spoken bearer. Same signals in the same order give the same answers.

const { brain, forget } = openBrain("sqlite::memory:");

test("how many of them counts the focused kind", async () => {
  await forget();
  await brain("i have 3 figs", { from: 508 });
  assertEquals((await brain("how many of them?", { from: 508 })).expression.state.says, "3");
  await forget();
});

test("how many of it counts the focused kind", async () => {
  await forget();
  await brain("i have 3 figs", { from: 508 });
  assertEquals((await brain("how many of it?", { from: 508 })).expression.state.says, "3");
  await forget();
});

test("taking all leaves zero, not unknown", async () => {
  await forget();
  await brain("i have 3 figs", { from: 508 });
  await brain("take three figs from it", { from: 508 });
  assertEquals((await brain("how many of them?", { from: 508 })).expression.state.says, "0");
  await forget();
});

test("a kind not held is unknown, not a number", async () => {
  await forget();
  await brain("i have 3 figs", { from: 508 });
  assertEquals((await brain("how many dates?")).expression.name, "unsure");
  await forget();
});
