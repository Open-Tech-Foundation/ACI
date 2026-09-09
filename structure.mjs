// Hand the brain a signal and see the conversation graph it left behind.
//
//   esdev structure.mjs "meera has 5 books" "meera gives 2 books to dev"
//
// Every line is one signal in one conversation, so what an earlier line put in
// is still there when a later one is read. What is printed is the graph saying
// what is in it — nothing here describes the graph, and nothing is worked out
// on the way to the screen.
import { openBrain } from './src/index.js';

const { read } = openBrain('sqlite::memory:');
const lines = (await import('runtime:process')).args;

if (lines.length === 0) {
  console.log('say something: esdev structure.mjs "meera has 5 books"');
} else {
  for (const line of lines) {
    const laid = await read(line);
    console.log(`\n> ${line}`);
    console.log(`  ${laid.says}`);
    const said = laid.text();
    console.log(said ? said.replace(/^/gm, '  ') : '  (nothing in the graph)');
  }
}
