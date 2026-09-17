import { test, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// A store of its own, that nothing else can reach.
const { brain, forget } = openBrain("sqlite::memory:");

test("the same as says one thing is another, and the same colour as does not", async () => {
  // `as` is how English says `because`, how it says the far side of a
  // sameness, and how it closes `the same as`. Which one is meant turns on
  // what stands before it: a scale says the sameness is on that scale, and
  // nothing else does. Reading it as the joint whenever `same` stood behind it
  // broke plain identity — `is the potter the same as arun?` came back unread.
  await forget();
  await brain("arun is the same as the potter");
  assertEquals((await brain("is the potter the same as arun?")).expression.name, "affirm");
  await forget();
  await brain("arun has 3 ropes");
  await brain("arun is the same as the potter");
  assertEquals((await brain("how many ropes does the potter have?")).expression.state.says, "three");
  await forget();
  await brain("the apple is green");
  await brain("the mango is green");
  assertEquals((await brain("is the apple the same colour as the mango?")).expression.name, "affirm");
  await forget();
  await brain("the drum is cold as the room is cold");
  assertEquals((await brain("why is the drum cold?")).expression.state.says, "a room is cold");
  await forget();
});
