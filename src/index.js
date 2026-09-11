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
import { brainFrom, grownBy } from './brain.js';
import { conversation } from './graph.js';
import { fromSources, speaking } from './knowledge.js';
import { openStore, seed, readWorld, write, forgetLearned, keepTalk, readTalk, forgetTalks } from './store.js';

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
  const build = async (settled = false) =>
    fromSources({ ...sources, world: await readWorld(store), settled });

  // A conversation is many signals over one graph, so the graph belongs to the
  // conversation and not to the brain. One brain may be holding several at
  // once — two people talking to it are two conversations over one world — and
  // what one was told is nothing to the other.
  const talks = new Map();
  const ALONE = Symbol('one thread');

  async function assemble() {
    const { file } = await import('runtime:fs');
    const root = await projectRoot(file);
    if (!root) throw new Error(`cannot find ${WORLD} — the brain has no world`);

    store = await open(root);
    const authored = await file(`${root}${WORLD}`).json();
    // Validate before the authored source is allowed to change persistent
    // state. The same door checks it again after memory is assembled.
    fromSources({ world: authored });
    // Every open, not only the first: the authored world may have grown since
    // this store was written, and what was learned is kept through it.
    await seed(store, authored);

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
  async function pickUp(thread) {
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
    return talk;
  }

  // Everything the conversation came to, put where it will still be after this
  // run. Only a named conversation: one that named none cannot be asked for
  // again, so there is nothing to come back to.
  async function settle(thread, talk, record) {
    threads.set(thread, record);
    if (thread === ALONE || !store) return;
    await keepTalk(store, thread, { graph: talk.dump(), thread: record }, Date.now());
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
    const talk = await pickUp(thread);
    const held = threads.get(thread) || {};
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
    const knowledge = { ...known, graph: talk };
    const result = brainFrom(input, knowledge, said);
    const standing = [...(held.told || [])];
    if (result.told && !standing.includes(result.told)) standing.push(result.told);
    // What the brain accepted, put where it will still be after the turn. A
    // turn is not acknowledged until the complete proposed change is
    // committed; persistence errors surface to the caller. One door for both
    // ways a turn can reach a fact — stated outright, or reached at last by
    // acting on something agreed to earlier — because they are the same fact.
    const commit = async (accepted) => {
      if (!accepted) return;
      await write(store, accepted);
      // The brain weighed this change against this world and accepted it, so
      // the world it holds is the world plus that change: reading three
      // thousand terms back out of the store to find the one that moved is
      // work nobody asked for. The store still has it, and a brain that opens
      // again reads it from there.
      const was = await knowledgePromise;
      const now = { ...was, world: grownBy(was.world, accepted) };
      knowledgePromise = Promise.resolve(now);
      await knowledgePromise;
    };

    await commit(result.learned);
    // Written, so the conversation may remember it.
    result.remember();

    // What it agreed to follow, brought round again now something has moved.
    // The brain holds no instruction; it is asked afresh, and where it can act
    // on one at last, that is its answer.
    for (const instruction of standing) {
      if (instruction === String(input)) continue;
      const again = brainFrom(instruction, { ...(await loaded()), graph: talk }, {
        spoken: result.spoken,
        focus: result.focus,
        names: result.names,
        language: result.language ?? held.language ?? null,
        from: said.from,
        to: said.to,
      });
      if (again.told == null && again.expression.name !== "unsure") {
        await commit(again.learned);
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
    if (!store) return;
    await forgetTalks(store);
    await forgetLearned(store);
    knowledgePromise = build();
    await knowledgePromise;
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
