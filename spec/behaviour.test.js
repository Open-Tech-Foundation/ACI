/**
 * What the model does — written so that none of it depends on how.
 *
 * Every input here is what an integrator would actually send: what arrived, on
 * which channel, with whatever detail they had. No internal name appears in
 * this file, and none should ever.
 */

import { scenario } from "./bdd.js";

const touch = (detail = {}) => ({ signal: "touch", ...detail });
const say = (message) => ({ signal: "text", message });

// ------------------------------------------------- answering what it knows

scenario("it answers what it was taught to answer", (aci) => {
  aci(touch()).answers("feel");
});

scenario("it answers the same way every time", (aci) => {
  for (let i = 0; i < 5; i += 1) aci(touch()).answers("feel");
});

scenario("what happens in one session does not reach another", (aci, another) => {
  // The first session ends up somewhere that gives "stop" a meaning. A second
  // session, started from the same training, must be untouched by that.
  aci(say("hey")).answers("hello");
  aci(say("stop")).answers("back-off");
  another()(say("stop")).saysNothing();
});

// ------------------------------------------------------ detail it was sent

scenario("detail it was never taught cannot change the answer", (aci) => {
  // The integrator knows where the touch landed. This brain does not know what
  // a shoulder is, so it is not moved by one — and the answer stands.
  aci(touch({ place: "shoulder" })).answers("feel");
});

scenario("more detail is safe to send than less", (aci) => {
  aci(touch({ place: "shoulder", force: "light", by: "someone" })).answers("feel");
});

scenario("the order the detail was written in does not matter", (aci) => {
  aci({ signal: "touch", place: "shoulder", force: "light" }).answers("feel");
});

scenario("the order the detail was written in does not matter, reversed", (aci) => {
  aci({ force: "light", place: "shoulder", signal: "touch" }).answers("feel");
});

// --------------------------------------------------------- what it does not

scenario("it says nothing when it has nothing to say", (aci) => {
  aci().saysNothing();
});

scenario("something meaningless to it leaves it exactly as it was", (aci) => {
  aci(say("stop")).saysNothing();
  aci(touch()).answers("feel");
});

scenario("it never guesses at a near miss", (aci) => {
  // "touc" is one letter from something it knows well. A system that reaches
  // for the nearest thing would answer "feel" here. This one must not.
  aci(say("touc")).answers("what");
});

scenario("it never invents an answer for something it has never met", (aci) => {
  aci({ signal: "plughxyz" }).answers("what");
});

scenario("knowing something and having a use for it are different", (aci, another) => {
  // This brain knows "stop" perfectly well — it just has no use for it before
  // anything else has happened. That is not the same as meeting a word for the
  // first time, and the two do not get the same answer.
  aci(say("stop")).saysNothing();
  another()(say("plughxyz")).answers("what");
});

scenario("it does not understand language yet, and says so", (aci) => {
  // Words are not signals until Layer 1 teaches which is which. Until then a
  // sentence is a run of things it has never met, and it answers accordingly
  // rather than pretending.
  aci(say("how do you do?")).answers("what");
});

// ------------------------------------------------------- context and order

scenario("the same opening signal can end somewhere else", (aci) => {
  aci(say("hey stop that")).answers("back-off");
});

scenario("what happened earlier changes what a later signal means", (aci) => {
  // On its own, "stop" means nothing to it (see above). After a greeting it
  // does — and nothing about the signal changed, only where it arrived.
  aci(say("hey")).answers("hello");
  aci(say("stop")).answers("back-off");
});

scenario("order matters within a single turn", (aci) => {
  aci(say("stop hey")).answers("hello");
});

scenario("several inputs in one turn arrive in the order they were given", (aci) => {
  aci(say("hey"), say("stop")).answers("back-off");
});

scenario("the same inputs in the other order end somewhere else", (aci) => {
  aci(say("stop"), say("hey")).answers("hello");
});

scenario("what reached it on one channel changes what another channel means", (aci) => {
  // Touched first, this brain is somewhere a greeting means nothing to it. The
  // greeting has not changed; where it landed has. This is the point of the
  // whole design, and it works across channels, not just within one.
  aci(touch(), say("hey")).answers("feel");
});

scenario("an empty turn answers from wherever it already is", (aci) => {
  aci(say("hey")).answers("hello");
  aci().answers("hello");
});

// -------------------------------------------------------------- it is taught

/**
 * Nothing in the answers above is built into the model. Teach it differently
 * and it behaves differently — which is the whole claim: what we train is what
 * comes out.
 */
const differently = (learned) =>
  learned
    .begins("asleep")
    .effect("asleep", "touch", "awake")
    .expresses("awake", "who's there")
    .expresses("asleep", "zzz");

scenario(
  "a differently taught model gives different answers to the same input",
  (aci) => {
    aci(touch()).answers("who's there");
  },
  { teach: differently },
);

scenario(
  "a differently taught model starts where its training says",
  (aci) => {
    aci().answers("zzz");
  },
  { teach: differently },
);

scenario(
  "an untrained model has nothing to say about anything",
  (aci) => {
    aci(touch()).saysNothing();
    aci(say("hey stop")).saysNothing();
  },
  { teach: (learned) => learned.begins("blank") },
);
