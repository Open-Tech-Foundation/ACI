import { test, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// Focus tracked from the current tree: a pronoun looks at entities already
// understood earlier in the SAME signal first, then at previous signals.
// Same signals in the same order give the same answers on every machine.

const { brain, forget } = openBrain("sqlite::memory:");

test("inline it reaches an entity earlier in the same signal", async () => {
  await forget();
  await brain("a violin is loud and it is old");
  assertEquals(
    (await brain("is a violin old?")).expression.state.says,
    "Yes. ✅ a violin is old.",
  );
  await forget();
});

test("no forward reference in the same signal", async () => {
  await forget();
  await brain("it is heavy and a drum is cold");
  assertEquals(
    (await brain("is a drum cold?")).expression.state.says,
    "Yes. ✅ a drum is cold.",
    "the second clause still lands",
  );
  assertEquals(
    (await brain("is a drum heavy?")).expression.name,
    "unsure",
    "the first clause names nothing",
  );
  await forget();
});

test("inline it with different entities", async () => {
  await forget();
  await brain("a trumpet is small and it is long");
  assertEquals(
    (await brain("is a trumpet long?")).expression.state.says,
    "Yes. ✅ a trumpet is long.",
  );
  await forget();
});
