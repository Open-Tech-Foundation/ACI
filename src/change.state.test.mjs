import { test, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// A store of its own, that nothing else can reach.
const { brain, forget } = openBrain("sqlite::memory:");

const PERSON = 29;

async function fresh(...said) {
  await forget();
  let last;
  for (const s of said) last = await brain(s, { from: PERSON });
  return last;
}

test("a later state is the one a thing is in", async () => {
  assertEquals((await fresh("a hut is warm", "a hut is cool", "is a hut warm?")).expression.name, "deny");
  assertEquals((await fresh("a hut is warm", "a hut is cool", "is a hut cool?")).expression.name, "affirm");
  await forget();
});

test("a change of state is not a contradiction", async () => {
  // `a bell is blue` after `a bell is red` was refused outright, because
  // nothing said a colour is a thing a bell stands in one of at a time.
  const r = await fresh("a bell is red", "a bell is blue");
  assertEquals(r.expression.name, "learn");
  assertEquals((await brain("is a bell red?", { from: PERSON })).expression.name, "deny");
  assertEquals((await brain("is a bell blue?", { from: PERSON })).expression.name, "affirm");
  await forget();
});

test("a state a thing is in is not a kind it is one of", async () => {
  // Being stamped with when it came to be so says nothing about what sort of
  // link it is: a red cat is not one of the reds.
  assertEquals((await fresh("my cat is red", "what colour is my cat?")).expression.state.says, "red");
  assertEquals(
    (await fresh("my cat is red", "what colour is your cat?")).expression.state.says,
    "I don't know.",
  );
  await forget();
});

test("what the question asks on is still asked on", async () => {
  assertEquals((await fresh("a car is red", "what colour is the car?")).expression.state.says, "red");
  assertEquals(
    (await fresh("the mast is 6 metres long", "how long is the mast?")).expression.state.says,
    "six metres",
  );
  await forget();
});
