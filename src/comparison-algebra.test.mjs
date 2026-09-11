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
  const measure = world.anchors.measure;
  const compares = world.anchors.compares;
  const many = [];
  for (const term of comparisons()) {
    const state = (term.links || []).find((link) => link.rel === compares).to;
    const scales = world.members(state, measure);
    if (scales.length > 1) many.push(`${world.term(state).name}: ${scales.length}`);
  }
  assertEquals(many, []);
});

test("two comparisons opposed on one scale are converse without being told", () => {
  const { compares, measure, more, less, converse } = world.anchors;
  const opposite = [];
  for (const term of comparisons()) {
    const state = (term.links || []).find((link) => link.rel === compares).to;
    const scale = world.members(state, measure)[0];
    if (scale == null) continue;
    for (const other of comparisons()) {
      if (other === term) continue;
      const its = (other.links || []).find((link) => link.rel === compares).to;
      if (world.members(its, measure)[0] !== scale) continue;
      const down = (one) => world.linked(one, world.named("subrelation")).includes(less);
      if (down(term.id) === down(other.id)) continue;
      if (!world.converses(term.id).includes(other.id)) {
        opposite.push(`${term.name} / ${other.name}`);
      }
    }
  }
  assertEquals(opposite, []);
  // And nothing says it twice.
  const told = [];
  for (const term of comparisons()) {
    for (const link of term.links || []) {
      if (link.rel !== converse) continue;
      const state = (term.links || []).find((l) => l.rel === compares).to;
      const its = (world.term(link.to).links || []).find((l) => l.rel === compares);
      if (its == null) continue;
      const scale = world.members(state, measure)[0];
      if (scale != null && scale === world.members(its.to, measure)[0]) {
        told.push(`${term.name} <-> ${world.term(link.to).name}`);
      }
    }
  }
  assertEquals(told, []);
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

test("a state says which end of its scale it is, and the comparison is never told", () => {
  const toward = world.anchors.toward;
  const { more, less, compares } = world.anchors;
  assertEquals(world.linked(world.named("tall"), toward), [more]);
  assertEquals(world.linked(world.named("short"), toward), [less]);
  assertEquals(world.linked(world.named("dark"), toward), [less]);
  // The relation compares a state and says nothing else about direction.
  const told = comparisons().filter((term) =>
    (term.links || []).some(
      (link) => link.rel === world.named("subrelation") && [more, less].includes(link.to),
    ),
  );
  assertEquals(told.map((term) => term.name), []);
  // Every one of them still knows which way it reads, through its state.
  const lost = comparisons().filter((term) => {
    const state = (term.links || []).find((link) => link.rel === compares).to;
    return world.linked(state, toward).length === 0;
  });
  assertEquals(lost.map((term) => term.name), []);
});
