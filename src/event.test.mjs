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
  assert(/event\(n\d, type: fall/.test(graph), `a falling happened:\n${graph}`);
  assert(/placement\(n\d, n\d\)/.test(graph), `and it left a placement:\n${graph}`);
  await forget();
});

test("the doing holds the fact said of it", async () => {
  await fresh("a plank fell on a floor");
  const graph = serialize();
  const [, fact] = /(f\d)\s+placement/.exec(graph) || [];
  assert(fact != null, `there is a placement:\n${graph}`);
  assert(
    new RegExp(`event\\(n\\d, type: [^)]*\\).*holds ${fact}`).test(graph),
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

test("several who did it are several, not the last of them", async () => {
  await fresh("hema and arun spoke");
  const graph = serialize();
  assert(/event\(\[n1, n2\], type: speak/.test(graph), `both spoke:\n${graph}`);
  await forget();
});

test("where the doing stood is where each of them stood", async () => {
  await fresh("hema and arun spoke on a road");
  const graph = serialize();
  assert(/placement\(n1, n3\)/.test(graph), `hema is on the road:\n${graph}`);
  assert(/placement\(n2, n3\)/.test(graph), `and so is arun:\n${graph}`);
  assert(/holds f1, f2/.test(graph), `and the doing holds both:\n${graph}`);
  assertEquals((await brain("where is arun?")).expression.state.says, "on a road");
  await forget();
});

test("a doing holds what came of it", async () => {
  await fresh("a road became wet because a plank fell");
  const graph = serialize();
  assert(/property-change\(n1\)/.test(graph), `the road changed:\n${graph}`);
  assert(/event\(n2, type: fall\[\d+\]\)\s+holds a1/.test(graph), `and the falling holds it:\n${graph}`);
  await forget();
});

test("what a doing left behind is not said of the doer", async () => {
  // `wet` stood after `became` and was read as describing whatever the next
  // clause named, so the plank came out wet.
  await fresh("a road became wet because a plank fell");
  const graph = serialize();
  assert(/n1  road.*wetness: wet/.test(graph), `the road is wet:\n${graph}`);
  assert(!/n2  plank.*wetness/.test(graph), `and the plank is not:\n${graph}`);
  await forget();
});
