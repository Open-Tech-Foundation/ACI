import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// A store of its own, that nothing else can reach.
const { brain, forget } = openBrain("sqlite::memory:");
const PERSON = 29;

function branch(r, kind) {
  return (r.roots[0].branch || []).find((b) => b.kind === kind) || null;
}

test("what makes a tool a tool is what it is used for", async () => {
  await forget();
  assertEquals((await brain("a saw is for work?")).expression.name, "affirm");
  assertEquals((await brain("a knife is for work?")).expression.name, "affirm", "down the kind");
  assertEquals((await brain("an apple is for work?")).expression.name, "unsure", "and not a thing that is not one");
  await forget();
});

test("what a thing is used for is asked the same way anything else is", async () => {
  await forget();
  assertEquals((await brain("a saw is for what")).expression.state.says, "work");
  await forget();
});

test("what a thing is used for is not what it is", async () => {
  await forget();
  assertEquals((await brain("a saw is a tool?")).expression.name, "affirm");
  assertEquals((await brain("a saw is a work?")).expression.name, "unsure",
    "being used for work is not being work");
  await forget();
});

test("a signal may say what a doing was done with", async () => {
  await forget();
  const r = await brain("i cut an apple with a saw", { from: PERSON });
  const parts = branch(r, "event").state.parts;
  const held = parts.find((p) => p.of === 457);
  assert(held != null, "the saw played a part");
  assert(held.role !== parts.find((p) => p.of === PERSON).role, "and not the doer's part");
  await forget();
});
