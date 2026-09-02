/** Words to kinds. The brain never sees any of this. */

export class Language {
  constructor({ ignore = [], ask = {}, compare = {}, relations = {}, kinds = {} } = {}) {
    this.ignore = new Set(ignore);
    this.ask = new Map(Object.entries(ask));
    this.compare = new Map(Object.entries(compare));
    this.relations = new Map(Object.entries(relations));
    this.kinds = new Map(Object.entries(kinds));
  }

  words(text) {
    return String(text).toLowerCase().match(/[a-z']+/g) ?? [];
  }

  /** What one word is, or `unknown`. Position is the caller's problem. */
  read(word) {
    if (this.ignore.has(word)) return { word, as: "ignored" };
    if (this.kinds.has(word)) return { word, as: "kind", kind: this.kinds.get(word) };
    if (this.compare.has(word)) return { word, as: "compare", ...this.compare.get(word) };
    if (this.relations.has(word)) {
      return { word, as: "relation", relation: this.relations.get(word) };
    }
    if (this.ask.has(word)) return { word, as: "ask", ask: this.ask.get(word) };
    return { word, as: "unknown" };
  }

  /** A kind on the way out. Nothing is generated — it says the kind itself. */
  say(kind) {
    return kind;
  }
}
