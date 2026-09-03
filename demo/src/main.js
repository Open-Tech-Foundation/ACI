import { define, html, update } from "@opentf/micro-ui";

define("x-ask", (el) => {
  let input = "";
  let result = null;
  let error = null;
  let active = "understand";

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
      active = "understand";
    } catch (e) {
      error = String(e.message || e);
    }
    update(el);
  }

  const tabs = () =>
    Object.keys(result.phases).map((key, i) => ({
      key,
      label: `${i + 1} · ${key[0].toUpperCase()}${key.slice(1)}`,
    }));

  return () => {
    const activeTree = result && result.phases ? result.phases[active] : null;

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
      ${error && html`<div class="error">${error}</div>`}
      ${result &&
        html`
          <div class="tabs">
            ${tabs().map((p) => html`
              <button
                class=${active === p.key ? "tab tab-active" : "tab"}
                onclick=${() => { active = p.key; update(el); }}
              >
                ${p.label}
              </button>
            `)}
          </div>
          <div class="stage">
            <div class="stage-label">${(tabs().find((p) => p.key === active) || {}).label}</div>
            ${active === "express"
              ? html`
                  <div class="output">${result.expression.name}</div>
                  <pre class="tree">${expressOutput(result.expression.branch)}</pre>
                `
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
  const replies = (parts || []).map((p) => p.name).filter((n) => n && n !== "...");
  return replies.length ? replies.join("\n") : "—";
}
