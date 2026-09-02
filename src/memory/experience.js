/** What happened, in order. Written, never read back. SPEC.md §4, §7. */
export class Experience {
  constructor() {
    this.steps = [];
  }

  append({ from, atom, signal, to }) {
    this.steps.push({ seq: this.steps.length + 1, from, atom, signal, to });
    return this;
  }

  all() {
    return this.steps.slice();
  }

  get size() {
    return this.steps.length;
  }
}
