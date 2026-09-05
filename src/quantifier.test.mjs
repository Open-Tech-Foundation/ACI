import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// A store of its own, that nothing else can reach.
const { brain, forget } = openBrain("sqlite::memory:");

async function ask(said) {
  await forget();
  return (await brain(said)).expression.name;
}

test("a claim may be about every one of a kind", async () => {
  assertEquals(await ask("all crows are birds?"), "affirm");
  assertEquals(await ask("every crow is a bird?"), "affirm");
  assertEquals(await ask("all crows are white?"), "unsure");
  await forget();
});

test("each and both say every one, either and any say some", async () => {
  assertEquals(await ask("each crow is a bird?"), "affirm");
  assertEquals(await ask("both crows are birds?"), "affirm");
  assertEquals(await ask("either crow is a bird?"), "affirm");
  assertEquals(await ask("any crow is a bird?"), "affirm");
  await forget();
});

test("none of a kind denies the claim of every one of it", async () => {
  assertEquals(await ask("no crow is a fish?"), "affirm");
  assertEquals(await ask("no crow is a bird?"), "deny");
  await forget();
});

test("some of a kind is not the kind", async () => {
  // What the kind reaches, some of it reaches; and some of it may reach what
  // the kind does not — one bird being a crow is not birds being crows.
  assertEquals(await ask("some crows are birds?"), "affirm");
  assertEquals(await ask("some birds are crows?"), "affirm");
  await forget();
});

test("some of a kind is never denied for what the kind does not reach", async () => {
  // Crows are not white as a kind, and nothing about crows says none of them
  // is. So it does not know, rather than saying no.
  assertEquals(await ask("some crows are white?"), "unsure");
  assertEquals(await ask("all crows are white?"), "unsure");
  await forget();
});

test("told how many of a kind, the brain still checks the same world", async () => {
  assertEquals(await ask("a crow is a bird?"), "affirm");
  assertEquals(await ask("all crows are birds?"), "affirm");
  await forget();
});

test("a claim that was denied is not said back without its denial", async () => {
  await forget();
  assertEquals((await brain("no crow is a fish?")).expression.state.says, "Yes. ✅");
  assertEquals((await brain("a crow is a bird?")).expression.state.says, "Yes. ✅ a crow is a bird.");
  await forget();
});
