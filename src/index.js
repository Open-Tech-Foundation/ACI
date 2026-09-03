// Server-only bootstrap for the brain.
//
// This module is deliberately small and separate from src/brain.js: importing
// it pulls in runtime:fs, which exists only on the server. The pure engine
// never touches runtime:fs, so a browser build that imports the engine never
// resolves the server-only module.
//
// Everything the brain knows is loaded here, once, by convention:
//
//   languages/*.json   one file per language
//   data/world.json    the base world
//   knowledge/*.json   anything taught on top of it, world-shaped
//
// brain(input) takes ONLY the input. The brain's own signature never grows to
// admit a new source; a new source is a new file in one of those directories.
import { brainFrom } from './brain.js';
import { fromSources } from './knowledge.js';

const LANGUAGES = 'languages';
const KNOWLEDGE = 'knowledge';
const WORLD = 'data/world.json';

let knowledgePromise = null;

function loaded() {
  if (!knowledgePromise) knowledgePromise = assemble();
  return knowledgePromise;
}

async function assemble() {
  const { file } = await import('runtime:fs');
  // The module's own location differs between a raw run (src/index.js) and an
  // esdev bundle (demo/dist/server.js), so probe upward instead of trusting one.
  const root = await projectRoot(file);
  if (!root) throw new Error(`cannot find ${WORLD} — the brain has no world`);

  return fromSources({
    world: await file(`${root}${WORLD}`).json(),
    knowledge: await readAll(root, KNOWLEDGE),
    languages: await readAll(root, LANGUAGES),
  });
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
  return brainFrom(input, await loaded());
}
