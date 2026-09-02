import { assertEquals, test } from "runtime:test";

import { createBrain } from "../brain.js";
import { trainExample } from "./example.js";

/**
 * These two lock the specification's worked examples. If either changes, the
 * document changed first — or something drifted.
 */

test("SPEC §3.2 — { sense: touch } -> { express: feel }", () => {
  const brain = createBrain({ learned: trainExample() });
  assertEquals(brain.sense({ sense: "touch" }), {
    express: "feel",
    steps: [{ from: "idle", atom: "touch", signal: "touch", to: "comfort" }],
  });
});

test("SPEC §3.3 — the same opening signal, two walks, two answers", () => {
  const short = createBrain({ learned: trainExample() });
  const long = createBrain({ learned: trainExample() });

  assertEquals(short.sense(["hey"]).express, "hello");
  assertEquals(long.sense(["hey", "stop", "that"]).express, "back-off");
  assertEquals(long.state, "alarmed");
});

test("the training declares idle silent, and it stays silent", () => {
  assertEquals(createBrain({ learned: trainExample() }).sense([]).express, null);
});
