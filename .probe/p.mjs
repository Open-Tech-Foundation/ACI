import { openBrain } from '../src/index.js';
const P = { from: 29 };
const b = openBrain('sqlite::memory:');
const r = await b.brain('i have two puppy dogs, one is white color and another is grey color', P);
console.log('=>', r.expression?.state?.says);
console.log(b.serialize());
