import { test, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

const { brain, forget } = openBrain("sqlite::memory:");

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
