/** understand, then resolve. The brain holds no words and runs nothing. */

import { resolve } from "./resolve.js";
import { understand } from "./understand.js";

export function createBrain({ knowledge, language }) {
  return {
    knowledge,
    ask(text) {
      const understood = understand(language, text);
      const { answer, because } = resolve(knowledge, understood.gap);
      return { ...understood, answer, because };
    },
  };
}
