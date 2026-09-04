import { test } from "runtime:test";
import { openBrain } from "./index.js";

// What the brain is aimed at, not what it does yet. Every line here is a
// question with one right answer that does not depend on who is asking or how
// it is worded — the ones that need judgement, generation or taste have been
// left out, because there is nothing for a deterministic brain to be right
// about in them.
//
// This scan reports and does not fail. It is a list to shorten, and what it
// prints is where the brain stands today.
const { brain, forget } = openBrain("sqlite::memory:");
const PERSON = 29;

// Each aim is what to say, then what the answer must hold.
const AIMS = [
  ["counting", [
    [["5 + 7"], "12"],
    [["10 > 2"], "Yes"],
    [["15 > 20?"], "No"],
    [["x is 1", "y is 2", "add x and y"], "three"],
    [["a box holds 10 coins", "take 3 coins from the box", "the box holds how many coins?"], "seven"],
    [["a tree holds 5 birds", "take 2 birds from the tree", "the tree holds how many birds?"], "three"],
  ]],
  ["what a thing is", [
    [["a dog is an animal?"], "Yes"],
    [["luna is a cat", "luna is an animal?"], "Yes"],
    [["john has 3 apples", "give 1 apple to john", "john has how many apples?"], "four"],
  ]],
  ["what the world holds", [
    [["france capital what"], "paris"],
    [["a week has how many days?"], "seven"],
    [["the sky is blue?"], "Yes"],
    [["japan speaks what"], "japanese"],
    [["a year has how many months?"], "twelve"],
  ]],
  ["standing on a scale", [
    [["alice measures 2 metre", "bob measures 1 metre", "alice is bigger than bob?"], "Yes"],
    [["tom is a person", "sam is a person", "tom is older than sam?"], "I don't know"],
  ]],
  ["what a word says", [
    [["i am sad"], "Sorry"],
    [["i am happy"], "Good"],
    [["ravi is in chennai", "where is ravi"], "chennai"],
    [["the boy kicked the ball", "who kicked the ball"], "boy"],
  ]],
  ["holding a conversation", [
    [["my colour is blue", "what is my colour"], "blue"],
    [["sarah is a woman", "sarah is a man"], "No"],
    [["a car is red", "what colour is the car"], "red"],
  ]],
  ["more than one meaning", [
    [["i saw her duck"], "duck"],
    [["the man saw the boy with the telescope", "who has the telescope"], "I don't know"],
  ]],
];

test("what the brain is aimed at", async () => {
  let reached = 0;
  let total = 0;
  for (const [group, aims] of AIMS) {
    console.log(`\n— ${group}`);
    for (const [said, wanted] of aims) {
      await forget();
      let last;
      for (const one of said) last = await brain(one, { from: PERSON });
      const got = last.expression.state.says ?? "—";
      const hit = String(got).toLowerCase().includes(String(wanted).toLowerCase());
      total += 1;
      if (hit) reached += 1;
      console.log(`  ${hit ? "ok  " : "not "} ${JSON.stringify(said[said.length - 1])} => ${JSON.stringify(got)}${hit ? "" : `   (wanted ${JSON.stringify(wanted)})`}`);
    }
  }
  console.log(`\n${reached} of ${total} reached\n`);
  await forget();
});
