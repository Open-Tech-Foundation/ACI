import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// A store of its own, that nothing else can reach.
const { brain, forget } = openBrain("sqlite::memory:");
const PERSON = 29;

// Every word English spells one way for two things: a thing it names, and a
// doing it also names. The world holds both terms; which one a signal means is
// the brain's to settle, and these are what it has to settle between.
const BOTH = [
  ["plant", "planting"], ["water", "watering"], ["light", "lighting"],
  ["iron", "ironing"], ["fish", "fishing"], ["mark", "marking"],
  ["form", "forming"], ["place", "placing"], ["hand", "handing"],
  ["train", "training"], ["ship", "shipping"], ["part", "parting"],
  ["bear", "bearing"], ["comb", "combing"], ["brush", "brushing"],
  ["milk", "milking"], ["sign", "signing"], ["name", "naming"],
  ["order", "ordering"], ["phone", "phoning"], ["pen", "penning"],
  ["picture", "picturing"], ["head", "heading"], ["saw", "see"],
];

function branch(r, kind) {
  return (r.roots[0].branch || []).find((b) => b.kind === kind) || null;
}

function waysOf(r) {
  for (const root of r.phases.think) {
    const t = (root.branch || []).find((b) => b.kind === "thought");
    if (t && t.state.ways) return t.state.ways;
  }
  return null;
}

test("a word that names two things is thought both ways", async () => {
  await forget();
  for (const [word] of BOTH) {
    const ways = waysOf(await brain(`i ${word} an apple`, { from: PERSON }));
    assert(ways != null, `${word} was thought only one way`);
    assertEquals(ways.length, 2, `${word} should be thought both ways`);
  }
  await forget();
});

test("with nothing joining the signal, the word is the doing", async () => {
  await forget();
  for (const [word, doing] of BOTH) {
    const event = branch(await brain(`i ${word} an apple`, { from: PERSON }), "event");
    assert(event != null, `nothing happened for "i ${word} an apple"`);
    assertEquals(event.name.split("#")[0], doing, `"i ${word} an apple"`);
  }
  await forget();
});

test("the doer and what it was done to are the parts of it", async () => {
  await forget();
  for (const [word] of BOTH) {
    const event = branch(await brain(`i ${word} an apple`, { from: PERSON }), "event");
    assertEquals(event.state.parts.map((p) => p.of), [PERSON, 79], `"i ${word} an apple"`);
  }
  await forget();
});

test("with something already joining the signal, the word is the thing", async () => {
  await forget();
  for (const [word] of BOTH) {
    // `is` joins them, so nothing has to be read as a doing to make the signal
    // mean something, and the word stands as it was first thought.
    const r = await brain(`a ${word} is a thing?`);
    assert(
      r.expression.name === "affirm" || r.expression.name === "unsure",
      `"a ${word} is a thing?" came to ${r.expression.name}`,
    );
    assertEquals(branch(r, "event"), null, `"a ${word} is a thing?" made something happen`);
  }
  await forget();
});

test("a doing already in the signal leaves the word as the thing", async () => {
  await forget();
  // `cut` is the doing here, so the saw is the tool it was done with.
  const cutting = branch(await brain("i cut an apple with a saw", { from: PERSON }), "event");
  assertEquals(cutting.name.split("#")[0], "cut");
  assert(cutting.state.parts.some((p) => p.of === 457), "the saw played its part as a tool");
  await forget();
});

test("the past of a doing is the doing, on the other side of now", async () => {
  await forget();
  for (const [word, doing] of [["plant", "planted"], ["water", "watered"], ["light", "lit"], ["bear", "bore"]]) {
    const event = branch(await brain(`i ${doing} an apple`, { from: PERSON }), "event");
    assert(event != null, `"i ${doing} an apple"`);
    assert(event.state.when != null, `"i ${doing} an apple" was not put in the past`);
  }
  await forget();
});

test("what the thing reading names is still what it always named", async () => {
  await forget();
  assertEquals((await brain("a plant is an organism?")).expression.name, "affirm");
  assertEquals((await brain("water is a liquid?")).expression.name, "affirm");
  assertEquals((await brain("a saw is a tool?")).expression.name, "affirm");
  await forget();
});

test("what the doing reading names is a doing", async () => {
  await forget();
  assertEquals((await brain("planting is a work?")).expression.name, "affirm");
  assertEquals((await brain("signing is a communication?")).expression.name, "affirm");
  assertEquals((await brain("picturing is a perception?")).expression.name, "affirm");
  assertEquals((await brain("heading is a motion?")).expression.name, "affirm");
  await forget();
});
