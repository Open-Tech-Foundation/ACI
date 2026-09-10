import { test, assert, assertEquals } from "runtime:test";
import {
  leapYear, daysInMonth, daysInYear, unitsIn, momentOf, calendarOf, dayOfWeek,
} from "./calendar.js";

// The calendar the brain owns. Nothing here is told to it: a day is
// twenty-four hours wherever it is asked, and which years are long is a rule
// it works rather than a fact it holds.

test("a year is long every fourth, but not every hundredth, and yet every four-hundredth", () => {
  assertEquals(leapYear(2024), true);
  assertEquals(leapYear(2023), false);
  assertEquals(leapYear(1900), false, "a hundredth is not");
  assertEquals(leapYear(2000), true, "a four-hundredth is");
  assertEquals(daysInYear(2024), 366);
  assertEquals(daysInYear(1900), 365);
});

test("february is the only month that changes", () => {
  assertEquals(daysInMonth(2023, 2), 28);
  assertEquals(daysInMonth(2024, 2), 29);
  assertEquals(daysInMonth(2024, 1), 31);
  assertEquals(daysInMonth(2024, 4), 30);
  assertEquals(daysInMonth(2024, 13), null, "there is no thirteenth month");
});

test("the steps between units, walked as far as they go", () => {
  assertEquals(unitsIn("minute", "second"), 60);
  assertEquals(unitsIn("hour", "minute"), 60);
  assertEquals(unitsIn("day", "hour"), 24);
  assertEquals(unitsIn("day", "minute"), 1440);
  assertEquals(unitsIn("week", "second"), 604800);
  assertEquals(unitsIn("year", "month"), 12);
});

test("a month is no fixed number of days, and says so rather than guessing", () => {
  assertEquals(unitsIn("month", "day"), null);
  assertEquals(unitsIn("year", "day"), null);
});

test("a moment said in the calendar's terms, and read back the same", () => {
  const at = momentOf({ year: 2026, month: 9, day: 15, hour: 15, minute: 30 });
  assert(Number.isInteger(at), "a moment is one number");
  assertEquals(calendarOf(at), { year: 2026, month: 9, day: 15, hour: 15, minute: 30, second: 0 });
});

test("two moments subtract to how long stands between them", () => {
  const six = momentOf({ year: 2026, month: 9, day: 15, hour: 6 });
  const eight = momentOf({ year: 2026, month: 9, day: 15, hour: 8 });
  assertEquals((eight - six) / unitsIn("hour", "second"), 2, "two hours");
});

test("the day after the last of a month is the first of the next", () => {
  const last = momentOf({ year: 2024, month: 2, day: 29 });
  const next = calendarOf(last + unitsIn("day", "second"));
  assertEquals({ year: next.year, month: next.month, day: next.day }, { year: 2024, month: 3, day: 1 });
});

test("and the last of a long year rolls into the first of the next", () => {
  const last = momentOf({ year: 2024, month: 12, day: 31, hour: 23, minute: 59, second: 59 });
  const next = calendarOf(last + 1);
  assertEquals(next, { year: 2025, month: 1, day: 1, hour: 0, minute: 0, second: 0 });
});

test("a moment nobody could reach is none, never the nearest one", () => {
  assertEquals(momentOf({ year: 2023, month: 2, day: 29 }), null, "no such day");
  assertEquals(momentOf({ year: 2024, month: 1, day: 0 }), null);
  assertEquals(momentOf({ year: 2024, month: 1, day: 1, hour: 24 }), null);
});

test("the seven days come round in order, whatever they are called", () => {
  const one = momentOf({ year: 2026, month: 9, day: 15 });
  const week = unitsIn("week", "second");
  assertEquals(dayOfWeek(one + week), dayOfWeek(one), "a week on is the same day");
  assert(dayOfWeek(one + unitsIn("day", "second")) !== dayOfWeek(one), "a day on is not");
});
