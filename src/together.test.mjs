import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// A store of its own, that nothing else can reach.
const { brain, forget } = openBrain("sqlite::memory:");

function all(root, k) {
  const found = [];
  const walk = (n) => {
    if (n.kind === k) found.push(n);
    (n.branch || []).forEach(walk);
  };
  walk(root);
  return found;
}

test("a claim made of several things is checked once per thing", async () => {
  const r = await brain("a cat and a dog are animals");
  const truths = all(r.roots[0], "truth");
  assertEquals(truths.length, 2);
  assertEquals(truths.map((t) => t.name), ["true", "true"]);
});

test("each member of a togetherness gets its own verdict said in full", async () => {
  const r = await brain("a cat and a stone are animals");
  assertEquals(r.expression.state.says, "I know. No. ❌");
});

test("a question asked of several things answers every one of them", async () => {
  const r = await brain("what is a cat and a dog");
  assertEquals(all(r.roots[0], "answer").length, 2);
  assertEquals(r.expression.state.says, "mammal, mammal");
});

test("a togetherness may hold more than two", async () => {
  const r = await brain("1 and 2 and 3 are what");
  assertEquals(all(r.roots[0], "answer").length, 3);
  assertEquals(r.expression.state.says, "number, number, number");
});

test("every fact a togetherness taught is handed back, not only the first", async () => {
  await forget();
  const r = await brain("a story and a question are art");
  assertEquals(r.learned.terms.map((t) => t.name), ["story", "question"]);
  assertEquals((await brain("a story is art?")).expression.name, "affirm");
  assertEquals((await brain("a question is art?")).expression.name, "affirm");
  await forget();
});

test("a togetherness learns the half it can and refuses the half it cannot", async () => {
  await forget();
  const r = await brain("a story and a cat are art");
  assertEquals(r.learned.terms.map((t) => t.name), ["story"]);
  assert(all(r.roots[0], "refuse").some((n) => n.name === "contradiction"));
  await forget();
});

test("joined clauses are judged one at a time and said back together", async () => {
  const r = await brain("a cat is an animal and a stone is an animal");
  assertEquals(all(r.roots[0], "truth").map((t) => t.name), ["true", "false"]);
  assertEquals(r.expression.state.says, "I know. No. ❌");
});

test("clauses join as many deep as they are written", async () => {
  const r = await brain("a cat is an animal and a dog is an animal and a cow is an animal");
  assertEquals(all(r.roots[0], "truth").length, 3);
});

test("every clause that taught something is handed back", async () => {
  await forget();
  const r = await brain("a story is art and a question is art");
  assertEquals(r.learned.terms.map((t) => t.name), ["story", "question"]);
  await forget();
});

test("a signal speaking of one thing carries no mark telling members apart", async () => {
  const r = await brain("a cat is an animal");
  assertEquals(all(r.roots[0], "truth")[0].state.about, undefined);
});

test("the same thing said twice is one thing, not a togetherness", async () => {
  const r = await brain("a cat and a cat are animals");
  assertEquals(r.expression.state.says, "I know.");
});

test("a denial reaches every member of a togetherness", async () => {
  const r = await brain("a cat and a dog are not animals");
  assertEquals(all(r.roots[0], "truth").map((t) => t.name), ["false", "false"]);
  assertEquals(r.expression.state.says, "No. ❌ No. ❌");
});

test("a joining word leaves a working out alone", async () => {
  assertEquals((await brain("add 1 and 2")).expression.state.says, "3");
});
