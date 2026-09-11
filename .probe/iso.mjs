import { openBrain } from '../src/index.js';
const A = openBrain('sqlite::memory:');
const B = openBrain('sqlite::memory:');
const ask = async () => (await B.brain('what is taller than a dog?')).expression?.state?.says;
console.log('B before      :', await ask());
await A.brain('a cat is taller than a dog');
console.log('B after A told:', await ask());
await A.forget();
console.log('B after forget:', await ask());
