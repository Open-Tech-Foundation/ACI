import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

const { brain, forget, serialize } = openBrain("sqlite::memory:");

async function fresh(...said) {
  await forget();
  for (const s of said) await brain(s);
  return serialize();
}

// One joining, whichever word says it. A reason and what came of it, with the
// reason's row holding the effect's — the word only chooses which side of it
// the reason was said on.
const says = async (q) => (await brain(q)).expression.state.says;
const joined = (graph) => /f1  property\(n\d, wet\[\d+\]\)[^\n]*reason a1/.test(graph);

test("a word that puts the reason after it joins the two", async () => {
  for (const word of ["because", "since", "as"]) {
    const graph = await fresh(`a road is wet ${word} a plank fell`);
    assert(joined(graph), `${word}:\n${graph}`);
  }
});

test("a word that puts what came of it after it joins the same two", async () => {
  for (const word of ["so", "therefore", "thus", "hence"]) {
    const graph = await fresh(`a plank fell ${word} a road is wet`);
    assert(joined(graph), `${word}:\n${graph}`);
  }
});

test("both sides are still said, whichever word joined them", async () => {
  const graph = await fresh("a plank fell therefore a road is wet");
  assert(/f1  property\(n2, wet\[\d+\]\)/.test(graph), `the road is wet:\n${graph}`);
  assert(/a1  event\(n1, type: fall\[\d+\]\)/.test(graph), `and the plank fell:\n${graph}`);
});

test("so still stands for the last idea where nothing follows it", async () => {
  await fresh("a banjo is big");
  assertEquals((await brain("is it so?")).expression.state.says, "Yes. ✅ a banjo is big.");
});

test("so after a doing word is still the idea, not a joining", async () => {
  await fresh("a banjo is big");
  assertEquals((await brain("i think so")).expression.name, "understood");
});

test("why a thing is so answers with the doing it came of", async () => {
  await fresh("a road became wet because a plank fell");
  assertEquals(await says("why is the road wet?"), "plank fell");
});

test("why reads the joining whichever word made it", async () => {
  await fresh("a sack became wet since a pipe burst");
  assertEquals(await says("why is the sack wet?"), "pipe burst");
});

test("why something happened answers with what it came of", async () => {
  await fresh("a gate became open so a dog ran");
  assert(/gate/.test(await says("why did the dog run?")), await says("why did the dog run?"));
});

test("a claim standing behind another still answers why", async () => {
  await fresh("a road is wet because a drum is cold");
  assertEquals(await says("why is the road wet?"), "a drum is cold");
});

test("with nothing behind it, why says so", async () => {
  await fresh("the sky is blue");
  assertEquals((await brain("why is the sky blue?")).expression.name, "unsure");
});
