import { test, assert, assertEquals } from "runtime:test";
import { brainFrom } from "./brain.js";
import { fromSources } from "./knowledge.js";

const unrelated = {
  name: "unrelated",
  symbols: {
    letter: { characters: "az#" },
    vowel: { characters: "a" },
    sign: { characters: "+", alone: true },
  },
  words: {
    z: { pos: "word", meaning: "z" },
    "#": { pos: "word", meaning: "hash" },
  },
  expressions: { recognise: "wrong: {meaning}" },
};

const joined = {
  name: "joined",
  symbols: {
    letter: { characters: "abcd+" },
    vowel: { characters: "b" },
  },
  words: {
    "ab+cd": { pos: "word", meaning: "whole" },
  },
  expressions: { recognise: "joined: {meaning}" },
};

function branch(root, kind) {
  return (root.branch || []).find((node) => node.kind === kind) || null;
}

test("installed languages cannot alter another language's tokens or sounds", () => {
  const knowledge = fromSources({ languages: [unrelated, joined] });
  const result = brainFrom("#ab+cd#", knowledge);
  assertEquals(result.roots.length, 1, "the unrelated standalone plus did not split the word");
  assertEquals(result.roots[0].state.identity, "ab+cd", "this language removed its own edge marks");
  assertEquals(result.expression.name, "recognise");
  assertEquals(result.expression.state.says, "joined: whole");

  const sound = result.phases.understand[0].branch.find(
    (node) => node.kind === "quality" && node.name === "sound",
  );
  const phonetics = sound.state.phonetics;
  assertEquals(phonetics.find((part) => part.char === "a").isVowel, false);
  assertEquals(phonetics.find((part) => part.char === "b").isVowel, true);
  assert(
    result.phases.understand.every((root) => (
      branch(root, "language").state.matches.every((match) => match.lang === "joined")
    )),
    "only the whole-signal language was carried into thought",
  );
});

test("words from incompatible symbol systems do not form one language", () => {
  const knowledge = fromSources({ languages: [unrelated, joined] });
  const result = brainFrom("z ab+cd", knowledge);
  assertEquals(result.expression.state.mood, "tell");
  assertEquals(result.learned, null);
  assert(
    result.phases.understand.every((root) => branch(root, "language") === null),
    "no token borrowed a different language",
  );
});
