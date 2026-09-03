import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

const { brain } = openBrain("sqlite::memory:");

const sender = { from: 441 };
const WHEN = 567;
const PAST = 565;
const NOW = 223;
const FUTURE = 566;

const stood = (r) => r.learned.terms[0].links.find((l) => l.rel === WHEN);

test("a signal may put what it says before now", async () => {
  assertEquals(stood(await brain("i was hurt", sender)).to, PAST);
});

test("or after it", async () => {
  assertEquals(stood(await brain("i will hurt", sender)).to, FUTURE);
});

test("and saying neither leaves it where it was said — now", async () => {
  assertEquals(stood(await brain("i am hurt", sender)), undefined);
});

test("the arrow between them is the world's, not the engine's", async () => {
  assertEquals((await brain("the past is a moment?")).expression.state.says, "Yes.");
  assertEquals((await brain("the future is a moment?")).expression.state.says, "Yes.");
  // past -> now -> future, written with the order relation the world already had
  const r = await brain("what is a past?");
  assert(r.expression.state.says.includes("moment"));
});
