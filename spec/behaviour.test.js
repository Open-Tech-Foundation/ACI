/**
 * What the model does — written so that none of it depends on how.
 *
 * Read these as the contract. Every one of them is a sentence you could say to
 * somebody about the model without mentioning a single implementation word.
 */

import { scenario } from "./bdd.js";

// ------------------------------------------------- answering what it knows

scenario("it answers what it was taught to answer", (aci) => {
  aci("touch").answers("feel");
});

scenario("it answers the same way every time", (aci) => {
  for (let i = 0; i < 5; i += 1) aci("touch").answers("feel");
});

scenario("what happens in one session does not reach another", (aci, another) => {
  // The first session ends up somewhere that gives "stop" a meaning. A second
  // session, started from the same training, must be untouched by that.
  aci("hey").answers("hello");
  aci("stop").answers("back-off");
  another()("stop").saysNothing();
});

// --------------------------------------------------------- what it does not

scenario("it says nothing when it has nothing to say", (aci) => {
  aci([]).saysNothing();
});

scenario("something meaningless to it leaves it exactly as it was", (aci) => {
  aci("stop").saysNothing();
  aci("touch").answers("feel");
});

scenario("it never guesses at a near miss", (aci) => {
  // "touc" is one letter from something it knows well. A system that reaches
  // for the nearest thing would answer "feel" here. This one must not.
  aci("touc").answers("what");
});

scenario("it never invents an answer for something it has never met", (aci) => {
  aci("plughxyz").answers("what");
});

// ------------------------------------------------------- context and order

scenario("the same opening signal can end somewhere else", (aci) => {
  aci(["hey", "stop", "that"]).answers("back-off");
});

scenario("what happened earlier changes what a later signal means", (aci) => {
  // On its own, "stop" means nothing to it (see above). After a greeting, it
  // does — and nothing about the signal changed, only where it arrived.
  aci("hey").answers("hello");
  aci("stop").answers("back-off");
});

scenario("order matters within a single turn", (aci) => {
  aci(["stop", "hey"]).answers("hello");
});

scenario("a turn with nothing in it answers from wherever it already is", (aci) => {
  aci("hey").answers("hello");
  aci([]).answers("hello");
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
    aci("touch").answers("who's there");
  },
  { teach: differently },
);

scenario(
  "a differently taught model starts where its training says",
  (aci) => {
    aci([]).answers("zzz");
  },
  { teach: differently },
);

scenario(
  "an untrained model has nothing to say about anything",
  (aci) => {
    aci("touch").saysNothing();
    aci(["hey", "stop"]).saysNothing();
  },
  { teach: (learned) => learned.begins("blank") },
);
