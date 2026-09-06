import { test, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// `why` asks across causes, and the brain keeps no causal memory: parsed,
// never answered from thin air.
// Same signals in the same order give the same answers on every machine.

const { brain, forget } = openBrain("sqlite::memory:");

test("why parses but stays unanswered", async () => {
  await forget();
  assertEquals((await brain("why is the sky blue?")).expression.name, "unsure");
  await forget();
});

test("why with nothing asked stays unanswered", async () => {
  await forget();
  await brain("a drum is cold");
  assertEquals((await brain("why is a drum cold?")).expression.name, "unsure");
  await forget();
});
