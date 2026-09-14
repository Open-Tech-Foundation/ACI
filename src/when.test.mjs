import { test, assert } from "runtime:test";
import { openBrain } from "./index.js";

const { brain, forget } = openBrain("sqlite::memory:");

async function fresh(...said) {
  await forget();
  let last;
  for (const s of said) last = await brain(s);
  return last;
}

test("asked when a doing was, the time it was told at answers", async () => {
  await fresh(
    "the backup started",
    "the backup started in the morning",
    "the backup started at ten hours and fifteen minutes",
  );
  const when = await brain("when did the backup start?");
  assert(when.expression.name === "answer", `a when-question answers:\n${JSON.stringify(when.expression)}`);
  assert(
    when.expression.state.says === "morning",
    `the morning the backup started in answers:\n${JSON.stringify(when.expression)}`,
  );
});

test("asked when what never had a time, the brain says it does not know", async () => {
  await fresh(
    "the backup started",
    "the backup started in the morning",
    "the backup started at ten hours and fifteen minutes",
  );
  const when = await brain("when did the server start?");
  assert(when.expression.name === "unsure", `no record for that doing:\n${JSON.stringify(when.expression)}`);
});

test("asked when a doing's clock read, it answers the reading of the day", async () => {
  await fresh("the backup started at ten hours and fifteen minutes");
  const when = await brain("when did the backup start?");
  assert(when.expression.name === "answer", `a clock reading answers:\n${JSON.stringify(when.expression)}`);
  assert(
    when.expression.state.says === "ten fifteen",
    `the day-clock reading answers:\n${JSON.stringify(when.expression)}`,
  );
});

test("a clock reading answers only the doing it was read of", async () => {
  await fresh(
    "the server started at five hours and forty minutes",
    "the update started at ten hours and fifteen minutes",
  );
  const update = await brain("when did the update start?");
  assert(
    update.expression.state.says === "ten fifteen",
    `the update's own reading answers:\n${JSON.stringify(update.expression)}`,
  );
  const server = await brain("when did the server start?");
  assert(
    server.expression.state.says === "five forty",
    `the server's own reading answers:\n${JSON.stringify(server.expression)}`,
  );
});