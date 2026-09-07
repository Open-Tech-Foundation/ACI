import { test, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

const { brain, forget } = openBrain("sqlite::memory:");

test("a bare recognized entity becomes the conversation topic", async () => {
  await forget();
  const named = await brain("honey");
  assertEquals(named.spoken, 401);
  assertEquals((await brain("what is it?")).expression.state.says, "food");
  await forget();
});

test("a bare action does not replace an established entity topic", async () => {
  await forget();
  await brain("honey");
  await brain("hi");
  assertEquals((await brain("what is it?")).expression.state.says, "food");
  await forget();
});

test("a classification choice answers from the focused entity", async () => {
  await forget();
  await brain("honey");
  const result = await brain("living thing or non-living thing");
  assertEquals(result.expression.name, "answer");
  assertEquals(result.expression.state.says, "non-living thing");
  assertEquals(result.learned, null, "choosing a known class teaches no fact");
  await forget();
});

test("classification choice recomputes a living topic from the world", async () => {
  await forget();
  await brain("tree");
  assertEquals((await brain("living thing or non-living thing?")).expression.state.says, "living thing");
  await forget();
});

test("a classification choice without one focused topic does not guess", async () => {
  await forget();
  const result = await brain("living thing or non-living thing");
  assertEquals(result.expression.name, "unsure");
  assertEquals(result.expression.state.says, "I don't know.");
  assertEquals(result.learned, null);
  await forget();
});

test("it on speaker-side focus stands for what is held", async () => {
  await forget();
  const told = await brain("i have 3 chocolates", { from: 26 });
  const r = await brain("what is it?", { from: 26 });
  assertEquals(typeof told.spoken, "number");
  assertEquals(typeof r.spoken, "number");
  assertEquals(r.spoken !== told.spoken, true);
  assertEquals(r.expression.state.says, "chocolates");
  await forget();
});

test("it without a speaker keeps the bearer", async () => {
  await forget();
  await brain("a cupboard has three cup");
  assertEquals((await brain("what is it")).expression.state.says, "cupboard");
  await forget();
});

test("what am i asks kind, who am i asks name", async () => {
  await forget();
  await brain("i have 3 chocolates", { from: 26 });
  assertEquals((await brain("what am i?", { from: 26 })).expression.state.says, "human");
  assertEquals((await brain("who am i?", { from: 26 })).expression.state.says, "I don't know.");
  await forget();
});

test("them on speaker-side focus stands for what is held", async () => {
  await forget();
  const told = await brain("i have 3 compasses", { from: 26 });
  const r = await brain("wash them", { from: 26 });
  assertEquals(typeof told.spoken, "number");
  assertEquals(typeof r.spoken, "number");
  assertEquals(r.spoken !== told.spoken, true);
  await forget();
});
