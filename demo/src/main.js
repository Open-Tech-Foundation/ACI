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

// A name for this thread that no other thread will take. `crypto.randomUUID`
// is only there in a secure context, and the demo is served over plain http on
// whatever host it is run from, so the bytes are drawn directly — and where
// even those are missing, from the weakest source there is, which is still
// enough to tell two tabs apart.
function made() {
  const bytes = new Uint8Array(16);
  if (globalThis.crypto && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function named() {
  const id = held() || made();
  keep(id);
  return id;
}

define("x-ask", (el) => {
  let conversation = named();
  let turns = [];
  let input = "";
  let pending = false;
  let error = null;
  let showGraph = false;
  let graphText = null;

  // What the conversation has built, spoken as its world would. Fetched
  // again after each turn, so the graph shown is the one the answers just
  // came out of — live, not the last signal's parse.
  async function refreshGraph() {
    graphText = null;
    update(el);
    try {
      const res = await fetch("/graph", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ conversation }),
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      graphText = (await res.json()).graph;
    } catch (e) {
      graphText = `cannot read the graph — ${String(e.message || e)}`;
    }
    update(el);
  }

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
      turns = [...turns, { q, result: await res.json() }];
      if (showGraph) await refreshGraph();
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
    conversation = made();
    keep(conversation);
    turns = [];
    error = null;
    graphText = null;
    update(el);
  }

  function toggleGraph() {
    showGraph = !showGraph;
    if (showGraph && graphText == null) refreshGraph();
    else update(el);
  }

  return () => html`
    <div class="app">
      <div class="head">
        <h1>ACI</h1>
        <div class="thread">
          <span class="id">${conversation.slice(0, 8)}</span>
          <button class="new" onclick=${toggleGraph}>
            ${showGraph ? "Hide graph" : "Graph"}
          </button>
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
              </div>
            </div>
          `,
        )}
        ${pending ? html`<div class="turn pending">…</div>` : ""}
      </div>

      ${showGraph
        ? html`<pre class="graph">${graphText ?? "reading the graph…"}</pre>`
        : ""}

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
