import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// A store of its own, that nothing else can reach.
const { brain, forget } = openBrain("sqlite::memory:");
const PERSON = 29;

function branch(r, kind) {
  return (r.roots[0].branch || []).find((b) => b.kind === kind) || null;
}

test("new birds, fish and mammals are what they are, apart from the rest", async () => {
  await forget();
  assertEquals((await brain("an avocet is a bird?")).expression.name, "affirm");
  assertEquals((await brain("an avocet is a fish?")).expression.name, "deny");
  assertEquals((await brain("avocets are birds?")).expression.name, "affirm");
  assertEquals((await brain("a bream is a fish?")).expression.name, "affirm");
  assertEquals((await brain("a bream is a bird?")).expression.name, "deny");
  assertEquals((await brain("an aardvark is a mammal?")).expression.name, "affirm");
  assertEquals((await brain("an aardvark is a reptile?")).expression.name, "deny");
  await forget();
});

test("new trees, flowers, fruit and vegetables", async () => {
  await forget();
  assertEquals((await brain("an aspen is a tree?")).expression.name, "affirm");
  assertEquals((await brain("an aspen is a flower?")).expression.name, "deny");
  assertEquals((await brain("an anemone is a flower?")).expression.name, "affirm");
  assertEquals((await brain("a durian is a fruit?")).expression.name, "affirm");
  assertEquals((await brain("a durian is a vegetable?")).expression.name, "deny");
  assertEquals((await brain("kale is a vegetable?")).expression.name, "affirm");
  await forget();
});

test("new foods, spices, cheeses and drinks", async () => {
  await forget();
  assertEquals((await brain("pizza is food?")).expression.name, "affirm");
  assertEquals((await brain("pizza is a vegetable?")).expression.name, "deny");
  assertEquals((await brain("cinnamon is food?")).expression.name, "affirm");
  assertEquals((await brain("cheddar is cheese?")).expression.name, "affirm");
  assertEquals((await brain("cider is a beverage?")).expression.name, "affirm");
  await forget();
});

test("new clothing, tools, containers and persons", async () => {
  await forget();
  assertEquals((await brain("a parka is clothing?")).expression.name, "affirm");
  assertEquals((await brain("an adze is a tool?")).expression.name, "affirm");
  assertEquals((await brain("an adze is a fish?")).expression.name, "deny");
  assertEquals((await brain("an amphora is a container?")).expression.name, "affirm");
  assertEquals((await brain("an astronaut is a person?")).expression.name, "affirm");
  assertEquals((await brain("astronauts are persons?")).expression.name, "affirm");
  await forget();
});

test("new sports, games, toys, music and devices", async () => {
  await forget();
  assertEquals((await brain("rugby is a sport?")).expression.name, "affirm");
  assertEquals((await brain("rugby is a game?")).expression.name, "affirm");
  assertEquals((await brain("backgammon is a game?")).expression.name, "affirm");
  assertEquals((await brain("a frisbee is a toy?")).expression.name, "affirm");
  assertEquals((await brain("a cello is music?")).expression.name, "affirm");
  assertEquals((await brain("a cello is a song?")).expression.name, "deny");
  assertEquals((await brain("a drone is a device?")).expression.name, "affirm");
  // Doubling plurals (quizzes, fezzes) derive to nothing — the rules only take
  // endings off — so plurals are proven on a regular one.
  assertEquals((await brain("drones are devices?")).expression.state.says, "Yes. ✅ a drone is a device.");
  await forget();
});

test("new landforms, sky, colours, fabrics, gems and stones", async () => {
  await forget();
  assertEquals((await brain("a fjord is a landform?")).expression.name, "affirm");
  assertEquals((await brain("a nebula is sky?")).expression.name, "affirm");
  assertEquals((await brain("maroon is a colour?")).expression.name, "affirm");
  assertEquals((await brain("maroon is red?")).expression.name, "deny");
  assertEquals((await brain("denim is cloth?")).expression.name, "affirm");
  assertEquals((await brain("an opal is solid?")).expression.name, "affirm");
  assertEquals((await brain("basalt is stone?")).expression.name, "affirm");
  await forget();
});

test("the new doings happen", async () => {
  await forget();
  for (const said of ["i sip water", "i pour water", "i yawn", "i whisper an apple"]) {
    const r = await brain(said, { from: PERSON });
    assert(branch(r, "event") !== null, `${said} was told to have happened`);
  }
  const past = branch(await brain("i nodded", { from: PERSON }), "event");
  assert(past != null, "something happened");
  assert(past.state.when != null, "on the other side of now");
  await forget();
});
