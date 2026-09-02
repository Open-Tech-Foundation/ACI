/** Names what arrived. No context, no decisions. */

export function understand(knowledge, recognised) {
  const met = [];
  for (const part of recognised.parts) {
    const kind = knowledge.kindOf(part);
    if (kind !== null) met.push({ form: part, kind, is: knowledge.isaChain(kind) });
  }
  return { met, unknown: recognised.parts.length - met.length };
}
