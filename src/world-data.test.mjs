import { test, assert } from "runtime:test";
import { fromSources } from "./knowledge.js";
import { file, readDir } from "runtime:fs";

// The world as authored, and the knowledge authored on top of it, read the way
// any source is read — through the same door, with the same shape check. A
// store's unique index would swallow a fault the file has; this does not.
const ROOT = new URL("../", import.meta.url).pathname;

async function read(dir) {
  const out = [];
  for (const e of await readDir(`${ROOT}${dir}`)) {
    if (e.isFile && e.name.endsWith(".json")) out.push(await file(`${ROOT}${dir}/${e.name}`).json());
  }
  return out;
}

async function sources() {
  return {
    world: await file(`${ROOT}data/world.json`).json(),
    languages: await read("languages"),
    knowledge: await read("knowledge"),
  };
}

test("the authored world passes the shape check every source passes", async () => {
  const built = await sources();
  const knowledge = fromSources(built);
  assert(knowledge.world.anchors.thing != null, "it has its anchors");
});

test("no term says the same thing twice", async () => {
  const world = (await sources()).world;
  for (const term of world.terms) {
    const seen = new Set();
    for (const l of term.links || []) {
      const key = [l.rel, l.to, l.quantity ?? null, l.at ?? null, l.not ?? false].join(":");
      assert(!seen.has(key), `term ${term.id} (${term.name}) links ${key} twice`);
      seen.add(key);
    }
  }
});
