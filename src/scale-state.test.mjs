import { test, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

const { brain, forget } = openBrain("sqlite::memory:");
const says = async (q) => (await brain(q)).expression.state.says;

test("asked what scale a thing stands on, the state it is in answers", async () => {
  // A ball told it is small stands at no size anybody measured, and small is
  // the size it is — the answer a colour already gave, which only read because
  // nothing measures colour in units.
  await forget();
  await brain("the ball is small");
  assertEquals(await says("what size is the ball?"), "small");
  await forget();
  await brain("the kettle is hot");
  assertEquals(await says("what temperature is the kettle?"), "hot");
});

test("every scale reads alike, whether the world gives it units or not", async () => {
  await forget();
  await brain("the sack is wet");
  assertEquals(await says("what wetness is the sack?"), "wet");
  await forget();
  await brain("the gate is closed");
  assertEquals(await says("what openness is the gate?"), "closed");
});

test("measured, the amount answers and not the state", async () => {
  await forget();
  await brain("the drum is 3 metres long");
  assertEquals(await says("how long is the drum?"), "three metres");
  assertEquals(await says("what length is the drum?"), "three metres");
});

test("whose thing is asked after is part of what was asked", async () => {
  await forget();
  await brain("my cat is red");
  assertEquals(await says("what colour is your cat?"), "I don't know.");
});
