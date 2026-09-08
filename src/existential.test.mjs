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
