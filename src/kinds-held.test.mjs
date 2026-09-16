import { test, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

const { brain, forget } = openBrain("sqlite::memory:");
const says = async (q) => (await brain(q)).expression.state.says;

test("how many kinds a thing holds is counted off the same walk as how many things", async () => {
  await forget();
  await brain("a shelf has 4 novels");
  await brain("the shelf has 3 atlases");
  await brain("the shelf has 2 lamps");
  assertEquals(await says("how many kinds does the shelf have?"), "three");
  // The same walk, counted the other way: seven books of two kinds.
  assertEquals(await says("how many books does the shelf have?"), "seven");
});

test("one kind held is one kind", async () => {
  await forget();
  await brain("a crate has 6 hammers");
  assertEquals(await says("how many kinds does the crate have?"), "one");
});

test("holding nothing, there are no kinds to count", async () => {
  await forget();
  await brain("a drawer is empty");
  assertEquals(await says("how many kinds does the drawer have?"), "I don't know.");
});
