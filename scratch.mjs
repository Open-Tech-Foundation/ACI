import { openBrain } from "./src/index.js";
const { brain, forget } = openBrain("sqlite::memory:");
await forget();
for (const i of ["if x > 10, then say big else say small", "x is 15", "you follow instruction?", "you follow an instruction"]) {
  console.log(JSON.stringify(i).padEnd(42), "=>", JSON.stringify((await brain(i)).expression.state.says));
}
await forget();
