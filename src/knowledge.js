// Everything the brain knows, assembled before it runs.
//
// The brain takes one argument for knowledge and never grows another: where a
// source came from — the base world, a file under knowledge/, a language, or
// something handed in from outside — is the runtime's business, not the
// brain's. Every source passes the same shape check on the way in.

import { checkWorld, checkWhole, checkLanguage } from './shape.js';
import { fromWorldData } from './world.js';
import { fromData } from './languages.js';

const NO_WORLD = { anchors: {}, relations: {}, terms: [] };

export function fromSources({ world = NO_WORLD, knowledge = [], languages = [] } = {}) {
  checkWorld(world, 'world');
  knowledge.forEach((k, i) => checkWorld(k, `knowledge[${i}]`));

  const { whole, origin } = merge(world, knowledge);
  checkWhole(whole, origin);

  return {
    world: fromWorldData(whole),
    languages: languages.map((l, i) => fromData(checkLanguage(l, `language[${i}]`))),
  };
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
        if (t.individual) kept.individual = true;
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
      for (const l of t.links) {
        // A link is the same one only if it was set at the same time. A later
        // count does not overwrite the earlier one — it comes after it, and
        // what was so before stays so before.
        const same = held.links.find(
          (h) => h.rel === l.rel && h.to === l.to && (h.at ?? null) === (l.at ?? null),
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
