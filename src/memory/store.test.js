import { assertEquals, test } from "runtime:test";

import { createBrain } from "../brain.js";
import { illustration } from "../../fixtures/illustration.js";
import { experienceIn, loadLearned, open, saveLearned } from "./store.js";

test("training survives a round trip through sqlite unchanged", async () => {
  const db = await open();
  const taught = illustration();
  await saveLearned(db, taught);

  const loaded = await loadLearned(db);
  assertEquals(loaded.toRows(), taught.toRows());
});

test("a brain loaded from sqlite answers exactly as the taught one does", async () => {
  const db = await open();
  await saveLearned(db, illustration());
  const loaded = createBrain({ learned: await loadLearned(db) });
  const taught = createBrain({ learned: illustration() });

  for (const turn of [["hey"], ["stop", "that"], ["plughxyz"], ["touch"]]) {
    assertEquals(loaded.sense(turn).express, taught.sense(turn).express);
  }
});

test("saving replaces what was there rather than merging with it", async () => {
  const db = await open();
  await saveLearned(db, illustration());

  const narrowed = illustration();
  narrowed.effects.delete([...narrowed.effects.keys()][0]);
  await saveLearned(db, narrowed);

  assertEquals((await loadLearned(db)).toRows(), narrowed.toRows());
});

test("experience written to sqlite reads back in the order it happened", async () => {
  const db = await open();
  const experience = experienceIn(db, (error) => {
    throw error;
  });
  const brain = createBrain({ learned: illustration(), experience });
  brain.sense(["hey", "stop", "that"]);

  const steps = await experience.all();
  assertEquals(
    steps.map((s) => [s.from, s.signal, s.to]),
    [
      ["idle", "hey", "greeted"],
      ["greeted", "stop", "alarmed"],
      ["alarmed", "that", "alarmed"],
    ],
  );
});

test("a write that fails reaches the handler and does not stop the next one", async () => {
  const db = await open();
  const failures = [];
  const experience = experienceIn(db, (error) => failures.push(error));

  experience.append({ from: "idle", atom: "hey", signal: "hey", to: "greeted" });
  // `null` violates the not-null column, so this one has to fail on its own.
  experience.append({ from: null, atom: "x", signal: "x", to: "y" });
  experience.append({ from: "greeted", atom: "stop", signal: "stop", to: "alarmed" });

  const steps = await experience.all();
  assertEquals(failures.length, 1);
  assertEquals(steps.map((s) => s.signal), ["hey", "stop"]);
});
