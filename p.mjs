import { openBrain } from './src/index.js';
const { brain, forget } = openBrain('sqlite::memory:');
for (const s of ["the sky is not blue", "omar is not a father", "omar is the father of devi", "omar is not the father of devi", "the wheel is not part of the cart", "a leg is not part of a cow", "why is the drum not cold?", "why is the sky not blue?"]) {
  await forget();
  const r = await brain(s, { from: 29 });
  console.log(`${s.padEnd(36)} => ${r.expression?.state?.says ?? r.expression?.name}`);
}
