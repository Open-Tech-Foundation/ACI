/**
 * Behaviour tests know one thing: you send the model something and it answers.
 * They must survive any rewrite of the internals.
 *
 * They currently run on a placeholder lesson, so what they assert is the shape
 * of the contract, not knowledge. Real training has not started; when it does,
 * these get rewritten, and until then a failure here is not worth defending.
 */

import { assertEquals, test } from "runtime:test";

import { createACI } from "../src/aci.js";
import { illustration } from "../fixtures/illustration.js";

/** `body(aci, another)` — a session, and a way to open a second one. */
export function scenario(name, body, { teach } = {}) {
  test(name, () => body(session(teach), () => session(teach)));
}

function session(teach) {
  const model = createACI({ teach: teach ?? illustration });

  return (...inputs) => {
    const sent = JSON.stringify(inputs.length === 1 ? inputs[0] : inputs);
    const { express } = model(...inputs);

    return {
      answers(expected) {
        assertEquals(express, expected, `${sent} should answer "${expected}"`);
      },
      saysNothing() {
        assertEquals(express, null, `${sent} should say nothing, said "${express}"`);
      },
    };
  };
}
