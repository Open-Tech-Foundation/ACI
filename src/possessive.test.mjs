import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// A possessive marks whose; it never offers a fact of its own. `my lantern
// is black` says the lantern is black — never its holder.
// Same signals in the same order give the same answers on every machine.

const { brain, forget } = openBrain("sqlite::memory:");

test("a possessive never claims alongside", async () => {
  await forget();
  const r = await brain("my lantern is black", { from: 508 });
  assertEquals(r.expression.name, "learn");
  const holder = (r.learned.terms || []).find((t) => t.id === 508);
  assert(holder != null, "ownership still recorded");
  assert(
    !(holder.links || []).some((l) => l.to === 206),
    "holder untouched by what its thing is: " + JSON.stringify(holder.links),
  );
  assertEquals((await brain("my lantern is black?", { from: 508 })).expression.name, "affirm");
  await forget();
});
