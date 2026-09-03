// Server-only bootstrap for the brain.
//
// This module is deliberately small and separate from src/brain.js: importing
// it pulls in runtime:fs, which exists only on the server. The pure engine
// never touches runtime:fs, so a browser build that imports the engine never
// resolves the server-only module.
//
// Everything the brain knows is loaded here, once, by convention:
//
//   data/aci.db        the world, kept in sqlite and seeded from the json below
//   data/world.json    the world as authored — the seed, and the export format
//   languages/*.json   one file per language
//   knowledge/*.json   anything taught on top of it, world-shaped
//
// brain(input) takes ONLY the input. The brain's own signature never grows to
// admit a new source; a new source is a new file in one of those directories.
import { brainFrom } from './brain.js';
import { fromSources } from './knowledge.js';
import { openStore, isEmpty, seed, readWorld, write, forgetLearned } from './store.js';

const LANGUAGES = 'languages';
const KNOWLEDGE = 'knowledge';
const WORLD = 'data/world.json';
// Where the world is kept between runs. Nowhere, unless asked: a run that was
// not told to remember must not be haunted by one that was.
const STORE = 'ACI_STORE';

let knowledgePromise = null;
let sources = null;
let store = null;

// One thing at a time at the store. A read left running blocks the next write,
// and two brains answering at once would otherwise interleave.
let gate = Promise.resolve();
function inTurn(work) {
  const run = gate.then(work, work);
  gate = run.then(
    () => {},
    () => {},
  );
  return run;
}

function loaded() {
  if (!knowledgePromise) knowledgePromise = assemble();
  return knowledgePromise;
}

async function assemble() {
  const { file } = await import('runtime:fs');
  const root = await projectRoot(file);
  if (!root) throw new Error(`cannot find ${WORLD} — the brain has no world`);

  store = await open(root);
  await inTurn(async () => {
    if (await isEmpty(store)) await seed(store, await file(`${root}${WORLD}`).json());
  });

  sources = {
    knowledge: await readAll(root, KNOWLEDGE),
    languages: await readAll(root, LANGUAGES),
  };
  return build();
}

// The store keeps the world; the shape check reads it back the same way it
// reads any other source. Where it came from is not the brain's business, and
// it is validated all the same.
function build() {
  return inTurn(async () => fromSources({ ...sources, world: await readWorld(store) }));
}

// A file where one is named and may be written, and nothing but this run
// otherwise. It says which, rather than quietly forgetting everything on exit.
async function open(root) {
  const { env } = await import('runtime:process');
  const named = env[STORE];
  if (!named) return openStore('sqlite::memory:');
  const path = named.startsWith('/') ? named : `${root}${named}`;
  try {
    return await openStore(`sqlite:${path}`);
  } catch {
    console.warn(`cannot write ${path} — this run will not be remembered`);
    return openStore('sqlite::memory:');
  }
}

export async function forget() {
  if (!store) return;
  await inTurn(() => forgetLearned(store));
  knowledgePromise = build();
  await knowledgePromise;
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

export async function brain(input) {
  const result = brainFrom(input, await loaded());
  if (result.learned) {
    try {
      await inTurn(() => write(store, result.learned));
      knowledgePromise = build();
      await knowledgePromise;
    } catch {
      // A fact that will not pass the shape check is not kept, and the brain's
      // answer stands as given.
      knowledgePromise = build();
    }
  }
  return result;
}
