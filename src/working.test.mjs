import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

const held = openBrain("sqlite::memory:");
const { brain, forget, conversation } = held;
const says = async (q) => (await brain(q)).expression.state.says;

test("the steps of working something out are kept, and are not facts", async () => {
  await forget();
  await brain("a shop has 120 apples");
  await brain("the shop gave 30 apples to sam");
  assertEquals(await says("how many apples does the shop have?"), "ninety");
  const shown = conversation.worked.serialize(null);
  // What was told, and what it came to. Ninety was never told, so it is no
  // fact — and it stands here, where the steps stand.
  assert(/told .* × 120/.test(shown), shown);
  assert(/moved .* × 90  of s\d/.test(shown), shown);
  assert(!/property|holding/.test(shown), `no facts here:\n${shown}`);
});

test("told none and telling nobody are not the same step", async () => {
  await forget();
  await brain("a shop has 120 apples");
  await brain("the shop gave 30 apples to sam");
  await says("how many apples does sam have?");
  const shown = conversation.worked.serialize(null);
  // Nobody said sam had none; the brain took none because it watched thirty
  // arrive at a hand it had never been told held any.
  assert(/none .* × 0/.test(shown), shown);
  assert(/moved .* × 30  of s\d/.test(shown), shown);
});

test("a step says what it was worked from", async () => {
  await forget();
  await brain("a shop has 120 apples");
  await brain("the shop gave 30 apples to sam");
  await says("how many apples does the shop have?");
  const all = conversation.worked.all();
  const last = all[all.length - 1];
  const chain = conversation.worked.back(last.id);
  assertEquals(chain.length, 2, "the telling and the moving");
  assertEquals(chain[0].value, 120);
  assertEquals(chain[1].value, 90);
});

test("the working is the conversation's, and goes when it does", async () => {
  await forget();
  await brain("a shop has 120 apples");
  await brain("the shop gave 30 apples to sam");
  await says("how many apples does the shop have?");
  assert(conversation.worked.all().length > 0);
  await forget();
  assertEquals(conversation.worked.all().length, 0);
});
