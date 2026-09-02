import { assertEquals, test } from "runtime:test";

import { createBrain } from "../../src/index.js";
import { illustration } from "../../fixtures/illustration.js";
import { walkFor } from "./walk.js";

const turn = (atoms) => {
  const learned = illustration();
  const brain = createBrain({ learned });
  const from = brain.state;
  return walkFor(brain.sense(atoms), from, learned);
};

test("a walk alternates state and signal, and ends in the read-out", () => {
  assertEquals(
    turn(["hey", "stop"]).map((row) => [row.kind, row.label]),
    [
      ["state", "idle"],
      ["signal", "hey"],
      ["state", "greeted"],
      ["signal", "stop"],
      ["state", "alarmed"],
      ["express", "back-off"],
    ],
  );
});

test("an unrecognised atom is marked, and shown beside what it became", () => {
  const rows = turn(["plughxyz"]);
  assertEquals(rows[1].kind, "unknown");
  assertEquals(rows[1].label, "unknown");
  assertEquals(rows[1].atom, "plughxyz");
});

test("a recognised atom carries no second label", () => {
  assertEquals(turn(["hey"])[1].atom, null);
});

test("a signal with nothing taught for it is marked untaught", () => {
  const rows = turn(["hey", "shove"]);
  assertEquals(rows[1].taught, true);
  // `shove` becomes `unknown`, and greeted does teach an effect for unknown.
  assertEquals(rows[3].taught, true);
  assertEquals(turn(["stop"])[1].taught, false);
});

test("a taught effect that stays put is not reported as untaught", () => {
  // alarmed + that -> alarmed is a taught self-loop. Reading "did it move?" as
  // "was anything taught?" would call this untaught, and it is not.
  const rows = turn(["hey", "stop", "that"]);
  assertEquals(rows[5].label, "that");
  assertEquals(rows[5].taught, true);
  assertEquals(rows[6].label, "alarmed");
});

test("silence is drawn as a read-out, not as an empty row", () => {
  const rows = turn([]);
  assertEquals(rows.at(-1), { kind: "express", label: "silence", silent: true });
});
