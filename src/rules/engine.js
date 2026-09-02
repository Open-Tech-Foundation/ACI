/**
 * The rule engine: policy, kept out of the graph.
 *
 * The graph answers "what does this mean" — words to concepts to responses.
 * Rules answer "what should be done about it": escalate, ask for
 * clarification, notice this is the second greeting of the conversation. That
 * split matters because meaning is stable while policy changes constantly, and
 * one should not require editing the other.
 *
 * Conditions are data, not code, wherever they can be. A declarative `when` can
 * be serialized, shipped, diffed and — eventually — generated, which a closure
 * cannot. A function is still accepted for the cases that genuinely need one.
 */

/** Reads "understanding.language" out of a context object. */
function path(source, dotted) {
  let cursor = source;
  for (const key of dotted.split(".")) {
    if (cursor === null || cursor === undefined) return undefined;
    cursor = cursor[key];
  }
  return cursor;
}

/** Evaluates one condition against one value. */
function test(value, condition) {
  if (condition === null || typeof condition !== "object") return value === condition;

  for (const [operator, operand] of Object.entries(condition)) {
    switch (operator) {
      case "$eq": if (value !== operand) return false; break;
      case "$ne": if (value === operand) return false; break;
      case "$in": if (!Array.isArray(operand) || !operand.includes(value)) return false; break;
      case "$has": if (!Array.isArray(value) || !value.includes(operand)) return false; break;
      case "$empty": if ((Array.isArray(value) ? value.length === 0 : !value) !== operand) return false; break;
      case "$exists": if ((value !== undefined && value !== null) !== operand) return false; break;
      case "$gt": if (!(value > operand)) return false; break;
      case "$gte": if (!(value >= operand)) return false; break;
      case "$lt": if (!(value < operand)) return false; break;
      case "$lte": if (!(value <= operand)) return false; break;
      case "$not": if (test(value, operand)) return false; break;
      default: throw new Error(`rule condition: unknown operator "${operator}"`);
    }
  }
  return true;
}

/** True when every clause of `when` holds. A function `when` is called directly. */
export function matches(when, context) {
  if (typeof when === "function") return Boolean(when(context));
  if (!when) return true;
  for (const [dotted, condition] of Object.entries(when)) {
    if (!test(path(context, dotted), condition)) return false;
  }
  return true;
}

export class RuleEngine {
  constructor(rules = []) {
    /** @type {Array<object>} kept sorted: highest priority first */
    this.rules = [];
    for (const rule of rules) this.add(rule);
  }

  /** Registers a rule. This is the runtime "training" entry point. */
  add(rule) {
    if (!rule?.id) throw new Error("rule: an id is required");
    if (!rule.stage) throw new Error(`rule "${rule.id}": a stage is required`);
    if (this.rules.some((existing) => existing.id === rule.id)) {
      throw new Error(`rule "${rule.id}": already registered`);
    }
    this.rules.push({ priority: 50, ...rule });
    this.rules.sort((a, b) => b.priority - a.priority);
    return this;
  }

  remove(id) {
    const before = this.rules.length;
    this.rules = this.rules.filter((rule) => rule.id !== id);
    return this.rules.length !== before;
  }

  forStage(stage) {
    return this.rules.filter((rule) => rule.stage === stage);
  }

  /**
   * Fires every matching rule for a stage, in priority order.
   *
   * A rule's `then` may be a function (full access to the context) or a plain
   * object merged into `context.patch` — the object that stage is building, so
   * a declarative rule works the same in think() and solve() without knowing
   * which one it is in. `stop: true` ends the stage, for a rule that has
   * decided the outcome and must not be second-guessed by a lower-priority one.
   *
   * @returns {string[]} the ids that fired, in order
   */
  run(stage, context, trace) {
    const fired = [];
    for (const rule of this.forStage(stage)) {
      if (!matches(rule.when, context)) continue;

      fired.push(rule.id);
      trace?.push(stage, "rule", `${rule.id} fired${rule.because ? ` — ${rule.because}` : ""}`);

      if (typeof rule.then === "function") rule.then(context);
      else if (rule.then) Object.assign(context.patch ?? context.plan, rule.then);

      if (rule.stop) break;
    }
    return fired;
  }
}
