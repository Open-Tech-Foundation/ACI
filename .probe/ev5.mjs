import { openBrain } from '../src/index.js';
const b = openBrain('sqlite::memory:');
const r = await b.brain('a tree fell on the road in the evening');
