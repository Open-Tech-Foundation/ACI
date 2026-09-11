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

test("what stands behind a claim is a claim, and is said back whole", async () => {
  await forget();
  await brain("the door is open because the wind is strong");
  assertEquals(
    (await brain("why is the door open?")).expression.state.says,
    "a wind is strong",
    "not the strength on its own, which is not what was said",
  );
  await forget();
});

test("a kind is no reason", async () => {
  await forget();
  // With nothing said about it, `a lamp is a tool` is true and is not why it
  // is broken. Asked why, the brain does not answer something else.
  assertEquals((await brain("why is the lamp broken?")).expression.name, "unsure");
  assertEquals((await brain("why is the sky?")).expression.name, "unsure");
  await forget();
});

test("a hole is what makes it a question, not the mark", async () => {
  await forget();
  assertEquals((await brain("why is the lamp broken")).expression.name, "unsure");
  await brain("the door is open because the wind is strong");
  assertEquals((await brain("why is the door open")).expression.state.says, "a wind is strong");
  await forget();
});
