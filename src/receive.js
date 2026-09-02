/**
 * Reception — turning what an integrator sends into signals the brain can take.
 *
 * Nobody outside this model should have to know its internal atom names. A
 * robot team sends what its hardware actually observed:
 *
 *   { signal: "touch", place: "shoulder" }
 *   { signal: "text", message: "how do you do?" }
 *
 * and reception spells that out as a sequence of atoms, in a fixed order: the
 * channel, then the detail values, taken in sorted order of their field names
 * so that two integrators who write the same fields in a different order get
 * the same answer.
 *
 *   { signal: "touch", place: "shoulder" }  ->  touch  shoulder
 *
 * Field *names* are not spelled out, and that is the whole rule: only what
 * actually arrived becomes a signal. "shoulder" arrived. "place" did not — it
 * is how the integrator labelled the field, and manufacturing a signal out of
 * it would hand the brain something nobody sent it.
 *
 * The cost of that is real: `{ place: "shoulder" }` and `{ avoiding:
 * "shoulder" }` reach the brain identically, because a detail's *role* is
 * structure, and Layer 0 has no structure — only atoms in order. See SPEC.md
 * §8.
 *
 * A value carrying several words becomes several atoms. That is as far as this
 * goes: no lowercasing, no punctuation stripping, no spelling correction, no
 * synonyms. Those are all Layer 1 (SPEC.md §6), which does not exist yet, so
 * "Hey" and "hey" are two different atoms today and the brain says so.
 */

/** The field naming the channel something arrived on. */
const CHANNEL = "signal";

/** One input object -> the atoms it spells out, in order. */
export function atomsOf(input) {
  if (typeof input === "string") return words(input);
  if (input === null || typeof input !== "object") return [];

  const atoms = [];
  if (input[CHANNEL] !== undefined) atoms.push(...values(input[CHANNEL]));

  for (const name of Object.keys(input).sort()) {
    if (name !== CHANNEL) atoms.push(...values(input[name]));
  }

  return atoms;
}

/** Several inputs in one turn are spelled out one after another. */
export function receive(inputs) {
  return inputs.flatMap((input) => atomsOf(input));
}

function values(value) {
  if (Array.isArray(value)) return value.flatMap((each) => values(each));
  if (value === null || value === undefined) return [];
  return words(value);
}

function words(value) {
  return String(value).trim().split(/\s+/).filter(Boolean);
}
