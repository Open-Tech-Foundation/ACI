import { test, assert, assertEquals } from "runtime:test";
import { openStore, isEmpty, seed, readWorld, write, forgetLearned } from "./store.js";

const IS = 9;
const world = {
  anchors: { thing: 1 },
  relations: { is: IS },
  terms: [
    { id: 1, name: "thing", links: [], disjoint: true },
    { id: 2, name: "relation", links: [] },
    { id: IS, name: "is", links: [{ rel: IS, to: 2 }] },
    { id: 20, name: "cart", links: [{ rel: IS, to: 1 }] },
    { id: 21, name: "load", links: [{ rel: IS, to: 1 }, { rel: IS, to: 20, quantity: 3, at: 0 }] },
    { id: 22, name: "four", links: [], value: 4 },
  ],
};

const fresh = async () => {
  const db = await openStore("sqlite::memory:");
  await seed(db, world);
  return db;
};

test("a world put in comes back exactly as it went", async () => {
  const db = await fresh();
  const back = await readWorld(db);
  assertEquals(back.anchors, world.anchors);
  assertEquals(back.relations, world.relations);
  assertEquals(back.terms.length, world.terms.length);
  assertEquals(back.terms.find((t) => t.id === 22).value, 4);
  assert(back.terms.find((t) => t.id === 1).disjoint);
  assertEquals(back.terms.find((t) => t.id === 21).links, world.terms[4].links);
});

test("an empty store says so, and a seeded one does not", async () => {
  const db = await openStore("sqlite::memory:");
  assertEquals(await isEmpty(db), true);
  await seed(db, world);
  assertEquals(await isEmpty(db), false);
});

test("one name may be claimed once, and the store enforces it", async () => {
  const db = await fresh();
  let thrown = null;
  try {
    await write(db, { terms: [{ id: 99, name: "cart", links: [] }] });
  } catch (e) {
    thrown = e;
  }
  assert(thrown !== null, "a second cart was accepted");
});

test("a link may not point at a term that is not there", async () => {
  const db = await fresh();
  let thrown = null;
  try {
    await write(db, { terms: [{ id: 98, name: "van", links: [{ rel: IS, to: 777 }] }] });
  } catch (e) {
    thrown = e;
  }
  assert(thrown !== null, "a dangling link was accepted");
});

test("what was learned can be dropped, and what was seeded stays", async () => {
  const db = await fresh();
  await write(db, {
    terms: [{ id: 30, name: "cart#30", individual: true, links: [{ rel: IS, to: 20 }] }],
  });
  assertEquals((await readWorld(db)).terms.length, world.terms.length + 1);
  await forgetLearned(db);
  const back = await readWorld(db);
  assertEquals(back.terms.length, world.terms.length);
  assert(back.terms.some((t) => t.name === "cart"), "the world it was born with is untouched");
});

test("writing the same fact twice writes it once", async () => {
  const db = await fresh();
  const fact = { terms: [{ id: 31, name: "cart#31", links: [{ rel: IS, to: 20 }] }] };
  await write(db, fact);
  await write(db, fact);
  const links = (await readWorld(db)).terms.find((t) => t.id === 31).links;
  assertEquals(links.length, 1);
});

test("a world that has grown since reaches a store written before it", async () => {
  const db = await fresh();
  await write(db, { terms: [{ id: 30, name: "sack", links: [{ rel: IS, to: 20 }] }] });

  // The same store, opened over a world with a term added, one renamed, and a
  // link gone from it.
  const grown = {
    ...world,
    anchors: { ...world.anchors, load: 21 },
    terms: [
      ...world.terms.slice(0, 4),
      { id: 21, name: "burden", links: [{ rel: IS, to: 1 }] },
      world.terms[5],
      { id: 23, name: "axle", links: [{ rel: IS, to: 20 }] },
    ],
  };
  await seed(db, grown);
  const back = await readWorld(db);

  assertEquals(back.anchors.load, 21, "an anchor it did not have");
  assert(back.terms.some((t) => t.id === 23), "a term it did not have");
  assertEquals(back.terms.find((t) => t.id === 21).name, "burden", "one it knew by another name");
  assertEquals(back.terms.find((t) => t.id === 21).links.length, 1, "and a link no longer written");
  assert(back.terms.some((t) => t.id === 30), "what was learned is left where it is");
  assertEquals(back.terms.find((t) => t.id === 30).links.length, 1, "links and all");
});
