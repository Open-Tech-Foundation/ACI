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

test("a number is read out of its figures, whatever the world named", async () => {
  // Nothing lists `125` as a word and no term names it. It is a number all the
  // same: the language says which symbols it counts in, and reading them is
  // the brain's own.
  assertEquals(await says("1+125"), "126");
  assertEquals(await says("125+25"), "150");
  assertEquals(await says("999+1"), "1000");
  assertEquals(await says("12*12"), "144");
});

test("times and divide, and what the world says binds first", async () => {
  assertEquals(await says("2*3"), "6");
  assertEquals(await says("2 times 3"), "6", "the numbers were figures, so the answer is");
  assertEquals(await says("two times three"), "six");
  assertEquals(await says("10/2"), "5");
  assertEquals(await says("1+2*3"), "7", "times before plus, because the world says so");
  assertEquals(await says("2*3+1"), "7");
  assertEquals(await says("1+6/2"), "4");
  assertEquals(await says("2+3*4-5"), "9");
});

test("what the world says nothing about is worked from the left", async () => {
  assertEquals(await says("10-3-2"), "5");
  assertEquals(await says("1-2+3"), "2");
  assertEquals(await says("10/2/5"), "1");
  assertEquals(await says("100/10/2"), "5");
});

test("an operation with no answer at all is not a claim about the numbers", async () => {
  // Nothing is divided by nothing, and nothing has a logarithm.
  assertEquals(await act("5/0"), "unsure");
  assertEquals(await act("log 0"), "unsure");
  assertEquals(await act("root (0-9)"), "unsure");
  assertEquals(await says("0/5"), "0");
});

test("a part below one is a number too", async () => {
  assertEquals(await says("7/2"), "3.5");
  assertEquals(await says("10/4"), "2.5");
  assertEquals(await says("1.5+1.5"), "3");
  assertEquals(await says("0.1+0.2"), "0.3");
});

test("every operation the brain can perform", async () => {
  assertEquals(await says("2^10"), "1024");
  assertEquals(await says("2^3^2"), "512", "a power meets a power from the right");
  assertEquals(await says("10%3"), "1");
  assertEquals(await says("root 9"), "3");
  assertEquals(await says("root (9+7)"), "4");
  assertEquals(await says("log 100"), "2");
  assertEquals(await says("ln 1"), "0");
  assertEquals(await says("sin 0"), "0");
  assertEquals(await says("cos 0"), "1");
  assertEquals(await says("tan 0"), "0");
  assertEquals(await says("abs (0-9)"), "9");
  assertEquals(await says("abs 0-9"), "-9", "and it takes the number, not the sum");
  assertEquals(await says("1+root 9"), "4");
});

test("what cannot be written exactly is written to where the language stops", async () => {
  assertEquals(await says("log 2"), "0.3010299956");
  assertEquals(await says("root 2"), "1.4142135623");
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

test("what a group holds is worked before what is outside it", async () => {
  assertEquals(await says("(1+2)*3"), "9");
  assertEquals(await says("1+(2*3)"), "7");
  assertEquals(await says("2*(3+4)"), "14");
  assertEquals(await says("(1+2)*(3+4)"), "21");
  assertEquals(await says("((1+2))*2"), "6");
  assertEquals(await says("(2+3)"), "5", "and a group may be the whole of it");
  assertEquals(await says("(1+8)*(8)"), "72", "even where it holds one number");
  assertEquals(await says("(8)+1"), "9");
  assertEquals(await says("(8)"), "8", "a group holding a number comes to it");
  assertEquals(await says("what is (1+2)*3"), "9");
});

test("two sides asked to be the same are each worked out first", async () => {
  assertEquals(await act("2+2 = 4?"), "affirm");
  assertEquals(await act("2+2 = 5?"), "deny");
  assertEquals(await act("2*3 = 1+5?"), "affirm");
  assertEquals(await act("two plus two equals four?"), "affirm");
});

test("everything at once", async () => {
  assertEquals(await says("1+2*3-4/2"), "5");
  assertEquals(await says("(1+2*3)-(4/2)"), "5");
});

test("an operation may stand before what it takes as well as between", async () => {
  assertEquals(await says("add 1 with 8"), "9");
  assertEquals(await says("add (1+8) with 8"), "17");
  assertEquals(await says("multiply 3 with 4"), "12");
  assertEquals(await says("subtract 3 with 1"), "2");
  assertEquals(await says("add 1 to 8"), "9", "and the word between them may be any");
});
