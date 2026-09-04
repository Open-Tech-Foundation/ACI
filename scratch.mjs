import { openBrain } from "./src/index.js";
const { brain, forget } = openBrain("sqlite::memory:");
await forget();
for (const i of ["a basket has 3 apples", "i take one apple from it", "the basket has how many apples?",
                 "give two apples to it", "the basket has how many apples?"]) {
  console.log(JSON.stringify(i).padEnd(36), "=>", JSON.stringify((await brain(i, { from: 29 })).expression.state.says));
}
await forget();
