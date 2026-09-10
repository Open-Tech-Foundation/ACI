import { test, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// A signal may hold more than one thing said. A mark that ends what is being
// said ends it, and what follows is the next thing — taken in order, so the
// last of them sees the world the ones before it left.

const { brain, forget } = openBrain("sqlite::memory:");

test("three sentences said at once are three things said", async () => {
  await forget();
  const r = await brain("Sara is older than Tom. Tom is older than Mike. Who is the youngest?");
  assertEquals(r.expression.state.says, "I understand. Mike", "each is said, and the same said twice is said once");
  await forget();
});

test("what one settles, the next one asks against", async () => {
  await forget();
  const r = await brain("a wren is a bird. is a wren a bird?");
  assertEquals(
    r.expression.state.says,
    "I know. Yes. \u2705 a wren is a bird.",
    "the second was answered against the world the first left, and both are said",
  );
  await forget();
});

test("a mark inside a word ends nothing", async () => {
  await forget();
  assertEquals((await brain("what is 0.1+0.2?")).expression.state.says, "0.3");
  await forget();
});

test("one thing said is still one thing said", async () => {
  await forget();
  assertEquals((await brain("nila is a crow.")).expression.name, "learn");
  await forget();
});
