/** Ask it something, see the answer and where it came from. */

import { define, html, onReady, store, update } from "@opentf/micro-ui";

import { brain, knowledge, ledger } from "./brain.js";

const EXAMPLES = [
  "is a sparrow an animal?",
  "which is heavier, apple or cat?",
  "which is lighter, apple or cat?",
  "what is a sparrow?",
  "what is your name?",
  "explain me algebra",
];

store.set("asked", null);

function ask(text) {
  if (text.trim() === "") return;
  store.set("asked", { text, ...brain.ask(text) });
}

function watch(el, ...keys) {
  const offs = keys.map((key) => store.subscribe(key, () => update(el)));
  return () => offs.forEach((off) => off());
}

define("aci-app", () => () => html`
  <header class="masthead">
    <h1>ACI</h1>
    <p class="tagline">
      Ask it something. It answers only from what it holds, or says it does not
      know — and it will tell you which facts the answer came from.
    </p>
    <dl class="counts">
      <div><dt>Taught</dt><dd>${String(knowledge.given.length)}</dd></div>
      <div><dt>Derived</dt><dd>${String(knowledge.derived)}</dd></div>
    </dl>
  </header>
  <div class="bench">
    <section class="console">
      <aci-composer></aci-composer>
      <aci-answer></aci-answer>
    </section>
    <aci-known></aci-known>
  </div>
`);

define("aci-composer", (el) => {
  function submit(event) {
    event.preventDefault();
    const field = el.querySelector("input");
    ask(field.value);
    field.select();
  }

  return () => html`
    <form class="composer" onsubmit=${submit}>
      <label class="visually-hidden" for="q">Your question</label>
      <input id="q" name="q" type="text" autocomplete="off" placeholder="Ask it something" />
      <button type="submit" class="send">Ask</button>
    </form>
    <ul class="examples">
      ${EXAMPLES.map((example) => html`
        <li><button type="button" onclick=${() => ask(example)}>${example}</button></li>
      `)}
    </ul>
  `;
});

define("aci-answer", (el) => {
  onReady(() => watch(el, "asked"));

  return () => {
    const asked = store.get("asked");
    if (asked === null) return html`<section class="answer"></section>`;

    if (asked.answer.length === 0) {
      return html`
        <section class="answer">
          <p class="said none">I don't know.</p>
          <p class="why">
            ${asked.gap === null
              ? "I could not work out what is being asked."
              : "Nothing I hold fills that."}
            ${asked.unknown.length > 0
              ? html` I have never met ${asked.unknown.join(", ")}.`
              : ""}
          </p>
        </section>
      `;
    }

    return html`
      <section class="answer">
        <p class="said">${asked.answer.join(", ")}</p>
        ${asked.because.length > 0
          ? html`
            <ol class="why">
              ${asked.because.map((fact) => html`
                <li>${readable(fact)}</li>
              `)}
            </ol>`
          : ""}
      </section>
    `;
  };
});

/** A fact, readably. Arrows rather than invented grammar. */
function readable([from, relation, to]) {
  if (relation === "is-a") return `${from} \u2192 ${to}`;
  if (relation === "less-weight") return `${from} weighs less than ${to}`;
  return `${from} ${relation.replace(/-/g, " ")} ${to}`;
}

define("aci-known", () => () => {
  const rows = ledger();
  return html`
    <aside class="known">
      <h2>Everything it holds</h2>
      <p class="blurb">
        Taught in plain type, worked out in italics. Nothing else exists to it.
      </p>
      <ul class="facts">
        ${rows.map(({ fact, derived }) => html`
          <li class="${derived ? "is-derived" : ""}">
            <span class="from">${fact[0]}</span>
            <span class="rel">${fact[1]}</span>
            <span class="to">${fact[2]}</span>
          </li>
        `)}
      </ul>
    </aside>
  `;
});

ask("which is heavier, apple or cat?");
