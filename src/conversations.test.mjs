import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";
import { conversation } from "./graph.js";
import { openStore, keepTalk, readTalk, forgetTalks } from "./store.js";

// A conversation is many signals over one graph. The graph is the whole of
// what they came to, so it belongs to the conversation and is kept under its
// name — which is what lets one be picked up again.
const { brain, forget, held } = openBrain("sqlite::memory:");

test("a conversation has a graph, and it is not another conversation's", async () => {
  await forget();
  await brain("tom has 5 books", { conversation: "one" });
  await brain("mary has 2 pens", { conversation: "two" });

  assert(held("one").serialize().includes("book"), held("one").serialize());
  assert(!held("one").serialize().includes("pen"), "one was never told about pens");
  assert(!held("two").serialize().includes("book"), "two was never told about books");
  await forget();
});

test("a signal naming no conversation fills the unnamed thread's graph alone", async () => {
  await forget();
  await brain("tom has 5 books", { conversation: "one" });
  await brain("mary has 2 pens");
  assert(!held("one").serialize().includes("pen"), "the unnamed thread is a conversation too");
  await forget();
});

test("a conversation is picked up where it was left", async () => {
  const url = "sqlite:../data/resumed-conversation.db";
  const first = openBrain(url);
  await first.forget();
  await first.brain("tom has 5 books", { conversation: "c1" });
  await first.brain("tom gives 2 books to jerry", { conversation: "c1" });
  const before = first.held("c1").dump();

  // A second brain over the same store, which heard none of it.
  const again = openBrain(url);
  await again.brain("hello", { conversation: "c1" });
  const after = again.held("c1").dump();

  assertEquals(
    after.held.nodes.map((one) => one.said).slice(0, before.held.nodes.length),
    before.held.nodes.map((one) => one.said),
    "everything the conversation brought in is still there",
  );
  for (const kind of ["facts", "actions"]) {
    assertEquals(
      after.held[kind].slice(0, before.held[kind].length),
      before.held[kind],
      `what was so, and what happened, are still in the order they were said (${kind})`,
    );
  }
  await again.forget();
});

test("a conversation nobody named is not kept, having no name to be asked for", async () => {
  const url = "sqlite:../data/unnamed-conversation.db";
  const one = openBrain(url);
  await one.forget();
  await one.brain("tom has 5 books");
  const store = await openStore(url);
  assertEquals(await readTalk(store, "null"), null);
  await one.forget();
});

test("forgetting drops every conversation that was kept", async () => {
  const url = "sqlite:../data/forgotten-conversation.db";
  const one = openBrain(url);
  await one.forget();
  await one.brain("tom has 5 books", { conversation: "c1" });
  const store = await openStore(url);
  assert((await readTalk(store, "c1")) != null, "it was kept");
  await one.forget();
  assertEquals(await readTalk(store, "c1"), null, "and it is gone");
});

test("a graph says the same after it has been kept and picked up", async () => {
  await forget();
  await brain("tom has 5 books", { conversation: "fidelity" });
  await brain("tom gives 2 books to jerry", { conversation: "fidelity" });
  const out = held("fidelity").dump();

  const empty = conversation();
  empty.restore(JSON.parse(JSON.stringify(out)));
  assertEquals(empty.dump(), out, "nothing was lost on the way through the store");
  await forget();
});

test("the store keeps a conversation under its name and gives it back", async () => {
  const store = await openStore("sqlite::memory:");
  await keepTalk(store, "c1", { graph: { held: { nodes: [{ id: "n1" }] } } }, 7);
  assertEquals((await readTalk(store, "c1")).graph.held.nodes[0].id, "n1");
  assertEquals(await readTalk(store, "c2"), null, "a conversation nobody had");

  await keepTalk(store, "c1", { graph: { held: { nodes: [] } } }, 8);
  assertEquals((await readTalk(store, "c1")).graph.held.nodes.length, 0, "the later one stands");

  await forgetTalks(store);
  assertEquals(await readTalk(store, "c1"), null);
});
