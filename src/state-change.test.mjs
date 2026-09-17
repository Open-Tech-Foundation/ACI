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
  // What was told stays as it was told; the change is what happened. How the
  // coffee is now is neither of them written down — it follows from the two.
  assert(/f1  property\(n1, hot\[\d+\]\)/.test(graph), `it was told hot:\n${graph}`);
  assertEquals((graph.match(/property\(n1,/g) || []).length, 1, `and nothing else:\n${graph}`);
  assert(/a1  state-change\(n1\)\s+\{time: done, temperature: cold\[\d+\]\}/.test(graph), `and it changed:\n${graph}`);
});

test("the thing stands in the state it took, not the one it left", async () => {
  const graph = await fresh("the coffee is hot", "the coffee got cold");
  assert(/n1  coffee.*\{temperature: cold\[\d+\]\}/.test(graph), graph);
  assertEquals(await says("is the coffee cold?"), "Yes. ✅ a coffee is cold.");
  assertEquals(await says("is the coffee hot?"), "No. ❌");
});

test("what a thing was is the fact, and what it is follows from the change", async () => {
  // Nothing is written twice: the told fact is what it was, the change is what
  // happened, and what it is now is read off the two.
  const graph = await fresh("the coffee is hot", "the coffee got cold");
  const facts = graph.match(/property\(n1, \w+\[\d+\]\)/g) || [];
  assertEquals(facts.length, 1);
  assert(/hot/.test(facts[0]), `what it was:\n${graph}`);
  assert(/n1  coffee.*\{temperature: cold\[\d+\]\}/.test(graph), `what it is:\n${graph}`);
});

test("a state nothing stood in before is the change and nothing else", async () => {
  const graph = await fresh("the porch became wet");
  assert(/state-change\(n1\)\s+\{time: done, wetness: wet\[\d+\]\}/.test(graph), graph);
  assertEquals((graph.match(/property\(n1,/g) || []).length, 0, `nobody told it anything:\n${graph}`);
  assert(/n1  porch.*\{wetness: wet\[\d+\]\}/.test(graph), `and it is wet all the same:\n${graph}`);
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

test("a change writes no fact, and the reading applies it", async () => {
  // The facts are what the conversation was told and never move; the actions
  // are what happened; how a thing stands now follows from the two — the same
  // way what somebody holds after a giving follows from what they were told to
  // hold and what was given away.
  const graph = await fresh("the sack is open", "the sack became wet");
  assertEquals((graph.match(/property\(n1,/g) || []).length, 1, `only what was told:\n${graph}`);
  assert(/f1  property\(n1, opened\[\d+\]\)/.test(graph), graph);
  assert(/a1  state-change\(n1\)\s+\{time: done, wetness: wet\[\d+\]\}/.test(graph), graph);
  assertEquals(await says("is the sack wet?"), "Yes. ✅ a sack is wet.");
  assertEquals(await says("is the sack open?"), "Yes. ✅ a sack is open.");
});

test("a doing brings its state about, and the reading applies that too", async () => {
  // The world declares which of its doings bring what about — an opening
  // brings about being open — and nothing about the door is written down
  // except what it was told.
  const graph = await fresh("the door is closed", "ravi opened the door");
  assertEquals((graph.match(/property\(n1,/g) || []).length, 1, `only what was told:\n${graph}`);
  assertEquals(await says("is the door open?"), "Yes. ✅ a door is open.");
  assertEquals(await says("is the door closed?"), "No. ❌");
  assertEquals(await says("was the door closed?"), "Yes. ✅ a door is closed.");
});

test("which change is the latest is the timeline's to say", async () => {
  // The order a conversation mentions things in is not the order they
  // happened. Told the cooling first and the heating second, the clock puts
  // the heating earlier, so the coffee is cold.
  await fresh("the coffee got cold at ten hours", "the coffee got hot at nine hours");
  assertEquals(await says("is the coffee cold?"), "Yes. ✅ a coffee is cold.");
  assertEquals(await says("is the coffee hot?"), "No. ❌");
  await fresh("the tram arrived at ten hours", "the bus arrived at nine hours");
  assertEquals(await says("who arrived first?"), "bus");
});

test("a change is a happening, and what changed names it", async () => {
  // `the coffee got cold at ten hours` leaves the clock on the change, and
  // asked when, nothing reached it: the walk knew a doing by who did it, and a
  // change has no doer — only the thing it happened to.
  await forget();
  await brain("the coffee got cold at ten hours");
  assertEquals((await brain("is the coffee cold?")).expression.name, "affirm");
  assertEquals((await brain("when did the coffee get cold?")).expression.state.says, "ten hours");
  await forget();
});

test("the state reached carries the clock, whether or not it is also a thing", async () => {
  // `got cold at ten hours` only ever read because `cold` is a thing as well
  // as a way to be, so the clock hung off it as if it were a second thing.
  // `open` is only a way to be, and the same sentence was not read at all.
  await fresh("the gate became open at ten hours");
  assertEquals(await says("is the gate open?"), "Yes. ✅ a gate is open.");
  assertEquals(await says("when did the gate open?"), "ten hours");
  await forget();
});
