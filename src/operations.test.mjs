import { test, assert } from "runtime:test";
import { openBrain } from "./index.js";

const { brain, forget, serialize } = openBrain("sqlite::memory:");

async function fresh(...said) {
  await forget();
  let last;
  for (const s of said) last = await brain(s);
  return last;
}

test("each of the operations words records its doing", async () => {
  await forget();
  await brain("the update crashed");
  await brain("the server restarted");
  await brain("the backup finished");
  const graph = serialize();
  assert(/event\(target: crash\[3041\], type: update\[3044\]\)/.test(graph), `a crash happened:\n${graph}`);
  assert(/event\(n\d, type: restart\[3042\]\)/.test(graph), `a restart happened:\n${graph}`);
  assert(/event\(target: finish\[3040\], type: backup\[3043\]\)/.test(graph), `a finishing happened:\n${graph}`);
  await forget();
});

test("an ordering over operations stands once on the chrono", async () => {
  await fresh("the server started before the backup");
  const graph = serialize();
  assert(!/order\(/.test(graph), `the ordering is a timeline, not order rows:\n${graph}`);
  assert(/event\(n\d, type: starting\[2670\]\)/.test(graph), `the server's starting is on the record:\n${graph}`);
  assert(
    /m\d\s+members: \[server\[2585\]\]\s+before: null/.test(graph) &&
      /m\d\s+members: \[backup\[3043\]\]\s+before: m\d/.test(graph),
    `server stands before backup on the single chain:\n${graph}`,
  );
  await forget();
});

test("re-offering the ordering the other way round is refused", async () => {
  await fresh("the server started before the backup");
  const result = await brain("the backup was before the server");
  assert(result.expression.name === "conflict", `the reversed claim conflicts, not stands`);
  const graph = serialize();
  const order = graph
    .split("\n")
    .filter((line) => /^\s*m\d\s+members:/.test(line))
    .map((line) => line.slice(line.indexOf("[") + 1, line.lastIndexOf("]")));
  assert(order.join(" > ") === "server[2585] > backup[3043]", `the timeline is untouched:\n${graph}`);
  await forget();
});

test("a doing may carry a clock measure on its at", async () => {
  // `at ten hours and fifteen minutes` is spoken as a measure on the doing —
  // the event's `at` row carries the count, ready for the calendar to read as
  // seconds of the day. That reading is the next construction; this test pins
  // the surface it builds on.
  await fresh("the backup started at ten hours and fifteen minutes");
  const graph = serialize();
  assert(
    /event\([^\n]*\)\s+at 10 hour\[220\]/.test(graph),
    `ten hours stood as the at:\n${graph}`,
  );
  assert(
    !/at 10 hour\[220\].*15 minute/.test(graph),
    `the quarter-hour does not yet join the at — that join is the clock reading`,
  );
  await forget();
});