/** What a brain was taught: forms, relations, rules, responses. */

export class Knowledge {
  constructor({ forms = {}, relations = [], rules = [], responses = {} } = {}) {
    this.forms = new Map(Object.entries(forms));
    this.relations = relations.map(([from, relation, to]) => ({ from, relation, to }));
    this.rules = rules;
    this.responses = new Map(Object.entries(responses));
  }

  /** A written form to the kind it names, or null. */
  kindOf(form) {
    return this.forms.get(form) ?? null;
  }

  /** `kind --relation--> ?` */
  from(kind, relation) {
    return this.relations
      .filter((row) => row.from === kind && row.relation === relation)
      .map((row) => row.to);
  }

  /** `? --relation--> kind` */
  to(kind, relation) {
    return this.relations
      .filter((row) => row.to === kind && row.relation === relation)
      .map((row) => row.from);
  }

  /** The kind and everything it is, walking `is-a` upward. Nearest first. */
  isaChain(kind) {
    const chain = [kind];
    for (let i = 0; i < chain.length; i += 1) {
      for (const up of this.from(chain[i], "is-a")) {
        if (!chain.includes(up)) chain.push(up);
      }
    }
    return chain;
  }

  say(name) {
    return this.responses.get(name) ?? null;
  }
}
