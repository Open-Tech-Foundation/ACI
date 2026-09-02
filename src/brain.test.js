import { test, assertEquals } from "runtime:test";
import { createBrain } from "./brain.js";

const IS = 0;
const to = (id) => [{ rel: IS, to: id }];
const world = [
  { id: IS, name: "is", links: [] },
  { id: 1, name: "existence", links: [] },
  { id: 2, name: "form", links: to(1) },
  { id: 3, name: "char", links: to(2) },
  { id: 4, name: "h", links: to(3) },
  { id: 5, name: "loop", links: to(5) },
  { id: 6, name: "g", links: to(99) },
];

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
