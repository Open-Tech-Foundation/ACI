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
  assertEquals(second.focus.length, 2);
  assertEquals(second.focus[0], second.spoken);
  assertEquals(second.focus[1], first.spoken);
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
