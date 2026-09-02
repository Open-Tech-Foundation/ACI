import { assert, assertEquals, test } from "runtime:test";
import { STAGES, chainFor, percent, signed } from "./chain.js";
import { createBrain } from "../../src/index.js";

const answer = (input) => createBrain().brain(input);
const kinds = (rows, stage) => rows.filter((r) => r.stage === stage).map((r) => r.kind);

test("the chain covers the whole pipeline", () => {
  const rows = chainFor(answer("Hi"));
  for (const stage of STAGES) {
    assert(rows.some((row) => row.stage === stage.id), `nothing in the ${stage.id} stage`);
  }
});

test("understanding is reported in traversal order", () => {
  const rows = chainFor(answer("Hi"));
  assertEquals(kinds(rows, "understand").join(" "), "word language concept emotion");
});

test("a matched word keeps what it was matched from", () => {
  const [word] = chainFor(answer("hellooo"));
  assertEquals(word.from, "hellooo");
  assertEquals(word.label, "hello");
  assert(word.score > 0.8);
});

test("an exact match is not dressed up as a correction", () => {
  const [word] = chainFor(answer("Hi"));
  assertEquals(word.note, "exact");
  assertEquals(word.score, 1);
});

test("unrecognised words appear as their own kind", () => {
  const rows = chainFor(answer("qwertyuiop"));
  assertEquals(kinds(rows, "understand").join(" "), "unknown");
  assertEquals(rows[0].label, "qwertyuiop");
});

test("a rule carries its own reason across from the trace", () => {
  const rows = chainFor(answer("Hi"));
  const rule = rows.find((row) => row.kind === "rule");
  assertEquals(rule.label, "carry-emotion");
  assert(rule.note.length > 0);
});

test("the chain still builds with tracing off", () => {
  const { brain } = createBrain({ trace: false });
  const rows = chainFor(brain("Hi"));
  assert(rows.length > 0);
  assertEquals(rows.find((row) => row.kind === "rule").note, undefined);
});

test("the answer is the last link", () => {
  const rows = chainFor(answer("Hi"));
  assertEquals(rows.at(-1).kind, "response");
  assertEquals(rows.at(-1).label, "Hello!");
});

test("actions are shown as steps of their own", () => {
  const rows = chainFor(answer("goodbye"));
  assert(rows.some((row) => row.kind === "action" && row.label === "end_session"));
});

test("nothing selected yields nothing to draw", () => {
  assertEquals(chainFor(undefined).length, 0);
});

test("numbers are formatted for reading", () => {
  assertEquals(percent(1), "100%");
  assertEquals(percent(0.333), "33%");
  assertEquals(signed(0.6), "+0.60");
  assertEquals(signed(-0.5), "-0.50");
});
