import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// Verb anaphora: `did` after its subject stands for the last action, copying
// unspoken parts from its latest occurrence with the new agent.
// Same signals in the same order give the same answers on every machine.

const { brain, forget } = openBrain("sqlite::memory:");

test("did repeats the last action with a new agent", async () => {
  await forget();
  await brain("pippa is a sailor");
  await brain("miro is a farmer");
  await brain("pippa washed a pot");
  assertEquals(
    (await brain("did miro wash a pot?")).expression.state.says,
    "I don't know.",
    "no occurrence with miro yet",
  );
  await brain("miro did too");
  assertEquals(
    (await brain("did miro wash a pot?")).expression.state.says,
    "Yes. ✅",
  );
  await forget();
});

test("sentence-initial did stays an auxiliary", async () => {
  await forget();
  await brain("pippa is a sailor");
  await brain("pippa washed a pot");
  assertEquals(
    (await brain("did pippa wash a pot?")).expression.state.says,
    "Yes. ✅",
  );
  await forget();
});

test("did with not stays an auxiliary", async () => {
  await forget();
  await brain("pippa is a sailor");
  const r = await brain("pippa did not wash a pot");
  assertEquals(r.expression.name, "learn");
  assert(r.learned != null, "the denied doing goes on the record");
  await forget();
});
