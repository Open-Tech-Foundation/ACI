import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

const { brain, forget, serialize } = openBrain("sqlite::memory:");

async function fresh(...said) {
  await forget();
  for (const s of said) await brain(s);
  return serialize();
}
const says = async (q) => (await brain(q)).expression.state.says;

test("a doing told with a time stands on the timeline", async () => {
  const graph = await fresh("the ferry arrived at eight hours");
  assert(/a1  event\(n1, type: arrive\[\d+\]\)\s+at 8 hour/.test(graph), graph);
  assert(/m1  members: \[a1\]/.test(graph), `and it takes a moment:\n${graph}`);
});

test("two clocks order two doings, with nobody declaring it", async () => {
  const graph = await fresh("nadia arrived at nine hours", "omar arrived at ten hours");
  assert(/m1  members: \[a1\]  before: null/.test(graph), `nadia first:\n${graph}`);
  assert(/m2  members: \[a2\]  before: m1/.test(graph), `omar after her:\n${graph}`);
});

test("told out of order, the clock still says which came first", async () => {
  const graph = await fresh("omar arrived at ten hours", "nadia arrived at nine hours");
  // The nine was said second and stands at the head all the same.
  assert(/m2  members: \[a2\]  before: null/.test(graph), `the nine is the head:\n${graph}`);
  assert(/m1  members: \[a1\]  before: m2/.test(graph), `and the ten follows it:\n${graph}`);
  assertEquals(await says("who arrived first?"), "nadia");
});

test("the end of the timeline reads off the clock", async () => {
  await fresh("nadia arrived at nine hours", "omar arrived at ten hours");
  assertEquals(await says("who arrived first?"), "nadia");
  assertEquals(await says("who arrived last?"), "omar");
});

test("one clock is one moment, however many stood at it", async () => {
  const graph = await fresh("the ferry arrived at eight hours", "the train arrived at eight hours");
  assert(/m1  members: \[a1, a2\]/.test(graph), `both at the one moment:\n${graph}`);
});

test("a declared ordering still reads its two ends", async () => {
  await fresh("asha arrived before deepak");
  assertEquals(await says("who arrived first?"), "asha");
  assertEquals(await says("who arrived last?"), "deepak");
});
