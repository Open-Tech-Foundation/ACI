import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

const { brain, forget, serialize } = openBrain("sqlite::memory:");

async function fresh(...said) {
  await forget();
  for (const s of said) await brain(s);
  return serialize();
}
const says = async (q) => (await brain(q)).expression.state.says;

test("a doing told with a time stands on the timeline", async () => {
  const graph = await fresh("the ferry arrived at eight hours");
  assert(/a1  event\(n1, type: arrive\[\d+\]\)\s+\{at: 8 hour/.test(graph), graph);
  assert(/m1  members: \[a1\]/.test(graph), `and it takes a moment:\n${graph}`);
});

test("two clocks order two doings, with nobody declaring it", async () => {
  const graph = await fresh("nadia arrived at nine hours", "omar arrived at ten hours");
  assert(/m1  members: \[a1\]  before: null/.test(graph), `nadia first:\n${graph}`);
  assert(/m2  members: \[a2\]  before: m1/.test(graph), `omar after her:\n${graph}`);
});

test("told out of order, the clock still says which came first", async () => {
  const graph = await fresh("omar arrived at ten hours", "nadia arrived at nine hours");
  // The nine was said second and stands at the head all the same.
  assert(/m2  members: \[a2\]  before: null/.test(graph), `the nine is the head:\n${graph}`);
  assert(/m1  members: \[a1\]  before: m2/.test(graph), `and the ten follows it:\n${graph}`);
  assertEquals(await says("who arrived first?"), "nadia");
});

test("the end of the timeline reads off the clock", async () => {
  await fresh("nadia arrived at nine hours", "omar arrived at ten hours");
  assertEquals(await says("who arrived first?"), "nadia");
  assertEquals(await says("who arrived last?"), "omar");
});

test("one clock is one moment, however many stood at it", async () => {
  const graph = await fresh("the ferry arrived at eight hours", "the train arrived at eight hours");
  assert(/m1  members: \[a1, a2\]/.test(graph), `both at the one moment:\n${graph}`);
});

test("a declared ordering still reads its two ends", async () => {
  await fresh("asha arrived before deepak");
  assertEquals(await says("who arrived first?"), "asha");
  assertEquals(await says("who arrived last?"), "deepak");
});

test("a doing says which time it is — the one it is set for, or the one it happened at", async () => {
  const soon = await fresh("the ferry will arrive");
  assert(/a1  event\(n1, type: arrive\[\d+\]\)\s+\{time: scheduled\}/.test(soon), soon);
  const done = await fresh("the ferry arrived");
  assert(/a1  event\(n1, type: arrive\[\d+\]\)\s+\{time: done\}/.test(done), `and one that happened says so too:\n${done}`);
});

test("a doing to come may be told its time", async () => {
  // `will` stood as a verb of its own, so it took the doing's place and the
  // clock was read as how long the thing measured.
  const graph = await fresh("the ferry will arrive at nine hours");
  assert(/a1  event\(n1, type: arrive\[\d+\]\)\s+\{at: 9 hour\[\d+\], time: scheduled\}/.test(graph), graph);
});

test("what is expected and what happened stand as two moments", async () => {
  const graph = await fresh("the ferry will arrive at nine hours", "the ferry arrived at ten hours");
  assert(/a1  event\(n1, type: arrive\[\d+\]\)\s+\{at: 9 hour\[\d+\], time: scheduled\}/.test(graph), `meant at nine:\n${graph}`);
  assert(/a2  event\(n1, type: arrive\[\d+\]\)\s+\{at: 10 hour\[\d+\], time: done\}/.test(graph), `came at ten:\n${graph}`);
  assert(/m1  members: \[a1\]  before: null/.test(graph), `the nine stands first:\n${graph}`);
  assert(/m2  members: \[a2\]  before: m1/.test(graph), `and the ten after it:\n${graph}`);
});

test("a doing to come has not happened", async () => {
  await fresh("the ferry will arrive");
  assertEquals(await says("did the ferry arrive?"), "I don't know.");
});

test("late is read off the two moments, not remembered", async () => {
  const graph = await fresh("the coach will arrive at nine hours", "the coach arrived at ten hours");
  // Nothing says late anywhere. The two moments are the whole of it.
  assert(!/late/.test(graph), `nothing stored:\n${graph}`);
  assertEquals(await says("is the coach late?"), "Yes. ✅ a coach is late.");
  assertEquals(await says("is the coach early?"), "No. ❌");
});

test("come before the moment it was set for, a thing is early", async () => {
  await fresh("the ferry will arrive at nine hours", "the ferry arrived at eight hours");
  assertEquals(await says("is the ferry early?"), "Yes. ✅ a ferry is early.");
  assertEquals(await says("is the ferry late?"), "No. ❌");
});

test("come at the moment it was set for, a thing is neither", async () => {
  await fresh("the tram will arrive at nine hours", "the tram arrived at nine hours");
  assertEquals(await says("is the tram late?"), "No. ❌");
  assertEquals(await says("is the tram early?"), "No. ❌");
});

test("with nothing expected there is nothing to be late against", async () => {
  await fresh("the barge arrived at ten hours");
  assertEquals(await says("is the barge late?"), "I don't know.");
});

test("a state a thing is in by its quantity answers without anyone saying it", async () => {
  // The same reading late is: the world says where the state begins, and the
  // quantity is read off the thing.
  await fresh("the room is 32 degrees");
  assertEquals(await says("is the room hot?"), "Yes. ✅ a room is hot.");
  await fresh("the room is 10 degrees");
  assertEquals(await says("is the room hot?"), "No. ❌");
});

test("asked of the past, what stood then answers", async () => {
  await fresh("the coffee is hot", "the coffee got cold");
  assertEquals(await says("was the coffee hot?"), "Yes. ✅ a coffee is hot.");
  assertEquals(await says("is the coffee hot?"), "No. ❌");
  assertEquals(await says("was the coffee blue?"), "I don't know.");
});

test("a thing the conversation named answers when it did something", async () => {
  await fresh("nadia arrived at nine hours");
  assertEquals(await says("when did nadia arrive?"), "nine hours");
});

test("two clocks order two doings for a yes or no, with nobody declaring it", async () => {
  await fresh("nadia arrived at nine hours", "omar arrived at ten hours");
  assertEquals(await says("did nadia arrive before omar?"), "Yes. ✅ nadia before omar.");
  assertEquals(await says("did omar arrive before nadia?"), "No. ❌");
  assertEquals(await says("did omar arrive after nadia?"), "Yes. ✅ omar after nadia.");
});

test("each side of an ordering keeps its own doing", async () => {
  // `the dog ran after the child sang` says two doings, and the far side was
  // being given the near side's: the child ran, and the singing was thrown
  // away. Two things went on the record that nobody said, and one that was
  // said went nowhere.
  const graph = await fresh("the dog ran after the child sang");
  assert(/a1  event\(n1, type: run\[\d+\]\)/.test(graph), graph);
  assert(/a2  event\(n2, type: singing\[\d+\]\)/.test(graph), `the child sang:\n${graph}`);
  assertEquals(await says("did the dog run?"), "Yes. ✅");
  assertEquals(await says("did the child sing?"), "Yes. ✅");
  assertEquals(await says("did the child run?"), "I don't know.");
  assertEquals(await says("what happened first?"), "child");
});

test("one doing said once is still both sides'", async () => {
  // Nothing on the far side says a doing of its own, so the one doing said is
  // what each of them did.
  await fresh("a man arrived before a boy");
  assertEquals(await says("did the boy arrive?"), "Yes. ✅");
});

test("a doing named as a thing is the happening, and did nothing to itself", async () => {
  // `a meeting` is a doing with nobody doing it. It was going on the record
  // twice — once as itself and once as falling — and then as its own doer.
  const graph = await fresh("a plank fell after a meeting");
  assert(/a1  event\(type: meeting\[\d+\]\)/.test(graph), `the meeting happened:\n${graph}`);
  assert(/a2  event\(n1, type: fall\[\d+\]\)/.test(graph), graph);
  assert(!/type: fall\[\d+\]\)[\s\S]*type: fall\[\d+\]\)/.test(graph), `the meeting did not fall:\n${graph}`);
});

test("the ordering is about the two the doings are about", async () => {
  // `a hawk sang before a crow` makes a hawk and a crow, and the happenings
  // are theirs. The chain was written on the kinds instead — `hawk` before
  // `crow` — so one sentence stood about two different subjects, and a
  // question reaching for both ends at once found neither beaten: `who sang
  // first?` and `who sang last?` both answered `hawk, crow`.
  const graph = await fresh("a hawk sang before a crow");
  assert(/a1  event\(n1, type: singing\[\d+\]\)/.test(graph), graph);
  assert(/m1  members: \[n1\]  before: null/.test(graph), `the one that sang, not the kind:\n${graph}`);
  assert(/m2  members: \[n2\]  before: m1/.test(graph), graph);
  assertEquals(await says("who sang first?"), "hawk");
  assertEquals(await says("who sang last?"), "crow");
});

test("a thing spoken of as known keeps the chain on what the conversation holds", async () => {
  // Said again, `the server` is the same server, and the ordering has to be
  // where a later signal can still meet it.
  await fresh("the server started before the backup");
  assertEquals((await brain("the backup was before the server")).expression.name, "conflict");
});
