globalThis.CDBG = 1;
import { openBrain } from '../src/index.js';
await openBrain('sqlite::memory:').brain('i have two dogs and one is white', { from: 29 });
