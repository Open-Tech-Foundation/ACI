import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

const { brain } = openBrain("sqlite::memory:");
const says = async (q) => (await brain(q)).expression.state.says;
const act = async (q) => (await brain(q)).expression.name;

test("two numbers and an operation", async () => {
  assertEquals(await says("1 + 1"), "2");
  assertEquals(await says("9 + 4"), "13");
  assertEquals(await says("20 - 5"), "15");
  assertEquals(await says("0 + 1"), "1");
  assertEquals(await says("1 - 1"), "0");
  assertEquals(await says("50 + 50"), "100");
});

test("a symbol that stands alone is a word wherever it falls", async () => {
  assertEquals(await says("1+1"), "2");
  assertEquals(await says("9+4"), "13");
  assertEquals(await says("100-1"), "99");
  assertEquals(await act("cat"), "recognise", "and a word does not come apart");
});

test("a signal may work more than once, and works from the left", async () => {
  assertEquals(await says("1+1+5"), "7");
  assertEquals(await says("1 + 1 + 5"), "7");
  assertEquals(await says("2+3+4+5"), "14");
  assertEquals(await says("10-3-2"), "5");
  assertEquals(await says("1+2-1"), "2");
  assertEquals(await says("10+10+1"), "21");
});

test("what is said back is said the way it was said", async () => {
  assertEquals(await says("1 + 1"), "2");
  assertEquals(await says("one plus one"), "two");
  assertEquals(await says("nine plus four"), "thirteen");
  assertEquals(await says("one plus one plus five"), "seven");
});

test("a number the world never named is still written out", async () => {
  assertEquals(await says("20 + 1"), "21");
  assertEquals(await says("twenty plus three?"), "23");
  assertEquals(await says("100 - 1"), "99");
});

test("below nothing is a number too", async () => {
  assertEquals(await says("1 - 5"), "-4");
  assertEquals(await says("seven minus nine?"), "-2");
});

test("a figure is another way to write a number, never what it is called", async () => {
  assertEquals(await says("what is 1"), "number");
  assertEquals(await says("what is five"), "number");
});

test("what a whole sentence comes to can be asked", async () => {
  assertEquals(await says("what is 1 + 5"), "6");
  assertEquals(await says("what is 1+1+5"), "7");
  assertEquals(await says("what is one plus five"), "six");
});

test("a mark is what no word of the language is made of", async () => {
  assertEquals(await says("2 + 2 ?"), "4", "the sign is a word, the mark is not");
  assertEquals(await act("?"), "unknown");
});

test("comparison is by value, and says no claim back about numbers", async () => {
  assertEquals(await act("3 more 1?"), "affirm");
  assertEquals(await says("3 more 1?"), "Yes. ✅");
  assertEquals(await act("1 more 3?"), "deny");
  assertEquals(await act("one less three?"), "affirm");
});
