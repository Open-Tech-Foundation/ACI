import { test, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// Superlatives derive like plurals and pasts: no `-est` is written down, and
// derivation is exact — nothing is guessed. A description before a noun head
// restricts it, never joins the doing.
// Same signals in the same order give the same answers on every machine.

const { brain, forget } = openBrain("sqlite::memory:");

test("biggest reaches big through doubled consonants", async () => {
  await forget();
  assertEquals((await brain("the biggest wren eats trout")).expression.name, "learn");
  assertEquals((await brain("who ate trout?")).expression.state.says, "wren");
  await forget();
});

test("smallest reaches small directly", async () => {
  await forget();
  assertEquals((await brain("the smallest finch eats tuna")).expression.name, "learn");
  assertEquals((await brain("who ate tuna?")).expression.state.says, "finch");
  await forget();
});

test("an ending that reaches nothing is unheard, not neared", async () => {
  await forget();
  assertEquals((await brain("the xqest wren eats trout")).expression.name, "unheard");
  await forget();
});
