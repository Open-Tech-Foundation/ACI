/** Type a word. See what it is, all the way down. */

import { define, html, update } from "@opentf/micro-ui";
import world from "../../data/world.json" with { type: "json" };
import { createBrain } from "../../src/brain.js";

const brain = createBrain(world);

const ENDS = {
  bottom: "nothing is under this",
  untaught: "not taught yet",
  unknown: "never seen this",
  circular: "it explains itself",
};

define("x-ask", (el) => {
  let word = "hi";

  const onInput = (event) => {
    word = event.target.value.trim().toLowerCase();
    update(el);
  };

  return () => html`
    <header>
      <h1>what is this?</h1>
      <p>Every answer is asked the same question again, until nothing answers.</p>
      <input value=${word} oninput=${onInput} placeholder="hi" autofocus spellcheck="false" />
    </header>

    <main>
      ${word === "" ? html`<p class="idle">type something</p>` : chains(brain(word).chains)}
    </main>
  `;
});

const chains = (found) => found.map((one) => html`
  <section>
    <h2>${one.of}</h2>
    <ol>
      ${one.chain.map((step) => html`<li>${step}</li>`)}
      <li class=${"end " + one.ends}>${one.ends === "bottom" ? "null" : "?"}</li>
    </ol>
    <p class="why">${ENDS[one.ends]}</p>
  </section>
`);
