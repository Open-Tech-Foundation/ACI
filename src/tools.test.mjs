import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// A store of its own, that nothing else can reach.
const { brain, forget } = openBrain("sqlite::memory:");
const PERSON = 29;

function branch(r, kind) {
  return (r.roots[0].branch || []).find((b) => b.kind === kind) || null;
}

// The kind a made thing is one of, read off what the signal learned. `a saw`
// is one saw, so the part it played is that one and not the kind.
function oneOf(r, id) {
  const made = ((r.learned || { terms: [] }).terms || []).find((t) => t.id === id);
  return made ? made.links[0].to : id;
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
  const held = parts.find((p) => oneOf(r, p.of) === 457);
  assert(held != null, "the saw played a part");
  assert(held.role !== parts.find((p) => p.of === PERSON).role, "and not the doer's part");
  await forget();
});

test("a word may name more than one thing", async () => {
  await forget();
  // A saw is a tool, and it is also what someone did with their eyes. The
  // brain thinks it both ways and does not pick while it has only the word.
  const r = await brain("i saw an apple", { from: PERSON });
  const ways = (r.phases.think[1].branch || []).find((b) => b.kind === "thought").state.ways;
  assertEquals(ways.length, 2, "both ways it may be meant");
  await forget();
});

test("what joins the things a signal names settles which way it was meant", async () => {
  await forget();
  // Nothing joins a person and a fruit until `saw` is read as the seeing.
  const r = await brain("i saw an apple", { from: PERSON });
  const seeing = branch(r, "event");
  assert(/^see#\d+$/.test(seeing.name), "a person saw a thing");
  assertEquals(seeing.state.parts.map((p) => oneOf(r, p.of)), [PERSON, 79]);
  assert(seeing.state.when != null, "and did it before now");
  await forget();
});

test("a signal that already has something joining it leaves the word alone", async () => {
  await forget();
  assertEquals((await brain("a saw is a tool?")).expression.name, "affirm",
    "`is` joins them, so the saw is the tool");
  const r = await brain("i cut an apple with a saw", { from: PERSON });
  const cutting = branch(r, "event");
  assert(/^cut#\d+$/.test(cutting.name), "cutting is the doing");
  assert(
    cutting.state.parts.some((p) => oneOf(r, p.of) === 457),
    "and the saw is the tool it was done with",
  );
  await forget();
});
