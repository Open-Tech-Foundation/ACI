import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// A store of its own, that nothing else can reach.
const { brain, forget } = openBrain("sqlite::memory:");
const PERSON = 29;

function branch(r, kind) {
  return (r.roots[0].branch || []).find((b) => b.kind === kind) || null;
}

test("a word may be more than one part of speech", async () => {
  await forget();
  // The world holds one term for walking. English says a walk and walks with
  // the same word, and which one it is, is what the parse settles.
  assertEquals((await brain("a walk is a motion?")).expression.name, "affirm", "as a thing");
  assert(branch(await brain("a person walks"), "event") !== null, "as a doing");
  await forget();
});

test("the actions the world holds are sayable", async () => {
  await forget();
  for (const said of ["i see an apple", "i make a basket", "i throw an apple"]) {
    const r = await brain(said, { from: PERSON });
    assert(branch(r, "event") !== null, `${said} was told to have happened`);
  }
  await forget();
});

test("a doing needs nothing done to it", async () => {
  await forget();
  const r = await brain("i think", { from: PERSON });
  const event = branch(r, "event");
  assert(event !== null, "someone thought, and that is the whole of it");
  assertEquals(event.state.parts.length, 1, "only the one doing it");
  await forget();
});

test("what was done is on the other side of now when the word says so", async () => {
  await forget();
  const r = await brain("i ate an apple", { from: PERSON });
  const event = branch(r, "event");
  assert(event !== null);
  assert(event.state.when != null, "the past is a side of now, and the word said which");
  await forget();
});

test("a word that is also a thing still stands as one", async () => {
  await forget();
  assertEquals((await brain("catch is work")).expression.name, "understood");
  await forget();
});
