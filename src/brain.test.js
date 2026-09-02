import { test, assertEquals } from "runtime:test";
import { createBrain } from "./brain.js";

const world = {
  is: { h: "char", char: "form", form: "existence", existence: null, loop: "loop", g: "gap" },
};

const brain = createBrain(world);
const of = (word, name) => brain(word).chains.find((one) => one.of === name);

test("asks what is this until nothing answers", () => {
  assertEquals(of("h", "h").chain, ["h", "char", "form", "existence"]);
  assertEquals(of("h", "h").ends, "bottom");
});

test("a word is asked about, and so is every char in it", () => {
  assertEquals(brain("hh").chains.map((one) => one.of), ["hh", "h", "h"]);
});

test("a word it was never taught stops at once", () => {
  assertEquals(of("z", "z"), { of: "z", chain: [], ends: "unknown" });
});

test("a chain that runs out mid-way says so", () => {
  assertEquals(of("hz", "hz").ends, "unknown");
  assertEquals(of("hz", "h").ends, "bottom");
});

test("a chain that explains itself stops instead of spinning", () => {
  assertEquals(of("loop", "loop"), { of: "loop", chain: ["loop"], ends: "circular" });
});

test("a chain whose answer was never explained says how far it got", () => {
  assertEquals(of("g", "g"), { of: "g", chain: ["g"], ends: "untaught" });
});

test("a single char has no parts", () => {
  assertEquals(brain("h").chains.length, 1);
});
