import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// A store of its own, that nothing else can reach.
const { brain, forget } = openBrain("sqlite::memory:");
const PERSON = 29;

function branch(r, kind) {
  return (r.roots[0].branch || []).find((b) => b.kind === kind) || null;
}

test("devices are machines, apart from one another", async () => {
  await forget();
  assertEquals((await brain("a radio is a device?")).expression.name, "affirm");
  assertEquals((await brain("a radio is a machine?")).expression.name, "affirm");
  assertEquals((await brain("a radio is a camera?")).expression.name, "deny");
  assertEquals((await brain("radios are devices?")).expression.state.says, "Yes. ✅ a radio is a device.");
  await forget();
});

test("a screen and a keyboard are devices, and still objects", async () => {
  await forget();
  assertEquals((await brain("a screen is a device?")).expression.name, "affirm");
  assertEquals((await brain("a screen is an object?")).expression.name, "affirm");
  assertEquals((await brain("a keyboard is a device?")).expression.name, "affirm");
  // A phone stays what it was: a tool that also does the phoning.
  assertEquals((await brain("a phone is a tool?")).expression.name, "affirm");
  await forget();
});

test("music holds songs, tunes and what they are played on", async () => {
  await forget();
  assertEquals((await brain("a song is music?")).expression.state.says, "Yes. ✅ a song is music.");
  assertEquals((await brain("a song is art?")).expression.state.says, "Yes. ✅ a song is an art.");
  assertEquals((await brain("a drum is a song?")).expression.name, "deny");
  assertEquals((await brain("drums are music?")).expression.state.says, "Yes. ✅ a drum is music.");
  await forget();
});

test("more feelings, still apart from one another", async () => {
  await forget();
  assertEquals((await brain("a shame is a feeling?")).expression.name, "affirm");
  assertEquals((await brain("a shame is a state?")).expression.name, "affirm");
  assertEquals((await brain("a shame is pride?")).expression.name, "deny");
  assertEquals((await brain("guilt is a feeling?")).expression.name, "affirm");
  await forget();
});

test("more weather, still apart from other weather", async () => {
  await forget();
  assertEquals((await brain("hail is weather?")).expression.name, "affirm");
  assertEquals((await brain("hail is rain?")).expression.name, "deny");
  assertEquals((await brain("a rainbow is weather?")).expression.name, "affirm");
  await forget();
});

test("singing and dancing happen, and are work", async () => {
  await forget();
  for (const said of ["i sing a song", "i dance", "i write a note"]) {
    const r = await brain(said, { from: PERSON });
    assert(branch(r, "event") !== null, `${said} was told to have happened`);
  }
  assertEquals((await brain("singing is a work?")).expression.name, "affirm");
  await forget();
});
