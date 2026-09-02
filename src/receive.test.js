import { assertEquals, test } from "runtime:test";

import { atomsOf, receive } from "./receive.js";

test("a channel with no detail is the whole signal", () => {
  assertEquals(atomsOf({ signal: "touch" }), ["touch"]);
});

test("the channel comes first, then the detail values", () => {
  assertEquals(atomsOf({ signal: "touch", place: "shoulder" }), ["touch", "shoulder"]);
});

test("field names are not signals — only what arrived is", () => {
  // "place" is how the integrator labelled the field. Nobody sent it.
  assertEquals(atomsOf({ signal: "touch", place: "shoulder" }).includes("place"), false);
});

test("detail is taken in sorted order of field name, not written order", () => {
  const written = { signal: "touch", place: "shoulder", force: "light" };
  const reversed = { force: "light", place: "shoulder", signal: "touch" };
  assertEquals(atomsOf(written), atomsOf(reversed));
  assertEquals(atomsOf(written), ["touch", "light", "shoulder"]);
});

test("a value of several words becomes several signals", () => {
  assertEquals(atomsOf({ signal: "text", message: "hey stop that" }), [
    "text",
    "hey",
    "stop",
    "that",
  ]);
});

test("nothing about a word is cleaned up on the way in", () => {
  // Case and punctuation are Layer 1's business, and Layer 1 does not exist.
  assertEquals(atomsOf({ signal: "text", message: "Hey!" }), ["text", "Hey!"]);
});

test("a list of values spells out in order", () => {
  assertEquals(atomsOf({ signal: "touch", place: ["left", "shoulder"] }), [
    "touch",
    "left",
    "shoulder",
  ]);
});

test("nothing sent is nothing to say", () => {
  assertEquals(atomsOf({}), []);
  assertEquals(atomsOf(null), []);
  assertEquals(receive([]), []);
});

test("empty and absent detail contributes nothing", () => {
  assertEquals(atomsOf({ signal: "touch", place: null, force: "  " }), ["touch"]);
});

test("several inputs are spelled out one after another, in the order given", () => {
  assertEquals(
    receive([{ signal: "touch" }, { signal: "text", message: "hey" }]),
    ["touch", "text", "hey"],
  );
});
