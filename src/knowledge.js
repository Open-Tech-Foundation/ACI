/** Facts as triples, rules that make more of them, and the closure. */

const key = (fact) => fact.join("|");

export class Knowledge {
  constructor({ facts = [], rules = [] } = {}) {
    this.rules = rules;
    this.given = facts.map((fact) => [...fact]);
    this.facts = close(this.given, rules);
    this.derived = this.facts.length - this.given.length;
  }

  /** Every fact matching a pattern; `null` in a slot means anything. */
  find([from, relation, to]) {
    return this.facts.filter(
      (fact) =>
        (from === null || fact[0] === from) &&
        (relation === null || fact[1] === relation) &&
        (to === null || fact[2] === to),
    );
  }

  holds(fact) {
    return this.find(fact).length > 0;
  }

  /** A kind and everything it is. */
  isa(kind) {
    return [kind, ...this.find([kind, "is-a", null]).map((fact) => fact[2])];
  }
}

/** Forward chaining to a fixpoint. Rules only recombine known terms, so it ends. */
function close(facts, rules) {
  const seen = new Map(facts.map((fact) => [key(fact), fact]));

  for (let grew = true; grew; ) {
    grew = false;
    for (const rule of rules) {
      for (const binding of solve(rule.if, [...seen.values()], {})) {
        const fact = rule.then.map((term) => bind(term, binding));
        if (!seen.has(key(fact))) {
          seen.set(key(fact), fact);
          grew = true;
        }
      }
    }
  }

  return [...seen.values()];
}

function solve([pattern, ...rest], facts, binding) {
  if (pattern === undefined) return [binding];

  const found = [];
  for (const fact of facts) {
    const next = unify(pattern, fact, binding);
    if (next !== null) found.push(...solve(rest, facts, next));
  }
  return found;
}

function unify(pattern, fact, binding) {
  const next = { ...binding };
  for (let i = 0; i < 3; i += 1) {
    const term = pattern[i];
    if (term.startsWith("?")) {
      if (next[term] !== undefined && next[term] !== fact[i]) return null;
      next[term] = fact[i];
    } else if (term !== fact[i]) {
      return null;
    }
  }
  return next;
}

const bind = (term, binding) => (term.startsWith("?") ? binding[term] : term);
