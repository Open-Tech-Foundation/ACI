/**
 * An envelope, rearranged into the chain of steps that produced it.
 *
 * Pure and DOM-free so `esdev test` can cover it — this is where the panel's
 * actual logic lives, and the rendering around it is only markup.
 */

/** Fixed order, because the pipeline has one. */
export const STAGES = [
  { id: "understand", title: "Understand", blurb: "Words to meaning" },
  { id: "think", title: "Think", blurb: "Meaning to a plan" },
  { id: "solve", title: "Solve", blurb: "A plan to an answer" },
];

/**
 * @returns {Array<{stage: string, kind: string, label: string, from?: string,
 *   note?: string, score?: number}>} one row per step, in pipeline order
 */
export function chainFor(envelope) {
  if (!envelope) return [];
  const { data, meta, trace, response } = envelope;
  const rows = [];

  for (const match of meta.matched) {
    rows.push({
      stage: "understand",
      kind: "word",
      label: match.word,
      from: match.surface,
      note: match.method,
      score: match.score,
    });
  }

  for (const surface of data.unknown) {
    rows.push({ stage: "understand", kind: "unknown", label: surface, note: "not in the vocabulary" });
  }

  if (data.language) {
    rows.push({ stage: "understand", kind: "language", label: data.language });
  }

  for (const concept of data.concepts) {
    rows.push({ stage: "understand", kind: "concept", label: concept });
  }

  if (data.emotion) {
    rows.push({
      stage: "understand",
      kind: "emotion",
      label: data.emotion,
      note: typeof data.valence === "number" ? signed(data.valence) : undefined,
    });
  }

  rows.push({ stage: "think", kind: "strategy", label: meta.strategy });
  for (const id of meta.rules) {
    rows.push({ stage: "think", kind: "rule", label: id, note: reasonFor(trace, id) });
  }

  for (const action of envelope.actions) {
    rows.push({ stage: "think", kind: "action", label: action.name });
  }

  rows.push({ stage: "solve", kind: "template", label: envelope.type });
  rows.push({ stage: "solve", kind: "response", label: response });

  return rows;
}

/** Pulls a rule's own explanation out of the trace, when tracing was on. */
function reasonFor(trace, id) {
  const entry = trace.find((step) => step.step === "rule" && step.detail.startsWith(`${id} fired`));
  const [, reason] = entry?.detail.split(" — ") ?? [];
  return reason;
}

export function signed(value) {
  return value >= 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
}

export function percent(value) {
  return `${Math.round(value * 100)}%`;
}
