import { openBrain } from '../src/index.js';
const { brain, conversation } = openBrain('sqlite::memory:');
await brain('my cat is red', { from: 29 });
const { fromSources } = await import('../src/knowledge.js');
