import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

const { brain, forget } = openBrain("sqlite::memory:");
const says = async (q) => (await brain(q)).expression.state.says;

test("the world tells two readings of one word apart", async () => {
  // Both are nouns, so nothing beside the word can separate them. What the
  // signal says the thing is, is what says which thing it is.
  await forget();
  assertEquals(await says("is a cricket a sport?"), "Yes. ✅ a cricket is a sport.");
  assertEquals(await says("is a cricket an insect?"), "Yes. ✅ a cricket is an insect.");
  assertEquals(await says("is a bat a tool?"), "Yes. ✅ a bat is a tool.");
  assertEquals(await says("is a bat a mammal?"), "Yes. ✅ a bat is a mammal.");
});

test("what the conversation already met settles a word the signal cannot", async () => {
  await forget();
  await brain("a cricket is a sport");
  assertEquals(await says("what is a cricket?"), "sport");
  await forget();
  await brain("a cricket is an insect");
  assertEquals(await says("what is a cricket?"), "insect");
});

test("what came before does not override what the signal needs", async () => {
  // The conversation has met `open` the state; the next signal wants the
  // doing, and the doing is what it gets.
  await forget();
  await brain("the sack is open");
  assertEquals(await says("did ravi open the crate?"), "I don't know.");
  await brain("ravi opened the crate");
  assertEquals(await says("did ravi open the crate?"), "Yes. ✅");
});

test("a word of one reading is untouched by any of it", async () => {
  await forget();
  await brain("a wren is a bird");
  assertEquals(await says("is a wren an animal?"), "Yes. ✅ a wren is an animal.");
});

test("a word that names two things is both, where nothing says which", async () => {
  // Not a conflict: the brain holds both and says both. Where the signal or
  // the conversation settles it, only the one it settled on answers.
  await forget();
  assertEquals(await says("what is a cricket?"), "sport, insect");
  await forget();
  await brain("a cricket is a sport");
  assertEquals(await says("what is a cricket?"), "sport");
  await forget();
  await brain("a cricket is an insect");
  assertEquals(await says("what is a cricket?"), "insect");
});

test("a word of one reading answers with the one thing it is", async () => {
  await forget();
  assertEquals(await says("what is a wren?"), "bird");
});
