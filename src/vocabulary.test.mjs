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

test("new kinds take their place on the ladder", async () => {
  // Terms added to the knowledge packs with the words naming them: each one
  // classifies under its kind, and the world answers for it.
  await forget();
  for (const [said, asked] of [
    ["a pebble is a rock", "is a pebble a rock?"],
    ["a cord is a string", "is a cord a string?"],
    ["the locker is a container", "is the locker a container?"],
    ["a trapdoor is a door", "is a trapdoor a door?"],
    ["a quill is a feather", "is a quill a feather?"],
    ["a bead is a toy", "is a bead a toy?"],
  ]) {
    await brain(said);
    assertEquals((await brain(asked)).expression.name, "affirm", asked);
    await forget();
  }
  await forget();
});

test("a new shade answers what colour a thing is", async () => {
  await forget();
  await brain("the bead is crimson");
  assertEquals((await brain("is the bead crimson?")).expression.name, "affirm");
  assertEquals((await brain("what colour is the bead?")).expression.state.says, "crimson");
  await forget();
});

test("new doings happen, and new happenings hold people", async () => {
  await forget();
  assertEquals((await brain("pip can juggle")).expression.name, "learn");
  assertEquals((await brain("can pip juggle?")).expression.name, "affirm");
  await brain("liam landed at eight hours");
  await brain("noah landed at nine hours");
  assertEquals((await brain("who landed first?")).expression.state.says, "liam");
  await forget();
  await brain("priya sang during the recital");
  assertEquals((await brain("who was in the recital?")).expression.state.says, "priya");
  await forget();
  await brain("the gale delayed the bus");
  assertEquals((await brain("why was the bus delayed?")).expression.state.says, "gale");
  await forget();
});
