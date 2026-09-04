import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// A store of its own, that nothing else can reach.
const { brain, forget } = openBrain("sqlite::memory:");

test("a name may be given a value, and stands for it after", async () => {
  await forget();
  assertEquals((await brain("x is 5")).expression.name, "learn");
  assertEquals((await brain("x is a number?")).expression.name, "affirm");
  await forget();
});

test("what turns on a name turns on what it was given", async () => {
  await forget();
  await brain("x is 5");
  assertEquals((await brain("if x > 10 then say big else say small")).expression.state.says, "small");
  await brain("x is 15");
  assertEquals((await brain("if x > 10 then say big else say small")).expression.state.says, "big");
  await forget();
});

test("a name may be given again", async () => {
  await forget();
  const first = await brain("y is 3");
  await brain("y is 9");
  const then = await brain("if y > 5 then say hot else say cold");
  assertEquals(first.names.y !== then.names.y, true, "the second giving stands");
  assertEquals(then.expression.state.says, "hot");
  await forget();
});

test("asking of a name gives it nothing", async () => {
  await forget();
  await brain("z is 7");
  const given = (await brain("z is 7")).names.z;
  await brain("if z > 100 then say big else say small");
  assertEquals((await brain("z is a number?")).names.z, given, "using a name does not give it one");
  await forget();
});

test("the brain keeps no name of its own — it is told each time", async () => {
  await forget();
  await brain("n is 4", { conversation: "one" });
  assertEquals(
    (await brain("if n > 2 then say big else say small", { conversation: "two" })).expression.name,
    "unsure",
    "another conversation was given no such name, and neither side follows",
  );
  assertEquals(
    (await brain("if n > 2 then say big else say small", { conversation: "one" })).expression.state.says,
    "big",
  );
  await forget();
});

test("what follows may be said outright", async () => {
  await forget();
  assertEquals((await brain("say hot")).expression.state.says, "hot");
  assertEquals((await brain("if 15 > 10 then say wool else say silk")).expression.state.says, "wool");
  assertEquals((await brain("if 5 > 10 then say wool else say silk")).expression.state.says, "silk");
  await forget();
});

test("a thing put where a claim would go is the thing to say", async () => {
  await forget();
  await brain("z is 3");
  assertEquals((await brain("if z > 10 then say wool else silk")).expression.state.says, "silk");
  assertEquals((await brain("if z > 10 then wool else silk")).expression.state.says, "silk");
  await brain("z is 30");
  assertEquals((await brain("if z > 10 then wool else silk")).expression.state.says, "wool");
  await forget();
});

test("a condition it cannot work out takes neither side", async () => {
  await forget();
  // Nothing has said what x stands for. The condition did not fail — it was
  // never reached — so neither what follows nor what stands instead follows.
  const r = await brain("if x > 10, then say big else say small");
  assertEquals(r.expression.name, "unsure");
  await forget();
});
