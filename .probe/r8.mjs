import { openBrain } from '../src/index.js';
const P = { from: 29 };
const b = openBrain('sqlite::memory:');
await b.brain('the drum is in a box', P);
await b.brain('the drum is in a shelf', P);
console.log(b.serialize());
console.log('ask:', (await b.brain('the drum is in a box?', P)).expression?.state?.says);
