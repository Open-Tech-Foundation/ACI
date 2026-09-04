import { openBrain } from "./src/index.js";
const { brain, forget } = openBrain("sqlite::memory:");
await forget();
for (const i of ["a family has two sisters and one brother", "how many sisters", "how many brothers",
                 "how many brothers and sisters", "how many humans", "how many amphibian?", "how many mammal?"]) {
  console.log(JSON.stringify(i).padEnd(42), "=>", JSON.stringify((await brain(i)).expression.state.says));
}
await forget();
