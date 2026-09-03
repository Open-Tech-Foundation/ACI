import { define, html, update } from "@opentf/micro-ui";

define("x-ask", (el) => {
  let input = "";
  let result = null;
  let error = null;
  let active = "expression";

  async function run() {
    error = null;
    try {
      const res = await fetch("/brain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ q: input }),
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      result = await res.json();
      active = "expression";
    } catch (e) {
      error = String(e.message || e);
    }
    update(el);
  }

  // Two views: what the brain said, and the objects it built to say it.
  const tabs = [
    { key: "expression", label: "Expression" },
    { key: "tree", label: "Tree" },
  ];

  return () => html`
    <div class="app">
      <h1>ACI</h1>
      <div class="input-row">
        <input
          type="text"
          placeholder="try 'the bird is a dog'"
          value=${input}
          oninput=${(e) => { input = e.target.value; }}
          onkeydown=${(e) => { if (e.key === "Enter") run(); }}
        />
        <button onclick=${run}>Think</button>
      </div>
      ${error && html`<div class="error">${error}</div>`}
      ${result &&
        html`
          <div class="tabs">
            ${tabs.map((t) => html`
              <button
                class=${active === t.key ? "tab tab-active" : "tab"}
                onclick=${() => { active = t.key; update(el); }}
              >
                ${t.label}
              </button>
            `)}
          </div>
          <div class="stage">
            ${active === "expression"
              ? html`
                  <div class="stage-label">${result.input ? `"${result.input}"` : "no signal"}</div>
                  <div class="output">${result.expression.state.says ?? "— unsaid"}</div>
                  <div class="act">
                    ${result.expression.name}
                    ${result.expression.state.language
                      ? ` · ${result.expression.state.language}`
                      : " · no language"}
                  </div>
                  ${result.expression.branch.length > 1
                    ? html`<pre class="parts">${expressOutput(result.expression.branch)}</pre>`
                    : ""}
                `
              : html`
                  <div class="stage-label">${result.roots.length} root${result.roots.length === 1 ? "" : "s"}</div>
                  <pre class="tree">${render(result.roots)}</pre>
                `}
          </div>
        `}
    </div>
  `;
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
    lines.push(`term: ${t.concept ?? "—"}`);
  }
  if (typeof state.concept === "number") {
    lines.push(`term: ${state.concept}`);
  }
  if (typeof state.relation === "number") {
    lines.push(`claim: ${state.subject} ${state.relation} ${state.object}`);
  }
  if (typeof state.language === "string") {
    lines.push(`language: ${state.language}`);
  }
  if ("says" in state) {
    lines.push(`says: ${state.says ?? "— (this language has no words for it)"}`);
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

// What the brain said about each thing, under what it said about the whole.
function expressOutput(parts) {
  const replies = (parts || [])
    .map((p) => p.state.says)
    .filter((n) => n && n !== "...");
  return replies.length ? replies.join("\n") : "—";
}
