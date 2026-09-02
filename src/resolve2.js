/** Assembles the answer from what was understood. Decides nothing. */

export function resolve(knowledge, understood) {
  const rule = ruleFor(knowledge, understood);
  if (rule === null) return [];

  const slots = {};
  for (const [name, spec] of Object.entries(rule.rule.slots ?? {})) {
    const of = spec.of === "subject" ? rule.subject : spec.of;
    const found = knowledge.to(of, spec.relation);
    if (found.length !== 1) return [];
    slots[name] = found[0];
  }

  const template = knowledge.say(rule.rule.respond);
  if (template === null) return [];

  const text = template.replace(/\{(\w+)\}/g, (whole, name) => slots[name] ?? whole);
  return [{ signal: "message", type: "text", data: text }];
}

/** The first rule whose `when` is something the understood thing is. */
function ruleFor(knowledge, understood) {
  for (const met of understood.met) {
    for (const rule of knowledge.rules) {
      if (met.is.includes(rule.when)) return { rule, subject: met.kind };
    }
  }
  return null;
}
