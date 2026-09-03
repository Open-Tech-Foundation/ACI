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
