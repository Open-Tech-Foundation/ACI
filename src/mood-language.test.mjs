import { test, assertEquals } from "runtime:test";
import { file } from "runtime:fs";
import { brainFrom } from "./brain.js";
import { fromSources } from "./knowledge.js";

const load = async () => ({
  world: await file(new URL('../data/world.json', import.meta.url).pathname).json(),
  english: await file(new URL('../languages/en.json', import.meta.url).pathname).json(),
});

test("question marks come only from the language that recognized the signal", async () => {
  const { world, english } = await load();
  const unrelated = {
    name: "unrelated",
    symbols: {
      letter: { characters: "z" },
      punctuation: { characters: "? !" },
      question: { characters: "?" },
    },
    words: { z: { pos: "word", meaning: "z" } },
  };
  const bang = structuredClone(english);
  bang.name = "bang";
  bang.symbols.question.characters = "!";
  const knowledge = fromSources({ world, languages: [unrelated, bang] });

  const told = brainFrom("a stone is warm?", knowledge);
  assertEquals(told.expression.state.mood, "tell");
  assertEquals(told.expression.name, "learn");
  assertEquals(told.expression.state.says, "I understand.");

  const asked = brainFrom("a stone is warm!", knowledge);
  assertEquals(asked.expression.state.mood, "ask");
  assertEquals(asked.expression.name, "unsure");
  assertEquals(asked.expression.state.says, "I don't know.");
  assertEquals(asked.learned, null, "asking leaves the world unchanged");
});
