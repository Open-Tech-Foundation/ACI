import { assert, assertEquals, assertThrows, test } from "runtime:test";
import { deserialize, serialize } from "./persist.js";
import { createMemory } from "./seed.js";
import { ids } from "./schema.js";
import { tokenize } from "../text/normalize.js";

// The round trip is tested without touching the filesystem: save() and load()
// are a JSON.stringify and a read around exactly this, so testing the pure half
// keeps the suite runnable with no capabilities at all.

test("a round trip preserves the graph", () => {
  const before = createMemory();
  const after = deserialize(serialize(before));
  assertEquals(after.stats().nodes, before.stats().nodes);
  assertEquals(after.stats().edges, before.stats().edges);
  assertEquals(after.stats().aliases, before.stats().aliases);
});

test("a round trip preserves meaning, not just counts", () => {
  const after = deserialize(serialize(createMemory()));
  assertEquals(after.emotionOf("greeting").props.name, "friendly");
  assertEquals(after.emotionOf("greeting").props.valence, 0.6);
  assertEquals(after.templatesOf("greeting")[0].props.text, "Hello!");
  assertEquals(after.conceptsOf(ids.word("en", "hi"))[0].node.props.name, "greeting");
});

test("a round trip preserves fuzzy and phrase matching", () => {
  const after = deserialize(serialize(createMemory()));
  assertEquals(after.lookupPhrase(tokenize("how are you"), 0).span, 3);
  assertEquals(after.lookupPhrase(tokenize("hellooo"), 0).match.key, ids.word("en", "hello"));
});

test("knowledge learned at runtime survives the round trip", () => {
  const before = createMemory();
  before.word("howdy", { concept: "greeting", aliases: ["howdee"] });
  const after = deserialize(serialize(before));
  assertEquals(after.conceptsOf(after.lookupPhrase(tokenize("howdee"), 0).match.key)[0].node.props.name, "greeting");
});

test("the serialized form is plain JSON", () => {
  const document = serialize(createMemory());
  assertEquals(JSON.parse(JSON.stringify(document)).format, 1);
  assert(Array.isArray(document.nodes) && Array.isArray(document.edges));
});

test("an unknown format is refused rather than half-loaded", () => {
  assertThrows(() => deserialize({ format: 99, nodes: [], edges: [], aliases: [] }));
  assertThrows(() => deserialize(null));
});
