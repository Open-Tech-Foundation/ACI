import { test, assert, assertEquals } from "runtime:test";
import { openStore, isEmpty, seed, readWorld, write, forgetLearned } from "./store.js";

const IS = 9;
const world = {
  anchors: { thing: 1 },
  relations: { is: IS },
  terms: [
    { id: 1, name: "thing", links: [], disjoint: true, asymmetric: true, irreflexive: true },
    { id: 2, name: "relation", links: [], symmetric: true, reflexive: true, functional: true },
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
  assert(back.terms.find((t) => t.id === 1).asymmetric);
  assert(back.terms.find((t) => t.id === 2).symmetric);
  assert(back.terms.find((t) => t.id === 2).reflexive);
  assert(back.terms.find((t) => t.id === 1).irreflexive);
  assert(back.terms.find((t) => t.id === 2).functional);
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

test("a rejected write leaves no partial term behind", async () => {
  const db = await fresh();
  try {
    await write(db, { terms: [{ id: 98, name: "van", links: [{ rel: IS, to: 777 }] }] });
  } catch {
    // expected
  }
  assertEquals((await readWorld(db)).terms.some((term) => term.id === 98), false);
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

test("a world with nothing in it seeds without complaint", async () => {
  // Every kind of row is written in one statement handed all of them, and a
  // world may have none of a kind — no links, no anchors, nothing at all.
  const db = await openStore("sqlite::memory:");
  await seed(db, { anchors: {}, relations: {}, terms: [] });
  assert(await isEmpty(db));
  await seed(db, { terms: [{ id: 1, name: "thing", links: [] }] });
  assertEquals((await readWorld(db)).terms.length, 1, "a world of one term and no links");
});

test("a growing world lands on its own ids, and memory steps aside to let it", async () => {
  const db = await fresh();
  // Memory is numbered from the top of the authored world, and refers to
  // itself: the load was learned to sit on the cart that was learned first.
  await write(db, {
    terms: [
      { id: 23, name: "tilly", individual: true, links: [{ rel: IS, to: 20 }] },
      { id: 24, name: "her load", individual: true, links: [{ rel: IS, to: 23, quantity: 5, at: 2 }] },
    ],
  });

  // The authored world grows into both of those ids.
  const grown = {
    ...world,
    terms: [
      ...world.terms,
      { id: 23, name: "wagon", links: [{ rel: IS, to: 1 }] },
      { id: 24, name: "barrow", links: [{ rel: IS, to: 1 }] },
    ],
  };
  await seed(db, grown);

  const back = await readWorld(db);
  const named = (name) => back.terms.find((t) => t.name === name);
  assertEquals(named("wagon").id, 23, "the authored term lands at the id it was written with");
  assertEquals(named("barrow").id, 24);
  assertEquals(back.terms.length, grown.terms.length + 2, "and nothing learned was dropped");

  const tilly = named("tilly");
  const load = named("her load");
  assert(tilly.id > 24 && load.id > tilly.id, "memory took free ids above both worlds");
  assert(tilly.individual, "and kept everything else it was");
  assertEquals(tilly.links, [{ rel: IS, to: 20 }], "a learned link to an authored term is untouched");
  assertEquals(
    load.links,
    [{ rel: IS, to: tilly.id, quantity: 5, at: 2 }],
    "and one naming a term that moved moved with it",
  );

  // Opening the same store on the same world again changes nothing.
  await seed(db, grown);
  const again = await readWorld(db);
  assertEquals(again.terms.length, back.terms.length);
  assertEquals(again.terms.find((t) => t.name === "tilly").id, tilly.id);
});

test("memory that stands nowhere the world is going is left where it is", async () => {
  const db = await fresh();
  await write(db, { terms: [{ id: 23, name: "tilly", individual: true, links: [{ rel: IS, to: 20 }] }] });
  await seed(db, { ...world, terms: [...world.terms, { id: 30, name: "wagon", links: [] }] });
  const back = await readWorld(db);
  assertEquals(back.terms.find((t) => t.name === "tilly").id, 23, "no authored term wanted 23");
});

test("a name the world brings back goes to the world, and memory keeps the thing", async () => {
  const db = await fresh();
  await write(db, {
    terms: [
      { id: 23, name: "tilly", individual: true, links: [{ rel: IS, to: 20 }] },
      { id: 24, name: "her load", individual: true, links: [{ rel: IS, to: 23, quantity: 5, at: 2 }] },
    ],
  });

  // The authored world brings its own "tilly", at an id nothing has taken.
  const grown = { ...world, terms: [...world.terms, { id: 40, name: "tilly", links: [{ rel: IS, to: 1 }] }] };
  await seed(db, grown);

  const back = await readWorld(db);
  const named = (name) => back.terms.find((t) => t.name === name);
  assertEquals(named("tilly").id, 40, "the bare word goes to the authored term");

  const kept = back.terms.find((t) => t.name === "tilly#23");
  assert(kept, "and memory keeps the thing under the name it makes individuals by");
  assertEquals(kept.id, 23, "which it did not have to move to do");
  assert(kept.individual);
  assertEquals(kept.links, [{ rel: IS, to: 20 }]);
  assertEquals(
    named("her load").links,
    [{ rel: IS, to: 23, quantity: 5, at: 2 }],
    "what was said of it is still said of it",
  );
  assertEquals(back.terms.length, grown.terms.length + 2, "nothing was dropped either way");

  // The renamed term no longer clashes, so opening again changes nothing.
  await seed(db, grown);
  const again = await readWorld(db);
  assertEquals(again.terms.length, back.terms.length);
  assert(again.terms.find((t) => t.name === "tilly#23"));
});

test("a term whose id and name are both claimed yields both at once", async () => {
  const db = await fresh();
  await write(db, { terms: [{ id: 23, name: "tilly", individual: true, links: [{ rel: IS, to: 20 }] }] });
  const grown = {
    ...world,
    terms: [...world.terms, { id: 23, name: "wagon", links: [] }, { id: 24, name: "tilly", links: [] }],
  };
  await seed(db, grown);

  const back = await readWorld(db);
  assertEquals(back.terms.find((t) => t.name === "wagon").id, 23);
  assertEquals(back.terms.find((t) => t.name === "tilly").id, 24);
  const kept = back.terms.find((t) => t.name.startsWith("tilly#"));
  assert(kept.id > 24, "memory moved up");
  assertEquals(kept.name, `tilly#${kept.id}`, "and is named by where it moved to");
  assertEquals(kept.links, [{ rel: IS, to: 20 }]);
});
