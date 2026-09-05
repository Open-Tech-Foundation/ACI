import { test, assert, assertEquals } from "runtime:test";
import { fromSources, speaking } from "./knowledge.js";

const world = {
  anchors: { thing: 1 },
  relations: { is: 9 },
  terms: [
    { id: 1, name: "thing", links: [] },
    { id: 2, name: "relation", links: [] },
    { id: 9, name: "is", links: [{ rel: 9, to: 2 }] },
  ],
};

const english = {
  name: "english",
  symbols: { letter: { characters: "abcdefghijklmnopqrstuvwxyz" } },
  words: { thing: { pos: "noun", meaning: "thing", concept: 1 } },
};

test("a language is checked and made ready to speak on its own", async () => {
  const spoken = speaking([english]);
  assertEquals(spoken.length, 1);
  assertEquals(spoken[0].data.name, "english");
});

test("a language made ready may be handed back instead of built again", async () => {
  // Only the world moves. What was checked once does not have to be checked
  // again for a world that has grown, and it is the same language either way.
  const built = fromSources({ world, languages: [english] });
  const handed = fromSources({ world, spoken: speaking([english]) });
  assertEquals(handed.languages.length, built.languages.length);
  assertEquals(handed.languages[0].data, built.languages[0].data);
  assertEquals(handed.languages[0].lookupWord("thing"), built.languages[0].lookupWord("thing"));
});

test("a language handed back is still checked — once, on the way in", async () => {
  let threw = null;
  try {
    speaking([{ name: "broken", words: { x: { pos: "" } } }]);
  } catch (e) {
    threw = e;
  }
  assert(threw != null, "a language that will not pass the shape check does not get through");
});
