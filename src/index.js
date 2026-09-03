// Server-only bootstrap for the brain.
//
// This module is deliberately small and separate from src/brain.js:
// importing it pulls in runtime:fs, which exists only on the server. The
// pure engine (src/brain.js) never touches runtime:fs, so a browser build
// that imports the engine never resolves the server-only module.
//
// brain(input) — takes ONLY the input. Language files are loaded internally
// from the languages/ directory and the world model from data/world.json; the
// caller passes nothing.
import { brainFrom } from './brain.js';
import { loadLanguageDirectory } from './languages.js';
import { loadWorldFile } from './world.js';

let cachePromise = null;
let worldPromise = null;

function loadedLanguages() {
  if (!cachePromise) {
    // Languages live in the project's languages/ dir. Resolve them robustly:
    // the module's own location differs between a raw esrun run (src/index.js
    // -> ../languages/) and an esdev bundle (demo/dist/server.js ->
    // ../../languages/), so probe candidates instead of trusting one path.
    const dirCandidates = [
      new URL('../languages/', import.meta.url).pathname,
      new URL('../../languages/', import.meta.url).pathname,
      new URL('./languages/', import.meta.url).pathname,
    ];
    cachePromise = loadFirstExisting(dirCandidates).catch(() => []);
  }
  return cachePromise;
}

function loadedWorld() {
  if (!worldPromise) {
    // Same probing as the languages dir: the module's own location differs
    // between a raw esrun run and an esdev bundle.
    worldPromise = loadFirstWorld([
      new URL('../data/world.json', import.meta.url).pathname,
      new URL('../../data/world.json', import.meta.url).pathname,
      new URL('./data/world.json', import.meta.url).pathname,
    ]).catch(() => null);
    worldPromise.then((w) => {
      // A brain with no world still runs, it just cannot say what anything is.
      // Say so rather than degrade in silence.
      if (!w) console.warn('no world model found — nothing will be categorized');
    });
  }
  return worldPromise;
}

async function loadFirstWorld(candidates) {
  for (const path of candidates) {
    try {
      return await loadWorldFile(path);
    } catch {
      // try the next candidate
    }
  }
  return null;
}

async function loadFirstExisting(candidates) {
  for (const dir of candidates) {
    try {
      const langs = await loadLanguageDirectory(dir);
      if (langs.length) return langs;
    } catch {
      // try the next candidate
    }
  }
  return [];
}

export async function brain(input) {
  const [langs, world] = await Promise.all([loadedLanguages(), loadedWorld()]);
  return brainFrom(input, langs, world);
}
