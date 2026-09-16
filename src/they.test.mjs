import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// Plural `they` reaches every topic in focus, not only the latest.
// Same signals in the same order give the same answers on every machine.

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

test("the runtime holds a focus list, latest first", async () => {
  await forget();
  const first = await brain("lara is a doctor");
  assert(Array.isArray(first.focus), "focus is a list");
  assertEquals(first.focus[0], first.spoken);
  const second = await brain("nina is a teacher");
  assertEquals(second.focus[0], second.spoken);
  assert(second.focus.includes(first.spoken), "the earlier topic stays in mind");
  await forget();
});

test("they are answered one apiece", async () => {
  await forget();
  await brain("lara is a doctor");
  await brain("lara is strong");
  await brain("nina is a teacher");
  const r = await brain("are they strong?");
  assertEquals(r.expression.name, "unsure");
  const whole = all(r.roots[0], "standing")[0];
  assertEquals(whole.branch.map((n) => n.name).sort(), ["absent", "held"]);
  await forget();
});

test("a pointer reaches somebody the conversation named and never classified", async () => {
  // Nobody said what devi or omar is. Asking a pointer to know they are things
  // before it may reach them drops exactly the names a conversation
  // introduces, and the count behind it then answers for one of the two.
  await forget();
  await brain("devi has 5 baskets");
  await brain("omar has 6 baskets");
  const r = await brain("how many baskets do they have?");
  assertEquals(r.expression.state.says, "eleven");
  await forget();
});

test("a pointer for several counts as many holders as it stands for", async () => {
  await forget();
  await brain("devi has 5 baskets");
  await brain("omar has 6 baskets");
  await brain("ilan has 2 baskets");
  assertEquals((await brain("how many baskets do they have?")).expression.state.says, "thirteen");
  await forget();
});

test("a pointer for one still stands for one", async () => {
  await forget();
  await brain("devi has 5 baskets");
  assertEquals((await brain("how many baskets does she have?")).expression.state.says, "five");
  await forget();
});
