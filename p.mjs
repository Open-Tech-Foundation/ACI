import { openBrain } from './src/index.js';
globalThis.__dbg = true;
const { brain } = openBrain('sqlite::memory:');
for (const line of (await import('runtime:process')).args) { const r = await brain(line); console.log('>', line, '=>', r.expression?.state?.says ?? r.expression?.name); }
