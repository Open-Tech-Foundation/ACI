import { define, html, update } from "@opentf/micro-ui";

// One conversation is one thread of signals through the brain's one world.
// The id is the thread's name: the server keeps what was last spoken of under
// it, so a pointer in one signal lands on the thing the signal before it was
// about. It is kept in sessionStorage so a reload stays in the same
// conversation, and starting a new one is what breaks the thread.
const KEY = "aci.conversation";

function held() {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function keep(id) {
  try {
    sessionStorage.setItem(KEY, id);
  } catch {
    // A browser that will not keep it still holds it for this page.
  }
}

function named() {
  const id = held() || crypto.randomUUID();
  keep(id);
  return id;
}

define("x-ask", (el) => {
  let conversation = named();
  let turns = [];
  let input = "";
  let pending = false;
  let error = null;

  async function send() {
    const q = input.trim();
    if (!q || pending) return;
    input = "";
    error = null;
    pending = true;
    update(el);

    try {
      const res = await fetch("/brain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ q, conversation }),
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      turns = [...turns, { q, result: await res.json(), open: false }];
    } catch (e) {
      error = String(e.message || e);
    }
    pending = false;
    update(el);
    queueMicrotask(() => {
      const list = el.querySelector(".turns");
      if (list) list.scrollTop = list.scrollHeight;
    });
  }

  function fresh() {
    conversation = crypto.randomUUID();
    keep(conversation);
    turns = [];
    error = null;
    update(el);
  }

  function toggle(turn) {
    turn.open = !turn.open;
    update(el);
  }

  return () => html`
    <div class="app">
      <div class="head">
        <h1>ACI</h1>
        <div class="thread">
          <span class="id">${conversation.slice(0, 8)}</span>
          <button class="new" onclick=${fresh}>New</button>
        </div>
      </div>

      <div class="turns">
        ${turns.length === 0 && !pending
          ? html`<div class="empty">Nothing said yet.</div>`
          : ""}
        ${turns.map(
          (turn) => html`
            <div class="turn">
              <div class="said">${turn.q}</div>
              <div class="reply">${turn.result.expression.state.says ?? "— unsaid"}</div>
              <div class="foot">
                <span class="act">
                  ${turn.result.expression.name}${turn.result.expression.state.language
                    ? ` · ${turn.result.expression.state.language}`
                    : " · no language"}${turn.result.learned ? " · learned" : ""}
                </span>
                <button class="tab" onclick=${() => toggle(turn)}>
                  ${turn.open ? "Hide tree" : "Tree"}
                </button>
              </div>
              ${turn.open
                ? html`<pre class="tree">${render(turn.result.roots)}</pre>`
                : ""}
            </div>
          `,
        )}
        ${pending ? html`<div class="turn pending">…</div>` : ""}
      </div>

      ${error ? html`<div class="error">${error}</div>` : ""}

      <div class="input-row">
        <input
          type="text"
          placeholder="a basket holds three apple"
          value=${input}
          oninput=${(e) => {
            input = e.target.value;
          }}
          onkeydown=${(e) => {
            if (e.key === "Enter") send();
          }}
        />
        <button onclick=${send} disabled=${pending}>Say</button>
      </div>
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
