import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// A store of its own, that nothing else can reach.
const { brain, forget } = openBrain("sqlite::memory:");
const says = async (said) => (await brain(said)).expression.state.says;

test("a country has a capital, and the world says which", async () => {
  await forget();
  assertEquals(await says("france capital what"), "paris");
  assertEquals(await says("japan capital what"), "tokyo");
  assertEquals((await brain("france capital paris?")).expression.name, "affirm");
  assertEquals((await brain("france capital tokyo?")).expression.name, "unsure");
  await forget();
});

test("a country speaks a language", async () => {
  await forget();
  assertEquals(await says("japan speaks what"), "japanese");
  assertEquals(await says("brazil speaks what"), "portuguese");
  await forget();
});

test("how many of a thing another holds is a fact like any other", async () => {
  await forget();
  assertEquals(await says("a week has how many days?"), "seven");
  assertEquals(await says("a year has how many months?"), "twelve");
  assertEquals(await says("a year has how many seasons?"), "four");
  await forget();
});

test("what colour a thing is, where the world says", async () => {
  await forget();
  assertEquals((await brain("the sky is blue?")).expression.name, "affirm");
  assertEquals((await brain("grass is green?")).expression.name, "affirm");
  assertEquals((await brain("snow is black?")).expression.name, "deny",
    "white and black are colours apart");
  await forget();
});

test("the days and the months are in the order they come", async () => {
  await forget();
  assertEquals((await brain("monday is a day?")).expression.name, "affirm");
  assertEquals((await brain("january is a month?")).expression.name, "affirm");
  await forget();
});

test("what the brain says it did is what it did", async () => {
  await forget();
  // It made two things to hold what was said and then said nothing they could
  // hold — three red balls and two blue ones, with no fact between the box and
  // either — so the things were dropped and nothing was taken in. Saying `I
  // understand` would be saying it took something in.
  const empty = await brain("a box holds 3 red balls and 2 blue balls");
  assertEquals(empty.learned, null);
  assert(empty.expression.name !== "learn", "it kept nothing, and does not say it did");

  // And the other way round: a rule is taken in whole while both its halves
  // are held at arm's length, so nothing stands — and it is kept all the same.
  const rule = await brain("if a drum is cold then a bell is red");
  assert(rule.learned != null, "the rule is written down");
  assertEquals(rule.expression.name, "learn");
  await forget();
});
