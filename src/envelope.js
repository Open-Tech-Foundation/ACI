/**
 * The one output contract.
 *
 * Every path through the engine — a confident answer, a fallback, an internal
 * failure — produces this same shape. Callers therefore never branch on
 * "did it work"; they read `type` and `confidence` and decide. Adding a field
 * is safe, changing or removing one is a breaking change, which is what
 * `v` is for.
 */

export const ENVELOPE_VERSION = 1;

/**
 * @returns {{
 *   v: number, input: string, response: string, type: string,
 *   actions: Array<object>, data: object, meta: object, trace: Array<object>
 * }}
 */
export function createEnvelope({
  input = "",
  response = "",
  type = "unknown",
  actions = [],
  data = {},
  meta = {},
  trace = [],
} = {}) {
  return { v: ENVELOPE_VERSION, input, response, type, actions, data, meta, trace };
}

/** Structural check — used by tests and by any consumer parsing untrusted output. */
export function isEnvelope(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    value.v === ENVELOPE_VERSION &&
    typeof value.response === "string" &&
    typeof value.type === "string" &&
    Array.isArray(value.actions) &&
    typeof value.data === "object" &&
    value.data !== null
  );
}
