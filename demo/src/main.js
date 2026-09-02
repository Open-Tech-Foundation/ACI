/** Type a word. See how far down each part of it goes. */

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

function bore(one) {
  const layers = one.chain.slice(1);
  const struck = one.ends === "bottom";

  return html`
    <article class="bore">
      <div class="head">${one.of}</div>
      <ol class="strata">
        ${layers.map((step, i) => html`
          <li style=${`--i:${i + 1}`} class=${struck && i === layers.length - 1 ? "floor" : ""}>${step}</li>
        `)}
      </ol>
      ${struck ? "" : html`<div class="trail"></div><p class="stopped">${why(one)}</p>`}
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
    <p class="hint">Every answer is asked the same question again. A bore ends at bedrock — the one thing nothing explains — or stops where the knowledge runs out.</p>
    ${word === ""
      ? html`<p class="idle">Ask about any word.</p>`
      : html`<div class="field">${brain(word).chains.map(bore)}</div>`}
  `;
});
