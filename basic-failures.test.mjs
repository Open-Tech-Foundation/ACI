import { test, assert } from "runtime:test";
import { openBrain } from "./src/index.js";

const { brain } = openBrain("sqlite::memory:");

const tests = [
  // Level 0: single words (should work)
  "hi",
  "cat",
  "two",
  "is",
  
  // Level 1: simple known phrases (should work)
  "a cat is an animal",
  "two plus three",
  "what is your name",
  "how many mammal",
  
  // Level 2: things that might break
  "my cat",
  "nobody runs",
  "i hurt myself",
  "cat bigger than dog",
  "because cat is animal",
  "if cat then animal",
  "i know that cat is animal",
  "the cat would be an animal",
  "first cat then dog",
  "the cat is not an animal",
  "a cat is very big",
  "all cats are animals",
  "some dogs are brown",
  "the king of france is bald",
  "it rains",
  "time is money",
  "x is 5",
  "hello world",
  "a cat and a dog",
  "add 1 with 8",
  "1 + 2 * 3",
  "take one apple from the basket",
  "a basket has three apple",
];

function findNode(n, kind) {
  if (!n) return null;
  if (n.kind === kind) return n;
  for (const b of (n.branch || [])) {
    const found = findNode(b, kind);
    if (found) return found;
  }
  return null;
}

test("basic failure scan", async () => {
  for (const input of tests) {
    const r = await brain(input);
    const expr = r.expression;
    const said = expr ? expr.state.says : "?";
    const name = expr ? expr.name : "?";
    const bound = expr ? expr.state.bound : "?";
    
    const standing = findNode(r.roots[0], "standing");
    const answer = findNode(r.roots[0], "answer");
    const learn = findNode(r.roots[0], "learn");
    const refuse = findNode(r.roots[0], "refuse");
    const sum = findNode(r.roots[0], "sum");
    const count = findNode(r.roots[0], "count");
    const did = findNode(r.roots[0], "did");
    const unheard = findNode(r.roots[0], "unheard") || (expr && expr.name === "unheard");
    
    const detail = standing ? `standing:${standing.name}` :
                   answer ? `answer:${JSON.stringify(answer.state.found)}` :
                   learn ? `learn` :
                   refuse ? `refuse:${refuse.name}` :
                   sum ? `sum:${sum.state.value}` :
                   count ? `count:${count.state.members}` :
                   did ? `did:${did.state.after}` :
                   unheard ? "UNHEARD" : "";
    
    const flag = name === "unheard" || name === "unknown" ? " <<< FAIL" : "";
    console.log(`"${input}" => ${name}: "${said}" [${detail}]${flag}`);
  }
});
