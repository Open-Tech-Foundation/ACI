/**
 * The view model for one turn — no DOM, so it can be tested on its own.
 *
 * A turn is a walk: the state you were in, then alternating signals and the
 * states they left you in, then the read-out at the end. The rows are that walk
 * in order, which is the only thing the page has to draw.
 */

import { UNKNOWN } from "../../src/memory/learned.js";

export function walkFor(turn, from, learned) {
  const rows = [{ kind: "state", label: from }];

  for (const step of turn.steps) {
    rows.push({
      kind: step.signal === UNKNOWN ? "unknown" : "signal",
      label: step.signal,
      // Shown only when the arriving atom is not the signal it resolved to,
      // which is exactly when the brain did not recognise what arrived.
      atom: step.atom === step.signal ? null : step.atom,
      // Whether an effect was taught for this pair — asked of learned memory,
      // not guessed from whether the state changed. A taught effect can leave
      // you where you were, and that is not the same as nothing being taught.
      taught: learned.effectOf(step.from, step.signal) !== null,
    });
    rows.push({ kind: "state", label: step.to });
  }

  rows.push({
    kind: "express",
    label: turn.express ?? "silence",
    silent: turn.express === null,
  });

  return rows;
}
