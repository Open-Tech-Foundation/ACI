import { assertEquals, assertThrows, test } from "runtime:test";

import { createBrain, solve, think, understand } from "./brain.js";
import { Learned, UNKNOWN } from "./memory/learned.js";
import { Experience } from "./memory/experience.js";
import { illustration } from "../fixtures/illustration.js";

const brain = () => createBrain({ learned: illustration() });

test("understand resolves a known atom to itself", () => {
  assertEquals(understand(illustration(), "touch"), "touch");
});

test("understand resolves anything untaught to the reserved signal", () => {
  assertEquals(understand(illustration(), "plughxyz"), UNKNOWN);
});

test("think moves the brain along a taught effect", () => {
  assertEquals(think(illustration(), "idle", "touch"), "comfort");
});

test("think leaves the state alone when nothing was taught", () => {
  // Totality (SPEC §2.3): a signal with no taught effect on you does not move
  // you. Nothing is inferred and no nearest match is reached for.
  assertEquals(think(illustration(), "comfort", "hey"), "comfort");
});

test("solve reads out the expression for the state", () => {
  assertEquals(solve(illustration(), "comfort"), "feel");
});

test("solve is silent for a state with no taught expression", () => {
  // Totality (SPEC §2.4): silence is a legitimate output, not a failure.
  assertEquals(solve(illustration(), "idle"), null);
});

test("the original loop runs: { sense: touch } -> { express: feel }", () => {
  assertEquals(brain().sense({ sense: "touch" }).express, "feel");
});

test("a bare atom and a one-item sequence are the same turn", () => {
  assertEquals(brain().sense("touch").express, brain().sense(["touch"]).express);
});

test("meaning is where the walk ends, not what the first signal is", () => {
  // SPEC §3.3. Nothing about `hey` changed between these two turns.
  assertEquals(brain().sense(["hey"]).express, "hello");
  assertEquals(brain().sense(["hey", "stop", "that"]).express, "back-off");
});

test("signals in a turn are applied one at a time, in arrival order", () => {
  const { steps } = brain().sense(["hey", "stop"]);
  assertEquals(
    steps.map((s) => [s.from, s.signal, s.to]),
    [
      ["idle", "hey", "greeted"],
      ["greeted", "stop", "alarmed"],
    ],
  );
});

test("an untaught atom walks as the unknown signal", () => {
  const { steps, express } = brain().sense(["plughxyz"]);
  assertEquals(steps[0].atom, "plughxyz");
  assertEquals(steps[0].signal, UNKNOWN);
  assertEquals(express, "what");
});

test("the state carries between turns, and is the whole of the context", () => {
  const b = brain();
  assertEquals(b.sense(["hey"]).express, "hello");
  assertEquals(b.state, "greeted");
  // `stop` from idle is untaught; it only means something once greeted.
  assertEquals(b.sense(["stop"]).express, "back-off");

  const fresh = brain();
  assertEquals(fresh.sense(["stop"]).express, null);
});

test("the same input from the same state always gives the same output", () => {
  const runs = [];
  for (let i = 0; i < 5; i += 1) {
    const b = brain();
    runs.push([b.sense(["hey"]).express, b.sense(["stop", "that"]).express, b.state]);
  }
  for (const run of runs) assertEquals(run, runs[0]);
  assertEquals(runs[0], ["hello", "back-off", "alarmed"]);
});

test("reset returns the brain to the state training declared", () => {
  const b = brain();
  b.sense(["hey", "stop"]);
  assertEquals(b.reset(), "idle");
  assertEquals(b.sense(["hey"]).express, "hello");
});

test("an empty turn moves nothing and expresses the state it is already in", () => {
  const b = brain();
  b.sense(["touch"]);
  const turn = b.sense({ sense: [] });
  assertEquals(turn.steps, []);
  assertEquals(turn.express, "feel");
});

test("every transition reaches experience, including the ones that moved nothing", () => {
  const experience = new Experience();
  const b = createBrain({ learned: illustration(), experience });
  b.sense(["hey", "shove", "stop"]);

  assertEquals(
    experience.all().map((s) => [s.seq, s.from, s.signal, s.to]),
    [
      [1, "idle", "hey", "greeted"],
      // `shove` is untaught, so it becomes `unknown`, which greeted does teach.
      [2, "greeted", UNKNOWN, "puzzled"],
      // `stop` means nothing from puzzled, so nothing moves — still recorded.
      [3, "puzzled", "stop", "puzzled"],
    ],
  );
});

test("experience is never read back into a decision", () => {
  // SPEC §7. Two brains sharing one log must still answer identically.
  const experience = new Experience();
  const first = createBrain({ learned: illustration(), experience });
  first.sense(["hey", "stop", "that"]);

  const second = createBrain({ learned: illustration(), experience });
  assertEquals(second.sense(["hey"]).express, "hello");
});

test("a turn returns nothing but its expression and its walk", () => {
  // A guard against a confidence score, a rank or a strategy reappearing.
  assertEquals(Object.keys(brain().sense(["hey"])).sort(), ["express", "steps"]);
  const [step] = brain().sense(["hey"]).steps;
  assertEquals(Object.keys(step).sort(), ["atom", "from", "signal", "to"]);
});

test("a brain cannot exist without training that says where it starts", () => {
  assertThrows(() => createBrain({ learned: new Learned() }));
  assertThrows(() => createBrain({}));
});
