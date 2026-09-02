/**
 * What a brain's training actually amounts to — SPEC.md §11.
 *
 *   tsr audit
 *
 * None of these numbers is a score. Each one makes a specific kind of mistake
 * visible: training nothing can reach, states the brain can fall into and never
 * speak from again, and how much of what it says depends on what came before.
 */

import { audit } from "../src/audit.js";
import { trainExample } from "../src/train/example.js";

const report = audit(trainExample());

console.log(`
  Taught          ${String(report.effects)} effects, ${String(report.expressions)} expressions
  Atoms           ${String(report.signals)} signals, ${String(report.states)} states
  Starts in       ${report.start}

  Reachable       ${String(report.reachable)} of ${String(report.states)} states
  Unreachable     ${list(report.unreachable)}
  Silent          ${list(report.silent)}
  Stuck           ${list(report.stuck)}

  Can ever say    ${String(report.answers)} different things

  Ambiguous       ${String(report.ambiguous.length)} signals turn the answer into more than one thing
  Conditional     ${String(report.conditional.length)} act somewhere and not elsewhere: ${list(report.conditional)}
  Inert           ${String(report.inert.length)} never change the answer: ${list(report.inert)}`);

for (const { signal, means } of report.ambiguous) {
  console.log(`    ${signal.padEnd(14)}-> ${[...means].map(String).join(", ")}`);
}

console.log();

function list(names) {
  return names.length === 0 ? "none" : names.join(", ");
}
