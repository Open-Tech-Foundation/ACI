// Server-only bootstrap for the brain.
//
// This module is deliberately small and separate from src/brain.js: importing
// it pulls in runtime:fs, which exists only on the server. The pure engine
// never touches runtime:fs, so a browser build that imports the engine never
// resolves the server-only module.
//
// Everything the brain knows is loaded here, once, by convention:
//
//   data/world.json    the world as authored — the seed, and the export format
//   languages/*.json   one file per language
//   knowledge/*.json   anything taught on top of it, world-shaped
//
// brain(input) takes ONLY the input. The brain's own signature never grows to
// admit a new source; a new source is a new file in one of those directories.
import { brainFrom } from './brain.js';
import { fromSources, speaking } from './knowledge.js';
import { openStore, seed, readWorld, write, forgetLearned } from './store.js';

const LANGUAGES = 'languages';
const KNOWLEDGE = 'knowledge';
const WORLD = 'data/world.json';

// One brain over one store. Anyone wanting a world of their own opens one —
// a store in memory is a world nothing else can reach, which is what a test
// wants and what two brains on one machine want.
export function openBrain(url) {
  let knowledgePromise = null;
  let sources = null;
  let store = null;

  // One thing at a time at the store: a read left running blocks the next
  // write, and two answers at once would otherwise interleave.
  let gate = Promise.resolve();
  const inTurn = (work) => {
    const run = gate.then(work, work);
    gate = run.then(
      () => {},
      () => {},
    );
    return run;
  };

  const loaded = () => {
    if (!knowledgePromise) knowledgePromise = assemble();
    return knowledgePromise;
  };

  // The store keeps the world; the shape check reads it back the same way it
  // reads any other source. Where it came from is not the brain's business,
  // and it is validated all the same.
  // Only the world moves. The languages were read once and checked once, and
  // are handed back as they are: a world that has grown is no reason to merge
  // and check every word of every language again.
  const build = () =>
    inTurn(async () => fromSources({ ...sources, world: await readWorld(store) }));

  async function assemble() {
    const { file } = await import('runtime:fs');
    const root = await projectRoot(file);
    if (!root) throw new Error(`cannot find ${WORLD} — the brain has no world`);

    store = await open(root);
    await inTurn(async () => {
      // Every open, not only the first: the authored world may have grown since
      // this store was written, and what was learned is kept through it.
      await seed(store, await file(`${root}${WORLD}`).json());
    });

    sources = {
      knowledge: await readAll(root, KNOWLEDGE),
      spoken: speaking(await readAll(root, LANGUAGES)),
    };
    return build();
  }

  // A file where one is named and may be written, and nothing but this run
  // otherwise. It says which, rather than quietly forgetting everything on exit.
  async function open(root) {
    const named = url ?? (await import('runtime:process')).env.ACI_STORE;
    if (!named) return openStore('sqlite::memory:');
    if (named.startsWith('sqlite:')) return openStore(named);
    const path = named.startsWith('/') ? named : `${root}${named}`;
    try {
      return await openStore(`sqlite:${path}`);
    } catch {
      console.warn(`cannot write ${path} — this run will not be remembered`);
      return openStore('sqlite::memory:');
    }
  }

  // What the last signal was about, so a pointer in the next one has something
  // to land on. The brain hands this back and keeps none of it; holding it
  // across signals is what makes a run of signals one conversation, and that is
  // the runtime's to decide.
  //
  // Signals may be threaded several at a time — two people talking to the same
  // brain are two conversations over one world, and what was last spoken of in
  // one is nothing to the other. A signal that names no conversation is in the
  // one unnamed thread.
  const threads = new Map();
  const ALONE = Symbol('one thread');

  // The circumstance of the signal — where it came from, where it went, what
  // was last spoken of — is the runtime's to supply, and it is optional: told
  // nothing, the brain does not guess who it is talking to.
  async function brain(input, circumstance) {
    const thread = (circumstance && circumstance.conversation) ?? ALONE;
    const held = threads.get(thread) || {};
    const said = { spoken: held.spoken ?? null, names: held.names || {}, ...(circumstance || {}) };
    const knowledge = await loaded();
    const result = brainFrom(input, knowledge, said);
    const standing = [...(held.told || [])];
    if (result.told && !standing.includes(result.told)) standing.push(result.told);
    threads.set(thread, { spoken: result.spoken, names: result.names, told: standing });

    // What it agreed to follow, brought round again now something has moved.
    // The brain holds no instruction; it is asked afresh, and where it can act
    // on one at last, that is its answer.
    for (const instruction of standing) {
      if (instruction === String(input)) continue;
      const again = brainFrom(instruction, knowledge, {
        spoken: result.spoken,
        names: result.names,
        from: said.from,
        to: said.to,
      });
      if (again.told == null && again.expression.name !== "unsure") return again;
    }
    if (result.learned) {
      try {
        await inTurn(() => write(store, result.learned));
      } catch {
        // A fact that will not pass the store is not kept, and the brain's
        // answer stands as given.
      }
      knowledgePromise = build();
      await knowledgePromise;
    }
    return result;
  }

  async function forget() {
    threads.clear();
    if (!store) return;
    await inTurn(() => forgetLearned(store));
    knowledgePromise = build();
    await knowledgePromise;
  }

  return { brain, forget };
}

async function projectRoot(file) {
  for (const up of ['../', '../../', './']) {
    const root = new URL(up, import.meta.url).pathname;
    try {
      if (await file(`${root}${WORLD}`).exists()) return root;
    } catch {
      // not readable from here; try the next
    }
  }
  return null;
}

// Files are read in name order so the brain is assembled the same way on every
// machine. A directory that is not there contributes nothing.
async function readAll(root, dir) {
  const { readDir, file } = await import('runtime:fs');
  let entries;
  try {
    entries = await readDir(`${root}${dir}`);
  } catch {
    return [];
  }
  const names = entries
    .filter((e) => e.isFile && e.name.endsWith('.json'))
    .map((e) => e.name)
    .sort();

  const out = [];
  for (const name of names) out.push(await file(`${root}${dir}/${name}`).json());
  return out;
}

// The brain this process speaks with, over whatever store ACI_STORE names.
const here = openBrain();
export const brain = (input, circumstance) => here.brain(input, circumstance);
export const forget = () => here.forget();
