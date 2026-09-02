/**
 * The engine at a terminal.
 *
 * Notably the only capability this needs is `--allow-imports`, to load its own
 * modules. Understanding, reasoning and answering touch no file, socket or
 * environment variable, and the command line is where that claim is checked.
 */

import { args } from "runtime:process";
import { createBrain } from "../src/index.js";

const flags = new Set(args.filter((arg) => arg.startsWith("--")));
const words = args.filter((arg) => !arg.startsWith("--"));

const DEMO = [
  "Hi",
  "how are you",
  "what is your name",
  "thankss",
  "Hi",
  "can you help",
  "qwertyuiop plughxyz",
  "goodbye",
];

if (flags.has("--help") || (words.length === 0 && !flags.has("--demo"))) {
  console.log(`aci — a rule-based reasoning engine

USAGE:
    esrun --allow-imports bin/aci.js [options] <message...>
    esrun --allow-imports bin/aci.js --demo

OPTIONS:
    --demo      Run a scripted conversation
    --json      Print the raw envelope instead of the formatted view
    --trace     Show the reasoning steps
    --help      Show this help`);
} else {
  const { brain } = createBrain();
  const inputs = flags.has("--demo") ? DEMO : [words.join(" ")];

  for (const input of inputs) {
    const envelope = brain(input);
    if (flags.has("--json")) console.log(JSON.stringify(envelope, null, 2));
    else report(input, envelope);
  }
}

function report(input, { response, type, actions, data, meta, trace }) {
  const emotion = data.emotion ? `${data.emotion} (${signed(data.valence)})` : "—";
  const actionNames = actions.length > 0 ? actions.map((a) => a.name).join(", ") : "—";

  console.log(`\n\x1b[2m›\x1b[0m ${input}`);
  console.log(`  \x1b[1m${response}\x1b[0m\n`);
  console.log(field("type", type));
  console.log(field("confidence", meta.confidence.toFixed(2)));
  console.log(field("language", data.language ?? "—"));
  console.log(field("emotion", emotion));
  console.log(field("actions", actionNames));
  console.log(field("rules", meta.rules.length > 0 ? meta.rules.join(", ") : "—"));
  if (data.unknown.length > 0) console.log(field("unknown", data.unknown.join(", ")));

  if (flags.has("--trace") && trace.length > 0) {
    console.log("\n  \x1b[2mtrace\x1b[0m");
    for (const { stage, step, detail } of trace) {
      console.log(`    \x1b[2m${`${stage}/${step}`.padEnd(18)}\x1b[0m ${detail}`);
    }
  }
}

// Declarations, not const arrows: report() is hoisted and runs before the
// bottom of this module is evaluated, which would leave these in the dead zone.
function field(label, value) {
  return `  \x1b[2m${label.padEnd(12)}\x1b[0m ${value}`;
}

function signed(value) {
  if (typeof value !== "number") return "?";
  return value >= 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
}
