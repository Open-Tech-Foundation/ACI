import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// Agreement with a denial: `neither` copies the last doing denied, with a new
// agent. Denied occurrences never answer as if they happened.
// Same signals in the same order give the same answers on every machine.

const { brain, forget } = openBrain("sqlite::memory:");

test("neither copies a denial onto a new agent", async () => {
  await forget();
  await brain("nora is a mason");
  await brain("theo is a gardener");
  await brain("nora did not wash a pan");
  const r = await brain("neither did theo");
  assertEquals(r.expression.name, "learn");
  assert(r.learned != null, "the denied doing goes on the record");
  assertEquals(
    (await brain("did theo wash a pan?")).expression.name,
    "unsure",
    "a denied doing is not answered as if it happened",
  );
  assertEquals(
    (await brain("did nora wash a pan?")).expression.name,
    "unsure",
    "a denied doing is not answered as if it happened",
  );
  await forget();
});
