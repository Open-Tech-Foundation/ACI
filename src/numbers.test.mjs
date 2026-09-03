import { test, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

const { brain } = openBrain("sqlite::memory:");
const says = async (q) => (await brain(q)).expression.state.says;

test("a signal written in figures is read like one written in words", async () => {
  assertEquals(await says("9 + 4"), "thirteen");
  assertEquals(await says("nine plus four"), "thirteen");
  assertEquals(await says("20 - 5"), "fifteen");
});

test("a figure is another way to write a number, never what it is called", async () => {
  assertEquals(await says("what is 1"), "number");
  assertEquals(await says("1 + 5"), "six", "said in the word that names it");
});

test("a mark is what no word of the language is made of", async () => {
  assertEquals(await says("2 + 2 ?"), "four", "the sign is a word, the mark is not");
  assertEquals((await brain("?")).expression.name, "unknown");
});

test("what a whole sentence comes to can be asked", async () => {
  assertEquals(await says("what is 1 + 5"), "six");
  assertEquals(await says("what is one plus five"), "six");
});
