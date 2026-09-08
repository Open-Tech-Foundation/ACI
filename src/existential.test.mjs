import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// Saying something is there is not naming it. English says it with a word that
// names nothing — `there` stands where a subject stands and refers to no thing
// at all — and the grammar has always had a rule for it. The word itself was
// never written down, so the rule could not fire and the word fell through to
// the one path that takes an unknown word standing where a thing stands: it was
// read as a name being given.
const { brain, forget } = openBrain("sqlite::memory:");

const fresh = async (said) => {
  await forget();
  return brain(said);
};

test("saying something is there does not name a thing `there`", async () => {
  const r = await fresh("there is a dog");
  const made = (r.learned && r.learned.terms) || [];
  assertEquals(
    made.filter((t) => t.name === "there"),
    [],
    "a word that refers to nothing was taken as the name of something",
  );
  await forget();
});

test("and it is not answered as though a thing by that name were known", async () => {
  await fresh("there is a dog");
  const r = await brain("what is there?");
  assert(
    r.expression.name !== "answer" || r.expression.state.says !== "dog",
    "the brain answered about a thing it had invented",
  );
  await forget();
});

test("the existential rule reaches the predicate it was written for", async () => {
  const r = await fresh("there is a dog");
  const root = r.phases.structure[0];
  const kinds = (root.branch || []).map((b) => b.kind);
  assert(kinds.includes("predicate"), `the sentence did not become a predicate: ${kinds.join(", ")}`);
  await forget();
});

// A relation joins two things. Said by itself neither is there, so there is
// nothing it claims and nothing to agree with — no more a claim than an action
// said by itself, which the brain has always simply recognized.
test("a relation said by itself is recognized, not agreed with", async () => {
  await forget();
  for (const word of ["is", "have", "in", "on", "under"]) {
    const r = await brain(word);
    assertEquals(r.expression.name, "recognise", `"${word}" was not recognized`);
    assert(
      !String(r.expression.state.says).startsWith("Yes"),
      `"${word}" was agreed with: ${r.expression.state.says}`,
    );
  }
  await forget();
});

test("an action said by itself is answered the same way", async () => {
  await forget();
  const action = await brain("swim");
  const relation = await brain("have");
  assertEquals(action.expression.name, relation.expression.name, "two modes, one answer to a bare word");
  await forget();
});

// A kind belongs to the world; an individual is only ever something the brain
// was told about, since the world as authored holds none at all. So counting
// individuals reads back what someone said to it, which is what was asked —
// not the world's inventory, which is nobody's business to ask after.
test("the brain can count the individuals it was told about", async () => {
  await forget();
  await brain("tilly is a cat");
  assertEquals((await brain("how many cats?")).expression.state.says, "one");
  await brain("misha is a cat");
  assertEquals((await brain("how many cats?")).expression.state.says, "two");
  await forget();
});

test("a kind it was told of none of is still not counted out", async () => {
  await forget();
  await brain("tilly is a cat");
  assertEquals((await brain("how many dogs?")).expression.name, "unsure");
  await forget();
});

test("what a thing holds is still counted before its kind's individuals", async () => {
  await forget();
  await brain("a box holds three cats");
  assertEquals((await brain("how many cats?")).expression.state.says, "three", "the count it was given wins");
  await forget();
});
