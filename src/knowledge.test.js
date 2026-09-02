import { assertEquals, test } from "runtime:test";

import { Knowledge } from "./knowledge.js";

const chain = {
  facts: [["sparrow", "is-a", "bird"], ["bird", "is-a", "animal"]],
  rules: [{ if: [["?a", "is-a", "?b"], ["?b", "is-a", "?c"]], then: ["?a", "is-a", "?c"] }],
};

test("a rule derives what nobody taught", () => {
  const knowledge = new Knowledge(chain);
  assertEquals(knowledge.holds(["sparrow", "is-a", "animal"]), true);
  assertEquals(knowledge.derived, 1);
});

test("with no rule, nothing is derived", () => {
  assertEquals(new Knowledge({ facts: chain.facts }).holds(["sparrow", "is-a", "animal"]), false);
});

test("what was never taught and cannot be derived does not hold", () => {
  assertEquals(new Knowledge(chain).holds(["sparrow", "is-a", "fish"]), false);
});

test("derivation reaches as far as the chain goes", () => {
  const knowledge = new Knowledge({
    facts: [["a", "is-a", "b"], ["b", "is-a", "c"], ["c", "is-a", "d"]],
    rules: chain.rules,
  });
  assertEquals(knowledge.holds(["a", "is-a", "d"]), true);
});

test("a cycle closes rather than running forever", () => {
  const knowledge = new Knowledge({
    facts: [["a", "is-a", "b"], ["b", "is-a", "a"]],
    rules: chain.rules,
  });
  assertEquals(knowledge.holds(["a", "is-a", "a"]), true);
});

test("find takes null as anything", () => {
  const knowledge = new Knowledge(chain);
  assertEquals(knowledge.find([null, "is-a", "animal"]).length, 2);
  assertEquals(knowledge.find(["sparrow", null, null]).length, 2);
});

test("isa gives a kind and everything it is", () => {
  assertEquals(new Knowledge(chain).isa("sparrow"), ["sparrow", "bird", "animal"]);
});
