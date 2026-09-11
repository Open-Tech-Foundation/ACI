import { test, assertEquals, assert } from "runtime:test";
import { openBrain } from "./index.js";

const { brain, forget, serialize } = openBrain("sqlite::memory:");

async function fresh(...said) {
  await forget();
  let last;
  for (const s of said) last = await brain(s);
  return last;
}

test("a doing keeps what was said of it", async () => {
  // A relation phrase after a doing used to stand in place of the doing: `a
  // tree fell on the road` wrote down a tree on a road and no falling at all.
  await fresh("a plank fell on the floor");
  const graph = serialize();
  assert(/action\(n\d, type: fall/.test(graph), `a falling happened:\n${graph}`);
  assert(/placement\(n\d, n\d\)/.test(graph), `and it left a placement:\n${graph}`);
  await forget();
});

test("the doing holds the fact said of it", async () => {
  await fresh("a plank fell on a floor");
  const graph = serialize();
  const [, fact] = /(f\d)\s+placement/.exec(graph) || [];
  assert(fact != null, `there is a placement:\n${graph}`);
  assert(
    new RegExp(`action\\(n\\d, type: [^)]*\\).*holds ${fact}`).test(graph),
    `and the doing holds it:\n${graph}`,
  );
  await forget();
});

test("where a doing stood is where the doer stood", async () => {
  assertEquals(
    (await fresh("hema lives in a village", "where is hema?")).expression.state.says,
    "in a village",
  );
  await forget();
});

test("a time phrase says when, never where", async () => {
  await fresh("a drum fell in the evening");
  const graph = serialize();
  assert(/at evening/.test(graph), `the falling was in the evening:\n${graph}`);
  assert(!/placement/.test(graph), `and nothing was placed in one:\n${graph}`);
  await forget();
});

test("a doing that brings a placement about keeps its far end", async () => {
  // `put` ends with the thing somewhere. That placement is what was said, not
  // a word about where the putting happened.
  assertEquals(
    (await fresh("hema put a mug on a ledge", "where is the mug?")).expression.state.says,
    "on ledge",
  );
  await forget();
});

test("a relation between two doings is still the signal itself", async () => {
  assertEquals(
    (await fresh("asha arrived before deepak", "who arrived first?")).expression.state.says,
    "asha",
  );
  await forget();
});
