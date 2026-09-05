import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// A store of its own, that nothing else can reach.
const { brain, forget } = openBrain("sqlite::memory:");

test("a thing may be said to stand somewhere relative to another", async () => {
  await forget();
  assertEquals((await brain("an apple is on a table")).expression.name, "learn");
  assertEquals((await brain("an apple is on a table?")).expression.name, "affirm");
  await forget();
});

test("a word that says no placement joins no placement", async () => {
  await forget();
  // `at` is a preposition with no term behind it: the claim is what the apple
  // is, and an apple is not a table.
  const r = await brain("an apple is at a table");
  assertEquals(r.expression.name, "deny");
  assertEquals(r.learned, null);
  await forget();
});

test("where a thing stands is asked the same way anything else is", async () => {
  await forget();
  await brain("an apple is on a table");
  assertEquals((await brain("an apple is on what")).expression.state.says, "table");
  await forget();
});

test("standing in a thing is a placement of its own", async () => {
  await forget();
  await brain("an apple is in a basket");
  assertEquals((await brain("an apple is in what")).expression.state.says, "basket");
  await forget();
});

test("a placement the world says is a different one stands against this", async () => {
  await forget();
  await brain("an apple is on a table");
  assertEquals((await brain("an apple is under a table?")).expression.name, "deny",
    "a thing on a table is not under it");
  assertEquals((await brain("an apple is on a table?")).expression.name, "affirm");
  await forget();
});

test("a placement nothing was said about either way stays unknown", async () => {
  await forget();
  await brain("an apple is on a table");
  assertEquals((await brain("an apple is in a table?")).expression.name, "unsure",
    "nothing says in and on are ways apart");
  await forget();
});

test("one relation may be another the other way round", async () => {
  await forget();
  await brain("an apple is in a basket");
  assertEquals((await brain("a basket holds an apple?")).expression.name, "affirm",
    "being in a thing and its holding you are one fact");
  await forget();
  await brain("a basket holds an apple");
  assertEquals((await brain("an apple is in a basket?")).expression.name, "affirm",
    "and it is read from either end");
  await forget();
});

test("the other end is said once and read both ways", async () => {
  await forget();
  // The world says `in converse hold` and nothing says `hold converse in`.
  await brain("a basket holds an apple");
  assertEquals((await brain("an apple is in a basket?")).expression.name, "affirm");
  await forget();
});

test("what a thing is does not change by standing somewhere", async () => {
  await forget();
  await brain("an apple is on a table");
  assertEquals((await brain("an apple is a fruit?")).expression.name, "affirm");
  await forget();
});

test("a placement is a relation of its own kind, not the ladder the world is built of", async () => {
  await forget();
  assertEquals((await brain("a placement is a relation?")).expression.name, "affirm");
  // Two relations stand in "an apple is on a table", and the more specific one
  // is the signal's joint: the claim is a placement, not what the apple is.
  const r = await brain("an apple is on a table");
  const stood = (r.roots[0].branch || []).find((b) => b.kind === "standing" || b.kind === "learn");
  const isRel = (await brain("a placement is a relation?")).roots[0].branch
    .find((b) => b.kind === "standing").state.relation;
  assert(stood.state.relation !== isRel, "the joint was the placement, not `is`");
  await forget();
});

test("where a thing may stand joins the positions the world already had", async () => {
  await forget();
  assertEquals((await brain("top is a position?")).expression.name, "affirm");
  assertEquals((await brain("inside is a position?")).expression.name, "affirm");
  assertEquals((await brain("a side is a position?")).expression.name, "affirm");
  await forget();
});

test("opposed positions exclude each other, the way up and down already did", async () => {
  await forget();
  assertEquals((await brain("a top is a bottom?")).expression.name, "deny");
  assertEquals((await brain("an inside is an outside?")).expression.name, "deny");
  await forget();
});
