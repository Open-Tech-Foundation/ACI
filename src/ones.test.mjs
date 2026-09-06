import { test, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// Elliptical NPs: `one`/`ones` stand for a focused kind.
// Same signals in the same order give the same answers on every machine.

const { brain, forget } = openBrain("sqlite::memory:");

test("the one reaches the focused kind", async () => {
  await forget();
  await brain("a clarinet is soft");
  await brain("the one is warm");
  assertEquals(
    (await brain("is a clarinet warm?")).expression.state.says,
    "Yes. ✅ a clarinet is warm.",
  );
  await forget();
});

test("the ones reaches the focused kind in plural", async () => {
  await forget();
  await brain("an oboe is cool");
  await brain("the ones are soft");
  assertEquals(
    (await brain("is an oboe soft?")).expression.state.says,
    "Yes. ✅ an oboe is soft.",
  );
  await forget();
});
