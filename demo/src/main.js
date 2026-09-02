/** Type a word. See what it is, and what that is, down to existence. */

import { define, html, update } from "@opentf/micro-ui";
import world from "../../data/world.json" with { type: "json" };
import { createBrain } from "../../src/brain.js";

const brain = createBrain(world);

function why({ of, chain, ends }) {
  const last = chain.at(-1) ?? of;
  if (ends === "untaught") return html`nothing explains <em>${last}</em> yet`;
  if (ends === "circular") return html`<em>${last}</em> explains itself`;
  return html`never seen <em>${of}</em>`;
}

function column(one) {
  const layers = one.chain.slice(1);
  const done = one.ends === "bottom";

  return html`
    <article class="chain">
      <div class="head">${one.of}</div>
      <ol class="steps">
        ${layers.map((step, i) => html`
          <li style=${`--i:${i + 1}`} class=${done && i === layers.length - 1 ? "last" : ""}>${step}</li>
        `)}
      </ol>
      ${done ? "" : html`<div class="stop"></div><p class="note">${why(one)}</p>`}
    </article>
  `;
}

define("x-ask", (el) => {
  let word = "hi";
  const onInput = (e) => { word = e.target.value.trim().toLowerCase(); update(el); };

  return () => html`
    <h1 class="ask">
      <span>what is</span>
      <input value=${word} oninput=${onInput} placeholder="hi" autofocus spellcheck="false" />
    </h1>
    ${word === ""
      ? html`<p class="idle">Ask about any word.</p>`
      : html`<div class="field">${brain(word).chains.map(column)}</div>`}
  `;
});
