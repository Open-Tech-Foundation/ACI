import { test, assertEquals } from 'runtime:test';
import { file } from 'runtime:fs';
import { brainFrom } from './brain.js';
import { fromSources } from './knowledge.js';

const load = async () => ({
  world: await file(new URL('../data/world.json', import.meta.url).pathname).json(),
  english: await file(new URL('../languages/en.json', import.meta.url).pathname).json(),
});

function renamed(language, names) {
  const changed = structuredClone(language);
  for (const [from, to] of Object.entries(names)) {
    changed.words[to] = changed.words[from];
    delete changed.words[from];
  }
  return changed;
}

function thoughtFor(result, identity) {
  const root = result.phases.solve.find((n) => n.state.identity === identity);
  return root.branch.find((n) => n.kind === 'thought').state.thought;
}

test('context chooses readings without knowing the language words', async () => {
  const { world, english } = await load();
  const language = renamed(english, {
    one: 'unu',
    that: 'clauselink',
    so: 'idearef',
    did: 'pastmark',
  });
  const knowledge = fromSources({ world, languages: [language] });

  const number = brainFrom('unu plus unu', knowledge);
  assertEquals(number.expression.state.says, 'two');
  assertEquals(
    thoughtFor(number, 'unu').concept,
    114,
    'unmatched context takes the declared fallback',
  );

  const ellipsis = brainFrom('the blue unu is warm', knowledge, {
    spoken: language.words.clarinet.concept,
  });
  assertEquals(
    thoughtFor(ellipsis, 'unu').marks,
    'spoken',
    'a determiner may be reached across modifiers',
  );

  const clause = brainFrom('i know clauselink a cat is an animal', knowledge, { from: 508 });
  assertEquals(clause.expression.name, 'understood');
  assertEquals(thoughtFor(clause, 'clauselink').functions, ['encloses']);

  const pointer = brainFrom('clauselink is warm', knowledge, {
    spoken: language.words.clarinet.concept,
  });
  assertEquals(thoughtFor(pointer, 'clauselink').marks, 'spoken', 'without a following proposition it points');

  const idea = brainFrom('i think idearef', knowledge, {
    from: 508,
    spoken: language.words.cat.concept,
  });
  assertEquals(thoughtFor(idea, 'idearef').marks, 'idea');

  const initial = brainFrom('pastmark i rinse a cup?', knowledge, { from: 508 });
  assertEquals(thoughtFor(initial, 'pastmark').marks, null, 'first position selects the auxiliary');

  const denial = brainFrom('i pastmark not rinse a cup', knowledge, { from: 508 });
  assertEquals(thoughtFor(denial, 'pastmark').marks, null, 'a following denial selects the auxiliary');

  const prior = brainFrom('i pastmark', knowledge, {
    from: 508,
    spoken: language.words.rinse.concept,
  });
  assertEquals(
    thoughtFor(prior, 'pastmark').marks,
    'prior',
    'unmatched context selects the fallback action reference',
  );
});
