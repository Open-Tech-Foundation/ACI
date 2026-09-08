import { test, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

// The ten cases the conversation graph is being landed against. See GRAPH.md.
// Every assertion here is behavioural — what was said in, what came back out —
// and nothing reads the stored shape. This file is red until the graph lands.

const { brain, forget } = openBrain("sqlite::memory:");

async function said(...lines) {
  await forget();
  let last;
  for (const line of lines) last = await brain(line);
  return last.expression.state?.says ?? last.expression.name;
}

test("a chain of comparisons reaches end to end", async () => {
  assertEquals(
    await said(
      "arun is older than bala",
      "bala is older than chris",
      "chris is older than david",
      "is arun older than david?",
    ),
    "Yes. ✅ arun is older than david.",
  );
});

test("what one person gave away is gone, and what others traded is not theirs", async () => {
  assertEquals(
    await said(
      "priya has 8 books",
      "priya gives 3 books to neha",
      "neha gives 1 book to ravi",
      "how many books does priya have?",
    ),
    "five",
  );
});

test("being inside something inside something reaches the outermost", async () => {
  assertEquals(
    await said(
      "the red box is inside the blue box",
      "the blue box is inside the cupboard",
      "is the red box inside the cupboard?",
    ),
    "Yes. ✅ the red box is inside the cupboard.",
  );
});

test("working for a company is not working in its city", async () => {
  assertEquals(
    await said(
      "kumar works for alpha",
      "alpha is located in chennai",
      "kumar lives in bangalore",
      "where does kumar work?",
    ),
    "alpha",
  );
});

test("the first of a chain of arrivals", async () => {
  assertEquals(
    await said(
      "sara arrived before john",
      "john arrived before mike",
      "mike arrived before alex",
      "who arrived first?",
    ),
    "sara",
  );
});

test("a father of a father is a grandfather, and a sister shares him", async () => {
  assertEquals(
    await said(
      "tom is the father of sam",
      "sam is the father of alex",
      "maya is the sister of alex",
      "who is tom to maya?",
    ),
    "the grandfather",
  );
});

test("a chain of comparisons between kinds, not things", async () => {
  assertEquals(
    await said(
      "a car is faster than a bike",
      "a bike is faster than a bicycle",
      "a bicycle is faster than walking",
      "is a car faster than walking?",
    ),
    "Yes. ✅ a car is faster than a walk.",
  );
});

test("what came back counts as much as what went out", async () => {
  assertEquals(
    await said(
      "ravi has 10 apples",
      "ravi gives 4 apples to sam",
      "sam gives 2 apples to ravi",
      "how many apples does ravi have?",
    ),
    "eight",
  );
});

test("two directions read together are two axes", async () => {
  assertEquals(
    await said(
      "room a is north of room b",
      "room b is east of room c",
      "room c is south of room d",
      "is room a north of room c?",
    ),
    "Yes. ✅ room a is north of room c.",
  );
});

test("the latest change wins and the history keeps the rest", async () => {
  assertEquals(
    await said(
      "anu booked a flight to delhi",
      "anu changed the destination to mumbai",
      "anu cancelled the booking",
      "what is the destination?",
    ),
    "mumbai",
  );
});
