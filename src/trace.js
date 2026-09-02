/**
 * The record of why the engine said what it said.
 *
 * This is not logging. In a rule-based engine the trace *is* the explanation —
 * every step from surface text to response is a discrete, nameable decision,
 * so a wrong answer can be walked back to the exact edge or rule that caused
 * it and fixed. Keeping it a first-class output, rather than a debug flag, is
 * most of what this architecture buys over a statistical model.
 */

export class Trace {
  constructor(enabled = true) {
    this.enabled = enabled;
    this.entries = [];
  }

  push(stage, step, detail, data) {
    if (!this.enabled) return;
    this.entries.push({ stage, step, detail, ...(data === undefined ? {} : { data }) });
  }

  /** Lines suitable for a terminal or a demo panel. */
  format() {
    return this.entries.map(({ stage, step, detail }) => `${stage}/${step}: ${detail}`);
  }

  toJSON() {
    return this.entries;
  }
}
