/**
 * Saving and loading a Memory.
 *
 * This is the only module in the engine that touches the host, which is
 * deliberate: `Memory` itself imports nothing from `runtime:`, so the core can
 * run under `--deny-all`. A program that never persists never needs the read
 * and write capabilities, and cannot be made to use them.
 *
 * The format is plain JSON — nodes, edges and aliases — so a trained memory can
 * be reviewed in a diff and corrected by hand. That is the point of the whole
 * architecture, and it would be lost to an opaque binary format.
 */

import * as fs from "runtime:fs";
import { Memory } from "./memory.js";

export const FORMAT_VERSION = 1;

/** A Memory as a plain, inspectable object. */
export function serialize(memory) {
  const edges = [];
  for (const [from, types] of memory.outgoing) {
    for (const [type, list] of types) {
      for (const edge of list) edges.push({ from, type, to: edge.to, weight: edge.weight, props: edge.props });
    }
  }

  return {
    format: FORMAT_VERSION,
    nodes: [...memory.nodes.values()],
    edges,
    aliases: [...memory.matcher.aliases].map(([alias, keys]) => [alias, [...keys]]),
  };
}

/** Rebuilds a Memory. Nodes go in before edges, since addEdge demands both ends. */
export function deserialize(document, options = {}) {
  if (document?.format !== FORMAT_VERSION) {
    throw new Error(`memory: unsupported format ${document?.format}, expected ${FORMAT_VERSION}`);
  }

  const memory = new Memory(options);
  for (const node of document.nodes) memory.addNode(node);
  for (const edge of document.edges) {
    memory.addEdge(edge.from, edge.type, edge.to, { weight: edge.weight, props: edge.props });
  }
  for (const [alias, keys] of document.aliases) {
    for (const key of keys) memory.matcher.add(alias, key);
    memory.maxPhraseTokens = Math.max(memory.maxPhraseTokens, alias.split(" ").length);
  }
  return memory;
}

/** Writes a Memory to disk. Requires `--allow-write` for the path. */
export async function save(memory, path) {
  await fs.write(path, `${JSON.stringify(serialize(memory), null, 2)}\n`);
  return path;
}

/** Reads a Memory back. Requires `--allow-read` for the path. */
export async function load(path, options = {}) {
  return deserialize(await fs.file(path).json(), options);
}
