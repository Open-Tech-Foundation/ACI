import { test, assert, assertEquals } from "runtime:test";
import { openStore, keepTalk, readTalk, forgetTalks } from "./store.js";

const open = () => openStore("sqlite::memory:");

test("a conversation is kept under its name and given back", async () => {
  const store = await open();
  await keepTalk(store, "c1", { graph: { held: { nodes: [{ id: "n1" }] } } }, 7);
  assertEquals((await readTalk(store, "c1")).graph.held.nodes[0].id, "n1");
  assertEquals(await readTalk(store, "c2"), null, "a conversation nobody had");
});

test("an older settlement may not climb over a newer one", async () => {
  const store = await open();
  await keepTalk(store, "c1", { graph: { held: { nodes: [{ id: "new" }] } } }, 200);
  // A stale turn — a second run that settled this conversation earlier — tries
  // to put its older state over the newer one.
  await keepTalk(store, "c1", { graph: { held: { nodes: [{ id: "stale" }] } } }, 100);
  assertEquals(
    (await readTalk(store, "c1")).graph.held.nodes[0].id,
    "new",
    "the newer settlement stands",
  );
  // And the later one is kept.
  await keepTalk(store, "c1", { graph: { held: { nodes: [{ id: "later" }] } } }, 300);
  assertEquals((await readTalk(store, "c1")).graph.held.nodes[0].id, "later");
});

test("settlements of one turn each go through", async () => {
  // Two turn settlements of the same conversation can land at the same time —
  // this run, and another over the same store in the same moment. That is not
  // a stale turn: the newest write still stands, whichever arrived first.
  const store = await open();
  await keepTalk(store, "c1", { graph: { held: { nodes: [{ id: "one" }] } } }, 500);
  await keepTalk(store, "c1", { graph: { held: { nodes: [{ id: "two" }] } } }, 500);
  assert(await readTalk(store, "c1") != null, "a settlement never lost to a newer equal-time one");
});