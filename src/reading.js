// What a signal put into the conversation graph.
//
// The brain already understands a sentence: it hands back the change it
// accepted, as terms and links over the world it was weighed against. This
// lays that change out in the graph GRAPH.md describes — nodes, collections,
// actions, facts and rules — and says what this signal introduced.
//
// It is not a translation of sentences. No word is looked at here; every
// decision below is made by asking the world what a term is:
//
//   a term standing for a doing            -> an action, its roles its slots
//   a term with a quantity arriving at it  -> a collection of that many
//   any other individual                   -> a node
//   a link between them                    -> a fact
//   a term joining a condition to what
//   stands on it                           -> a rule
//
// A name is not a node. It is a word this conversation gave to something, so
// it goes to context, which is thrown away with the conversation.

import { openGraph } from './working-memory.js';

// `known` is what the conversation has already met: which item stands for
// which term of the world. A thing said of twice is one node, not two, and a
// later signal reaching back to something an earlier one introduced finds it.
export function layOut(learned, world, into = openGraph(), known = new Map()) {
  const laid = { nodes: [], collections: [], actions: [], facts: [], rules: [] };
  if (!learned || !world) return { graph: into, ...laid };

  const anchors = world.anchors || {};
  const roles = [anchors.agent, anchors.target, anchors.source, anchors.destination].filter(
    (role) => role != null,
  );
  const terms = new Map((learned.terms || []).map((term) => [term.id, term]));
  const links = (term) => (term.links || []).filter((link) => link.rel !== anchors.name);

  // What a term is an instance of. Said the precise way where the brain could,
  // and the broad way otherwise. A signal need not say what a thing is — a
  // name arrives with no kind attached — so where the change itself is silent,
  // the world it was written into is asked.
  const conceptOf = (term) => {
    for (const link of term.links || []) if (link.rel === anchors.instance && !link.not) return link.to;
    for (const link of term.links || []) if (link.rel === world.baseRelation && !link.not) return link.to;
    const met = world.kinds(term.id) || [];
    return met.length ? met[0] : null;
  };

  // A word given to something in this conversation. The word is held on a term
  // of its own; that term is not a thing, so nothing is made for it.
  const spelling = new Map();
  for (const term of terms.values()) if (typeof term.symbol === 'string') spelling.set(term.id, term.symbol);
  const calledOf = (term) => {
    for (const link of term.links || []) {
      if (link.rel === anchors.name && spelling.has(link.to)) return spelling.get(link.to);
    }
    return null;
  };

  // Where a quantity of a kind was said and no particular thing, the quantity
  // arrives on the link that reaches it. That is what makes it a collection
  // rather than one thing.
  const many = new Map();
  for (const term of terms.values()) {
    for (const link of term.links || []) {
      if (link.quantity != null && terms.has(link.to)) many.set(link.to, link.quantity);
    }
  }

  // The two claims a standing instruction joins are not items of their own.
  const claiming = new Set();
  for (const term of terms.values()) {
    if (conceptOf(term) !== anchors.instructing) continue;
    for (const link of term.links || []) {
      if (link.rel === anchors.condition || link.rel === anchors.consequence) claiming.add(link.to);
    }
  }

  const label = (id) => (id == null ? null : world.term(id)?.name ?? null);
  const laidAs = known;

  // Things first, then what stands between them: a fact cannot reach an item
  // that is not there yet.
  for (const term of terms.values()) {
    if (spelling.has(term.id) || claiming.has(term.id) || laidAs.has(term.id)) continue;
    const of = conceptOf(term);
    if (of === anchors.instructing) continue;

    if (of != null && anchors.action != null && world.isA(of, anchors.action)) {
      const slots = {};
      for (const link of links(term)) {
        if (!roles.includes(link.rel)) continue;
        slots[label(link.rel)] = laidAs.get(link.to) ?? link.to;
        if (link.quantity != null) slots.quantity = link.quantity;
      }
      const id = into.action(of, slots);
      laidAs.set(term.id, id);
      laid.actions.push({ id, of, name: label(of), slots });
      continue;
    }

    if (many.has(term.id)) {
      const id = into.collection(of, { count: many.get(term.id) });
      laidAs.set(term.id, id);
      laid.collections.push({ id, of, name: label(of), count: many.get(term.id) });
      continue;
    }

    const id = into.node(of);
    laidAs.set(term.id, id);
    const called = calledOf(term);
    if (called) into.context.name(called, id);
    laid.nodes.push({ id, of, name: label(of), called });
  }

  // A slot filled before the thing in it was laid out points at the term it
  // came from; now everything is there, it points at the thing.
  for (const one of laid.actions) {
    for (const [role, value] of Object.entries(one.slots)) {
      if (laidAs.has(value)) one.slots[role] = laidAs.get(value);
    }
    Object.assign(into.item(one.id).slots, one.slots);
    into.context.saw(one.id);
  }

  const stood = (id) => laidAs.get(id) ?? id;

  for (const term of terms.values()) {
    if (spelling.has(term.id) || claiming.has(term.id)) continue;
    const of = conceptOf(term);
    if (of === anchors.instructing) {
      laid.rules.push(ruleFrom(term));
      continue;
    }
    if (of != null && anchors.action != null && world.isA(of, anchors.action)) continue;

    for (const link of links(term)) {
      if (link.rel === anchors.instance || link.rel === world.baseRelation) continue;
      const slots = { subject: stood(term.id), object: stood(link.to) };
      const id = into.fact(link.rel, slots, {
        denied: link.not === true,
        props: link.quantity != null ? { count: link.quantity } : {},
      });
      laid.facts.push({
        id,
        of: link.rel,
        name: label(link.rel),
        slots,
        ...(link.quantity != null ? { count: link.quantity } : {}),
        ...(link.not ? { denied: true } : {}),
      });
    }
  }

  // A claim is which two things stand in which relation. It is what a standing
  // instruction is made of on both sides — the question it asks, and what
  // becomes so when the answer is yes.
  function claimAt(id) {
    const term = terms.get(id);
    if (!term) return null;
    const claim = { of: conceptOf(term) };
    for (const link of term.links || []) {
      if (link.rel === anchors.subject) claim.subject = stood(link.to);
      if (link.rel === anchors.object) claim.object = stood(link.to);
    }
    return claim;
  }

  function ruleFrom(term) {
    let on = null;
    let then = null;
    for (const link of term.links || []) {
      if (link.rel === anchors.condition) on = { claim: claimAt(link.to) };
      if (link.rel === anchors.consequence) then = { claim: claimAt(link.to) };
    }
    const id = into.rule({ on, then });
    return {
      id,
      on: named(on, label),
      then: named(then, label),
    };
  }

  return { graph: into, ...laid };
}

// A rule read back with the world's own labels beside the terms, so what it
// says can be seen without looking every id up.
function named(side, label) {
  if (!side || !side.claim) return side;
  const claim = side.claim;
  return {
    claim: {
      ...claim,
      name: label(claim.of),
      subjectName: label(claim.subject),
      objectName: label(claim.object),
    },
  };
}
