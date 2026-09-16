import { test, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

const { brain, forget } = openBrain("sqlite::memory:");
const fresh = async (...said) => {
  await forget();
  let last;
  for (const s of said) last = await brain(s);
  return last;
};
const says = async (q) => (await brain(q)).expression.state.says;

test("told the consequence does not stand, the condition cannot either", async () => {
  await fresh("if a drum is cold then a bell is red", "a bell is not red");
  assertEquals(await says("is a drum cold?"), "No. ❌");
});

test("the rule still runs the way it was written", async () => {
  await fresh("if a drum is cold then a bell is red", "a drum is cold");
  assertEquals(await says("is a bell red?"), "Yes. ✅ a bell is red.");
});

test("the consequence standing says nothing about the condition", async () => {
  // Affirming the consequent. A red bell may be red for its own reasons.
  await fresh("if a drum is cold then a bell is red", "a bell is red");
  assertEquals(await says("is a drum cold?"), "I don't know.");
});

test("the condition not standing says nothing about the consequence", async () => {
  // Denying the antecedent, and the same refusal.
  await fresh("if a drum is cold then a bell is red", "a drum is not cold");
  assertEquals(await says("is a bell red?"), "I don't know.");
});

test("what it followed from is kept with it", async () => {
  // The denial is not merely taken; it says what it stood on, the way any
  // fact the brain worked out does. Asking why *not* is a wording the brain
  // does not read yet, so the record is read rather than asked after.
  const told = await fresh("if a drum is cold then a bell is red", "a bell is not red");
  const following = (told.learned && told.learned.terms ? told.learned.terms : []).some(
    (term) => (term.links || []).length > 0,
  );
  assertEquals(following, true);
  assertEquals(await says("is a drum cold?"), "No. ❌");
});
