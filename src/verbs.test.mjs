import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// A store of its own, that nothing else can reach.
const { brain, forget } = openBrain("sqlite::memory:");

// The one the signals come from, so `i` lands on something.
const PERSON = 29;

test("a signal may say who did it", async () => {
  await forget();
  await brain("a basket holds three apple");
  await brain("i take one apple from the basket", { from: PERSON });
  assertEquals(
    (await brain("the basket holds how many apples?")).expression.state.says,
    "two",
    "the doer standing before the action does not stop it being read",
  );
  await forget();
});

test("what a word does in the past it does the same, on the other side of now", async () => {
  await forget();
  assertEquals((await brain("a basket had three apple")).expression.name, "learn");
  assertEquals((await brain("a basket held three apple")).expression.name, "learn");
  await forget();
});

test("what a get goes to is whoever did it", async () => {
  await forget();
  await brain("a person holds two apple");
  assertEquals((await brain("i got one apple", { from: PERSON })).expression.name, "learn");
  assertEquals(
    (await brain("i hold how many apples?", { from: PERSON })).expression.state.says,
    "three",
    "and it is the getter who came to hold it",
  );
  await forget();
});

test("nothing was said twice: the doer is the destination without saying so", async () => {
  await forget();
  await brain("a person holds two apple");
  const got = await brain("i get one apple", { from: PERSON });
  const did = (got.roots[0].branch || []).find((b) => b.kind === "did");
  assertEquals(did.state.before, 2);
  assertEquals(did.state.after, 3);
  await forget();
});

test("an action still needs a count it was given", async () => {
  await forget();
  await brain("a person holds two apple");
  // "an apple" says which, not how many, and the brain does not read one for it.
  assertEquals((await brain("i got an apple", { from: PERSON })).expression.name, "learn");
  await forget();
});

test("what happened is recorded whether or not it could be worked out", async () => {
  await forget();
  const r = await brain("i got one apple", { from: PERSON });
  const event = (r.roots[0].branch || []).find((b) => b.kind === "event");
  assert(/^get#\d+$/.test(event.name), "it was told a get happened");
  await forget();
});

test("third-person and past forms stand as the doing", async () => {
  await forget();
  // A third person doing it is someone doing it: the doer reads off the order.
  const third = await brain("a boy brushes", { from: PERSON });
  assertEquals(third.expression.name, "learn");
  assert((third.roots[0].branch || []).some((b) => b.kind === "event"), "someone brushed");
  // A past or participle puts it on the other side of now.
  for (const said of ["i brushed an apple", "i said an apple", "i gave an apple"]) {
    const r = await brain(said, { from: PERSON });
    const event = (r.roots[0].branch || []).find((b) => b.kind === "event");
    assert(event != null, `${said} happened`);
  }
  await forget();
});

test("a third-person form keeps the noun it shares a spelling with", async () => {
  await forget();
  assertEquals((await brain("bears are mammals?")).expression.name, "affirm");
  assertEquals((await brain("trains are vehicles?")).expression.name, "affirm");
  assertEquals((await brain("plants are organisms?")).expression.name, "affirm");
  await forget();
});

test("using a tool is said with the verb, and taken in like having", async () => {
  await forget();
  const r = await brain("i use a saw", { from: PERSON });
  assertEquals(r.expression.name, "learn");
  assert(r.learned != null, "what was used is kept");
  assertEquals((await brain("a saw is a tool?")).expression.name, "affirm", "and nothing else moved");
  await forget();
});

test("wanting, liking and the rest happen like any doing", async () => {
  await forget();
  // Statives file the same way: what was wanted is on the record as what
  // happened, and the question of what wanting is stays untouched.
  for (const said of ["i talk", "i like an apple", "i want an apple", "i help an apple", "i start", "i play an apple", "i move an apple", "i believe an apple", "i bring an apple", "i sit"]) {
    const r = await brain(said, { from: PERSON });
    const event = (r.roots[0].branch || []).find((b) => b.kind === "event");
    assert(event != null, `${said} happened`);
  }
  assertEquals((await brain("talking is work?")).expression.name, "affirm");
  assertEquals((await brain("wanting is work?")).expression.name, "affirm");
  await forget();
});

test("derived and irregular pasts put the doing before now", async () => {
  await forget();
  // talked and helped were never written down: -ed derives. brought and sat
  // were, being irregular.
  for (const said of ["i talked", "i helped an apple", "i brought an apple", "i sat"]) {
    const r = await brain(said, { from: PERSON });
    const event = (r.roots[0].branch || []).find((b) => b.kind === "event");
    assert(event != null && event.state.when != null, `${said} happened before now`);
  }
  await forget();
});

test("a doing already done is the same doing, reached by its ending", async () => {
  await forget();
  // No language writes down every form of every verb. `cleaned` is not listed
  // anywhere — the ending reaches `clean`, and says the doing is behind.
  await brain("i cleaned a room", { from: PERSON });
  assertEquals((await brain("did i clean a room?", { from: PERSON })).expression.name, "affirm");
  await forget();
});

test("an ending that puts a doing behind says so of any verb it reaches", async () => {
  await forget();
  for (const [said, asked] of [
    ["i whispered", "did i whisper?"],
    ["i heard a bird", "did i hear a bird?"],
    ["i carried a box", "did i carry a box?"],
  ]) {
    await brain(said, { from: PERSON });
    assertEquals((await brain(asked, { from: PERSON })).expression.name, "affirm", said);
  }
  await forget();
});

test("an ending is exact, and reaches nothing it does not fit", async () => {
  await forget();
  // Nothing is guessed: `wandered` reaches `wander`, which no language lists.
  assertEquals((await brain("i wandered", { from: PERSON })).expression.name, "unheard");
  await forget();
});
