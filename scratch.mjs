import { openBrain } from "./src/index.js";
const { brain, forget } = openBrain("sqlite::memory:");
const say = async (...xs) => { await forget(); let o; for (const x of xs) o = await brain(x, { from: 29 }); return o.expression.state.says; };
for (const [l, ...xs] of [
  ["john apples", "john has 3 apples", "john has how many apples?"],
  ["give to john", "john has 3 apples", "give 1 apple to john", "john has how many apples?"],
  ["alice bigger", "alice measures 2 metre", "bob measures 1 metre", "alice is bigger than bob?"],
  ["luna", "luna is a cat", "luna is an animal?"],
]) console.log(l.padEnd(16), "=>", JSON.stringify(await say(...xs)));
await forget();
