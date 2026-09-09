// Hand the brain a signal and see the conversation graph it left.
//
//   esdev graph.mjs "john has 5 apples and he put three apples into a basket"
//
// Nothing here builds or describes the graph. It calls serialize and prints it.
import { openBrain } from './src/index.js';
import { serialize } from './src/graph.js';

const { brain } = openBrain('sqlite::memory:');
const lines = (await import('runtime:process')).args;

if (lines.length === 0) {
  console.log('say something: esdev graph.mjs "john has 5 apples"');
} else {
  for (const line of lines) {
    await brain(line);
    console.log(`\n> ${line}\n`);
    console.log(serialize());
  }
}
