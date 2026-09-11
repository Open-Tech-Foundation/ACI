// Server-only bootstrap for the brain.
//
// This module is deliberately small and separate from src/brain.js: importing
// it pulls in runtime:fs, which exists only on the server. The pure engine
// never touches runtime:fs, so a browser build that imports the engine never
// resolves the server-only module.
//
// Everything the brain knows is loaded here, once, by convention:
//
//   data/world.json    the world as authored
//   languages/*.json   one file per language
//   knowledge/*.json   anything taught on top of it, world-shaped
//
// Those three are the whole of the world, and it is read-only: the only way it
// grows is by someone editing one of them. What a session is told is the
// session's, and is kept with that session's graph.
//
// brain(input) takes ONLY the input. The brain's own signature never grows to
// admit a new source; a new source is a new file in one of those directories.
import { brainFrom, grownBy } from './brain.js';
import { conversation } from './graph.js';
import { fromSources, speaking } from './knowledge.js';
import { openStore, keepTalk, readTalk, forgetTalks } from './store.js';

const LANGUAGES = 'languages';
const KNOWLEDGE = 'knowledge';
const WORLD = 'data/world.json';

// One brain over one store. The store keeps sessions, not the world — a store
// in memory is a set of sessions nothing else can reach, which is what a test
// wants and what two brains on one machine want.
export function openBrain(url) {
  let knowledgePromise = null;
  let sources = null;
  let store = null;
  let authored = null;

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

  // The world, as authored. It is read from the files and never written to:
  // one world, the same for every session, and the only way it grows is by
  // someone editing a file. What a session is told belongs to that session.
  const build = async () => fromSources({ ...sources, world: authored });

  // A conversation is many signals over one graph, so the graph belongs to the
  // conversation and not to the brain. One brain may be holding several at
  // once — two people talking to it are two conversations over one world — and
  // what one was told is nothing to the other.
  const talks = new Map();
  // What each session has been told, and the world that is the authored world
  // plus it. A session reasons over its own; nothing it says reaches another.
  const grown = new Map();
  const ALONE = Symbol('one thread');

  async function assemble() {
    const { file } = await import('runtime:fs');
    const root = await projectRoot(file);
    if (!root) throw new Error(`cannot find ${WORLD} — the brain has no world`);

    store = await open(root);
    authored = await file(`${root}${WORLD}`).json();

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

  // What the last signal was about, and which language it established, so a
  // pointer or ambiguous reading in the next one has circumstance to land on.
  // The brain hands these back and keeps none of them; holding them across
  // signals is what makes a run of signals one conversation, and that is the
  // runtime's to decide.
  //
  // Signals may be threaded several at a time — two people talking to the same
  // brain are two conversations over one world, and what was last spoken of in
  // one is nothing to the other. A signal that names no conversation is in the
  // one unnamed thread.
  const threads = new Map();

  // The graph this conversation has been filling. A named one is kept, so a
  // conversation the brain has not heard from — in this run or an earlier one —
  // is picked up where it was left rather than said again from the start.
  async function pickUp(thread, base) {
    const already = talks.get(thread);
    if (already) return already;
    const talk = conversation();
    talks.set(thread, talk);
    if (thread === ALONE || !store) return talk;
    const kept = await readTalk(store, thread);
    if (!kept) return talk;
    talk.restore(kept.graph);
    // What a word in the next signal lands on comes back with it. A
    // conversation picked up mid-sentence still knows what `it` was.
    if (kept.thread) threads.set(thread, kept.thread);
    // And what it was told: the authored world with this session's own on top
    // of it, which is the world this session has been reasoning over.
    if (kept.learned) grown.set(thread, { learned: kept.learned, world: grownBy(base, kept.learned) });
    return talk;
  }

  // Everything the conversation came to, put where it will still be after this
  // run. Only a named conversation: one that named none cannot be asked for
  // again, so there is nothing to come back to.
  async function settle(thread, talk, record) {
    threads.set(thread, record);
    if (thread === ALONE || !store) return;
    const mine = grown.get(thread);
    await keepTalk(
      store,
      thread,
      { graph: talk.dump(), thread: record, learned: mine ? mine.learned : null },
      Date.now(),
    );
  }

  // The circumstance of the signal — where it came from, where it went, what
  // was last spoken of — is the runtime's to supply, and it is optional: told
  // nothing, the brain does not guess who it is talking to.
  async function turn(input, circumstance) {
    const thread = (circumstance && circumstance.conversation) ?? ALONE;
    // What is known before the conversation is picked up: the store is opened
    // on the way, and a conversation kept in it cannot be read back before
    // there is a store to read it from.
    const known = await loaded();
    const talk = await pickUp(thread, known.world);
    const held = threads.get(thread) || {};
    // The world this session reasons over: the authored world, and whatever it
    // has been told on top of it. Another session's is not in it.
    const mine = () => ({ ...known, world: (grown.get(thread) || known).world, graph: talk });
    // Who spoke, and who was spoken to, arrive with each signal or not at
    // all: the runtime never carries them across signals. What was spoken of,
    // the names given, the focus list and the last language the brain actually
    // selected are the thread's to keep.
    const said = {
      spoken: held.spoken ?? null,
      focus: held.focus ?? (held.spoken != null ? [held.spoken] : []),
      names: held.names || {},
      language: held.language ?? null,
      ...(circumstance || {}),
    };
    const result = brainFrom(input, mine(), said);
    const standing = [...(held.told || [])];
    if (result.told && !standing.includes(result.told)) standing.push(result.told);
    // What the brain accepted goes to the session it was told to, and nowhere
    // else: the authored world does not move. One door for both ways a turn
    // can reach a fact — stated outright, or reached at last by acting on
    // something agreed to earlier — because they are the same fact.
    const commit = (accepted) => {
      if (!accepted) return;
      const was = grown.get(thread) || { learned: { terms: [] }, world: known.world };
      grown.set(thread, {
        learned: { terms: [...(was.learned.terms || []), ...(accepted.terms || [])] },
        world: grownBy(was.world, accepted),
      });
    };

    commit(result.learned);
    // Held, so the conversation may remember it.
    result.remember();

    // What it agreed to follow, brought round again now something has moved.
    // The brain holds no instruction; it is asked afresh, and where it can act
    // on one at last, that is its answer.
    for (const instruction of standing) {
      if (instruction === String(input)) continue;
      const again = brainFrom(instruction, mine(), {
        spoken: result.spoken,
        focus: result.focus,
        names: result.names,
        language: result.language ?? held.language ?? null,
        from: said.from,
        to: said.to,
      });
      if (again.told == null && again.expression.name !== "unsure") {
        commit(again.learned);
        again.remember();
        await settle(thread, talk, {
          spoken: result.spoken,
          focus: result.focus,
          names: result.names,
          language: again.language ?? result.language ?? held.language ?? null,
          told: standing.filter((heldInstruction) => heldInstruction !== instruction),
        });
        return again;
      }
    }
    await settle(thread, talk, {
      spoken: result.spoken,
      focus: result.focus,
      names: result.names,
      language: result.language ?? held.language ?? null,
      told: standing,
    });
    return result;
  }

  // Perception, reasoning, allocation and persistence are one serial turn.
  // A second signal must reason over the world left by the first, rather than
  // allocate from the same stale snapshot and overwrite its identity.
  const brain = (input, circumstance) => inTurn(() => turn(input, circumstance));

  const forget = () => inTurn(async () => {
    threads.clear();
    // Every conversation goes, graph and all. The graphs themselves stay put
    // and empty: a caller holding one is holding that conversation, and it is
    // the same conversation after it has been forgotten.
    for (const talk of talks.values()) talk.clear();
    grown.clear();
    if (!store) return;
    await forgetTalks(store);
  });

  // What is reached through the brain is the unnamed thread — the conversation
  // a signal that names no conversation is in. A named one is reached by
  // naming it, the same way a signal does.
  const alone = conversation();
  talks.set(ALONE, alone);
  const held = (named) => talks.get(named ?? ALONE) ?? null;

  return { brain, forget, graph: alone.graph, serialize: alone.serialize, conversation: alone, held };
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
// machine. A directory that is not there contributes nothing; one that is there
// and unreadable says so, rather than going missing in silence.
async function readAll(root, dir) {
  const { readDir, file } = await import('runtime:fs');
  let entries;
  try {
    entries = await readDir(`${root}${dir}`);
  } catch (why) {
    // A directory that is not there contributes nothing, and that is ordinary.
    // Being told it may not be read is not: the brain would answer from less
    // than it was given and never say so, and a brain whose every answer is
    // meant to trace back to something readable must not do that quietly.
    if (why && why.code === 'ERR_NOT_FOUND') return [];
    console.warn(`cannot read ${dir} — the brain runs without what is in it: ${why.message}`);
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
