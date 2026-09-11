// The basics, as transcripts.
//
//   esdev tests/run.mjs               every category
//   esdev tests/run.mjs state space   only those
//
// A file under tests/basics is one category. A blank line starts a new
// conversation, so what one line settles stands for the next. A line with no
// arrow is told and not checked; `=>` checks what the brain answered, and `?>`
// records what it answers today where that is known to be wrong — so a file
// says what works and what is still owed, and neither can drift unnoticed.
//
// What follows an arrow is the reply itself where it matters, or the name of
// the verdict — affirm, deny, unsure, learn, answer, unknown — where only the
// judgement does.
import { openBrain } from '../src/index.js';

const { readDir, file } = await import('runtime:fs');
const { args } = await import('runtime:process');
const here = new URL('./basics/', import.meta.url).pathname;

const VERDICTS = ['affirm', 'deny', 'unsure', 'learn', 'know', 'answer', 'unknown', 'understood', 'conflict', 'greet'];

function casesIn(text) {
  const talks = [];
  let talk = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('#')) continue;
    if (line === '') {
      if (talk.length) talks.push(talk);
      talk = [];
      continue;
    }
    const owed = line.includes('?>');
    const at = owed ? line.indexOf('?>') : line.indexOf('=>');
    if (at < 0) {
      talk.push({ said: line, want: null, owed: false });
      continue;
    }
    talk.push({ said: line.slice(0, at).trim(), want: line.slice(at + 2).trim(), owed });
  }
  if (talk.length) talks.push(talk);
  return talks;
}

const names = (await readDir(here))
  .filter((e) => e.isFile && e.name.endsWith('.txt'))
  .map((e) => e.name.replace(/\.txt$/, ''))
  .sort();
const wanted = args.length > 0 ? names.filter((n) => args.includes(n)) : names;
const missing = args.filter((a) => !names.includes(a));
if (missing.length > 0) {
  console.log(`no such category: ${missing.join(', ')}\nhave: ${names.join(', ')}`);
}

const { brain, forget } = openBrain('sqlite::memory:');
let ran = 0;
let failed = 0;
let owed = 0;

for (const name of wanted) {
  const text = await file(`${here}${name}.txt`).text();
  const broken = [];
  for (const talk of casesIn(text)) {
    await forget();
    for (const step of talk) {
      const answer = await brain(step.said, { from: 29 });
      if (step.want == null) continue;
      const verdict = answer.expression?.name ?? 'nothing';
      const says = answer.expression?.state?.says ?? '';
      const got = VERDICTS.includes(step.want) ? verdict : says;
      const same = got === step.want;
      if (step.owed) {
        owed += 1;
        // What is owed is owed: it passing is news, and it failing is not.
        if (same) continue;
        broken.push(`  ~~ ${step.said}\n     owed ${step.want}\n     now  ${got}`);
        continue;
      }
      ran += 1;
      if (same) continue;
      failed += 1;
      broken.push(`  !! ${step.said}\n     want ${step.want}\n     got  ${got}`);
    }
  }
  console.log(`${broken.length === 0 ? '  ' : '!!'} ${name}`);
  for (const b of broken) console.log(b);
}

console.log(`\n${ran - failed}/${ran} across ${wanted.length} categories, ${owed} owed`);
