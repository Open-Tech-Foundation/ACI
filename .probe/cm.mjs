globalThis.RDBG = 1;
import { openBrain } from '../src/index.js';
await openBrain('sqlite::memory:').brain('the sky is blue, the grass is green', { from: 29 });
