// Server-only bootstrap for the brain.
//
// This module is deliberately small and separate from src/brain.js:
// importing it pulls in runtime:fs, which exists only on the server. The
// pure engine (src/brain.js) never touches runtime:fs, so a browser build
// that imports the engine never resolves the server-only module.
//
// brain(input) — takes ONLY the input. Language files are loaded internally
// from the languages/ directory; the caller passes nothing.
import { brainFrom } from './brain.js';
import { loadLanguageDirectory } from './languages.js';

let cachePromise = null;

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
  const langs = await loadedLanguages();
  return brainFrom(input, langs);
}
