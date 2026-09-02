/** Type a question; watch it compile, derive and answer. */

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
      A question is a gap. It is compiled into one, filled from what the brain
      holds, and answered with a kind — never a sentence it made up.
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
    if (asked === null) {
      return html`<section class="answer">
        <p class="empty">Ask something, and every step from your words to the answer appears here.</p>
      </section>`;
    }

    return html`
      <section class="answer">
        <h2>${asked.text}</h2>

        <h3>Words</h3>
        <ul class="tokens">
          ${asked.read.map((token) => html`
            <li class="token as-${token.as}">
              <span class="word">${token.word}</span>
              <span class="as">${token.kind ?? token.relation ?? token.ask ?? token.as}</span>
            </li>
          `)}
        </ul>

        <h3>The gap</h3>
        ${asked.gap === null
          ? html`<p class="none">It could not be compiled into a gap, so there is nothing to fill.</p>`
          : html`<pre class="gap">${JSON.stringify(asked.gap, null, 2)}</pre>`}

        <h3>Answer</h3>
        ${asked.answer.length === 0
          ? html`<p class="none">Nothing. It will not invent one.</p>`
          : html`<ul class="said">${asked.answer.map((one) => html`<li>${one}</li>`)}</ul>`}

        ${asked.because.length > 0
          ? html`
            <h3>Because</h3>
            <ul class="facts">
              ${asked.because.map((fact) => html`
                <li>
                  <span class="from">${fact[0]}</span>
                  <span class="rel">${fact[1]}</span>
                  <span class="to">${fact[2]}</span>
                </li>
              `)}
            </ul>`
          : ""}
      </section>
    `;
  };
});

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
