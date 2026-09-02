/**
 * Placeholder words for the tests and the CLI. NOT the model's knowledge.
 *
 * Wiring only — the words themselves are data, in data/lessons/.
 */

import lesson from "../data/lessons/illustration.json" with { type: "json" };
import { learnedFrom } from "../src/memory/lesson.js";

export const illustration = () => learnedFrom(lesson, "illustration");
