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

test("how long a thing ran answers, told for so many minutes", async () => {
  await fresh("the backup ran for 35 minutes");
  const long = await brain("how long is the backup?");
  assert(long.expression.name === "answer", `a duration answer:\n${JSON.stringify(long.expression)}`);
  assert(
    long.expression.state.says === "thirty-five minutes",
    `the minutes it was held for answer:\n${JSON.stringify(long.expression)}`,
  );
});

test("told for so many minutes, the doing itself answers how long", async () => {
  await fresh("the backup ran for 35 minutes");
  const long = await brain("the backup is how long?");
  assert(
    long.expression.state.says === "thirty-five minutes",
    `the held-for amount answers the other way round too:\n${JSON.stringify(long.expression)}`,
  );
  await forget();
  const none = await brain("how long is the backup?");
  assert(none.expression.name !== "answer", `nothing told, no duration answers:\n${JSON.stringify(none.expression)}`);
});

test("a compound minute joins a clock reading, said as words or figures", async () => {
  await fresh("the update started at ten hours and twenty-five minutes");
  const word = await brain("when did the update start?");
  assert(
    word.expression.state.says === "ten twenty-five",
    `a compound minute answers in words:\n${JSON.stringify(word.expression)}`,
  );
  await forget();
  await fresh("the update started at ten hours and 25 minutes");
  const figures = await brain("when did the update start?");
  assert(
    figures.expression.state.says === "ten twenty-five",
    `the same reading said in figures answers alike:\n${JSON.stringify(figures.expression)}`,
  );
});

test("asked when a doing finished, its start and what it ran answer", async () => {
  await fresh(
    "the server started at nine hours and fifteen minutes",
    "the backup started at nine hours and forty minutes",
    "the backup ran for 35 minutes",
  );
  const finish = await brain("when did the backup finish?");
  assert(finish.expression.name === "answer", `a finish answers:\n${JSON.stringify(finish.expression)}`);
  assert(
    finish.expression.state.says === "ten fifteen",
    `beginning plus what it went on answers:\n${JSON.stringify(finish.expression)}`,
  );
  const start = await brain("when did the backup start?");
  assert(
    start.expression.state.says === "nine forty",
    `asked for the start, the start still answers:\n${JSON.stringify(start.expression)}`,
  );
});

test("an hour-long run carries the finish over the hour", async () => {
  await fresh("the backup started at nine hours and forty minutes", "the backup ran for 90 minutes");
  const finish = await brain("when did the backup finish?");
  assert(
    finish.expression.state.says === "eleven ten",
    `the finish crosses into the next hour:\n${JSON.stringify(finish.expression)}`,
  );
});

test("a doing nothing ever ran answers no finish", async () => {
  await fresh("the server started at nine hours and fifteen minutes", "the backup started at nine hours and forty minutes");
  const finish = await brain("when did the update finish?");
  assert(finish.expression.name !== "answer", `no doing on the record, no finish answers:\n${JSON.stringify(finish.expression)}`);
});

test("how many minutes stood between two clocked doings answers the gap", async () => {
  await fresh(
    "the crash happened at eleven hours and five minutes",
    "the server started at nine hours and fifteen minutes",
  );
  const after = await brain("how many minutes after the server started did the crash happen?");
  assert(after.expression.name === "answer", `a span answers:\n${JSON.stringify(after.expression)}`);
  assert(
    after.expression.state.says === "110 minutes",
    `the minutes between the two doings answer:\n${JSON.stringify(after.expression)}`,
  );
  const before = await brain("how many minutes before the crash did the server start?");
  assert(
    before.expression.state.says === "110 minutes",
    `the same gap asked the other way round answers alike:\n${JSON.stringify(before.expression)}`,
  );
});

test("asked how far in minutes from a doing's end, the gap answers from its finish", async () => {
  await fresh(
    "the crash happened at eleven hours and five minutes",
    "the update started at ten hours and fifteen minutes",
    "the update ran for thirty-five minutes",
  );
  const before = await brain("how many minutes before the crash did the update finish?");
  assert(before.expression.name === "answer", `a span to an end answers:\n${JSON.stringify(before.expression)}`);
  assert(
    before.expression.state.says === "fifteen minutes",
    `the end, not the start, is the other end of the gap:\n${JSON.stringify(before.expression)}`,
  );
  const after = await brain("how many minutes after the update finished did the crash happen?");
  assert(
    after.expression.state.says === "fifteen minutes",
    `asked from the end the same gap answers alike:\n${JSON.stringify(after.expression)}`,
  );
});

test("told when one doing was by offsetting from another, the doing answers the derived clock", async () => {
  await fresh(
    "the server started at nine hours and fifteen minutes",
    "the crash happened two hours after the server started",
  );
  const when = await brain("when did the crash happen?");
  assert(
    when.expression.name === "answer",
    `a clock reading answers:\n${JSON.stringify(when.expression)}`,
  );
  assert(
    when.expression.state.says === "eleven fifteen",
    `the clock derived from the offset answers:\n${JSON.stringify(when.expression)}`,
  );
  const how = await brain("how many hours after the server started did the crash happen?");
  assert(
    how.expression.name === "answer",
    `a span answers:\n${JSON.stringify(how.expression)}`,
  );
  assert(
    how.expression.state.says === "two hours",
    `the named offset answers:\n${JSON.stringify(how.expression)}`,
  );
});

test("told when one doing was by offsetting from another, the doing does not answer without a prior clock", async () => {
  await fresh("the crash happened two hours after the server started");
  const when = await brain("when did the crash happen?");
  assert(
    when.expression.name === "unsure",
    `no clock to read answers not knowing:\n${JSON.stringify(when.expression)}`,
  );
});

test("did the crash happen more than N after the server started — asks the band", async () => {
  await fresh(
    "the server started at nine hours and fifteen minutes",
    "the crash happened at eleven hours and five minutes",
  );
  const yes = await brain("did the crash happen more than 100 minutes after the server started?");
  assert(
    yes.expression.name === "affirm",
    `a gap beyond the band affirms:\n${JSON.stringify(yes.expression)}`,
  );
  assert(
    yes.expression.state.says === "Yes. ✅",
    `a gap beyond the band says yes:\n${JSON.stringify(yes.expression)}`,
  );
  const no = await brain("did the crash happen more than two hours after the server started?");
  assert(
    no.expression.name === "deny",
    `a gap within the band denies:\n${JSON.stringify(no.expression)}`,
  );
  assert(
    no.expression.state.says === "No. ❌",
    `a gap within the band says no:\n${JSON.stringify(no.expression)}`,
  );
});

test("did the crash happen less than N after the server started — asks the band", async () => {
  await fresh(
    "the server started at nine hours and fifteen minutes",
    "the crash happened at eleven hours and five minutes",
  );
  const yes = await brain("did the crash happen less than two hours after the server started?");
  assert(
    yes.expression.name === "affirm",
    `a gap below the band affirms:\n${JSON.stringify(yes.expression)}`,
  );
  assert(
    yes.expression.state.says === "Yes. ✅",
    `a gap below the band says yes:\n${JSON.stringify(yes.expression)}`,
  );
  const no = await brain("did the crash happen less than 100 minutes after the server started?");
  assert(
    no.expression.name === "deny",
    `a gap at the band denies:\n${JSON.stringify(no.expression)}`,
  );
  assert(
    no.expression.state.says === "No. ❌",
    `a gap at the band says no:\n${JSON.stringify(no.expression)}`,
  );
});