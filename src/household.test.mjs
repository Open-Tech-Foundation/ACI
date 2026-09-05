import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// A store of its own, that nothing else can reach.
const { brain, forget } = openBrain("sqlite::memory:");
const PERSON = 29;

function branch(r, kind) {
  return (r.roots[0].branch || []).find((b) => b.kind === kind) || null;
}

test("meals are kinds of food, apart from one another", async () => {
  await forget();
  assertEquals((await brain("a breakfast is a meal?")).expression.name, "affirm");
  assertEquals((await brain("a breakfast is a food?")).expression.name, "affirm");
  assertEquals((await brain("a breakfast is a fruit?")).expression.name, "deny");
  // A count is asked cold: with something spoken of it would be about that.
  await forget();
  assertEquals((await brain("how many meal?")).expression.state.says, "six");
  assertEquals((await brain("how many lunches?")).expression.state.says, "zero");
  await forget();
});

test("beverages are liquids, apart from one another", async () => {
  await forget();
  assertEquals((await brain("a lemonade is a beverage?")).expression.name, "affirm");
  assertEquals((await brain("a lemonade is a liquid?")).expression.name, "affirm");
  assertEquals((await brain("a lemonade is a cocoa?")).expression.name, "deny");
  await forget();
  assertEquals((await brain("how many beverage?")).expression.state.says, "four");
  await forget();
});

test("rooms are places, apart from one another", async () => {
  await forget();
  assertEquals((await brain("a pantry is a room?")).expression.name, "affirm");
  assertEquals((await brain("a nursery is a study?")).expression.name, "deny");
  await forget();
  assertEquals((await brain("how many room?")).expression.state.says, "three");
  assertEquals((await brain("how many nurseries?")).expression.state.says, "zero");
  await forget();
});

test("a shelf is furniture, and still an object", async () => {
  await forget();
  assertEquals((await brain("a shelf is furniture?")).expression.name, "affirm");
  assertEquals((await brain("a shelf is an object?")).expression.name, "affirm");
  assertEquals((await brain("a pillow is furniture?")).expression.name, "affirm");
  await forget();
  assertEquals((await brain("how many furniture?")).expression.state.says, "27");
  assertEquals((await brain("how many curtains?")).expression.state.says, "zero");
  await forget();
});

test("the new doings happen, and are work", async () => {
  await forget();
  for (const said of ["i drive a van", "i clean a room", "i fix a clock", "i cook an apple"]) {
    const r = await brain(said, { from: PERSON });
    assert(branch(r, "event") !== null, `${said} was told to have happened`);
  }
  for (const doing of ["cooking", "driving", "cleaning", "fixing"]) {
    assertEquals((await brain(`${doing} is a work?`)).expression.name, "affirm", doing);
  }
  await forget();
});
