// The calendar, which the brain owns.
//
// Time is not something the brain is taught. A day is twenty-four hours and a
// year twelve months wherever it is asked, and a brain that had to be told
// could work nothing out until somebody told it. So the steps live here, with
// the arithmetic over them, and the world says only which of its terms is
// which unit — a language says what they are called.
//
// Weight does not follow. A world picks kilograms or pounds and there are many
// such systems, so its steps stay world knowledge and the brain converts by
// walking what it was given. The difference is that there is one time scale
// and every brain shares it.
//
// Nothing here knows a word, a term id or a world. It is arithmetic.

// The units, smallest first, and how many of each make the next. A month is
// not among them: months are not all the same length, so how many days one
// holds is a question about a particular month of a particular year, and it is
// answered below rather than stepped through here.
const STEP = [
  ['second', 1],
  ['minute', 60],
  ['hour', 60],
  ['day', 24],
  ['week', 7],
];

// How many months make a year. The one step above a month that never varies.
const MONTHS = 12;

// How many days each month holds, in order, before any year is known.
const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// Seconds in each unit, counted up from a second.
const IN_SECONDS = (() => {
  const out = new Map();
  let many = 1;
  for (const [unit, step] of STEP) {
    many *= step;
    out.set(unit, many);
  }
  return out;
})();

export const UNITS = [...IN_SECONDS.keys(), 'month', 'year'];

// Whether a year holds an extra day. Every fourth, except every hundredth,
// except every four-hundredth — that is the whole of the rule, and it is a
// rule rather than a step, which is why a year has no fixed number of days.
export function leapYear(year) {
  if (!Number.isInteger(year)) return false;
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function daysInMonth(year, month) {
  if (!Number.isInteger(month) || month < 1 || month > MONTHS) return null;
  return month === 2 && leapYear(year) ? 29 : DAYS[month - 1];
}

export function daysInYear(year) {
  return leapYear(year) ? 366 : 365;
}

// How many of one unit make another, where both are units the brain steps
// through. A month answers only against a year, since it is no fixed number of
// days; anything else it is asked of comes back as nothing rather than as a
// guess.
export function unitsIn(from, to) {
  if (!UNITS.includes(from) || !UNITS.includes(to)) return null;
  if (from === to) return 1;
  if (from === 'year' && to === 'month') return MONTHS;
  if (!IN_SECONDS.has(from) || !IN_SECONDS.has(to)) return null;
  const many = IN_SECONDS.get(from) / IN_SECONDS.get(to);
  return Number.isInteger(many) ? many : null;
}

// A moment: how many seconds stand between it and the first moment of year
// one. Which moment that is does not matter and is never said — it is the
// nought a scale needs so that two moments can be told apart and subtracted.
const YEARS_BEFORE = (year) => {
  const past = year - 1;
  return past * 365 + Math.floor(past / 4) - Math.floor(past / 100) + Math.floor(past / 400);
};

export function momentOf({ year, month = 1, day = 1, hour = 0, minute = 0, second = 0 }) {
  if (!Number.isInteger(year) || daysInMonth(year, month) == null) return null;
  if (!Number.isInteger(day) || day < 1 || day > daysInMonth(year, month)) return null;
  if (![hour, minute, second].every(Number.isInteger)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) return null;
  let days = YEARS_BEFORE(year);
  for (let m = 1; m < month; m += 1) days += daysInMonth(year, m);
  days += day - 1;
  return ((days * 24 + hour) * 60 + minute) * 60 + second;
}

// The same moment, said in the calendar's own terms.
export function calendarOf(moment) {
  if (!Number.isInteger(moment) || moment < 0) return null;
  const second = moment % 60;
  const minutes = (moment - second) / 60;
  const minute = minutes % 60;
  const hours = (minutes - minute) / 60;
  const hour = hours % 24;
  let days = (hours - hour) / 24;
  let year = 1;
  for (;;) {
    const holds = daysInYear(year);
    if (days < holds) break;
    days -= holds;
    year += 1;
  }
  let month = 1;
  for (;;) {
    const holds = daysInMonth(year, month);
    if (days < holds) break;
    days -= holds;
    month += 1;
  }
  return { year, month, day: days + 1, hour, minute, second };
}

// Which day of the week a moment falls on, counted from the first day of year
// one. Which day that is called, and which day a week is reckoned to start on,
// are not the brain's — it knows only that the seven come round in order.
export function dayOfWeek(moment) {
  if (!Number.isInteger(moment) || moment < 0) return null;
  const days = Math.floor(moment / (24 * 60 * 60));
  return days % 7;
}
