import { test, assertEquals } from "runtime:test";
import { fromSources } from "./knowledge.js";

// The authored world, read the way the brain reads it.
const { file } = await import("runtime:fs");
const authored = await file(new URL("../data/world.json", import.meta.url).pathname).json();
const { world } = fromSources({ world: authored });

const comparisons = () => {
  const compares = world.anchors.compares;
  return world.data.terms.filter((term) =>
    (term.links || []).some((link) => link.rel === compares),
  );
};

test("every comparison the world holds is a strict ordering", () => {
  const all = comparisons();
  assertEquals(all.length > 0, true, "the world holds comparisons");
  const loose = all.filter(
    (term) => !(world.asymmetric(term.id) && world.irreflexive(term.id)),
  );
  assertEquals(loose.map((term) => term.name), []);
});

test("no comparison has to be told it is one", () => {
  // The algebra follows from comparing a state, so a world that says it again
  // on each relation says it sixty times and forgets most of them.
  const told = comparisons().filter((term) => term.transitive || term.asymmetric);
  assertEquals(told.map((term) => term.name), []);
});

test("measure runs one way", () => {
  // A gram measures weight, weight measures heavy, and there it stops. Said
  // both ways round the two disagreed: `size` claimed `tall`, where `tall`
  // said it was measured on `height`, and the brain read the claim.
  const measure = world.anchors.measure;
  const back = [];
  for (const term of world.data.terms) {
    for (const link of term.links || []) {
      if (link.rel !== measure) continue;
      if (world.linked(link.to, measure).includes(term.id)) {
        back.push(`${term.name} measure ${world.term(link.to).name}`);
      }
    }
  }
  assertEquals(back, []);
});

test("a state is measured on exactly one scale", () => {
  const { measure, toward } = world.anchors;
  const many = [];
  for (const term of world.data.terms) {
    if (world.linked(term.id, toward).length === 0) continue;
    const scales = world.members(term.id, measure);
    if (scales.length > 1) many.push(`${term.name}: ${scales.length}`);
  }
  assertEquals(many, []);
});

test("one ordering per scale, and no word has one of its own", () => {
  const { compares, measure } = world.anchors;
  // `hotter` and `warmer` were two relations on one scale, so neither reached
  // through the other. An ordering belongs to the scale, not to the word.
  const perWord = comparisons().filter((term) => {
    const of = world.linked(term.id, compares)[0];
    return of != null && world.linked(of, measure).length === 0 && world.members(of, measure).length > 0;
  });
  assertEquals(perWord.map((term) => term.name), []);
  // What is left compares a state the world put on no scale: its own ordering.
  for (const term of comparisons()) {
    const of = world.linked(term.id, compares)[0];
    if (world.linked(of, measure).length > 0) continue;
    assertEquals(world.members(of, measure), []);
  }
});

test("a scale says what it is a scale of", () => {
  const of = world.named("property-of");
  const measure = world.anchors.measure;
  // Light and sound the brain already held, as kinds of energy. What was
  // missing was the rung between a state and the thing it is a state of.
  for (const [scale, thing] of [
    ["brightness", "light"],
    ["loudness", "sound"],
    ["temperature", "heat"],
    ["strength", "force"],
    ["wetness", "water"],
  ]) {
    assertEquals(world.linked(world.named(scale), of), [world.named(thing)]);
  }
  for (const [state, scale] of [
    ["bright", "brightness"],
    ["dark", "brightness"],
    ["loud", "loudness"],
    ["quiet", "loudness"],
  ]) {
    assertEquals(world.members(world.named(state), measure), [world.named(scale)]);
  }
});

test("a scale is never a scale of itself", () => {
  const of = world.named("property-of");
  assertEquals(world.asymmetric(of), true);
  assertEquals(world.irreflexive(of), true);
});

test("a state says which end of its scale it is", () => {
  const { more, less, toward } = world.anchors;
  assertEquals(world.linked(world.named("tall"), toward), [more]);
  assertEquals(world.linked(world.named("short"), toward), [less]);
  assertEquals(world.linked(world.named("dark"), toward), [less]);
  // Every state that is compared knows its end.
  const compares = world.anchors.compares;
  const lost = comparisons().flatMap((term) => {
    const of = world.linked(term.id, compares)[0];
    const measured = world.linked(of, world.anchors.measure);
    const states = measured.length > 0 ? measured : [of];
    return states.filter((state) => world.linked(state, toward).length === 0)
      .map((state) => world.term(state).name);
  });
  assertEquals(lost, []);
});
