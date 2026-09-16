import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";
import { PROPERTY, MEASURE } from "./graph.js";
import { loadWorldFile } from "./world.js";

// A denial is not how a thing is. `the sky is not blue` says nothing about the
// sky that stands — what was said is that blue does not stand between the sky
// and the world. So a denied property is never written onto the thing as if it
// were so, and a denied measure is never held by it; both are written down as
// facts against, and where the thing carried the claim before, the denial takes
// it off. What the graph holds is what was said — the denial included.

const opened = openBrain("sqlite::memory:");
const { brain, forget, graph, serialize } = opened;
const world = await loadWorldFile(new URL("../data/world.json", import.meta.url).pathname);

const said = async (...lines) => {
  await forget();
  for (const line of lines) await brain(line);
  return graph();
};

test("a denied property is a fact against, never a colour the thing carries", async () => {
  const held = await said("the sky is not blue");
  const [sky] = held.nodes;
  assert(sky != null, "the sky was spoken of, so it is here");
  assertEquals(sky.how || {}, {}, "nothing to say how the sky is was written on it");
  const [denied] = held.facts;
  assert(denied != null, "the denial was written down");
  assertEquals(denied.of, PROPERTY, "it stands as a property fact");
  assertEquals(denied.stands, "against", "and it is against, never held");
  assertEquals(world.term(denied.parts[1]).name, "blue");
});

test("a denial takes the colour off a thing that carried it before", async () => {
  const held = await said("the sky is blue", "the sky is not blue");
  const [sky] = held.nodes;
  assertEquals(sky.how || {}, {}, "blue no longer stands as how the sky is");
  const denied = held.facts.find((one) => one.stands === "against");
  assert(denied != null, "the denial is held as a fact against");
});

test("a denied measure is a fact against, never a height the thing stands at", async () => {
  const held = await said("tom is not 2 metre tall");
  const [tom] = held.nodes;
  assertEquals(tom.measures || [], [], "nothing measures tom");
  const [denied] = held.facts;
  assert(denied != null, "the denial was written down");
  assertEquals(denied.of, MEASURE, "it stands as a measure fact");
  assertEquals(denied.stands, "against", "and it is against, never held");
  assertEquals(world.term(denied.parts[1]).name, "metre");
  assertEquals(denied.properties.amount, 2, "the quantity that was denied is kept beside it");
});

test("a denial takes a measure off a thing that carried it before", async () => {
  const held = await said("tom is 2 metre tall", "tom is not 2 metre tall");
  const [tom] = held.nodes;
  assertEquals(tom.measures || [], [], "no measure stands on tom anymore");
  assert(serialize().includes("not measure"), serialize());
});

test("a denied property answers no where it is asked after", async () => {
  const verdict = async (...lines) => {
    await forget();
    let last;
    for (const line of lines) last = await brain(line);
    return last.expression.name;
  };
  assertEquals(await verdict("the sky is not blue", "is the sky blue?"), "deny");
  assertEquals(await verdict("the sky is blue", "the sky is not blue", "is the sky blue?"), "deny");
});

test("a denial asked with not is read the same way it was told", async () => {
  const verdict = async (...lines) => {
    await forget();
    let last;
    for (const line of lines) last = await brain(line);
    return last.expression.name;
  };
  // The world holds that a cat is an animal, so asking whether it is not is
  // answered against — a denial asked is a denial judged.
  assertEquals(await verdict("a cat is an animal", "is a cat not an animal?"), "deny");
  assertEquals(await verdict("a cat is not a dog", "is a cat not a dog?"), "affirm");
  assertEquals(await verdict("a cat is not a dog", "is a cat a dog?"), "deny");
  assertEquals(await verdict("the door is not open", "is the door not open?"), "affirm");
  assertEquals(await verdict("the sky is not blue", "is the sky not blue?"), "affirm");
});