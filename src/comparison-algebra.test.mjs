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
