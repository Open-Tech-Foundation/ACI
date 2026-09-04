import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

const { brain } = openBrain("sqlite::memory:");

// Whoever sent it. The runtime says who; the brain never asks what kind of
// thing it is.
const sender = { from: 508 };
const NICE = 563;
const AGENT = 327;
const TARGET = 328;

const branchOf = (r, kind) => (r.roots[0].branch || []).find((b) => b.kind === kind) || null;
const linkOf = (r, rel) => r.learned.terms[0].links.find((l) => l.rel === rel);

test("what someone says of a thing is held as theirs, with what they said it of", async () => {
  const r = await brain("the shelf is nice", sender);
  assertEquals(r.expression.state.says, "I understand.");
  assertEquals(linkOf(r, 294).to, NICE, "of what was said");
  assertEquals(linkOf(r, AGENT).to, 508, "by whoever sent it");
  assertEquals(linkOf(r, TARGET).to, 435, "about the shelf");
});

test("and the world is not made to agree with it", async () => {
  await brain("the spoon is nice", sender);
  assertEquals((await brain("a spoon is nice?")).expression.state.says, "I don't know.");
});

test("a denial is held as a denial, not as its opposite", async () => {
  const r = await brain("the ladder is not nice", sender);
  assertEquals(linkOf(r, 294).not, true);
  assertEquals(linkOf(r, 294).to, NICE, "what they denied, not what they did not say");
});

test("with nobody to hold it, an opinion is not knowledge", async () => {
  const r = await brain("the ladder is nice");
  assertEquals(branchOf(r, "refuse").name, "unheld");
  assertEquals(r.expression.name, "deny");
  assertEquals(r.learned, null);
});

test("a claim the world can settle is still the world's", async () => {
  const r = await brain("a spoon is a tool", sender);
  assert(branchOf(r, "standing") !== null, "judged, not held");
  assertEquals(branchOf(r, "event"), null);
});

// Empathy: understanding what someone feels, and holding it as theirs. Both
// halves are already the record's — the act is only the last step.
test("said of themselves, and standing at the bad pole, the brain empathizes", async () => {
  const r = await brain("i am hurt", sender);
  assertEquals(r.expression.name, "empathy");
  assertEquals(r.expression.state.says, "Sorry. \ud83d\ude14");
});

test("what they said of something else is understood, not empathized with", async () => {
  assertEquals((await brain("the wheel is hurt", sender)).expression.name, "learn");
});

test("what stands at the other pole is gladness, not empathy", async () => {
  const r = await brain("i am nice", sender);
  assertEquals(r.expression.name, "glad");
  assertEquals(r.expression.state.says, "Good. \ud83d\ude42");
});

test("what they denied of themselves is not what they feel", async () => {
  assertEquals((await brain("i am not hurt", sender)).expression.name, "learn");
});
