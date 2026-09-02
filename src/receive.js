/** What an integrator sent, spelled out as signals. SPEC.md §3.2. */

const CHANNEL = "signal";

/**
 * The channel, then the detail values in sorted order of their field names.
 * Field names are not signals: only what actually arrived becomes one.
 */
export function atomsOf(input) {
  if (typeof input === "string") return words(input);
  if (input === null || typeof input !== "object") return [];

  const atoms = input[CHANNEL] === undefined ? [] : values(input[CHANNEL]);
  for (const name of Object.keys(input).sort()) {
    if (name !== CHANNEL) atoms.push(...values(input[name]));
  }
  return atoms;
}

export function receive(inputs) {
  return inputs.flatMap((input) => atomsOf(input));
}

function values(value) {
  if (Array.isArray(value)) return value.flatMap((each) => values(each));
  if (value === null || value === undefined) return [];
  return words(value);
}

/** No case folding and no punctuation stripping — that is Layer 1 (§6). */
function words(value) {
  return String(value).trim().split(/\s+/).filter(Boolean);
}
