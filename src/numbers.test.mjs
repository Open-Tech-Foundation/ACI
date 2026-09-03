import { test, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

const { brain } = openBrain("sqlite::memory:");
const says = async (q) => (await brain(q)).expression.state.says;

test("a signal written in figures is read like one written in words", async () => {
  assertEquals(await says("9 + 4"), "13");
  assertEquals(await says("nine plus four"), "thirteen");
  assertEquals(await says("20 - 5"), "15");
});

test("what is said back is said the way it was said", async () => {
  // The brain does not choose between the two; it uses the one it was given,
  // and the language is what holds both.
  assertEquals(await says("1 + 1"), "2");
  assertEquals(await says("one plus one"), "two");
  assertEquals(await says("what is 1"), "number", "and a term with one form has one");
});

test("a symbol that stands alone is a word wherever it falls", async () => {
  assertEquals(await says("1+1"), "2");
  assertEquals(await says("9+4"), "13");
  assertEquals((await brain("cat")).expression.name, "recognise", "and a word does not come apart");
});

test("a mark is what no word of the language is made of", async () => {
  assertEquals(await says("2 + 2 ?"), "4", "the sign is a word, the mark is not");
  assertEquals((await brain("?")).expression.name, "unknown");
});

test("what a whole sentence comes to can be asked", async () => {
  assertEquals(await says("what is 1 + 5"), "6");
  assertEquals(await says("what is one plus five"), "six");
});
