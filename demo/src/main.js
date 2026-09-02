/**
 * The page: a composer, a transcript, and the signal path that explains it.
 *
 * State lives in Micro-UI's store rather than in the components, so the panel
 * on the right and the transcript on the left cannot disagree about which turn
 * is being inspected.
 */

import { define, html, onReady, store, update } from "@opentf/micro-ui";
import { STAGES, chainFor, percent } from "./chain.js";
import { ask, concepts, stats, teach } from "./engine.js";

const EXAMPLES = ["how are you", "thankss", "what is your name", "hellooo", "goodbye"];

store.set("turns", []);
store.set("selected", -1);

/** Runs a turn and selects it. */
function run(text) {
  const input = text.trim();
  if (input === "") return;
  const turns = [...store.get("turns"), ask(input)];
  store.set("turns", turns);
  store.set("selected", turns.length - 1);
}

function selected() {
  return store.get("turns")[store.get("selected")];
}

/** Re-renders `el` whenever any of `keys` changes. */
function watch(el, ...keys) {
  const offs = keys.map((key) => store.subscribe(key, () => update(el)));
  return () => offs.forEach((off) => off());
}

// ---------------------------------------------------------------- layout

define("aci-app", () => () => html`
  <header class="masthead">
    <h1>ACI</h1>
    <p class="tagline">Every answer built from words, relationships and rules, with the reasoning on show.</p>
    <aci-counts></aci-counts>
  </header>
  <div class="bench">
    <section class="console">
      <aci-composer></aci-composer>
      <aci-transcript></aci-transcript>
    </section>
    <aci-signal></aci-signal>
  </div>
`);

define("aci-counts", (el) => {
  onReady(() => watch(el, "turns"));
  return () => {
    const { nodes, edges, aliases } = stats();
    return html`
      <dl class="counts">
        <div><dt>Nodes</dt><dd>${String(nodes)}</dd></div>
        <div><dt>Edges</dt><dd>${String(edges)}</dd></div>
        <div><dt>Spellings</dt><dd>${String(aliases)}</dd></div>
      </dl>
    `;
  };
});

// -------------------------------------------------------------- composer

define("aci-composer", (el) => {
  function submit(event) {
    event.preventDefault();
    const field = el.querySelector("input");
    run(field.value);
    field.value = "";
    field.focus();
  }

  return () => html`
    <form class="composer" onsubmit=${submit}>
      <label class="visually-hidden" for="say">Your message</label>
      <input id="say" name="say" type="text" autocomplete="off" placeholder="Say something" />
      <button type="submit" class="send">Ask</button>
    </form>
    <ul class="examples">
      ${EXAMPLES.map((example) => html`
        <li><button type="button" onclick=${() => run(example)}>${example}</button></li>
      `)}
    </ul>
  `;
});

// ------------------------------------------------------------- transcript

define("aci-transcript", (el) => {
  onReady(() => watch(el, "turns", "selected"));

  function learn(event, turn) {
    event.preventDefault();
    const concept = event.target.querySelector("select").value;
    const answer = teach(turn.input, concept);
    const turns = [...store.get("turns"), answer];
    store.set("turns", turns);
    store.set("selected", turns.length - 1);
  }

  return () => {
    const turns = store.get("turns");
    const chosen = store.get("selected");

    return html`
      <ol class="transcript">
        ${turns.map((turn, index) => html`
          <li class="turn ${index === chosen ? "is-selected" : ""}">
            <button type="button" class="turn-body" onclick=${() => store.set("selected", index)}>
              <span class="said">${turn.input}</span>
              <span class="replied">${turn.response}</span>
              <span class="readout">
                <span class="type kind-${turn.type}">${turn.type}</span>
                <span class="confidence">${percent(turn.meta.confidence)} understood</span>
              </span>
            </button>
            ${turn.type === "unknown" && turn.input !== ""
              ? html`
                <form class="teach" onsubmit=${(event) => learn(event, turn)}>
                  <label for="as-${String(index)}">Teach it: “${turn.input}” means</label>
                  <select id="as-${String(index)}" name="concept">
                    ${concepts().map((name) => html`<option value=${name}>${name}</option>`)}
                  </select>
                  <button type="submit">Teach</button>
                </form>`
              : ""}
          </li>
        `)}
      </ol>
    `;
  };
});

// ----------------------------------------------------------- signal path

define("aci-signal", (el) => {
  onReady(() => watch(el, "turns", "selected"));

  return () => {
    const turn = selected();
    if (!turn) {
      return html`<aside class="signal"><p class="empty">Ask something, and every step from your words to the answer appears here.</p></aside>`;
    }

    const rows = chainFor(turn);
    return html`
      <aside class="signal">
        ${STAGES.map((stage) => html`
          <section class="stage">
            <h2>${stage.title}</h2>
            <p class="blurb">${stage.blurb}</p>
            <ol class="chain">
              ${rows.filter((row) => row.stage === stage.id).map((row) => html`
                <li class="link kind-${row.kind}">
                  <span class="kind">${row.kind}</span>
                  <span class="value">
                    ${row.from ? html`<span class="from">${row.from}</span>` : ""}
                    <span class="label">${row.label}</span>
                  </span>
                  ${typeof row.score === "number" ? html`<span class="score">${row.score.toFixed(2)}</span>` : ""}
                  ${row.note ? html`<span class="note">${row.note}</span>` : ""}
                </li>
              `)}
            </ol>
          </section>
        `)}
        <details class="envelope">
          <summary>The envelope this produced</summary>
          <pre><code>${JSON.stringify({ ...turn, trace: undefined }, null, 2)}</code></pre>
        </details>
      </aside>
    `;
  };
});

// The page opens on a worked example, so the first thing anyone sees is the
// engine's reasoning rather than an empty box asking them to imagine it.
run("Hi");
