const t0 = performance.now();
const { openBrain } = await import('../src/index.js');
const t1 = performance.now();
const { brain } = openBrain('sqlite::memory:');
const t2 = performance.now();
await brain('a drum is cold');           // first turn: assembles the world
const t3 = performance.now();
for (let i = 0; i < 20; i += 1) await brain('is a drum cold?');
const t4 = performance.now();
for (let i = 0; i < 5; i += 1) await brain(`a bell${i} is red`);
const t5 = performance.now();
console.log(`import module      ${(t1 - t0).toFixed(0)} ms`);
console.log(`openBrain          ${(t2 - t1).toFixed(0)} ms`);
console.log(`first turn (load)  ${(t3 - t2).toFixed(0)} ms`);
console.log(`ask                ${((t4 - t3) / 20).toFixed(1)} ms each`);
console.log(`learn              ${((t5 - t4) / 5).toFixed(1)} ms each`);
