import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// A store of its own, that nothing else can reach.
const { brain, forget } = openBrain("sqlite::memory:");

async function fresh(...said) {
  await forget();
  let last;
  for (const s of said) last = await brain(s);
  return last;
}

// A metre serves a height, a length and a size alike, so a signal that gives
// one says which. A gram can be nothing but weight, and says nothing.
const MEASURED = [
  "a cow weighs 500 gram",
  "the cow measures 2 metre big",
  "a goat weighs 200 gram",
  "the goat measures 3 metre big",
];

test("a comparative says which scale it compares on", async () => {
  // The same two things, and two answers: heavier reads what they weigh,
  // bigger reads how big they are, and neither reads the other.
  assertEquals((await fresh(...MEASURED, "a cow is heavier than a goat?")).expression.name, "affirm");
  assertEquals((await fresh(...MEASURED, "a cow is bigger than a goat?")).expression.name, "deny");
  await forget();
});

test("the other way round is the other end of the same scale", async () => {
  assertEquals((await fresh(...MEASURED, "a cow is smaller than a goat?")).expression.name, "affirm");
  assertEquals((await fresh(...MEASURED, "a goat is heavier than a cow?")).expression.name, "deny");
  await forget();
});

test("with no scale said, two scales that disagree are no answer", async () => {
  const r = await fresh(...MEASURED, "is a cow more than a goat?");
  assertEquals(r.expression.name, "unsure", "heavier and smaller at once is not the comparison");
  await forget();
});

test("a thing nothing has measured cannot be compared", async () => {
  assertEquals((await fresh("a cow is heavier than a goat?")).expression.name, "unsure");
  await forget();
});

test("a comparison is said back as the comparing, not as more-or-less", async () => {
  // The standing joins the things by more, but what the signal said was
  // bigger — and a name takes no article.
  await forget();
  await brain("alice measures 2 metre big");
  await brain("bob measures 1 metre big");
  assertEquals(
    (await brain("alice is bigger than bob?")).expression.state.says,
    "Yes. ✅ alice is bigger than bob.",
  );
  await forget();
  assertEquals(
    (await fresh(...MEASURED, "a cow is heavier than a goat?")).expression.state.says,
    "Yes. ✅ a cow is heavier than a goat.",
  );
  assertEquals(
    (await fresh(...MEASURED, "a cow is smaller than a goat?")).expression.state.says,
    "Yes. ✅ a cow is smaller than a goat.",
  );
  await forget();
});

test("the things compared are the things, not the words joining them", async () => {
  // `a cow is heavier than a goat` names two relations, and neither of them
  // is one of the things being compared.
  const one = await fresh("a cow weighs 500 gram", "a goat weighs 200 gram", "a cow is heavier than a goat?");
  assertEquals(one.expression.name, "affirm");
  await forget();
});

test("what the brain worked out, it answers — asked or not", async () => {
  await forget();
  // Told that ten is more than two, saying it already knew is beside the
  // point: it did not know it, it worked it out.
  assertEquals((await brain("10 > 2")).expression.name, "affirm");
  assertEquals((await brain("1 > 2")).expression.name, "deny");
  assertEquals((await brain("2 equals 2")).expression.name, "affirm");
  // A claim laid against the world is another matter: told one it holds, it
  // says it knew.
  assertEquals((await brain("a mango is a fruit")).expression.name, "understood");
  await forget();
});

test("which of two, where the world names neither number", async () => {
  await forget();
  // No world names every number. The comparison is worked out all the same,
  // and the amount that came out on top is the answer.
  assertEquals((await brain("which is larger 145 or 154?")).expression.state.says, "154");
  assertEquals((await brain("which is smaller, 145 or 154?")).expression.state.says, "145");
  assertEquals(
    (await brain("which is smaller, 8 or 0?")).expression.state.says,
    "zero",
    "and one the world does name is said by its word",
  );
  await forget();
});

test("comparing is an ordering, whatever the world said about it", async () => {
  // `more-deep` was never marked transitive or asymmetric; `more-big` was.
  // Being a comparison is what says so, so both answer alike.
  assertEquals(
    (await fresh(
      "a lake is deeper than a pond",
      "a pond is deeper than a puddle",
      "is a lake deeper than a puddle?",
    )).expression.name,
    "affirm",
  );
  assertEquals(
    (await fresh(
      "a lake is deeper than a pond",
      "is a pond deeper than a lake?",
    )).expression.name,
    "deny",
  );
  await forget();
});

test("nothing is further along than itself", async () => {
  assertEquals(
    (await fresh("a lake is deeper than a lake?")).expression.name,
    "deny",
  );
  await forget();
});

test("one scale is one fact, read from either end", async () => {
  // Nothing joins warm to cold. They are two states of one scale pointing
  // opposite ways along it, and that is the whole of what makes them converse.
  assertEquals(
    (await fresh("a shed is colder than a hut", "is a hut warmer than a shed?")).expression.name,
    "affirm",
  );
  assertEquals(
    (await fresh("a lane is narrower than a road", "is a road wider than a lane?")).expression.name,
    "affirm",
  );
  assertEquals(
    (await fresh("a wren is tinier than a crow", "is a crow bigger than a wren?")).expression.name,
    "affirm",
  );
  await forget();
});

test("width, depth and thickness are not length", async () => {
  // A scale that held all four made a wider thing a shallower one.
  assertEquals(
    (await fresh("a lane is narrower than a road", "is a road deeper than a lane?")).expression.name,
    "unsure",
  );
  await forget();
});

test("a scale is of something the brain already knows", async () => {
  // Brightness is how much light there is, and the brain has held light as a
  // kind of energy all along. Nothing here is about seeing: a candle is
  // dimmer than a lamp in an empty room.
  assertEquals(
    (await fresh("a lamp is brighter than a candle", "is a candle darker than a lamp?"))
      .expression.name,
    "affirm",
  );
  assertEquals(
    (await fresh("a drum is louder than a bell", "is a bell quieter than a drum?"))
      .expression.name,
    "affirm",
  );
  await forget();
});

test("what a scale orders, it orders strictly", async () => {
  assertEquals(
    (await fresh(
      "a room is darker than a hall",
      "a hall is darker than a yard",
      "is a room darker than a yard?",
    )).expression.name,
    "affirm",
  );
  assertEquals(
    (await fresh("a room is darker than a hall", "is a hall darker than a room?"))
      .expression.name,
    "deny",
  );
  await forget();
});

test("strength is of force, wetness of water", async () => {
  // Both were already in the world; only the rung between them and the states
  // was missing. Fullness, cleanliness and health are not wired: space, dirt
  // and sickness are not there to be a scale of.
  assertEquals(
    (await fresh("a rope is stronger than a thread", "is a thread weaker than a rope?"))
      .expression.name,
    "affirm",
  );
  assertEquals(
    (await fresh("a sponge is wetter than a cloth", "is a cloth drier than a sponge?"))
      .expression.name,
    "affirm",
  );
  await forget();
});

test("one scale is one ordering, whatever word reaches it", async () => {
  // `hotter` and `warmer` were two relations on one scale, so a chain said
  // half in one and half in the other reached nothing.
  assertEquals(
    (await fresh(
      "a shed is hotter than a hut",
      "a hut is warmer than a barn",
      "is a shed hotter than a barn?",
    )).expression.name,
    "affirm",
  );
  assertEquals(
    (await fresh(
      "a shed is hotter than a hut",
      "a hut is warmer than a barn",
      "is a shed warmer than a barn?",
    )).expression.name,
    "affirm",
  );
  await forget();
});

test("a comparison is said back with the word it was asked with", async () => {
  await forget();
  await brain("a lake is deeper than a pond");
  // No language lists `deeper`; it is made the way it is read, by the ending
  // that says a comparison.
  assertEquals(
    (await brain("is a lake deeper than a pond?")).expression.state.says,
    "Yes. ✅ a lake is deeper than a pond.",
  );
  assertEquals(
    (await brain("is a pond shallower than a lake?")).expression.state.says,
    "Yes. ✅ a pond is shallower than a lake.",
  );
  await forget();
});

test("a comparison with nobody named on the other end asks for the end it reads", async () => {
  // Told only that tom is taller than sam, `who is shorter?` is sam: the one
  // the ordering puts below. The word's own direction says which end it reads.
  await forget();
  await brain("tom is taller than sam");
  assertEquals((await brain("who is shorter?")).expression.state.says, "sam");
  await forget();
});

test("the more end of a bare comparison answers the high end", async () => {
  await forget();
  await brain("tom is taller than sam");
  assertEquals((await brain("who is taller?")).expression.state.says, "tom");
  await forget();
});

test("a bare comparison reads the ordering, not the word it was said with", async () => {
  // Said the other way round — sam is shorter than tom — the fact is the same,
  // so the bare question finds the same ends.
  await forget();
  await brain("sam is shorter than tom");
  assertEquals((await brain("who is shorter?")).expression.state.says, "sam");
  assertEquals((await brain("who is taller?")).expression.state.says, "tom");
  await forget();
});

test("a bare comparison answers across a whole chain", async () => {
  await forget();
  await brain("tom is taller than sam");
  await brain("sam is taller than john");
  assertEquals((await brain("who is taller?")).expression.state.says, "tom");
  assertEquals((await brain("who is shorter?")).expression.state.says, "john");
  await forget();
});

test("a bare comparison with nothing compared says nothing", async () => {
  assertEquals((await fresh("who is shorter?")).expression.name, "unknown");
  assertEquals((await fresh("who is taller?")).expression.name, "unknown");
  await forget();
});

test("more of a counted hold asks for the holder at the high end", async () => {
  await forget();
  await brain("john has 5 apples");
  await brain("sam has 3 apples");
  assertEquals((await brain("who has more apples?")).expression.state.says, "john");
  assertEquals((await brain("who has fewer apples?")).expression.state.says, "sam");
  // What a holder holds, and not the order it was said in, is the answer.
  await forget();
  await brain("sam has 3 apples");
  await brain("john has 5 apples");
  assertEquals((await brain("who has more apples?")).expression.state.says, "john");
  await forget();
});

test("a counted hold ties answer with every holder at the end", async () => {
  await forget();
  await brain("john has 5 apples");
  await brain("sam has 5 apples");
  assertEquals((await brain("who has more apples?")).expression.state.says, "john, sam");
  await forget();
});

test("a counted comparison with nothing held says nothing", async () => {
  assertEquals((await fresh("who has more apples?")).expression.name, "unsure");
  await forget();
});

test("a counted comparison is over the chain, not just the spoken two", async () => {
  await forget();
  await brain("john has 5 apples");
  await brain("sam has 3 apples");
  await brain("dev has 8 apples");
  assertEquals((await brain("who has more apples?")).expression.state.says, "dev");
  await forget();
});

// A state may be measured on more than one scale. `long` is one: a wall is
// long and so is a wait. Which scale the comparison reads on cannot be
// whichever the world happens to list first.
const WALLED = ["the fence is 8 metres long", "the wall is 12 metres long"];

test("a comparison reads on a scale that carries an ordering", async () => {
  // Both are measured in metres on length, and length is the only one of the
  // scales holding `long` that anything compares along.
  assertEquals((await fresh(...WALLED, "is the wall longer than the fence?")).expression.name, "affirm");
  assertEquals((await fresh(...WALLED, "is the fence longer than the wall?")).expression.name, "deny");
  await forget();
});

test("the far end of that scale reads the same fact back", async () => {
  assertEquals((await fresh(...WALLED, "is the fence shorter than the wall?")).expression.name, "affirm");
  await forget();
});

test("a comparison the world puts on no ordering answers nothing", async () => {
  // Nothing was told, so there is nothing to compare — and a comparison that
  // cannot be placed must not fall through to a plain check for a joining
  // nobody made, which would deny it in both directions at once.
  assertEquals((await fresh("is the wall longer than the fence?")).expression.name, "unsure");
  assertEquals((await fresh("is the fence longer than the wall?")).expression.name, "unsure");
  await forget();
});
