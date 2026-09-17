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

test("what came of a doing says which doing it came of", async () => {
  await fresh("a plank fell on a floor");
  const graph = serialize();
  const [, doing] = /(a\d)\s+event\(n\d, type: fall/.exec(graph) || [];
  assert(doing != null, `there is a falling:\n${graph}`);
  assert(
    new RegExp(`placement\\(n\\d, n\\d\\)[^\\n]*reason ${doing}`).test(graph),
    `and the placement came of it:\n${graph}`,
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
  assert(/times: evening/.test(graph), `the falling was in the evening:\n${graph}`);
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

test("an ordering over a doing puts both doings on the record", async () => {
  await fresh("asha arrived before deepak");
  const graph = serialize();
  assert(/event\(n1, type: arrive/.test(graph), `asha's arrival happened:\n${graph}`);
  assert(/event\(n2, type: arrive/.test(graph), `and deepak's did too:\n${graph}`);
  // The chrono section is the single store for the ordering: the pairwise
  // `order` row is no longer written. The participants sit as node ids inside
  // the moments.
  assert(!/order\(/.test(graph), `no pairwise order row remains:\n${graph}`);
  assert(/members: \[n1\]/.test(graph), `asha is in the timeline:\n${graph}`);
  assert(/members: \[n2\]/.test(graph), `and deepak is too:\n${graph}`);
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
  assert(/f1  placement\(n1, n3\)[^\n]*reason a1/.test(graph) && /f2  placement\(n2, n3\)[^\n]*reason a1/.test(graph), `and both came of the doing:\n${graph}`);
  assertEquals((await brain("where is arun?")).expression.state.says, "on a road");
  await forget();
});

test("a doing holds what came of it", async () => {
  await fresh("a road became wet because a plank fell");
  const graph = serialize();
  // Wet is a state of the road, not a property of it, so what happened to it
  // is a state change.
  assert(/state-change\(n1\)/.test(graph), `the road changed:\n${graph}`);
  assert(/state-change\(n1\)[^\n]*reason a2/.test(graph), `and the change came of the falling:\n${graph}`);
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

test("a kind of event spoken of is an occurrence of it", async () => {
  // `a meeting` is not a thing standing in a hall. It is something that
  // happened, and where it was hangs off the happening.
  await fresh("a meeting was in a hall");
  const graph = serialize();
  assert(/a1  event\(type: meeting\[\d+\]\)/.test(graph), `the meeting happened:\n${graph}`);
  assert(/f1  placement\(a1, n1\)/.test(graph), `and it was in the hall:\n${graph}`);
  await forget();
});

test("being in something that happened is being a member of it", async () => {
  await fresh("an accident was on a road", "hema was in the accident");
  const graph = serialize();
  assert(/member\(n2, a1\)/.test(graph), `hema is in the accident:\n${graph}`);
  assert(/event\(\[n2\], type: accident/.test(graph), `and the accident holds her:\n${graph}`);
  await forget();
});

test("an event said to be at a time was then, not placed inside one", async () => {
  await fresh("a meeting was in a hall in the evening");
  const graph = serialize();
  assert(/times: evening/.test(graph), `the meeting was in the evening:\n${graph}`);
  assert(/placement\(a1, n1\)/.test(graph), `and in the hall:\n${graph}`);
  assert(!/placement\(a1, evening/.test(graph), `and not inside the evening:\n${graph}`);
  await forget();
});

test("a doing inside something that happened is held by it", async () => {
  await fresh("an accident was on a road", "a plank fell in the accident");
  const graph = serialize();
  assert(/member\(a2, a1\)/.test(graph), `the falling is in the accident:\n${graph}`);
  assert(/a2  event\(n\d, type: fall\[\d+\]\)/.test(graph), `and the falling is its own row:\n${graph}`);
  await forget();
});

test("one event, however many signals speak of it", async () => {
  await fresh(
    "a robbery was at a shop at night",
    "a shopkeeper and a robber were in the robbery",
    "the robber stole money in the robbery",
  );
  const graph = serialize();
  assert(
    (graph.match(/type: robbery/g) || []).length === 1,
    `there is one robbery:\n${graph}`,
  );
  assert(/a1  event\(\[n2, n3\], type: robbery\[\d+\]\)  \{time: done, times: night\[\d+\]\}/.test(graph), `with both in it, at night:\n${graph}`);
  assert(/placement\(a1, n1\)/.test(graph), `at the shop:\n${graph}`);
  assert(/placement\(a1, n1\)/.test(graph) && /member\(n2, a1\)/.test(graph) && /member\(n3, a1\)/.test(graph) && /member\(a2, a1\)/.test(graph), `everything in it names it:\n${graph}`);
  assert(/a2  event\(n3, target: money\[\d+\], type: steal/.test(graph), `and the stealing inside it:\n${graph}`);
  await forget();
});

test("being at a place is a placement", async () => {
  assertEquals((await fresh("nila was at a fair", "where is nila?")).expression.state.says, "at fair");
  await forget();
});

test("a time is no way for a thing to be", async () => {
  await fresh("an exam was at a school at night");
  const graph = serialize();
  assert(!/n1  school.*period/.test(graph), `the school is not night-coloured:\n${graph}`);
  assert(/times: night/.test(graph), `the exam was at night:\n${graph}`);
  await forget();
});

test("a doing spoken of as a thing is what happened to it, not what happened", async () => {
  // `the backup started` is a starting, and the backup is what started. It
  // used to be a backup whose target was a starting — a doing standing in a
  // part of itself — because the first word that could be a doing was taken
  // for the doing, whether or not the signal was speaking of it.
  await fresh("the backup started in the morning");
  const graph = serialize();
  assert(/event\(n\d, type: starting\[2670\]\)/.test(graph), `a starting happened:\n${graph}`);
  assert(!/event\([^\n]*type: backup/.test(graph), `and the backup is not what happened:\n${graph}`);
  assert(/n\d\s+backup\s+type: backup\[3043\]/.test(graph), `the backup is what started:\n${graph}`);
  assertEquals((await brain("when did the backup start?")).expression.state.says, "morning");
  await forget();
});

test("a word that says only that something took place names nothing", async () => {
  // `the crash happened at eleven hours` is one crash with a clock on it. The
  // happening was standing as a part of the crash — a doing done to a word
  // that says no more than that it was done.
  await fresh("the crash happened at eleven hours and five minutes");
  const graph = serialize();
  assert(/event\(type: crash\[3041\]\)\s+\{at: 665/.test(graph), `the crash is what happened:\n${graph}`);
  assert(!/happening/.test(graph), `and the happening plays no part in it:\n${graph}`);
  await forget();
});

test("a happening can be asked after by name", async () => {
  // Whether something took place is a question about the happening and names
  // no part of it. Nothing on the record is not a no.
  await fresh("a plank fell after a meeting");
  assertEquals((await brain("did the meeting happen?")).expression.name, "affirm");
  assertEquals((await brain("did a party happen?")).expression.name, "unsure");
  await forget();
});

test("a happening met inside another can be asked after by name", async () => {
  // The outer happening stands on the record even where the world holds no
  // individual of its kind: asking whether it happened is answered from
  // there, and one never spoken of is still unknown rather than denied.
  await fresh("priya sang during the recital");
  assertEquals((await brain("did the recital happen?")).expression.name, "affirm");
  assertEquals((await brain("did the concert happen?")).expression.name, "unsure");
  await forget();
});

test("asked something else of the same happening, it is not answered whether it happened", async () => {
  // `how long is the backup?` names the backup and asks after its length; that
  // it happened answers past the question.
  await fresh("the backup ran for 35 minutes");
  assertEquals((await brain("how long is the backup?")).expression.state.says, "thirty-five minutes");
  await forget();
});

test("saying something is a doing; greeting is not", async () => {
  // Every word of communication was read as a greeting — so `nila spoke` named
  // no doer, took nothing into the world, and `who spoke?` came back unread.
  // A greeting is something that passed between two people and belongs to the
  // conversation; a speaking happened.
  await fresh("nila spoke");
  assertEquals((await brain("who spoke?")).expression.state.says, "nila");
  await forget();
});

test("one happening inside another puts whoever was in it in it", async () => {
  // `during` said when, and was recorded as what the speaking was spoken to.
  // One happening within another is containment, and whoever did the inner one
  // was in the outer.
  await fresh("nila spoke during the meeting");
  assertEquals((await brain("who was in the meeting?")).expression.state.says, "nila");
  await forget();
});
