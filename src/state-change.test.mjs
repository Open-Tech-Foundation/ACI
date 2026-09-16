import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

const { brain, forget, serialize } = openBrain("sqlite::memory:");

async function fresh(...said) {
  await forget();
  for (const s of said) await brain(s);
  return serialize();
}
const says = async (q) => (await brain(q)).expression.state.says;

test("a state told is a fact, and taking a new one is a change", async () => {
  const graph = await fresh("the coffee is hot", "the coffee got cold");
  assert(/f1  property\(n1, hot\[\d+\]\)/.test(graph), `it was hot:\n${graph}`);
  assert(/f2  property\(n1, cold\[\d+\]\)/.test(graph), `and it is cold:\n${graph}`);
  assert(/a1  state-change\(n1\)\s+\{time: done, temperature: cold\[\d+\]\}/.test(graph), `and it changed:\n${graph}`);
});

test("the thing stands in the state it took, not the one it left", async () => {
  const graph = await fresh("the coffee is hot", "the coffee got cold");
  assert(/n1  coffee.*\{temperature: cold\[\d+\]\}/.test(graph), graph);
  assertEquals(await says("is the coffee cold?"), "Yes. ✅ a coffee is cold.");
  assertEquals(await says("is the coffee hot?"), "No. ❌");
});

test("what a thing was is the fact standing before the latest", async () => {
  // Nothing is written twice. The order the facts were said in is the history,
  // the way it already is for a count, and the change says when it turned.
  const graph = await fresh("the coffee is hot", "the coffee got cold");
  const facts = graph.match(/property\(n1, \w+\[\d+\]\)/g) || [];
  assertEquals(facts.length, 2);
  assert(/hot/.test(facts[0]) && /cold/.test(facts[1]), `hot, then cold:\n${graph}`);
});

test("a state nothing stood in before leaves one fact and no history", async () => {
  const graph = await fresh("the porch became wet");
  assert(/state-change\(n1\)\s+\{time: done, wetness: wet\[\d+\]\}/.test(graph), graph);
  assertEquals((graph.match(/property\(n1,/g) || []).length, 1, graph);
});

test("a feeling is a state, and taking a new one leaves the old", async () => {
  await fresh("ravi is angry", "ravi became afraid");
  assertEquals(await says("is ravi afraid?"), "Yes. ✅ ravi is fear.");
  assertEquals(await says("is ravi angry?"), "No. ❌");
});

test("a property is not a state, and changing one is not the other", async () => {
  const graph = await fresh("the lamp is red", "the lamp turned blue");
  assert(/property-change\(n1\)\s+\{time: done, colour: blue\[\d+\]\}/.test(graph), graph);
});

test("a dimension holds one value at a time without anyone saying so", async () => {
  // Nobody declares anger and fear to be different. One feeling at a time is
  // what a dimension means.
  await fresh("meera is angry", "meera became afraid");
  assertEquals(await says("is meera angry?"), "No. ❌");
});

test("a state of one kind is left alone by a state of another", async () => {
  await fresh("the sack is open", "the sack became wet");
  assertEquals(await says("is the sack open?"), "Yes. ✅ a sack is open.");
  assertEquals(await says("is the sack wet?"), "Yes. ✅ a sack is wet.");
});

test("how long after a doing was is when it was, never a second doing", async () => {
  // `after five minutes` used to order the falling against the minutes: a
  // second falling whose doer was the unit, and the unit itself on the
  // timeline. A unit that measures time cannot fall.
  const graph = await fresh("a plank fell after 5 minutes");
  assert(/a1  event\(n1, type: fall\[\d+\]\)\s+\{after: 5 minute\[\d+\], time: done\}/.test(graph), graph);
  assertEquals((graph.match(/^  a\d/gm) || []).length, 1, `one falling:\n${graph}`);
  assert(!/minute\[\d+\]\]\s+before/.test(graph), `and no unit on the timeline:\n${graph}`);
});

test("a state change told how long after keeps the thing it is about", async () => {
  const graph = await fresh("the coffee is hot", "the coffee got cold after 5 minutes");
  assert(/a1  state-change\(n1\)\s+\{after: 5 minute\[\d+\], time: done/.test(graph), graph);
  assertEquals((graph.match(/^  n\d/gm) || []).length, 1, `one coffee:\n${graph}`);
});

test("an ordering between two doings still says how far apart they were", async () => {
  await fresh("the crash happened two hours after the server started");
  assertEquals((await brain("when did the crash happen?")).expression.name, "unsure");
});

test("two things said to have stood at one time stand in one moment", async () => {
  const graph = await fresh("the coffee was hot when it arrived");
  assert(/f1  property\(n1, hot\[\d+\]\)/.test(graph), `it was hot:\n${graph}`);
  assert(/a1  event\(n1, type: arrive\[\d+\]\)/.test(graph), `and it arrived:\n${graph}`);
  assert(/m1  members: \[f1, a1\]/.test(graph), `both at one moment:\n${graph}`);
});

test("when still asks when where it opens the signal", async () => {
  await fresh("the backup started in the morning");
  assertEquals((await brain("when did the backup start?")).expression.state.says, "morning");
});
