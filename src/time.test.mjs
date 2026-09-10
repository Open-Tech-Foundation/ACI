import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

const { brain, forget } = openBrain("sqlite::memory:");

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
  assertEquals((await brain("the past is a moment?")).expression.name, "affirm");
  assertEquals((await brain("the future is a moment?")).expression.name, "affirm");
  // past -> now -> future, written with the order relation the world already had
  const r = await brain("what is a past?");
  assert(r.expression.state.says.includes("moment"));
});

test("before and after belong to the existing order and time ontology", async () => {
  assertEquals((await brain("before is an order?")).expression.name, "affirm");
  assertEquals((await brain("after is an order?")).expression.name, "affirm");
  assertEquals((await brain("the past is a time?")).expression.name, "affirm");
  assertEquals((await brain("now is a time?")).expression.name, "affirm");
  assertEquals((await brain("the future is a time?")).expression.name, "affirm");
});

test("temporal order is read forward, backward and transitively", async () => {
  assertEquals((await brain("the past is before now?")).expression.name, "affirm");
  assertEquals((await brain("now is after the past?")).expression.name, "affirm");
  assertEquals((await brain("the past is before the future?")).expression.name, "affirm");
  assertEquals((await brain("the future is after the past?")).expression.name, "affirm");
});

test("temporal order is asymmetric rather than merely unknown in reverse", async () => {
  assertEquals((await brain("the future is before the past?")).expression.name, "deny");
  assertEquals((await brain("the past is after the future?")).expression.name, "deny");
});

test("learned temporal order composes across before and after wording", async () => {
  await brain("morning is before afternoon");
  await brain("evening is after afternoon");
  assertEquals((await brain("morning is before evening?")).expression.name, "affirm");
  assertEquals((await brain("evening is after morning?")).expression.name, "affirm");
  assertEquals((await brain("evening is before morning?")).expression.name, "deny");
});

test("one offering cannot create a temporal cycle", async () => {
  const { brain: isolated } = openBrain("sqlite::memory:");
  const result = await isolated("morning is before afternoon and morning is after afternoon");
  assertEquals(result.expression.name, "deny");
  assertEquals(result.learned, null);
});

test("a time named is when it happened, not what it happened to", async () => {
  await forget();
  const r = await brain("nila arrived yesterday", { from: 29 });
  const doing = (r.learned.terms || []).find((t) => t.name.startsWith("arrive#"));
  const when = doing.links.filter((l) => l.rel === 567).map((l) => l.to);
  assert(when.includes(2866), `yesterday is when she arrived: ${JSON.stringify(doing.links)}`);
  assert(when.includes(565), "and it was in the past");
  assert(
    !doing.links.some((l) => l.rel === 328 && l.to === 2866),
    "never what she arrived at",
  );
  await forget();
});

test("two units of one scale come to a number, however many steps apart", async () => {
  await forget();
  assertEquals((await brain("an hour has how many minutes?")).expression.state.says, "sixty");
  // Said the short way round, where `in` puts the counted thing first.
  assertEquals((await brain("how many days in a week?")).expression.state.says, "seven");
  assertEquals((await brain("how many minutes in a day?")).expression.state.says, "1440");
  assertEquals(
    (await brain("a day has how many minutes?")).expression.state.says,
    "1440",
    "a day is twenty-four hours and an hour sixty minutes; nobody wrote the third down",
  );
  assertEquals((await brain("a week has how many hours?")).expression.state.says, "168");
  await forget();
});
