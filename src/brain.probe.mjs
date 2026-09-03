import { brainFrom } from './brain.js';
import { fromSources } from './knowledge.js';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');

const world = JSON.parse(readFileSync(join(root, 'data/world.json'), 'utf8'));
const en = JSON.parse(readFileSync(join(root, 'languages/en.json'), 'utf8'));
const knowledge = fromSources({ world, languages: [en] });

const $ = Symbol.for('aci.node');

function kind(n, k) {
  return (n.branch || []).find((b) => b.kind === k) || null;
}

function walk(node, fn) {
  const kids = (node.branch || []).map((c) => walk(c, fn));
  return fn(Object.assign({}, node, { branch: kids }));
}

function findKind(root, k) {
  let found = null;
  walk(root, (n) => {
    if (n.kind === k && !found) found = n;
    return n;
  });
  return found;
}

function findAllKinds(root, k) {
  const out = [];
  walk(root, (n) => {
    if (n.kind === k) out.push(n);
    return n;
  });
  return out;
}

function collectPhases(result) {
  const phases = {};
  for (const [name, roots] of Object.entries(result.phases)) {
    const kinds = {};
    for (const r of roots) {
      walk(r, (n) => {
        kinds[n.kind] = (kinds[n.kind] || 0) + 1;
        return n;
      });
    }
    phases[name] = kinds;
  }
  return phases;
}

// ---- Input categories ----

const inputs = {
  // Void / edge
  'void': '',
  'spaces': '   ',
  'null-ish': null,
  'number-0': 0,
  'boolean-false': false,
  'empty-object': {},
  'string-number': '123',
  'pure-punctuation': '?!.',
  'unicode-emoji': '\u{1F600}',
  'emoji-word': '\u{1F600} hi',
  'non-latin': '\u0905\u0915\u094D\u0937\u0930',  // Hindi characters
  'arabic': '\u0627\u0644\u0639\u0631\u0628\u064A\u0629',
  'chinese': '\u4F60\u597D',
  'japanese': '\u3053\u3093\u306B\u3061\u306F',

  // Known words
  'greeting': 'hi',
  'greeting-hello': 'hello',
  'known-noun': 'cat',
  'known-noun-dog': 'dog',
  'known-numeral': 'two',
  'known-verb': 'is',
  'known-verb-has': 'has',

  // Unknown words (but in alphabet)
  'unknown-xyz': 'xyz',
  'unknown-qwerty': 'qwerty',
  'unknown-single-z': 'z',

  // Mixed
  'multi-word-known': 'cat is two',
  'multi-word-unknown': 'xyz abc',
  'sentence-question': 'a cat is two?',
  'sentence-statement': 'a cat is an animal',
  'sentence-what': 'what is your name?',
  'sentence-how-many': 'how many mammal?',
  'sentence-arithmetic': 'two plus three?',
  'sentence-comparison': 'one less three?',

  // Teaching
  'teach-new-fact': 'a cat has a mind',
  'teach-contradiction': 'a cat is two',
  'teach-loop': 'a human is a person',

  // Quantity
  'quantity': 'two cat',
  'quantity-reverse': 'three dog',
  'self-count': 'one two three',

  // Unknown grammar patterns
  'just-verb': 'know',
  'just-article': 'the',
  'just-interrogative': 'what',
  'just-quantifier': 'many',
  'just-pronoun': 'you',
  'bare-preposition': 'about',

  // Boundary: single character from alphabet
  'single-a': 'a',
  'single-i': 'i',

  // Mix of known + punctuation
  'greeting-q': 'hi?',
  'cat-q': 'cat?',
  'long-sentence': 'a cat is a mammal and it has a mind',

  // Numbers
  'word-number-zero': 'zero',
  'word-number-ten': 'ten',

  // Multi-word questions
  'what-is': 'what is',
  'what-is-a': 'what is a cat',
  'name-question': 'what is your name?',
  'has-question': 'aci has a mind?',
  'is-question': 'a bird is an animal?',

  // Edge: very long input
  'long-words': 'cat dog bird tree apple banana mango pear orange',

  // All articles
  'article-a': 'a',
  'article-an': 'an',
  'article-the': 'the',
};

// ---- Run ----

let failures = 0;
let warnings = 0;
const issues = [];

function report(level, input, msg) {
  const tag = level === 'FAIL' ? 'FAIL' : 'WARN';
  console.log(`  [${tag}] ${msg}`);
  if (level === 'FAIL') failures++;
  else warnings++;
  issues.push({ input, level, msg });
}

console.log('=== Brain Primitive Probe ===\n');

for (const [label, input] of Object.entries(inputs)) {
  console.log(`--- ${label} (${JSON.stringify(input)}) ---`);

  let result;
  try {
    result = brainFrom(input, knowledge);
  } catch (e) {
    report('FAIL', input, `THREW: ${e.message}`);
    console.log();
    continue;
  }

  const phases = collectPhases(result);
  const roots = result.roots;
  const expr = result.expression;

  // 1. existence: does void get handled?
  if (input === '' || input === '   ' || input === null || input === false || input === undefined) {
    if (roots.length !== 1 || roots[0].kind !== 'void') {
      report('FAIL', input, `void input should produce 1 void root, got ${roots.length} root(s) kind=${roots[0]?.kind}`);
    }
    if (!phases.understand.void) {
      report('FAIL', input, 'void input missing existence->void phase');
    }
  }

  // 2. number/boolean/object input: toString must handle
  if (typeof input === 'number' || typeof input === 'boolean' || typeof input === 'object') {
    // toString should convert these
    const expectedRaw = String(input);
    if (roots[0]?.state?.exists && !phases.understand.existence) {
      report('FAIL', input, 'non-string input not perceived as existence');
    }
    // Should still get through the pipeline without crashing
    if (!expr) {
      report('FAIL', input, 'non-string input produces no expression');
    }
  }

  // 3. existence phase: every input should produce existence nodes for non-void
  if (input !== '' && input !== '   ' && input !== null && input !== false && input !== undefined) {
    if (!phases.understand.existence && !phases.understand.void) {
      report('FAIL', input, 'missing existence primitive in understand phase');
    }
  }

  // 4. thing phase: existing inputs should produce thing nodes
  if (roots.length > 0 && roots[0].kind !== 'void') {
    if (!phases.understand.thing && !phases.understand.void) {
      report('FAIL', input, 'missing thing primitive in understand phase');
    }
  }

  // 5. quality: every existing word should get visual quality
  if (roots.length > 0 && roots[0].kind !== 'void' && roots[0].state?.exists) {
    const qualities = findAllKinds(roots[0], 'quality');
    const hasVisual = qualities.some(q => q.name === 'visual');
    if (!hasVisual) {
      report('WARN', input, 'no visual quality on existing word');
    }
  }

  // 6. form: visual quality should get form
  if (roots.length > 0 && roots[0].kind !== 'void') {
    const forms = findAllKinds(roots[0], 'form');
    const visuals = findAllKinds(roots[0], 'visual');
    if (visuals.length > 0 && forms.length === 0) {
      report('FAIL', input, 'visual quality present but form primitive missing');
    }
  }

  // 7. symbol: form should get symbol
  if (roots.length > 0 && roots[0].kind !== 'void') {
    const forms = findAllKinds(roots[0], 'form');
    const symbols = findAllKinds(roots[0], 'symbol');
    if (forms.length > 0 && symbols.length === 0) {
      report('FAIL', input, 'form present but symbol primitive missing');
    }
  }

  // 8. think phase: known words should have thought nodes
  const knownWords = ['hi', 'hello', 'cat', 'dog', 'two', 'is', 'has', 'tree', 'apple', 'bird'];
  if (knownWords.includes(String(input).toLowerCase())) {
    const thought = findKind(roots[0], 'thought');
    if (!thought) {
      report('FAIL', input, 'known word missing thought node');
    }
  }

  // 9. solve phase: void should get 'nothing' response
  if (input === '' || input === '   ') {
    const resp = findKind(roots[0], 'response');
    if (!resp || resp.name !== 'nothing') {
      report('FAIL', input, 'void input should get "nothing" response');
    }
  }

  // 10. solve phase: known words should get entity from world
  for (const w of ['cat', 'dog', 'bird', 'tree', 'apple']) {
    if (String(input).toLowerCase() === w) {
      const entity = findKind(roots[0], 'entity');
      if (!entity) {
        report('FAIL', input, `known noun "${w}" should get entity from world`);
      }
    }
  }

  // 11. solve: numeral should get nonliving entity
  if (String(input).toLowerCase() === 'two') {
    const entity = findKind(roots[0], 'entity');
    if (!entity || entity.name !== 'nonliving') {
      report('FAIL', input, 'numeral "two" should get nonliving entity');
    }
  }

  // 12. solve: verb with no world term should get NO entity
  for (const w of ['is', 'the', 'know']) {
    if (String(input).toLowerCase() === w) {
      const entity = findKind(roots[0], 'entity');
      if (entity) {
        report('FAIL', input, `"${w}" should not get entity (no world term)`);
      }
    }
  }

  // 13. judge: claim questions should produce truth nodes
  if (String(input).toLowerCase().includes(' is ') && String(input).endsWith('?')) {
    const truth = findKind(roots[0], 'truth');
    if (!truth) {
      report('FAIL', input, 'claim question should produce truth node');
    }
  }

  // 14. judge: arithmetic should produce sum nodes
  if (String(input).includes(' plus ') || String(input).includes(' minus ')) {
    if (String(input).endsWith('?')) {
      const sum = findKind(roots[0], 'sum');
      if (!sum) {
        report('FAIL', input, 'arithmetic question should produce sum node');
      }
    }
  }

  // 15. judge: comparison should produce truth nodes
  if (String(input).includes(' more ') || String(input).includes(' less ')) {
    if (String(input).endsWith('?')) {
      const truth = findKind(roots[0], 'truth');
      if (!truth) {
        report('FAIL', input, 'comparison question should produce truth node');
      }
    }
  }

  // 16. judge: "how many" should produce count nodes
  if (String(input).startsWith('how many')) {
    const count = findKind(roots[0], 'count');
    if (!count) {
      report('FAIL', input, '"how many" question should produce count node');
    }
  }

  // 17. judge: "what is your name?" should produce answer node
  if (String(input).toLowerCase() === 'what is your name?') {
    const answer = findKind(roots[0], 'answer');
    if (!answer) {
      report('FAIL', input, '"what is your name?" should produce answer node');
    }
  }

  // 18. express phase: every root should end with an express node
  for (const r of roots) {
    const express = findKind(r, 'express');
    if (!express) {
      report('WARN', input, `root kind=${r.kind} has no express node`);
    }
  }

  // 19. quantity: "two cat" should produce quantity on "cat"
  if (String(input).toLowerCase() === 'two cat') {
    const dogRoot = roots.find(r => r.state?.identity === 'cat');
    if (dogRoot) {
      const qty = findKind(dogRoot, 'quantity');
      if (!qty) {
        report('FAIL', input, '"two cat" should produce quantity on cat root');
      }
    }
  }

  // 20. brain-specific: "aci" should get mind branch
  if (String(input).toLowerCase() === 'aci') {
    const entity = findKind(roots[0], 'entity');
    if (entity) {
      const mind = findKind(entity, 'mind');
      if (!mind) {
        report('FAIL', input, '"aci" entity should have mind branch');
      }
    }
  }

  // 21. teach: "a cat has a mind" should produce learn node
  if (String(input).toLowerCase() === 'a cat has a mind') {
    const learn = findKind(roots[0], 'learn');
    if (!learn) {
      report('FAIL', input, 'teaching "a cat has a mind" should produce learn node');
    }
  }

  // 22. teach: "a cat is two" should produce refuse (contradiction)
  if (String(input).toLowerCase() === 'a cat is two') {
    const refuse = findKind(roots[0], 'refuse');
    if (!refuse || refuse.name !== 'contradiction') {
      report('FAIL', input, '"a cat is two" should produce refuse(contradiction)');
    }
  }

  // 23. teach: "a human is a person" should produce refuse (loop)
  if (String(input).toLowerCase() === 'a human is a person') {
    const refuse = findKind(roots[0], 'refuse');
    if (!refuse || refuse.name !== 'loop') {
      report('FAIL', input, '"a human is a person" should produce refuse(loop)');
    }
  }

  // 24. structure: "a cat is two?" should parse into sentence
  if (String(input).toLowerCase() === 'a cat is two?') {
    if (roots.length !== 1 || roots[0].kind !== 'sentence') {
      report('FAIL', input, '"a cat is two?" should parse into single sentence root');
    }
  }

  // 25. structure: "hi hi" should parse into sentence
  if (String(input).toLowerCase() === 'hi hi') {
    if (roots.length !== 1 || roots[0].kind !== 'sentence') {
      report('FAIL', input, '"hi hi" should parse into single sentence root');
    }
  }

  // 26. expression: bound signal should have a meaningful expression name
  if (String(input).toLowerCase() === 'hi hi') {
    if (expr.name !== 'understood') {
      report('FAIL', input, '"hi hi" expression should be "understood"');
    }
  }

  // 27. expression: single known word
  if (String(input).toLowerCase() === 'hi') {
    if (expr.name !== 'greet') {
      report('FAIL', input, '"hi" expression should be "greet"');
    }
  }

  // 28. expression: single numeral
  if (String(input).toLowerCase() === 'two') {
    if (expr.name !== 'count') {
      report('FAIL', input, '"two" expression should be "count"');
    }
  }

  // 29. expression: claim question affirmation
  if (String(input).toLowerCase() === 'a cat is an animal?') {
    if (expr.name !== 'affirm') {
      report('FAIL', input, '"a cat is an animal?" expression should be "affirm"');
    }
  }

  // 30. expression: claim question denial
  if (String(input).toLowerCase() === 'a cat is a plant?') {
    if (expr.name !== 'deny') {
      report('FAIL', input, '"a cat is a plant?" expression should be "deny"');
    }
  }

  // 31. expression: unknown word
  if (String(input).toLowerCase() === 'xyz') {
    if (expr.name !== 'unknown') {
      report('FAIL', input, '"xyz" expression should be "unknown"');
    }
  }

  // 32. unknown grammar: multi-word without parse should stay separate roots
  if (String(input).toLowerCase() === 'xyz abc') {
    if (roots.length !== 2) {
      report('FAIL', input, '"xyz abc" should produce 2 separate roots (unparseable)');
    }
  }

  // 33. expression: unknown grammar stays separate
  if (String(input).toLowerCase() === 'xyz abc') {
    if (expr.name !== 'unknown') {
      report('FAIL', input, '"xyz abc" expression should be "unknown" (unbound)');
    }
  }

  // 34. all phases should be present
  const expectedPhases = ['understand', 'think', 'solve', 'structure', 'judge', 'express'];
  for (const p of expectedPhases) {
    if (!result.phases[p]) {
      report('FAIL', input, `missing phase: ${p}`);
    }
  }

  // 35. expression tree should track bound state
  if (expr.state.bound === undefined) {
    report('FAIL', input, 'expression missing bound state');
  }

  // 36. expression tree should track mood
  if (expr.state.mood === undefined) {
    report('FAIL', input, 'expression missing mood state');
  }

  console.log();
}

// ---- Summary ----
console.log('\n=== SUMMARY ===');
console.log(`Total inputs tested: ${Object.keys(inputs).length}`);
console.log(`Failures: ${failures}`);
console.log(`Warnings: ${warnings}`);

if (issues.length > 0) {
  console.log('\n=== ALL ISSUES ===');
  for (const issue of issues) {
    console.log(`[${issue.level}] input=${JSON.stringify(issue.input)}: ${issue.msg}`);
  }
}

// ---- Specific primitive gap analysis ----
console.log('\n=== PRIMITIVE GAP ANALYSIS ===');

// Test: does the brain handle NaN input?
try {
  brainFrom(NaN, knowledge);
  console.log('NaN input: handled (no throw)');
} catch (e) {
  console.log(`NaN input: CRASHED - ${e.message}`);
}

// Test: does the brain handle Symbol input?
try {
  brainFrom(Symbol('test'), knowledge);
  console.log('Symbol input: handled (no throw)');
} catch (e) {
  console.log(`Symbol input: CRASHED - ${e.message}`);
}

// Test: does the brain handle very long input?
try {
  const longInput = 'cat '.repeat(1000);
  const r = brainFrom(longInput, knowledge);
  console.log(`Very long input (${longInput.length} chars): ${r.roots.length} roots`);
} catch (e) {
  console.log(`Very long input: CRASHED - ${e.message}`);
}

// Test: does the brain handle array input?
try {
  brainFrom(['cat', 'dog'], knowledge);
  console.log('Array input: handled (no throw)');
} catch (e) {
  console.log(`Array input: CRASHED - ${e.message}`);
}

// Test: does the brain handle undefined?
try {
  brainFrom(undefined, knowledge);
  console.log('undefined input: handled (no throw)');
} catch (e) {
  console.log('undefined input: CRASHED - ' + e.message);
}

// Test: does the brain handle missing world?
try {
  const noWorld = fromSources({ languages: [en] });
  const r = brainFrom('cat', noWorld);
  console.log('No world: handled, entity=' + JSON.stringify(kind(r.roots[0], 'entity')?.name));
} catch (e) {
  console.log(`No world: CRASHED - ${e.message}`);
}

// Test: does the brain handle missing languages?
try {
  const noLangs = fromSources({ world });
  const r = brainFrom('cat', noLangs);
  console.log('No languages: handled, lang=' + JSON.stringify(kind(r.roots[0], 'language')));
} catch (e) {
  console.log(`No languages: CRASHED - ${e.message}`);
}

// Test: does the brain handle empty knowledge?
try {
  const r = brainFrom('cat', fromSources());
  console.log('Empty knowledge: handled, root kind=' + JSON.stringify(r.roots[0]?.kind));
} catch (e) {
  console.log(`Empty knowledge: CRASHED - ${e.message}`);
}

// Test: does the brain handle null knowledge?
try {
  const r = brainFrom('cat', null);
  console.log('null knowledge: handled, root kind=' + JSON.stringify(r.roots[0]?.kind));
} catch (e) {
  console.log(`null knowledge: CRASHED - ${e.message}`);
}

// Test: does the brain handle undefined knowledge?
try {
  const r = brainFrom('cat', undefined);
  console.log('undefined knowledge: handled, root kind=' + JSON.stringify(r.roots[0]?.kind));
} catch (e) {
  console.log(`undefined knowledge: CRASHED - ${e.message}`);
}
