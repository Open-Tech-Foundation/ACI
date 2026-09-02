/**
 * A very small harness for behaviour tests.
 *
 * The point of these tests is that they know exactly one thing about the
 * model: you send it something and it answers. No state names, no tables, no
 * walks, no steps, no module paths beyond the front door. Rewrite Layer 0
 * however you like — change the data structures, change the algorithms,
 * change the storage — and these must still pass unchanged. If one of them
 * has to be edited to make a refactor green, the behaviour changed, and that
 * belongs in SPEC.md before it belongs in the code.
 *
 * The unit tests beside each module are the opposite: they are allowed to
 * know everything, and they are expected to be thrown away with the code they
 * describe.
 */

import { assertEquals, test } from "runtime:test";

import { createACI } from "../src/aci.js";

/**
 * @param name  what the model should do, in plain words
 * @param body  receives `aci`, a fresh session callable as `aci(input)`, and
 *              `another()`, which opens a second session with the same
 *              training — for saying that one session cannot reach into another
 * @param teach optional: train these sessions instead of using the default
 */
export function scenario(name, body, { teach } = {}) {
  test(name, () => body(session(teach), () => session(teach)));
}

function session(teach) {
  const model = createACI(teach ? { teach } : {});

  return (input) => {
    // A turn is one signal or a sequence of them. It is deliberately not a
    // sentence: splitting text into signals is Layer 1's job and Layer 1 does
    // not exist yet, so a spec test that wants a sequence writes an array.
    const sent = Array.isArray(input) ? input.join(" ") : String(input);
    const said = model(input);

    return {
      answers(expected) {
        assertEquals(said, expected, `"${sent}" should answer "${expected}"`);
      },
      saysNothing() {
        assertEquals(said, null, `"${sent}" should say nothing, said "${said}"`);
      },
    };
  };
}
