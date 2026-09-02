/** Turns a lesson — data from outside the code — into learned memory. */

import { Learned } from "./learned.js";

const KEYS = new Set(["start", "effects", "expressions"]);

export function learnedFrom(lesson, where = "lesson") {
  if (lesson === null || typeof lesson !== "object" || Array.isArray(lesson)) {
    throw new Error(`${where}: expected an object`);
  }
  for (const key of Object.keys(lesson)) {
    if (!KEYS.has(key)) throw new Error(`${where}: unknown key "${key}"`);
  }

  const effects = rows(lesson.effects, `${where}.effects`, ["state", "signal", "next"]);
  const expressions = rows(lesson.expressions, `${where}.expressions`, ["state", "signal"]);

  if (typeof lesson.start !== "string" || lesson.start === "") {
    throw new Error(`${where}: start must name the state it begins in`);
  }

  return Learned.fromRows({ start: lesson.start, effects, expressions });
}

function rows(value, where, fields) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error(`${where}: expected a list`);

  return value.map((row, index) => {
    for (const field of fields) {
      if (typeof row?.[field] !== "string" || row[field] === "") {
        throw new Error(`${where}[${String(index)}]: ${field} must be a name`);
      }
    }
    return row;
  });
}
