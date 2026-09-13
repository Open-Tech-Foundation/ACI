import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

const sender = { from: 441 };
const said = async (brain, input) => {
  const r = await brain(input, sender);
  return r.expression.state.says;
};

test("the chrono is the single store an ordering claim writes to", async () => {
  const { brain, forget, serialize } = openBrain("sqlite::memory:");
  await brain("morning is before afternoon", sender);
  const graph = serialize();
  assert(!/order\(/.test(graph), `no pairwise order row remains:\n${graph}`);
  assert(/chrono:/.test(graph), "the timeline is part of the graph");
  assert(/members: \[morning\[/.test(graph), "morning is in the timeline");
  assert(/members: \[afternoon\[/.test(graph), "and afternoon is too");
  await forget();
});

test("bare before and after wording compose on the one timeline", async () => {
  const { brain, forget } = openBrain("sqlite::memory:");
  await brain("morning is before afternoon", sender);
  await brain("evening is after afternoon", sender);
  assertEquals(await said(brain, "morning is before evening?"), "Yes. ✅ a morning before evening.");
  assertEquals(await said(brain, "evening is before morning?"), "No. ❌");
  assertEquals(await said(brain, "who is first?"), "morning");
  assertEquals(await said(brain, "who is last?"), "evening");
  await forget();
});

test("an ordering over a doing still reads its far end", async () => {
  const { brain, forget } = openBrain("sqlite::memory:");
  await brain("sara arrived before john", sender);
  assertEquals(await said(brain, "did sara arrive?"), "Yes. ✅");
  assertEquals(await said(brain, "who arrived first?"), "sara");
  assertEquals(await said(brain, "who arrived last?"), "john");
  await forget();
});

test("ordering is asymmetric: the chain refuses a temporal cycle", async () => {
  const isolated = openBrain("sqlite::memory:");
  const denied = await isolated.brain(
    "morning is before afternoon and morning is after afternoon",
    sender,
  );
  assertEquals(denied.expression.name, "deny");
  assertEquals(denied.learned, null);
  const graph = isolated.serialize();
  assert(/chrono:\n\n/.test(graph), `nothing was placed on a refused offering:\n${graph}`);
  await isolated.forget();
});