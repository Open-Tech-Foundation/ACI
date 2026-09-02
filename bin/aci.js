/**
 * Layer 0 at a terminal.
 *
 * The only capability this needs is `--allow-imports`, to load its own
 * modules. Understanding, thinking and expressing touch no file, socket or
 * environment variable, and the command line is where that claim is checked.
 * (Persisting to sqlite does need more, which is why it lives in
 * src/memory/store.js and is not imported here.)
 *
 *   tsr cli                       walk the specification's examples
 *   esrun --allow-imports bin/aci.js hey stop that
 */

import { args } from "runtime:process";

import { Experience, createBrain, trainExample } from "../src/index.js";

const flags = new Set(args.filter((arg) => arg.startsWith("--")));
const atoms = args.filter((arg) => !arg.startsWith("--"));

/** Each of these is its own example, so each gets a brain at its start state. */
const DEMO = [
  ["touch"],
  ["hey"],
  ["hey", "stop", "that"],
  ["plughxyz"],
  ["stop"],
];

/** This one is a session: the state carries, so `stop` means something by the
 * time it arrives — which it did not in the example above. */
const SESSION = [["hey"], ["stop"], ["that"]];

const experience = new Experience();
const learned = trainExample();
const brain = createBrain({ learned, experience });

if (flags.has("--help")) {
  console.log(`aci — Layer 0: signal, state, effect, expression

  esrun --allow-imports bin/aci.js [signals...]
  esrun --allow-imports bin/aci.js --demo

  --demo   walk the examples from SPEC.md
  --steps  show every transition, not just the read-out
  --reset  return to the start state between turns`);
} else if (flags.has("--demo") || atoms.length === 0) {
  console.log("\nEach on a brain at its start state:");
  for (const turn of DEMO) {
    brain.reset();
    walk(turn);
  }
  console.log("\nOne session, where the state carries from turn to turn:");
  brain.reset();
  for (const turn of SESSION) walk(turn);
  console.log(`\n${String(experience.size)} transitions recorded.`);
} else {
  walk(atoms);
}

function walk(sent) {
  if (flags.has("--reset")) brain.reset();
  const from = brain.state;
  const { express, steps } = brain.sense(sent);

  console.log(`\n  ${sent.join(" ")}`);
  if (flags.has("--steps") || flags.has("--demo")) {
    for (const step of steps) {
      const seen = step.atom === step.signal ? step.signal : `${step.atom} → ${step.signal}`;
      // Asked of learned memory, not guessed from whether the state changed:
      // a taught effect is allowed to leave you exactly where you were.
      const untaught = learned.effectOf(step.from, step.signal) === null
        ? " (nothing taught — no move)"
        : "";
      console.log(`    ${step.from} ── ${seen} ──▸ ${step.to}${untaught}`);
    }
    if (steps.length === 0) console.log(`    ${from} (no signals)`);
  }
  console.log(`  → ${express ?? "silence"}`);
}
