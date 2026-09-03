// Everything the brain knows, assembled before it runs.
//
// The brain takes one argument for knowledge and never grows another: where a
// source came from — the base world, a file under knowledge/, a language, or
// something handed in from outside — is the runtime's business, not the
// brain's. Every source passes the same shape check on the way in.

import { checkWorld, checkWhole, checkLanguage, checkWholeLanguage } from './shape.js';
import { fromWorldData } from './world.js';
import { fromData } from './languages.js';

const NO_WORLD = { anchors: {}, relations: {}, terms: [] };

export function fromSources({ world = NO_WORLD, knowledge = [], languages = [] } = {}) {
  checkWorld(world, 'world');
  knowledge.forEach((k, i) => checkWorld(k, `knowledge[${i}]`));

  const { whole, origin } = merge(world, knowledge);
  checkWhole(whole, origin);

  languages.forEach((l, i) => checkLanguage(l, `language[${i}]`));
  const spoken = mergeLanguages(languages);

  return {
    world: fromWorldData(whole),
    languages: spoken.map((l) => fromData(checkWholeLanguage(l, 'language'))),
  };
}

// Files that name the same language are one language. A later file may add
// words, symbols, frames and rules to what an earlier one declared — so a
// service ships the vocabulary of its own tools, and an instance is given its
// own name, without owning the file that holds the alphabet. It may not say
// anything twice differently: two files disagreeing is a contradiction, and the
// brain refuses rather than picking a winner.
function mergeLanguages(sources) {
  const spoken = new Map();
  sources.forEach((data, i) => {
    const where = `language[${i}]`;
    const held = spoken.get(data.name);
    if (!held) spoken.set(data.name, clone(data));
    else join(held, data, where);
  });
  return [...spoken.values()];
}

function join(into, from, where) {
  const at = `${where} "${from.name}"`;
  for (const part of ['symbols', 'words', 'speech', 'expressions']) {
    for (const [key, value] of Object.entries(from[part] || {})) {
      const held = (into[part] || {})[key];
      if (held !== undefined && !same(held, value)) {
        throw new Error(`${at}: ${part} "${key}" was already said differently`);
      }
      into[part] = into[part] || {};
      into[part][key] = clone(value);
    }
  }
  if (from.marking !== undefined) {
    if (into.marking !== undefined && into.marking !== from.marking) {
      throw new Error(`${at}: marking was already "${into.marking}"`);
    }
    into.marking = from.marking;
  }
  for (const rule of from.derivations || []) {
    into.derivations = into.derivations || [];
    if (!into.derivations.some((held) => same(held, rule))) into.derivations.push(clone(rule));
  }
  if (from.grammar) {
    into.grammar = into.grammar || {};
    if (from.grammar.start !== undefined) {
      if (into.grammar.start !== undefined && into.grammar.start !== from.grammar.start) {
        throw new Error(`${at}: grammar starts at "${into.grammar.start}" already`);
      }
      into.grammar.start = from.grammar.start;
    }
    // A rule is added to, not replaced: another way to say a sentence is one
    // more alternative, the way a knowledge file adds a link to a term.
    for (const [symbol, rule] of Object.entries(from.grammar.rules || {})) {
      into.grammar.rules = into.grammar.rules || {};
      const held = into.grammar.rules[symbol];
      if (!held) {
        into.grammar.rules[symbol] = clone(rule);
        continue;
      }
      for (const alternative of rule.rules) {
        if (!held.rules.includes(alternative)) held.rules.push(alternative);
      }
    }
  }
}

function clone(value) {
  if (Array.isArray(value)) return value.map(clone);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clone(v)]));
  }
  return value;
}

function same(a, b) {
  if (a === b) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => same(v, b[i]));
  }
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((k) => same(a[k], b[k]));
}

// A knowledge file may name terms the base world already has, and add links to
// them. It may not redefine one: two sources disagreeing about a term is a
// contradiction, and the brain refuses rather than picking a winner.
function merge(world, sources) {
  const terms = new Map();
  const origin = new Map();
  const relations = { ...(world.relations || {}) };
  const anchors = { ...(world.anchors || {}) };

  const take = (data, where) => {
    for (const t of data.terms) {
      const held = terms.get(t.id);
      if (!held) {
        const kept = { id: t.id, name: t.name, links: [...t.links] };
        if (t.value !== undefined) kept.value = t.value;
        if (t.symbol !== undefined) kept.symbol = t.symbol;
        if (t.individual) kept.individual = true;
        if (t.disjoint) kept.disjoint = true;
        terms.set(t.id, kept);
        origin.set(t.id, where);
        continue;
      }
      if (held.name !== t.name) {
        throw new Error(
          `${where}: term ${t.id} is "${t.name}" here and "${held.name}" already`,
        );
      }
      if (t.value !== undefined) {
        if (held.value !== undefined && held.value !== t.value) {
          throw new Error(
            `${where}: term ${t.id} names ${t.value} here and ${held.value} already`,
          );
        }
        held.value = t.value;
      }
      if (t.symbol !== undefined) {
        if (held.symbol !== undefined && held.symbol !== t.symbol) {
          throw new Error(
            `${where}: term ${t.id} is said as "${t.symbol}" here and "${held.symbol}" already`,
          );
        }
        held.symbol = t.symbol;
      }
      for (const l of t.links) {
        // A link is the same one only if it was set at the same time. A later
        // count does not overwrite the earlier one — it comes after it, and
        // what was so before stays so before.
        const same = held.links.find(
          (h) =>
            h.rel === l.rel &&
            h.to === l.to &&
            (h.at ?? null) === (l.at ?? null) &&
            Boolean(h.not) === Boolean(l.not),
        );
        if (same) {
          if (l.quantity !== undefined && same.quantity !== l.quantity) {
            same.quantity = l.quantity;
            origin.set(t.id, where);
          }
          continue;
        }
        const kept = { rel: l.rel, to: l.to };
        if (l.quantity !== undefined) kept.quantity = l.quantity;
        if (l.at !== undefined) kept.at = l.at;
        if (l.not) kept.not = true;
        held.links.push(kept);
        origin.set(t.id, where);
      }
    }
    for (const [name, id] of Object.entries(data.relations || {})) {
      if (relations[name] !== undefined && relations[name] !== id) {
        throw new Error(`${where}: relation "${name}" is already term ${relations[name]}`);
      }
      relations[name] = id;
    }
    for (const [name, id] of Object.entries(data.anchors || {})) {
      if (anchors[name] !== undefined && anchors[name] !== id) {
        throw new Error(`${where}: anchor "${name}" is already term ${anchors[name]}`);
      }
      anchors[name] = id;
    }
  };

  take(world, 'world');
  sources.forEach((s, i) => take(s, `knowledge[${i}]`));

  return { whole: { anchors, relations, terms: [...terms.values()] }, origin };
}
