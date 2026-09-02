import { assertEquals, test } from "runtime:test";

import { Experience } from "./experience.js";

test("experience numbers what happened, oldest first", () => {
  const experience = new Experience();
  experience.append({ from: "idle", atom: "hey", signal: "hey", to: "greeted" });
  experience.append({ from: "greeted", atom: "stop", signal: "stop", to: "alarmed" });

  assertEquals(experience.size, 2);
  assertEquals(experience.all().map((s) => s.seq), [1, 2]);
  assertEquals(experience.all()[0].to, "greeted");
});

test("the log hands back a copy, so a reader cannot rewrite the past", () => {
  const experience = new Experience();
  experience.append({ from: "idle", atom: "hey", signal: "hey", to: "greeted" });
  experience.all().push({ seq: 99 });
  assertEquals(experience.size, 1);
});
