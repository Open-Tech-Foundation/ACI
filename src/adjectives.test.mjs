import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// A store of its own, that nothing else can reach.
const { brain, forget } = openBrain("sqlite::memory:");
const PERSON = 29;

test("what is said of a thing in a state is asked back the same way", async () => {
  await forget();
  await brain("an ocean is vast");
  assertEquals((await brain("an ocean is vast?")).expression.name, "affirm");
  await brain("sugar is sweet");
  assertEquals((await brain("sugar is sweet?")).expression.name, "affirm");
  await brain("a test is easy");
  assertEquals((await brain("a test is easy?")).expression.name, "affirm");
  await forget();
});

test("gladness and sorrow are poles, fear is only learnt", async () => {
  await forget();
  assertEquals((await brain("i am glad", { from: PERSON })).expression.name, "glad");
  assertEquals((await brain("i am sorry", { from: PERSON })).expression.name, "empathy");
  // Fear stands at no pole, so being afraid is taken in like any state.
  assertEquals((await brain("i am afraid", { from: PERSON })).expression.name, "learn");
  await forget();
});

test("clean is the wash, the doing, and the state it leaves", async () => {
  await forget();
  await brain("a shirt is clean");
  assertEquals((await brain("a shirt is clean?")).expression.name, "affirm");
  const r = await brain("i clean a shirt", { from: PERSON });
  assert((r.roots[0].branch || []).some((b) => b.kind === "event"), "someone cleaned");
  assertEquals((await brain("cleaning is work?")).expression.name, "affirm");
  await forget();
});

test("larger and wider read the size scale, newer the time", async () => {
  await forget();
  await brain("alice measures 2 metre");
  await brain("bob measures 1 metre");
  assertEquals(
    (await brain("alice is larger than bob?")).expression.state.says,
    "Yes. ✅ alice is bigger than bob.",
  );
  await brain("tom measures 5 second");
  await brain("sam measures 3 second");
  assertEquals(
    (await brain("sam is newer than tom?")).expression.state.says,
    "Yes. ✅ sam is newer than tom.",
  );
  assertEquals((await brain("tom is newer than sam?")).expression.name, "deny");
  await forget();
});
