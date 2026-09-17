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

test("two things stand at one place on a scale, or they do not", async () => {
  // Asked whether two things are the same colour, the brain is not being asked
  // what colour either of them is. It reads where each stands on the scale the
  // question named and lays the two against each other. Nothing is stored.
  await forget();
  await brain("the sofa is brown");
  await brain("the shelf is brown");
  const alike = await brain("do the sofa and the shelf have the same colour?");
  assertEquals(alike.expression.name, "affirm");
  // And says what they are alike *in*: a sofa is not a shelf.
  assertEquals(alike.expression.state.says, "Yes. ✅ a sofa is the same colour as a shelf.");
  await forget();
});

test("standing at two places on one scale is a denial", async () => {
  await forget();
  await brain("the kite is big");
  await brain("the sail is small");
  assertEquals((await brain("are the kite and the sail the same size?")).expression.name, "deny");
  await forget();
});

test("where one of them stands nowhere, there is nothing to compare", async () => {
  await forget();
  await brain("the sofa is brown");
  assertEquals((await brain("do the sofa and the shelf have the same colour?")).expression.name, "unsure");
  await forget();
});
