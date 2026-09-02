import { assert, assertEquals, assertThrows, test } from "runtime:test";
import { Memory } from "./memory.js";
import { createMemory } from "./seed.js";
import { EdgeType, ids } from "./schema.js";
import { tokenize } from "../text/normalize.js";

test("the seed knows English", () => {
  const memory = createMemory();
  const stats = memory.stats();
  assert(stats.nodes > 30);
  assert(stats.edges > 30);
  assertEquals(memory.get(ids.language("en")).label, "English");
});

test("a word links to its language and its concept", () => {
  const memory = createMemory();
  const hi = memory.get(ids.word("en", "hi"));
  assertEquals(hi.props.language, "en");
  assertEquals(memory.conceptsOf(hi.id)[0].node.props.name, "greeting");
  assertEquals(memory.neighbors(hi.id, EdgeType.IN_LANGUAGE)[0].node.props.code, "en");
});

test("a defaulted argument never overwrites what was set deliberately", () => {
  const memory = createMemory();
  // evokes() re-declares the emotion and word() re-declares the language;
  // neither may erase the valence or the label the seed established.
  assertEquals(memory.emotionOf("greeting").props.valence, 0.6);
  assertEquals(memory.get(ids.language("en")).label, "English");

  memory.word("hiya", { language: "en", concept: "greeting" });
  memory.evokes("greeting", "friendly");
  assertEquals(memory.emotionOf("greeting").props.valence, 0.6);
  assertEquals(memory.get(ids.language("en")).label, "English");
});

test("a concept carries an emotion and an answer", () => {
  const memory = createMemory();
  assertEquals(memory.emotionOf("greeting").props.name, "friendly");
  assertEquals(memory.templatesOf("greeting")[0].props.text, "Hello!");
});

test("the longest known phrase wins over its parts", () => {
  const memory = createMemory();
  const found = memory.lookupPhrase(tokenize("how are you"), 0);
  assertEquals(found.span, 3);
  assertEquals(memory.get(found.match.key).props.normalized, "how are you");
});

test("phrase lookup falls back to a single word", () => {
  const memory = createMemory();
  const found = memory.lookupPhrase(tokenize("hi there"), 0);
  assertEquals(found.span, 1);
  assertEquals(memory.get(found.match.key).props.normalized, "hi");
});

test("phrase lookup returns null when nothing is known", () => {
  const memory = createMemory();
  assertEquals(memory.lookupPhrase(tokenize("qwertyuiop"), 0), null);
});

test("aliases share a node instead of creating rivals", () => {
  const memory = createMemory();
  const viaAlias = memory.lookupPhrase(tokenize("thnx"), 0);
  assertEquals(memory.get(viaAlias.match.key).id, ids.word("en", "thanks"));
});

test("re-teaching a word does not duplicate its edges", () => {
  const memory = createMemory();
  const before = memory.stats().edges;
  memory.word("hi", { language: "en", concept: "greeting" });
  assertEquals(memory.stats().edges, before);
});

test("relating to a node that does not exist is an error, not a silent no-op", () => {
  const memory = createMemory();
  assertThrows(() => memory.addEdge(ids.word("en", "hi"), EdgeType.DENOTES, "concept:nonexistent"));
});

test("neighbours come back heaviest first", () => {
  const memory = new Memory();
  memory.concept("ambiguous");
  memory.emotion("weak");
  memory.emotion("strong");
  memory.evokes("ambiguous", "weak", { weight: 0.2 });
  memory.evokes("ambiguous", "strong", { weight: 0.9 });
  assertEquals(memory.emotionOf("ambiguous").props.name, "strong");
});

test("a word taught at runtime is immediately findable", () => {
  const memory = createMemory();
  memory.word("howdy", { language: "en", concept: "greeting", aliases: ["howdee"] });
  const found = memory.lookupPhrase(tokenize("howdee"), 0);
  assertEquals(memory.conceptsOf(found.match.key)[0].node.props.name, "greeting");
});

test("a word that normalizes to nothing is rejected", () => {
  assertThrows(() => new Memory().word("!!!", { concept: "greeting" }));
});
