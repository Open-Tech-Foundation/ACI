import { define, html, update } from "@opentf/micro-ui";

define("x-ask", (el) => {
  let input = "";
  let result = null;
  let active = "understand";

  async function run() {
    const res = await fetch("/brain", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ q: input }),
    });
    result = await res.json();
    active = "understand";
    update(el);
  }

  const phases = [
    { key: "understand", label: "1 · Understand" },
    { key: "think", label: "2 · Think" },
    { key: "solve", label: "3 · Solve" },
    { key: "express", label: "4 · Express" },
  ];

  return () => {
    const activeTree = result
      ? active === "express"
        ? result.roots
        : result.phases && result.phases[active]
      : null;

    return html`
    <div class="app">
      <h1>ACI</h1>
      <div class="input-row">
        <input
          type="text"
          placeholder="try 'a'"
          value=${input}
          oninput=${(e) => { input = e.target.value; }}
          onkeydown=${(e) => { if (e.key === "Enter") run(); }}
        />
        <button onclick=${run}>Think</button>
      </div>
      ${result &&
        html`
          <div class="tabs">
            ${phases.map((p) => html`
              <button
                class=${active === p.key ? "tab tab-active" : "tab"}
                onclick=${() => { active = p.key; update(el); }}
              >
                ${p.label}
              </button>
            `)}
          </div>
          <div class="stage">
            <div class="stage-label">${phases.find((p) => p.key === active).label}</div>
            ${active === "express"
              ? html`<div class="output">${expressOutput(result.roots)}</div>`
              : html`<pre class="tree">${render(activeTree)}</pre>`}
          </div>
        `}
    </div>
  `;
  };
});

function render(nodes) {
  return (nodes || []).map((n) => renderNode(n)).join("");
}

function renderNode(node, prefix = "", connector = "", isLast = true) {
  const label =
    node.name && node.name !== node.kind ? `${node.kind} (${node.name})` : node.kind;
  let out = prefix + connector + label + "\n";
  const state = node.state;
  const childPrefix = prefix + (connector === "" ? "" : isLast ? "   " : "│  ");
  if (state && Object.keys(state).length) {
    out += formatState(state, childPrefix + "   ");
  }
  (node.branch || []).forEach((child, i) => {
    out += renderNode(
      child,
      childPrefix,
      i === node.branch.length - 1 ? "└─ " : "├─ ",
      i === node.branch.length - 1,
    );
  });
  return out;
}

function formatState(state, indent) {
  const lines = [];
  if (typeof state.identity === "string") {
    lines.push(`value: ${state.identity}`);
  }
  if (typeof state.exists === "boolean") {
    lines.push(`exists: ${state.exists}`);
  }
  if (typeof state.charCount === "number") {
    lines.push(`chars: ${state.charCount}`);
  }
  if (state.phonetics && state.phonetics.length) {
    lines.push(
      "phonetics: " +
        state.phonetics.map((p) => `${p.char}${p.isVowel ? "(v)" : "(c)"}`).join(" "),
    );
  }
  const match = state.matches && state.matches[0];
  if (match) {
    const lang = match.lang || "?";
    const word = match.word
      ? `${match.word.text} = ${match.word.meaning}`
      : "word unknown";
    lines.push(`lang: ${lang}`);
    lines.push(`word: ${word}`);
    if (match.roles && match.roles.length) {
      lines.push(`roles: ${match.roles.join(", ")}`);
    }
  }
  if (state.thought) {
    const t = state.thought;
    lines.push(`meaning: ${t.meaning ?? "—"}`);
    lines.push(`pos: ${t.pos ?? "—"}`);
  }
  if (typeof state.language === "string") {
    lines.push(`language: ${state.language}`);
  }
  if (Array.isArray(state.parts)) {
    lines.push(`parts: ${state.parts.join(" + ")}`);
  }
  if (typeof state.text === "string") {
    lines.push(`phrase: ${state.text}`);
  }
  return lines.length
    ? lines
        .filter((l) => l)
        .map((l) => indent + "· " + l + "\n")
        .join("")
    : "";
}

function expressOutput(roots) {
  const replies = [];
  const collect = (node) => {
    if (node.kind === "express" && node.name && node.name !== "...") {
      replies.push(node.name);
    }
    (node.branch || []).forEach(collect);
  };
  (roots || []).forEach(collect);
  return replies.length ? replies.join("\n") : "—";
}
