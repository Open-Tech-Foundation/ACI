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

test("things joined offer several facts, laid against what the brain holds", async () => {
  const r = await brain("a sparrow and a snake are animals");
  const whole = all(r.roots[0], "standing")[0];
  assertEquals(whole.branch.map((n) => n.name), ["held", "held"], "each was laid against");
  assertEquals(whole.name, "held", "and the offering came to one standing");
});

test("what is offered as one thing is answered as one thing", async () => {
  const r = await brain("a sparrow and a river are animals");
  const whole = all(r.roots[0], "standing")[0];
  assertEquals(whole.branch.map((n) => n.name), ["held", "against"]);
  assertEquals(whole.name, "against", "one standing against it stands against the offering");
  assertEquals(r.expression.state.says, "No. ❌");
});

test("the offering is about all of them and about no one of them", async () => {
  const whole = all((await brain("a sparrow and a snake are animals")).roots[0], "standing")[0];
  assertEquals(whole.state.subject, null);
  assertEquals(whole.state.object, null);
});

test("a question asked of several things answers every one of them", async () => {
  const r = await brain("what is a sparrow and a snake");
  assertEquals(all(r.roots[0], "answer").length, 2);
  assertEquals(r.expression.state.says, "bird, animal");
});

test("a togetherness may hold more than two", async () => {
  const r = await brain("1 and 2 and 3 are what");
  assertEquals(all(r.roots[0], "answer").length, 3);
});

test("three asked about, three answered, one thing to say", async () => {
  assertEquals((await brain("1 and 2 and 3 are what")).expression.state.says, "number");
});

test("the same answer reached twice is said once", async () => {
  const r = await brain("1+8 and 5+4");
  assertEquals(all(r.roots[0], "sum").map((n) => n.state.value), [9, 9]);
  assertEquals(r.expression.state.says, "9", "judged twice, said once");
});

test("every fact a togetherness taught is handed back, not only the first", async () => {
  await forget();
  const r = await brain("a story and a question are art");
  assertEquals(r.learned.terms.map((t) => t.name), ["story", "question"]);
  assertEquals((await brain("a story is art?")).expression.name, "affirm");
  assertEquals((await brain("a question is art?")).expression.name, "affirm");
  await forget();
});

test("an offering it will not take, it takes no part of", async () => {
  await forget();
  const r = await brain("a story and a cat are art");
  assert(all(r.roots[0], "refuse").some((n) => n.name === "contradiction"));
  assertEquals(r.learned, null, "no part of it was offered on its own");
  assertEquals((await brain("a story is art?")).expression.name, "unsure");
  await forget();
});

test("what was offered on its own is taken on its own", async () => {
  await forget();
  await brain("a story is art");
  assertEquals((await brain("a story is art?")).expression.name, "affirm");
  await forget();
});

test("joined clauses are two offerings, not one — each answered on its own", async () => {
  const r = await brain("a sparrow is an animal and a river is an animal");
  assertEquals(all(r.roots[0], "standing").map((t) => t.name), ["held", "against"]);
  assertEquals(r.expression.state.says, "I know. No. ❌");
});

test("clauses join as many deep as they are written", async () => {
  const r = await brain("a sparrow is an animal and a snake is an animal and a cow is an animal");
  assertEquals(all(r.roots[0], "standing").length, 3);
});

test("every clause that taught something is handed back", async () => {
  await forget();
  const r = await brain("a story is art and a question is art");
  assertEquals(r.learned.terms.map((t) => t.name), ["story", "question"]);
  await forget();
});

test("one fact offered stands on its own, with nothing held underneath it", async () => {
  const r = await brain("a sparrow is an animal");
  const whole = all(r.roots[0], "standing")[0];
  assertEquals(whole.branch.length, 0);
  assertEquals(whole.state.subject != null, true, "and it says what it is about");
});

test("a thing named twice offers the fact twice, and it stands the same", async () => {
  const r = await brain("a sparrow and a sparrow are animals");
  assertEquals(all(r.roots[0], "standing")[0].branch.length, 2);
  assertEquals(r.expression.state.says, "I know.");
});

test("the object side joins too, and offers a fact for each", async () => {
  const r = await brain("a sparrow is a plant and a bird");
  const whole = all(r.roots[0], "standing")[0];
  assertEquals(whole.branch.map((n) => n.name), ["against", "held"]);
  assertEquals(r.expression.state.says, "No. ❌");
});

test("joined on both sides, as many facts are offered as the sides pair into", async () => {
  const whole = all((await brain("a sparrow and a snake are animals and birds")).roots[0], "standing")[0];
  assertEquals(whole.branch.map((n) => n.name), ["held", "held", "held", "against"]);
  assertEquals(whole.name, "against");
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

test("a denial reaches every fact the offering holds", async () => {
  const r = await brain("a sparrow and a snake are not animals");
  const whole = all(r.roots[0], "standing")[0];
  assertEquals(whole.branch.map((n) => n.name), ["against", "against"]);
  assertEquals(r.expression.state.says, "No. ❌");
});

test("a joining word leaves a working out alone", async () => {
  assertEquals((await brain("add 1 and 2")).expression.state.says, "3");
});
