// The node: the one shape everything in the brain is made of, and the walks
// over it that every phase needs.
//
//   { [$]: 'node', kind, name, branch (array of child nodes), state }
//
// A phase reads a node, adds its perception to a running state, and hands back
// a node. Nothing here knows a language, a world, or a phase — these are the
// shape and how to walk it, and no more.

export const $ = Symbol.for('aci.node');

// A node is the single uniform unit of the whole system:
//   { [$]: 'node', kind, name, branch (array of child nodes), state }
export function node(kind, name, branch = [], state = {}) {
  return { [$]: 'node', kind, name, branch, state };
}

// What the brain came to, and not the walking it did to get there.
// What a phase put on a node that is an answer to what was asked, rather than
// a step on the way to one.
export const VERDICT = ['standing', 'answer', 'learn', 'refuse'];

export function taken(n) {
  return VERDICT.includes(n.kind) || n.kind === 'count' || n.kind === 'sum';
}

// The same tree with one node standing in place of another.
export function instead(n, target, made) {
  if (n === target) return made;
  return withBranch(n, (n.branch || []).map((b) => instead(b, target, made)));
}

// What number this thing is. The world names some of them; the rest the brain
// read out of the figures it was sent, and both are numbers alike.
export function numberOf(n, world) {
  const held = world.valueOf(conceptOf(n));
  if (held != null) return held;
  const thought = n ? findBranch(n, 'thought') : null;
  const read = thought && thought.state.thought ? thought.state.thought.value : null;
  return read == null ? null : read;
}

export function conceptOf(n) {
  const thought = n ? findBranch(n, 'thought') : null;
  return thought && thought.state.thought ? thought.state.thought.concept : null;
}

// What a word says about the thing beside it, or about itself.
export function markOn(n) {
  const t = n ? findBranch(n, 'thought') : null;
  return t && t.state.thought ? t.state.thought.marks : null;
}

export function thoughtOf(n) {
  const thought = findBranch(n, 'thought');
  return thought ? thought.state.thought : null;
}

// What a word does in a signal, as a list however it was declared.
export function functionList(value) {
  if (!value || value.functions == null) return [];
  return Array.isArray(value.functions) ? value.functions : [value.functions];
}

export function functionsOf(n) {
  return functionList(thoughtOf(n));
}

export function withBranch(node, branch, state) {
  return Object.assign({}, node, {
    branch: branch === undefined ? node.branch : branch,
    state: state === undefined ? node.state : state,
  });
}

export function findBranch(n, kind) {
  return (n.branch || []).find((b) => b.kind === kind) || null;
}

export function toString(v) {
  if (typeof v === 'string') return v;
  if (v === null || v === undefined) return '';
  return String(v);
}

export function quote(s) {
  return /^[\p{L}\p{N}]+$/u.test(s) ? s : `"${s}"`;
}
