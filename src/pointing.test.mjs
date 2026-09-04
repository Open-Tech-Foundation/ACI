import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// A store of its own, that nothing else can reach.
const { brain, forget } = openBrain("sqlite::memory:");

test("a pointer with nothing to land on names nothing", async () => {
  await forget();
  assertEquals((await brain("what is it")).expression.name, "unknown");
  await forget();
});

test("what the last signal was about is what a pointer lands on", async () => {
  await forget();
  const told = await brain("a cupboard has three cup");
  assert(told.spoken != null, "the brain handed back what was spoken of");
  assertEquals((await brain("what is it")).expression.state.says, "cupboard");
  await forget();
});

test("a pointer reaches the one thing bearing the state, not its kind", async () => {
  await forget();
  await brain("a cupboard has three cup and two plate");
  assertEquals((await brain("it has how many cups?")).expression.state.says, "three");
  assertEquals((await brain("it has how many plates?")).expression.state.says, "two");
  await forget();
});

test("one thing offered several facts is still one thing spoken of", async () => {
  await forget();
  const r = await brain("a cupboard has three cup and two plate");
  assertEquals(typeof r.spoken, "number");
  await forget();
});

test("several things spoken of leave no one of them to point back at", async () => {
  await forget();
  const r = await brain("a story and a question are art");
  assertEquals(r.spoken, null, "the brain does not pick");
  assertEquals((await brain("what is it")).expression.name, "unknown");
  await forget();
});

test("a signal it could make nothing of says nothing about what was spoken of", async () => {
  await forget();
  await brain("a cupboard has three cup");
  await brain("xyz qwerty");
  assertEquals((await brain("what is it")).expression.state.says, "cupboard");
  await forget();
});

test("a question names the thing it asked about", async () => {
  await forget();
  const r = await brain("what is a sparrow");
  assert(r.spoken != null);
  await forget();
});

test("the brain keeps nothing across signals — it is told each time", async () => {
  await forget();
  const sparrow = (await brain("what is a sparrow")).spoken;
  await forget();
  assertEquals((await brain("what is it")).expression.name, "unknown", "nothing carried over");
  assertEquals(
    (await brain("what is it", { spoken: sparrow })).expression.state.says,
    "bird",
    "told what was spoken of, the pointer lands",
  );
  await forget();
});
