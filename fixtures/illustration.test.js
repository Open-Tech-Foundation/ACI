import { assertEquals, test } from "runtime:test";

import { createBrain } from "../src/brain.js";
import { illustration } from "./illustration.js";

/**
 * These two lock the specification's worked examples. If either changes, the
 * document changed first — or something drifted.
 */

test("SPEC §3.2 — { sense: touch } -> { express: feel }", () => {
  const brain = createBrain({ learned: illustration() });
  assertEquals(brain.sense({ sense: "touch" }), {
    express: "feel",
    steps: [{ from: "idle", atom: "touch", signal: "touch", to: "comfort" }],
  });
});

test("SPEC §3.3 — the same opening signal, two walks, two answers", () => {
  const short = createBrain({ learned: illustration() });
  const long = createBrain({ learned: illustration() });

  assertEquals(short.sense(["hey"]).express, "hello");
  assertEquals(long.sense(["hey", "stop", "that"]).express, "back-off");
  assertEquals(long.state, "alarmed");
});

test("the training declares idle silent, and it stays silent", () => {
  assertEquals(createBrain({ learned: illustration() }).sense([]).express, null);
});
