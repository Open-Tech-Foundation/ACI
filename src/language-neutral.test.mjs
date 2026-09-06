import { test, assertEquals } from 'runtime:test';
import { file } from 'runtime:fs';
import { brainFrom } from './brain.js';
import { fromSources } from './knowledge.js';

const load = async () => ({
  world: await file(new URL('../data/world.json', import.meta.url).pathname).json(),
  english: await file(new URL('../languages/en.json', import.meta.url).pathname).json(),
});

function renamedSyntax(language) {
  const changed = structuredClone(language);
  const rules = Object.keys(changed.grammar.rules);
  const nonterminals = new Map(rules.map((name, i) => [name, `r${i}`]));
  const parts = new Set();
  for (const entry of Object.values(changed.words)) {
    for (const reading of Array.isArray(entry) ? entry : [entry]) {
      for (const pos of Array.isArray(reading.pos) ? reading.pos : [reading.pos]) parts.add(pos);
    }
  }
  for (const symbol of Object.values(changed.symbols)) if (symbol.pos) parts.add(symbol.pos);
  if (changed.unknown && changed.unknown.pos) parts.add(changed.unknown.pos);
  const terminals = new Map([...parts].map((name, i) => [name, `p${i}`]));
  const renamed = (name) => nonterminals.get(name) ?? terminals.get(name) ?? name;
  const positions = (value) => Array.isArray(value) ? value.map(renamed) : renamed(value);

  for (const entry of Object.values(changed.words)) {
    for (const reading of Array.isArray(entry) ? entry : [entry]) reading.pos = positions(reading.pos);
  }
  for (const symbol of Object.values(changed.symbols)) if (symbol.pos) symbol.pos = renamed(symbol.pos);
  if (changed.unknown) changed.unknown.pos = renamed(changed.unknown.pos);
  for (const derivation of changed.derivations || []) {
    if (derivation.of) derivation.of = renamed(derivation.of);
    if (derivation.pos) derivation.pos = renamed(derivation.pos);
  }
  changed.syntax = Object.fromEntries(
    Object.entries(changed.syntax || {}).map(([position, functions]) => [renamed(position), functions]),
  );
  changed.grammar.start = renamed(changed.grammar.start);
  changed.grammar.rules = Object.fromEntries(
    Object.entries(changed.grammar.rules).map(([name, rule]) => [
      renamed(name),
      {
        ...rule,
        rules: rule.rules.map((text) => text.split(/\s+/).map(renamed).join(' ')),
      },
    ]),
  );
  return changed;
}

const outcome = (result) => ({
  expression: {
    name: result.expression.name,
    says: result.expression.state.says,
  },
  learned: result.learned,
});

test('renaming every parser symbol leaves entity and verb reasoning unchanged', async () => {
  const { world, english } = await load();
  const ordinary = fromSources({ world, languages: [english] });
  const opaque = fromSources({ world, languages: [renamedSyntax(english)] });
  const cases = [
    ['a dog is an animal?', {}, 'affirm', 'Yes. ✅ a dog is an animal.'],
    ['a tree is an animal?', {}, 'deny', 'No. ❌'],
    ['a basket holds things?', {}, 'affirm', 'Yes. ✅ a basket hold a thing.'],
    ['a stone holds things?', {}, 'unsure', "I don't know."],
    ['some crows are birds?', {}, 'affirm', 'Yes. ✅ a crow is a bird.'],
    ['a cat might be a fish', {}, 'deny', 'No. ❌'],
    ['i know that a cat is an animal', { from: 508 }, 'understood', 'I know.'],
    ['the biggest wren eats trout', {}, 'learn', 'I understand.'],
    ['mira is a doctor', {}, 'learn', 'I understand.'],
  ];
  for (const [input, circumstance, expected, says] of cases) {
    const baseline = brainFrom(input, ordinary, circumstance);
    assertEquals(baseline.expression.name, expected, input);
    assertEquals(baseline.expression.state.says, says, input);
    assertEquals(
      outcome(brainFrom(input, opaque, circumstance)),
      outcome(baseline),
      input,
    );
  }
});

test('an unknown name receives its parser position from language data', async () => {
  const { world, english } = await load();
  const without = structuredClone(english);
  delete without.unknown;
  const result = brainFrom('mira is a doctor', fromSources({ world, languages: [without] }));
  assertEquals(result.expression.name, 'unknown');
  assertEquals(result.learned, null);
});
