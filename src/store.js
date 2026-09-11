// Where sessions are kept.
//
// One session is one conversation, and a conversation is many signals over one
// graph — so what is kept here is a graph under the name its session was given,
// and what that session came to be told. Nothing else: the world is read from
// the files at startup and never written, so there is no copy of it here to go
// stale or to be shared by two sessions that never met.
//
// The brain never comes here. It is handed what it knows and asks that.

import { connect, sqlite, sql } from 'runtime:db';

const SCHEMA = [
  sql`create table if not exists talk (
        id text primary key,
        state text not null,
        at integer not null default 0
      )`,
];

export async function openStore(url) {
  const db = await connect(url, { driver: sqlite });
  for (const statement of SCHEMA) await db.execute(statement);
  return db;
}

// A write says what it did and hands back no rows, so it is executed rather
// than queried: a cursor allocated for an insert is one nothing ever reads.
//
// Every read is drained and closed before the next statement runs: a cursor
// left open blocks the next write.
async function rows(db, statement) {
  const cursor = await db.query(statement);
  try {
    return await cursor.toArray();
  } finally {
    await cursor.close();
  }
}

// A conversation, by the name it was given. Only a named one is kept: a signal
// that named none is in the unnamed thread, and there is nothing to come back
// to.
export async function keepTalk(db, id, state, at) {
  await db.execute(
    sql`insert into talk (id, state, at) values (${String(id)}, ${JSON.stringify(state)}, ${at ?? 0})
        on conflict (id) do update set state = excluded.state, at = excluded.at`,
  );
}

export async function readTalk(db, id) {
  const [held] = await rows(db, sql`select state from talk where id = ${String(id)}`);
  if (!held) return null;
  try {
    return JSON.parse(held.state);
  } catch {
    // A conversation that cannot be read back is a conversation that was
    // never had. Better to begin again than to answer out of half of one.
    return null;
  }
}

export async function forgetTalks(db) {
  await db.execute(sql`delete from talk`);
}
