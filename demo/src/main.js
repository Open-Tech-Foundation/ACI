/**
 * The page: send a turn, watch the walk, read what was taught.
 *
 * There is nothing to explain about words or meaning here, because the engine
 * has neither. What you can see is the whole of Layer 0: which state the brain
 * is in, what each signal did to it, and what it read out at the end.
 *
 * State lives in Micro-UI's store rather than in the components, so the panels
 * cannot disagree about which turn is being inspected.
 */

import { define, html, onReady, store, update } from "@opentf/micro-ui";

import { atomsOf, brain, experience, learned, taught } from "./engine.js";
import { walkFor } from "./walk.js";

const EXAMPLES = [
  ["touch", "the loop from the spec"],
  ["hey", "one signal"],
  ["hey stop that", "the same signal, walked further"],
  ["plughxyz", "nothing it was taught"],
  ["stop", "meaningless from here"],
];

store.set("turns", []);
store.set("selected", -1);
store.set("state", brain.state);

/** Runs one turn and selects it. */
function run(line) {
  const atoms = atomsOf(line);
  const from = brain.state;
  const turn = brain.sense(atoms);
  const turns = [...store.get("turns"), { atoms, from, turn }];
  store.set("turns", turns);
  store.set("selected", turns.length - 1);
  store.set("state", brain.state);
}

function reset() {
  brain.reset();
  store.set("state", brain.state);
  run("");
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
    <p class="tagline">
      Layer 0: a signal arrives, it moves the brain from one state to another,
      and the brain reads out the state it is in. Nothing here knows what a word is.
    </p>
    <aci-here></aci-here>
  </header>
  <div class="bench">
    <section class="console">
      <aci-composer></aci-composer>
      <aci-transcript></aci-transcript>
    </section>
    <aci-walk></aci-walk>
    <aci-taught></aci-taught>
  </div>
`);

define("aci-here", (el) => {
  onReady(() => watch(el, "state", "turns"));
  return () => html`
    <dl class="here">
      <div><dt>State</dt><dd class="atom state">${store.get("state")}</dd></div>
      <div><dt>Transitions</dt><dd>${String(experience.size)}</dd></div>
    </dl>
  `;
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
      <label class="visually-hidden" for="atoms">Signals for this turn</label>
      <input
        id="atoms"
        name="atoms"
        type="text"
        autocomplete="off"
        placeholder="Signals, separated by spaces"
      />
      <button type="submit" class="send">Send</button>
    </form>
    <ul class="examples">
      ${EXAMPLES.map(([line, why]) => html`
        <li>
          <button type="button" onclick=${() => run(line)}>
            <span class="atoms">${line}</span>
            <span class="why">${why}</span>
          </button>
        </li>
      `)}
      <li>
        <button type="button" class="reset" onclick=${reset}>
          <span class="atoms">reset</span>
          <span class="why">back to the state training declares</span>
        </button>
      </li>
    </ul>
  `;
});

// ------------------------------------------------------------- transcript

define("aci-transcript", (el) => {
  onReady(() => watch(el, "turns", "selected"));

  return () => {
    const turns = store.get("turns");
    const chosen = store.get("selected");

    return html`
      <ol class="transcript">
        ${turns.map(({ atoms, from, turn }, index) => html`
          <li class="turn ${index === chosen ? "is-selected" : ""}">
            <button type="button" class="turn-body" onclick=${() => store.set("selected", index)}>
              <span class="sent">${atoms.length === 0 ? "—" : atoms.join(" ")}</span>
              <span class="expressed ${turn.express === null ? "is-silent" : ""}">
                ${turn.express ?? "silence"}
              </span>
              <span class="readout">
                <span class="atom state">${from}</span>
                <span class="arrow">→</span>
                <span class="atom state">${turn.steps.at(-1)?.to ?? from}</span>
              </span>
            </button>
          </li>
        `)}
      </ol>
    `;
  };
});

// ------------------------------------------------------------------ walk

define("aci-walk", (el) => {
  onReady(() => watch(el, "turns", "selected"));

  return () => {
    const chosen = selected();
    if (!chosen) {
      return html`<aside class="walk">
        <p class="empty">Send some signals, and the walk they take appears here.</p>
      </aside>`;
    }

    const rows = walkFor(chosen.turn, chosen.from, learned);
    return html`
      <aside class="walk">
        <h2>The walk</h2>
        <p class="blurb">
          Each signal is applied to wherever the last one left the brain. The
          answer is read out once, from the state at the end.
        </p>
        <ol class="chain">
          ${rows.map((row) => html`
            <li class="link kind-${row.kind} ${row.taught === false ? "is-untaught" : ""}">
              <span class="kind">${row.kind}</span>
              <span class="value">
                ${row.atom ? html`<span class="from">${row.atom}</span>` : ""}
                <span class="label">${row.label}</span>
              </span>
              ${row.taught === false ? html`<span class="note">nothing taught — no move</span>` : ""}
              ${row.silent ? html`<span class="note">no expression taught</span>` : ""}
            </li>
          `)}
        </ol>
      </aside>
    `;
  };
});

// ---------------------------------------------------------------- taught

define("aci-taught", () => () => {
  const { start, effects, expressions, silent } = taught();
  return html`
    <aside class="taught">
      <h2>Everything it was taught</h2>
      <p class="blurb">
        The whole of the brain's knowledge. It cannot answer with anything that
        is not on this list, and it will not guess at anything that is missing.
      </p>
      <h3>Effects <span class="count">${String(effects.length)}</span></h3>
      <ol class="rows">
        ${effects.map((row) => html`
          <li>
            <span class="atom state">${row.state}</span>
            <span class="atom signal">${row.signal}</span>
            <span class="arrow">→</span>
            <span class="atom state">${row.next}</span>
          </li>
        `)}
      </ol>
      <h3>Expressions <span class="count">${String(expressions.length)}</span></h3>
      <ol class="rows">
        ${expressions.map((row) => html`
          <li>
            <span class="atom state">${row.state}</span>
            <span class="arrow">→</span>
            <span class="atom express">${row.signal}</span>
          </li>
        `)}
      </ol>
      <p class="footnote">
        Starts in <span class="atom state">${start}</span>.
        Silent states: ${silent.length === 0 ? "none" : silent.join(", ")}.
      </p>
    </aside>
  `;
});

// The page opens on the specification's own example, so the first thing anyone
// sees is a walk rather than an empty box asking them to imagine one.
run("touch");
