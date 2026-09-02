import { assert, assertEquals, test } from "runtime:test";
import { createBrain } from "./brain.js";
import { isEnvelope } from "./envelope.js";

test("the worked example: Hi -> Hello!", () => {
  const { brain } = createBrain();
  const out = brain("Hi");

  assertEquals(out.response, "Hello!");
  assertEquals(out.type, "greeting");
  assertEquals(out.data.language, "en");
  assertEquals(out.data.emotion, "friendly");
  assertEquals(out.data.valence, 0.6);
  assertEquals(out.meta.confidence, 1);
});

test("every path produces the same envelope shape", () => {
  const { brain } = createBrain();
  for (const input of ["Hi", "qwertyuiop", "", "thanks a lot"]) {
    assert(isEnvelope(brain(input)), `not an envelope for ${JSON.stringify(input)}`);
  }
});

test("a typo still lands on the right concept", () => {
  const { brain } = createBrain();
  assertEquals(brain("hellooo").type, "greeting");
  assertEquals(brain("thankss").type, "gratitude");
});

test("a phrase is understood as one unit", () => {
  const { brain } = createBrain();
  assertEquals(brain("how are you").type, "wellbeing_query");
  assertEquals(brain("what is your name").type, "identity");
});

test("unknown input is answered, not dropped", () => {
  const { brain } = createBrain();
  const out = brain("qwertyuiop plugh");

  assertEquals(out.type, "unknown");
  assertEquals(out.meta.confidence, 0);
  assertEquals(out.data.unknown.join(" "), "qwertyuiop plugh");
  assert(out.actions.some((a) => a.name === "learn_prompt"));
});

test("think() consults the conversation, not just the sentence", () => {
  const { brain } = createBrain();
  assertEquals(brain("Hi").response, "Hello!");
  assertEquals(brain("Hi").response, "Hello again!");
  assert(brain("Hi").data.repeat);
});

test("reset forgets the conversation but keeps what was learned", () => {
  const aci = createBrain();
  aci.brain("Hi");
  aci.reset();
  assertEquals(aci.brain("Hi").response, "Hello!");
});

test("half-understood input asks to be clarified", () => {
  const { brain } = createBrain();
  const out = brain("hello qwertyuiop plughxyz");

  assert(out.meta.confidence < 0.5);
  assert(out.data.uncertain);
  assert(out.actions.some((a) => a.name === "clarify"));
});

test("a farewell carries its action and closes the exchange", () => {
  const { brain } = createBrain();
  const out = brain("goodbye");
  assert(out.actions.some((a) => a.name === "end_session"));
  assert(out.data.closing);
});

test("the trace explains the answer step by step", () => {
  const { brain } = createBrain();
  const { trace } = brain("Hi");

  assert(trace.length > 0);
  assert(trace.some((e) => e.stage === "understand" && e.step === "match"));
  assert(trace.some((e) => e.stage === "think"));
  assert(trace.some((e) => e.stage === "solve"));
});

test("tracing can be turned off", () => {
  const { brain } = createBrain({ trace: false });
  assertEquals(brain("Hi").trace.length, 0);
});

test("the three stages can be driven separately", () => {
  const aci = createBrain();
  const understanding = aci.understand("Hi");
  assertEquals(understanding.concepts[0].name, "greeting");

  const plan = aci.think(understanding);
  assertEquals(plan.concept, "greeting");

  assertEquals(aci.solve(plan, understanding).response, "Hello!");
});

test("a word taught at runtime is understood immediately", () => {
  const aci = createBrain();
  assertEquals(aci.brain("howdy").type, "unknown");

  aci.learn.word("howdy", { concept: "greeting" });
  assertEquals(aci.brain("howdy").type, "greeting");
});

test("a rule taught at runtime changes the answer", () => {
  const aci = createBrain();
  aci.learn.rule({
    id: "shout",
    stage: "solve",
    priority: 200,
    then: (c) => {
      c.output.response = c.output.response.toUpperCase();
    },
  });
  assertEquals(aci.brain("Hi").response, "HELLO!");
});

test("a new concept can be taught end to end", () => {
  const aci = createBrain();
  aci.memory.concept("weather_query");
  aci.memory.evokes("weather_query", "curious");
  aci.learn.word("what is the weather", { concept: "weather_query", aliases: ["hows the weather"] });
  aci.learn.respond("weather_query", "I have no weather data yet.", { actions: [{ name: "fetch_weather" }] });

  const out = aci.brain("hows the weather");
  assertEquals(out.type, "weather_query");
  assertEquals(out.response, "I have no weather data yet.");
  assert(out.actions.some((a) => a.name === "fetch_weather"));
});

test("empty input is handled without inventing meaning", () => {
  const { brain } = createBrain();
  const out = brain("");
  assertEquals(out.type, "unknown");
  assertEquals(out.meta.confidence, 0);
});

test("meta records what matched and which rules fired", () => {
  const { brain } = createBrain();
  const { meta } = brain("Hi");
  assertEquals(meta.matched[0].word, "hi");
  assertEquals(meta.matched[0].method, "exact");
  assert(Array.isArray(meta.rules));
});
