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

test("a living refinement predicates an ordinary entity question", async () => {
  await forget();
  for (const input of ["is dog a living thing?", "is dog a living-thing?"]) {
    const result = await brain(input);
    assertEquals(result.expression.name, "affirm", input);
    assertEquals(result.expression.state.says, "Yes. ✅ a dog is living thing.", input);
    assertEquals(result.learned, null, input);
  }
  await forget();
});

test("living and non-living predicates preserve all three truth states", async () => {
  await forget();
  assertEquals((await brain("is a stone a living thing?")).expression.name, "deny");
  assertEquals((await brain("is a stone a non-living thing?")).expression.name, "affirm");
  assertEquals((await brain("is thing a living thing?")).expression.name, "unsure");
  assertEquals((await brain("is thing a non-living thing?")).expression.name, "unsure");
  await forget();
});

test("refinement statements agree with established life status", async () => {
  await forget();
  assertEquals((await brain("a dog is a living thing")).expression.name, "understood");
  assertEquals((await brain("a stone is a non-living thing")).expression.name, "understood");
  await forget();
});

test("a refinement statement contradicting the world is refused", async () => {
  await forget();
  const result = await brain("a dog is a non-living thing");
  assertEquals(result.expression.name, "deny");
  assertEquals(result.learned, null);
  assertEquals((await brain("is a dog a living thing?")).expression.name, "affirm");
  await forget();
});

test("surface negation reverses a living refinement claim", async () => {
  await forget();
  assertEquals((await brain("a dog is not a living thing?")).expression.name, "deny");
  assertEquals((await brain("a stone is not a living thing?")).expression.name, "affirm");
  await forget();
});

test("classification choice stays unsure when life is not known either way", async () => {
  await forget();
  await brain("thing");
  const result = await brain("living thing or non-living thing?");
  assertEquals(result.expression.name, "unsure");
  assertEquals(result.expression.state.says, "I don't know.");
  assertEquals(result.learned, null, "an unanswered choice teaches no classification");
  await forget();
});

test("an explicit denial of life proves non-living classification", async () => {
  await forget();
  await brain("a group is not an organism");
  await brain("group");
  const result = await brain("living thing or non-living thing?");
  assertEquals(result.expression.name, "answer");
  assertEquals(result.expression.state.says, "non-living thing");
  assertEquals(result.learned, null);
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
