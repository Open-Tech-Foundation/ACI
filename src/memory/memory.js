/**
 * Memory: a typed, directed property graph plus the index that finds a way in.
 *
 * There is no training loop here and no weights to fit. Knowing something means
 * a node and an edge exist; learning is `addEdge`. That is the whole bargain of
 * this architecture — it can be inspected, diffed and corrected by hand, which
 * a matrix of parameters cannot.
 *
 * The class deliberately imports nothing from the host: no filesystem, no clock,
 * no network. A Memory can therefore be built and queried under `--deny-all`.
 * Persistence lives in ./persist.js so that it, and not the core, carries the
 * capability requirement.
 */

import { FuzzyMatcher } from "../match/fuzzy.js";
import { normalize } from "../text/normalize.js";
import { EdgeType, NodeType, ids } from "./schema.js";

export class Memory {
  constructor({ threshold = 0.82 } = {}) {
    /** @type {Map<string, {id: string, type: string, label: string, props: object}>} */
    this.nodes = new Map();
    /** @type {Map<string, Map<string, Array<{to: string, weight: number, props: object}>>>} */
    this.outgoing = new Map();
    /** @type {Map<string, Map<string, Array<{to: string, weight: number, props: object}>>>} */
    this.incoming = new Map();

    this.matcher = new FuzzyMatcher({ threshold });
    /** Longest alias in tokens — bounds the phrase window in understand(). */
    this.maxPhraseTokens = 1;
  }

  // ---- graph primitives -------------------------------------------------

  /** Inserts a node, or merges props into the one already there. */
  addNode({ id, type, label, props = {} }) {
    const existing = this.nodes.get(id);
    if (existing) {
      Object.assign(existing.props, props);
      if (label) existing.label = label;
      return existing;
    }
    const node = { id, type, label: label ?? id, props };
    this.nodes.set(id, node);
    return node;
  }

  get(id) {
    return this.nodes.get(id);
  }

  has(id) {
    return this.nodes.has(id);
  }

  /**
   * Relates two existing nodes.
   *
   * Idempotent: relating the same pair again updates the existing edge rather
   * than adding a parallel one, so re-teaching a word — which the seed and any
   * reload both do — cannot quietly inflate a concept's weight.
   */
  addEdge(from, type, to, { weight = 1, props = {} } = {}) {
    if (!this.nodes.has(from)) throw new Error(`addEdge: unknown source node "${from}"`);
    if (!this.nodes.has(to)) throw new Error(`addEdge: unknown target node "${to}"`);

    const existing = this.outgoing.get(from)?.get(type)?.find((edge) => edge.to === to);
    if (existing) {
      existing.weight = weight;
      Object.assign(existing.props, props);
      const mirror = this.incoming.get(to)?.get(type)?.find((edge) => edge.to === from);
      if (mirror) {
        mirror.weight = weight;
        Object.assign(mirror.props, props);
      }
      return existing;
    }

    const edge = { to, weight, props };
    push(this.outgoing, from, type, edge);
    push(this.incoming, to, type, { to: from, weight, props });
    return edge;
  }

  /** Raw edges of one type leaving (or entering) a node. */
  edges(id, type, direction = "out") {
    const side = direction === "in" ? this.incoming : this.outgoing;
    return side.get(id)?.get(type) ?? [];
  }

  /** Neighbour nodes across one edge type, heaviest edge first. */
  neighbors(id, type, direction = "out") {
    return this.edges(id, type, direction)
      .slice()
      .sort((a, b) => b.weight - a.weight)
      .map((edge) => ({ node: this.nodes.get(edge.to), weight: edge.weight, props: edge.props }))
      .filter((entry) => entry.node !== undefined);
  }

  // ---- domain helpers ---------------------------------------------------

  /**
   * These three are *declare-or-fetch*, and they are written the long way on
   * purpose: an argument the caller did not supply must never overwrite one it
   * did earlier. `word()` re-declares the language it belongs to and `evokes()`
   * re-declares the emotion it points at, so a defaulted label or valence here
   * would quietly erase what the seed established.
   */
  language(code, label) {
    const id = ids.language(code);
    const existing = this.nodes.get(id);
    if (existing) {
      if (label) existing.label = label;
      return existing;
    }
    return this.addNode({ id, type: NodeType.LANGUAGE, label: label ?? code, props: { code } });
  }

  concept(name, { label, parent } = {}) {
    const id = ids.concept(name);
    const existing = this.nodes.get(id);
    const node = existing ?? this.addNode({ id, type: NodeType.CONCEPT, label: label ?? name, props: { name } });
    if (existing && label) existing.label = label;
    if (parent) {
      this.concept(parent);
      this.addEdge(node.id, EdgeType.IS_A, ids.concept(parent));
    }
    return node;
  }

  emotion(name, { valence, label } = {}) {
    const id = ids.emotion(name);
    const existing = this.nodes.get(id);
    if (existing) {
      if (label) existing.label = label;
      if (valence !== undefined) existing.props.valence = valence;
      return existing;
    }
    return this.addNode({
      id,
      type: NodeType.EMOTION,
      label: label ?? name,
      props: { name, valence: valence ?? 0 },
    });
  }

  /**
   * Teaches one word or phrase.
   *
   * `aliases` are alternate spellings that mean the same thing and share the
   * node — they are indexed for matching but do not become nodes of their own,
   * because "thanks" and "thankyou" are one piece of knowledge, not two.
   */
  word(surface, { language = "en", concept, aliases = [], weight = 1 } = {}) {
    const normalized = normalize(surface);
    if (normalized === "") throw new Error(`word: "${surface}" normalizes to nothing`);

    this.language(language);
    const node = this.addNode({
      id: ids.word(language, normalized),
      type: NodeType.WORD,
      label: surface,
      props: { normalized, language, tokens: normalized.split(" ").length },
    });

    this.addEdge(node.id, EdgeType.IN_LANGUAGE, ids.language(language));
    if (concept) {
      this.concept(concept);
      this.addEdge(node.id, EdgeType.DENOTES, ids.concept(concept), { weight });
    }

    for (const alias of [surface, ...aliases]) {
      const term = normalize(alias);
      if (term === "") continue;
      this.matcher.add(term, node.id);
      this.maxPhraseTokens = Math.max(this.maxPhraseTokens, term.split(" ").length);
    }
    return node;
  }

  evokes(concept, emotion, { weight = 1 } = {}) {
    this.concept(concept);
    this.emotion(emotion);
    return this.addEdge(ids.concept(concept), EdgeType.EVOKES, ids.emotion(emotion), { weight });
  }

  /**
   * Registers a way to answer a concept.
   *
   * `type`, `actions` and `data` ride on the template so the envelope is
   * assembled from memory rather than hardcoded in solve().
   */
  respond(concept, text, { weight = 1, type, actions = [], data = {}, language = "en" } = {}) {
    this.concept(concept);
    const ordinal = this.edges(ids.concept(concept), EdgeType.RESPONDS_WITH).length;
    const node = this.addNode({
      id: ids.template(concept, ordinal),
      type: NodeType.TEMPLATE,
      label: text,
      props: { text, type: type ?? concept, actions, data, language },
    });
    this.addEdge(ids.concept(concept), EdgeType.RESPONDS_WITH, node.id, { weight });
    return node;
  }

  // ---- retrieval --------------------------------------------------------

  /**
   * Finds the longest known phrase starting at `start` in `tokens`.
   *
   * Longest-first is what lets "how are you" beat the bare "you": a phrase
   * carries more meaning than its parts, so the scan must never settle for a
   * single-token match while a longer one is still available.
   *
   * @returns {{match: object, span: number, text: string} | null}
   */
  lookupPhrase(tokens, start, options = {}) {
    const widest = Math.min(this.maxPhraseTokens, tokens.length - start);
    for (let span = widest; span >= 1; span--) {
      const text = tokens.slice(start, start + span).map((t) => t.normalized).join(" ");
      const [best] = this.matcher.match(text, options);
      if (best) return { match: best, span, text };
    }
    return null;
  }

  /** Every concept a word denotes, heaviest first. */
  conceptsOf(wordId) {
    return this.neighbors(wordId, EdgeType.DENOTES);
  }

  /** The dominant emotion for a concept, or null when it carries none. */
  emotionOf(conceptName) {
    const [top] = this.neighbors(ids.concept(conceptName), EdgeType.EVOKES);
    return top ? top.node : null;
  }

  /** Candidate answers for a concept, heaviest first. */
  templatesOf(conceptName) {
    return this.neighbors(ids.concept(conceptName), EdgeType.RESPONDS_WITH).map((entry) => entry.node);
  }

  /** Counts, for diagnostics and for the demo's memory panel. */
  stats() {
    const byType = {};
    for (const node of this.nodes.values()) byType[node.type] = (byType[node.type] ?? 0) + 1;
    let edges = 0;
    for (const types of this.outgoing.values()) for (const list of types.values()) edges += list.length;
    return { nodes: this.nodes.size, edges, aliases: this.matcher.size, byType };
  }
}

function push(side, id, type, edge) {
  let types = side.get(id);
  if (!types) side.set(id, (types = new Map()));
  let list = types.get(type);
  if (!list) types.set(type, (list = []));
  list.push(edge);
}
