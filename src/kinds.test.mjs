import { test, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// A store of its own, that nothing else can reach.
const { brain, forget } = openBrain("sqlite::memory:");

const told = async (said) => (await brain(said)).expression.name;

test("a thing may be more than one kind of thing", async () => {
  await forget();
  // Every kind of object was held apart from every other, which said that a
  // cup cannot be a container because it is a tool. It is both.
  for (const said of [
    "a cup is a container",
    "a bottle is a container",
    "a bucket is a container",
    "a bag is a container",
    "a phone is a device",
    "a clock is a device",
    "a lamp is a device",
  ]) {
    const name = await told(said);
    assertEquals(name === "learn" || name === "know", true, `${said}: ${name}`);
  }
  await forget();
});

test("what the world holds apart it still denies", async () => {
  await forget();
  assertEquals(await told("is a cup an organism?"), "deny");
  assertEquals(await told("is a wren a fish?"), "deny");
  assertEquals(await told("is a dog a plant?"), "deny");
  await forget();
});

test("and what it holds apart from nothing it does not", async () => {
  await forget();
  // Not being told a cup is no vehicle is not being told it is not one.
  assertEquals(await told("is a cup a vehicle?"), "unsure");
  await forget();
});
