import { test, assertEquals } from 'runtime:test';
import { file } from 'runtime:fs';
import { brainFrom } from './brain.js';
import { fromSources } from './knowledge.js';

const load = async () => ({
  world: await file(new URL('../data/world.json', import.meta.url).pathname).json(),
  hindi: await file(new URL('../languages/hi.json', import.meta.url).pathname).json(),
});

const says = (result) => result.expression.state.says;

test('hindi verb-final yes/no exposes a joint-position gap', async () => {
  const { world, hindi } = await load();
  const knowledge = fromSources({ world, languages: [hindi] });

  // SOV order puts the joint last: बिल्ली जानवर है (cat animal is).
  // The core's namedRelation only accepts a medial or fronted joint for a
  // hole-free signal, so a verb-final claim is not joined and stays unknown.
  // Same semantics in English affirms; hole-questions below prove the words
  // and world walk are correctly wired, isolating the gap to joint position.
  const english = await file(new URL('../languages/en.json', import.meta.url).pathname).json();
  const enKnowledge = fromSources({ world, languages: [english] });
  assertEquals(brainFrom('a cat is an animal?', enKnowledge).expression.name, 'affirm');

  for (const input of ['बिल्ली जानवर है?', 'बिल्ली मछली है?', 'पेड़ जानवर है?']) {
    const result = brainFrom(input, knowledge);
    assertEquals(result.expression.name, 'unknown', input);
  }
});

test('hindi what-question answers the direct kind', async () => {
  const { world, hindi } = await load();
  const knowledge = fromSources({ world, languages: [hindi] });

  const result = brainFrom('बिल्ली क्या है?', knowledge);
  assertEquals(result.expression.name, 'answer');
  assertEquals(says(result), 'स्तनपायी');
});

test('hindi reads a name and does not yet walk it like english', async () => {
  const { world, hindi } = await load();
  const knowledge = fromSources({ world, languages: [hindi] });

  // The same signal in english — `luna is a cat` — comes to a claim and is
  // written down. This pack reads the name and joins it to nothing, so nothing
  // is taken in, and the brain says so rather than saying it understood.
  const read = brainFrom('लूना बिल्ली है', knowledge);
  assertEquals(read.learned, null, 'nothing was written down');
  assertEquals(read.expression.name, 'unknown');
});
