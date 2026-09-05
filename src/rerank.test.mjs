import { test, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// Role-aware re-ranking: a clause-subject pointer prefers the current
// signal's entities over a previous topic; a role-marked pointer (`from it`)
// keeps reaching across signals.
// Same signals in the same order give the same answers on every machine.

const { brain, forget } = openBrain("sqlite::memory:");

test("clause-subject it prefers its own signal over a prior topic", async () => {
  await forget();
  await brain("a crate holds three lamps");
  await brain("a bassoon is loud and it is old");
  assertEquals(
    (await brain("is a bassoon old?")).expression.state.says,
    "Yes. ✅ a bassoon is an old.",
  );
  assertEquals(
    (await brain("is a crate old?")).expression.name,
    "unsure",
    "the prior topic stays untouched",
  );
  await forget();
});

test("role-marked it keeps reaching across signals", async () => {
  await forget();
  await brain("a crate holds three lamps");
  await brain("take one lamp from it");
  assertEquals(
    (await brain("the crate holds how many lamps?")).expression.state.says,
    "two",
  );
  await forget();
});
