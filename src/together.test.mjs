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
  assertEquals(all(r.roots[0], "truth")[0].state.among, undefined);
});

test("a thing named twice is judged twice — the signal said it twice", async () => {
  const r = await brain("a sparrow and a sparrow are animals");
  assertEquals(all(r.roots[0], "truth").length, 2);
  assertEquals(r.expression.state.says, "I know. I know.");
});

test("the object side joins too, and the claim is checked against each", async () => {
  const r = await brain("a sparrow is a plant and a bird");
  assertEquals(all(r.roots[0], "truth").map((t) => t.name), ["false", "true"]);
  assertEquals(r.expression.state.says, "No. ❌ I know.");
});

test("joined on both sides, every pairing is a claim of its own", async () => {
  const r = await brain("a sparrow and a snake are animals and birds");
  assertEquals(all(r.roots[0], "truth").map((t) => t.name), ["true", "true", "true", "false"]);
});

test("what an object togetherness taught is one thing learned, not two", async () => {
  await forget();
  const r = await brain("a story is art and a question");
  assertEquals(r.learned.terms.length, 1);
  assertEquals(r.learned.terms[0].links.length, 2);
  assertEquals((await brain("a story is a question?")).expression.name, "affirm");
  await forget();
});

test("a thing may be given two things at once", async () => {
  await forget();
  await brain("a cupboard has three cup and two plate");
  assertEquals((await brain("the cupboard has how many cups?")).expression.state.says, "three");
  assertEquals((await brain("the cupboard has how many plates?")).expression.state.says, "two");
  await forget();
});

test("a join is read at its widest, not at the first thing that parses", async () => {
  assertEquals((await brain("1+8 and 5+9")).expression.state.says, "9, 14");
});

test("a question laid over a join reaches the join underneath it", async () => {
  const r = await brain("what is 1+8 and 5+9");
  assertEquals(all(r.roots[0], "sum").map((n) => n.state.value), [9, 14]);
  assertEquals(r.expression.state.says, "9, 14");
});

test("a denial reaches every member of a togetherness", async () => {
  const r = await brain("a cat and a dog are not animals");
  assertEquals(all(r.roots[0], "truth").map((t) => t.name), ["false", "false"]);
  assertEquals(r.expression.state.says, "No. ❌ No. ❌");
});

test("a joining word leaves a working out alone", async () => {
  assertEquals((await brain("add 1 and 2")).expression.state.says, "3");
});
