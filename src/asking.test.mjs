import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// A store of its own, that nothing else can reach.
const { brain, forget } = openBrain("sqlite::memory:");
const PERSON = 29;

async function fresh(...said) {
  await forget();
  let last;
  for (const s of said) last = await brain(s, { from: PERSON });
  return last;
}

test("a hole may say what kind of answer it wants", async () => {
  // Everything the car is stays true; only a colour is an answer to this.
  assertEquals((await fresh("a car is red", "what colour is the car")).expression.state.says, "red");
  assertEquals((await fresh("what colour is the sky")).expression.state.says, "blue");
  await forget();
});

test("the kind asked after is not one of the things asked about", async () => {
  const r = await fresh("a car is red", "the car is what");
  assertEquals(r.expression.state.says, "vehicle, red", "asked plainly, it says all of it");
  await forget();
});

test("a kind nothing was said of is unknown", async () => {
  assertEquals((await fresh("a car is red", "what size is the car")).expression.state.says, "I don't know.");
  await forget();
});

test("a hole standing where something played a part asks which thing played it", async () => {
  assertEquals((await fresh("a boy kicked the ball", "who kicked the ball")).expression.state.says, "boy");
  assertEquals((await fresh("a boy kicked the ball", "the boy kicked what")).expression.state.says, "ball");
  await forget();
});

test("nothing was told to have happened, so nothing played the part", async () => {
  assertEquals((await fresh("who kicked the ball")).expression.state.says, "I don't know.");
  await forget();
});

test("asking names nothing, with or without a question mark", async () => {
  // `telescope` is no word and no term. Asked, it is not a name being given:
  // the brain answers what it found and takes nothing in.
  const r = await fresh("the man saw the boy with the telescope", "who has the telescope");
  assertEquals(r.expression.state.says, "I don't know.");
  assertEquals(r.learned, null, "a question teaches nothing");
  assertEquals((await fresh("who has the telescope?")).expression.state.says, "I don't know.");
  await forget();
});

test("a choice joined by or is answered with the one it comes out for", async () => {
  // `or` joins as a choice, not a togetherness: one of them is the answer.
  // Each pairing is worked the way any comparison is.
  assertEquals((await fresh("which is smaller 8 or 0")).expression.state.says, "zero");
  assertEquals((await fresh("which is bigger 8 or 0")).expression.state.says, "eight");
  assertEquals((await fresh("what is smaller 8 or 0")).expression.state.says, "zero");
  const tied = await fresh("which is smaller 8 or 8");
  assertEquals(tied.learned, null, "a tie teaches nothing either");
  assertEquals(tied.expression.state.says, "neither", "a worked tie is neither of them");
  await forget();
});

test("a choice may be measured things, not only numbers", async () => {
  await forget();
  await brain("alice measures 2 metre big", { from: PERSON });
  await brain("bob measures 1 metre big", { from: PERSON });
  assertEquals((await brain("which is bigger alice or bob", { from: PERSON })).expression.state.says, "alice");
  await forget();
});

test("what was told of one doing is not told of another", async () => {
  const r = await fresh("a boy kicked the ball", "a man kicked the stone", "who kicked the stone");
  assertEquals(r.expression.state.says, "man");
  await forget();
});

test("a greeting before a signal is said alongside it, not in it", async () => {
  await forget();
  const r = await brain("hello, how are you?", { from: PERSON });
  assertEquals(r.expression.name, "greet");
  assert(r.expression.state.says.startsWith("Hello!"), "greeted");
  assert(r.expression.branch.length > 1, "and the rest answered on its own");
  await forget();
});

test("one greeting after another is two greetings, not a greeting and a signal", async () => {
  await forget();
  const r = await brain("hi hi");
  assertEquals(r.expression.name, "greet");
  assertEquals(r.expression.state.says, "Hello!", "said once, however many times it was said");
  await forget();
});

test("how asks after the way a thing is, not what it is", async () => {
  await forget();
  // The brain holds no state of its own, so it has no evidence for an answer.
  assertEquals((await brain("how are you?", { from: PERSON })).expression.state.says, "I don't know.");
  assertEquals((await brain("what are you")).expression.state.says, "computer");
  await forget();
});

test("when asks after when, and answering what a thing is is no answer", async () => {
  // `when is dinner` used to say `meal` — the kind of thing dinner is, which
  // is not when it is. Nobody has said when, so there is nothing to say.
  assertEquals((await fresh("when is dinner")).expression.name, "unsure");
  // And `why is a cat` said `mammal`, which is the same answer to the same
  // question nobody asked. A kind is not a reason.
  assertEquals((await fresh("why is a cat")).expression.name, "unsure");
  await forget();
});

test("when across time stays unknown where nothing does", async () => {
  await forget();
  await brain("a drum is cold");
  assertEquals((await brain("when is it?")).expression.state.says, "I don't know.");
  await forget();
});

test("a signal may turn its joint to the front", async () => {
  await forget();
  assertEquals((await brain("is a cat an animal?")).expression.name, "affirm");
  assertEquals((await brain("is a cat a fish?")).expression.name, "deny");
  assertEquals((await brain("is 10 greater than 2?")).expression.name, "affirm");
  await forget();
});

test("an operation standing before what it takes is a doing, not a joint", async () => {
  await forget();
  await brain("a basket holds three apple");
  assertEquals((await brain("add one apple into it", { from: PERSON })).expression.name, "learn");
  assertEquals((await brain("it holds how many apples?")).expression.state.says, "four");
  await forget();
});

test("every word for greeting is the one act of greeting", async () => {
  for (const said of ["hello", "hi", "hey", "welcome", "greetings"]) {
    await forget();
    const r = await brain(said, { from: PERSON });
    assertEquals(r.expression.name, "greet", said);
    assertEquals(r.learned, null, `nothing about the world was said: ${said}`);
  }
  await forget();
});

test("a doing that itself holds its doer answers a who-word alone", async () => {
  assertEquals((await fresh("sara arrived", "who arrived")).expression.state.says, "sara");
  assertEquals((await fresh("sara ran", "who ran")).expression.state.says, "sara");
  await forget();
});

test("every who did it, in the order they did", async () => {
  assertEquals((await fresh("sara arrived", "john arrived", "who arrived")).expression.state.says, "sara, john");
  await forget();
});

test("who nothing was told to have done answers nothing", async () => {
  assertEquals((await fresh("who arrived")).expression.state.says, "I don't know.");
  await forget();
});

test("a hole asks the part it stands in, from either side of the doing", async () => {
  // `what did sara wash` used to say it did not know: the word carrying the
  // tense was read as a doing of its own — doing again what was done before —
  // and the question had two doings in it where it named one.
  assertEquals((await fresh("sara washed the car", "who washed the car")).expression.state.says, "sara");
  assertEquals((await fresh("sara washed the car", "what did sara wash")).expression.state.says, "car");
  await forget();
});

test("a hole is what it asks after, not how it is spelled", async () => {
  // `Which fruit is yellow?` is the same question as `which fruit is yellow?`
  // — a capital first letter is how English opens a sentence, not a different
  // word. The reading that answers it was matched against the three English
  // words themselves, so the capital turned it into another question and every
  // word in it answered: `food, banana, colour, property`.
  await forget();
  await brain("the apple is red");
  await brain("the banana is yellow");
  assertEquals((await brain("Which fruit is yellow?")).expression.state.says, "banana");
  assertEquals((await brain("which fruit is yellow?")).expression.state.says, "banana");
  assertEquals((await brain("What is yellow?")).expression.state.says, "banana");
  assertEquals((await brain("Who is yellow?")).expression.state.says, "banana");
  await forget();
});

test("a description says which thing, and that thing is the answer", async () => {
  // `the capital of france` is a way of saying paris. The question asks which
  // thing it is, not what that thing is besides — it was answering `city`.
  await forget();
  assertEquals((await brain("what is the capital of france?")).expression.state.says, "paris");
  assertEquals((await brain("what is the capital of india?")).expression.state.says, "delhi");
  // Nothing is a capital of a city, so there is no thing to name.
  assertEquals((await brain("what is the capital of paris?")).expression.state.says, "I don't know.");
  await forget();
});

test("asking what a thing is still answers what it is", async () => {
  await forget();
  assertEquals((await brain("what is paris?")).expression.state.says, "city");
  assertEquals((await brain("what is a wren?")).expression.state.says, "bird");
  await forget();
});

test("the capital runs from the city to the country it is of", async () => {
  await forget();
  assertEquals((await brain("is paris the capital of france?")).expression.name, "affirm");
  assertEquals((await brain("is france the capital of paris?")).expression.name, "unsure");
  await forget();
});

test("when a happening is asked after, the happening's own row answers", async () => {
  // `when did the crash happen?` names the crash and no part of it, and the
  // reading that answers a when was looking only at rows some *other* word in
  // the question stood in. With nothing else standing there it found none.
  await forget();
  await brain("the server started at nine hours and fifteen minutes");
  await brain("the crash happened two hours after the server started");
  assertEquals((await brain("when did the crash happen?")).expression.state.says, "eleven fifteen");
  await forget();
});
