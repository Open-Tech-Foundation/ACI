import { openBrain } from "./src/index.js";
const { brain, forget } = openBrain("sqlite::memory:");
const say = async (...xs) => { await forget(); let o; for (const x of xs) o = await brain(x); return o.expression.state.says; };
for (const [l, ...xs] of [["1>2","1>2"], ["10>2","10>2"], ["10 > 2","10 > 2"], ["2 equals 2","2 equals 2"],
  ["2 equals 3","2 equals 3"], ["cow heavier", "a cow weighs 500 gram", "a goat weighs 200 gram", "a cow is heavier than a goat"],
  ["a mango is a fruit", "a mango is a fruit"]])
  console.log(l.padEnd(20), "=>", JSON.stringify(await say(...xs)));
await forget();
