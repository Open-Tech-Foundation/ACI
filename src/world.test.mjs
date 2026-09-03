import { test, assert, assertEquals } from "runtime:test";
import { fromWorldData } from "./world.js";

const IS = 294;
const data = {
  anchors: { living: 10, person: 29 },
  relations: { is: IS },
  terms: [
    { id: 1, name: "existence", links: [] },
    { id: 2, name: "thing", links: [{ rel: IS, to: 1 }] },
    { id: 10, name: "organism", links: [{ rel: IS, to: 2 }] },
    { id: 24, name: "animal", links: [{ rel: IS, to: 10 }] },
    { id: 29, name: "person", links: [{ rel: IS, to: 24 }] },
    { id: 83, name: "cat", links: [{ rel: IS, to: 24 }] },
    { id: 90, name: "stone", links: [{ rel: IS, to: 2 }] },
  ],
};

test("isA walks the is chain transitively", () => {
  const w = fromWorldData(data);
  assert(w.isA(83, 10), "cat reaches organism through animal");
  assert(w.isA(83, 1), "and on up to existence");
});

test("isA is false for a term off the chain", () => {
  const w = fromWorldData(data);
  assertEquals(w.isA(90, 10), false);
});

test("a term is itself", () => {
  const w = fromWorldData(data);
  assert(w.isA(10, 10));
});

test("an unknown id reaches nothing", () => {
  const w = fromWorldData(data);
  assertEquals(w.isA(999, 10), false);
});

test("anchors name the brain's categories", () => {
  const w = fromWorldData(data);
  assertEquals(w.anchors.living, 10);
  assert(w.isA(29, w.anchors.living), "a person is living");
});

test("a cycle in the data terminates", () => {
  const w = fromWorldData({
    relations: { is: IS },
    terms: [
      { id: 1, name: "a", links: [{ rel: IS, to: 2 }] },
      { id: 2, name: "b", links: [{ rel: IS, to: 1 }] },
    ],
  });
  assert(w.isA(1, 2));
  assertEquals(w.isA(1, 99), false);
});

test("links that are not the is relation are not followed", () => {
  const w = fromWorldData({
    relations: { is: IS },
    terms: [
      { id: 1, name: "a", links: [{ rel: 777, to: 2 }] },
      { id: 2, name: "b", links: [] },
    ],
  });
  assertEquals(w.isA(1, 2), false);
});

test("all links of a relation are followed, not only the first", () => {
  const w = fromWorldData({
    relations: { is: IS },
    terms: [
      { id: 1, name: "a", links: [{ rel: IS, to: 2 }, { rel: IS, to: 3 }] },
      { id: 2, name: "b", links: [] },
      { id: 3, name: "c", links: [{ rel: IS, to: 4 }] },
      { id: 4, name: "d", links: [] },
    ],
  });
  assert(w.isA(1, 2), "the first link");
  assert(w.isA(1, 3), "and the second");
  assert(w.isA(1, 4), "and on through it");
});

test("two terms exclude each other when their kinds stand different", () => {
  const DIFF = 8;
  const w = fromWorldData({
    relations: { is: IS, different: DIFF },
    terms: [
      { id: 1, name: "thing", links: [] },
      { id: 2, name: "here", links: [{ rel: IS, to: 1 }, { rel: DIFF, to: 3 }] },
      { id: 3, name: "there", links: [{ rel: IS, to: 1 }] },
      { id: 4, name: "a", links: [{ rel: IS, to: 2 }] },
      { id: 5, name: "b", links: [{ rel: IS, to: 3 }] },
      { id: 6, name: "loose", links: [{ rel: IS, to: 1 }] },
    ],
  });
  assert(w.excludes(4, 5), "far apart, but their kinds are different");
  assert(w.excludes(5, 4), "and it reads either way round");
  assertEquals(w.excludes(4, 6), false, "nothing says these two exclude");
  assertEquals(w.excludes(4, 4), false);
});

test("a world that declares no different relation excludes nothing", () => {
  const w = fromWorldData({
    relations: { is: IS },
    terms: [{ id: 1, name: "a", links: [] }, { id: 2, name: "b", links: [] }],
  });
  assertEquals(w.excludes(1, 2), false);
});

test("a term says which number it names, and the number says which term", () => {
  const w = fromWorldData({
    relations: { is: IS },
    terms: [
      { id: 100, name: "zero", links: [], value: 0 },
      { id: 101, name: "one", links: [], value: 1 },
      { id: 102, name: "plain", links: [] },
    ],
  });
  assertEquals(w.valueOf(101), 1);
  assertEquals(w.valueOf(102), null, "a term that names no number");
  assertEquals(w.termFor(0), 100);
  assertEquals(w.termFor(9), null, "the world has no word for it, and says so");
});

test("the world holds no arithmetic, only which symbol is which number", () => {
  const w = fromWorldData({ relations: { is: IS }, terms: [{ id: 1, name: "a", links: [] }] });
  assertEquals(w.valueOf(1), null);
  assertEquals(w.termFor(1), null);
});

test("members are what link to a term, the other way from linked", () => {
  const w = fromWorldData({
    relations: { is: IS },
    terms: [
      { id: 1, name: "kind", links: [] },
      { id: 2, name: "a", links: [{ rel: IS, to: 1 }] },
      { id: 3, name: "b", links: [{ rel: IS, to: 1 }] },
      { id: 4, name: "far", links: [{ rel: IS, to: 2 }] },
    ],
  });
  assertEquals(w.members(1, IS), [2, 3], "direct members only");
  assertEquals(w.linked(2, IS), [1]);
});
