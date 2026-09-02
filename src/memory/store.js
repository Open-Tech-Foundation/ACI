/**
 * The sqlite store — SPEC.md §4.
 *
 * Learned and experience are the persistent memories, and this is where they
 * live. It is the only module in the engine that imports a host capability, so
 * `brain.js`, `learned.js` and `experience.js` all still run under `--deny-all`
 * and can be tested without granting anything.
 *
 * The tables are the primitives, one table each. There is no column anywhere
 * for a weight, score or rank, and adding one would be a change to SPEC.md
 * before it was a change to this file.
 */

import { connect, sql, sqlite } from "runtime:db";

import { Learned } from "./learned.js";

/** `sqlite::memory:` for a scratch brain, or `sqlite:<path>` for one that lasts. */
export async function open(url = "sqlite::memory:") {
  const db = await connect(url, { driver: sqlite });
  await migrate(db);
  return db;
}

export async function migrate(db) {
  await db.query(sql`create table if not exists signal (name text primary key)`);
  await db.query(sql`create table if not exists state (name text primary key)`);
  await db.query(sql`create table if not exists effect (
    state text not null, signal text not null, next text not null,
    primary key (state, signal))`);
  await db.query(sql`create table if not exists expression (
    state text primary key, signal text not null)`);
  await db.query(sql`create table if not exists start_state (
    only integer primary key check (only = 1), state text not null)`);
  await db.query(sql`create table if not exists experience (
    seq integer primary key autoincrement,
    from_state text not null, atom text not null,
    signal text not null, to_state text not null)`);
  return db;
}

/** Writes everything that has been taught. Replaces; it does not merge. */
export async function saveLearned(db, learned) {
  const rows = learned.toRows();
  await db.query(sql`delete from signal`);
  await db.query(sql`delete from state`);
  await db.query(sql`delete from effect`);
  await db.query(sql`delete from expression`);
  await db.query(sql`delete from start_state`);

  for (const name of rows.signals) {
    await db.query(sql`insert into signal (name) values (${name})`);
  }
  for (const name of rows.states) {
    await db.query(sql`insert into state (name) values (${name})`);
  }
  for (const { state, signal, next } of rows.effects) {
    await db.query(
      sql`insert into effect (state, signal, next) values (${state}, ${signal}, ${next})`,
    );
  }
  for (const { state, signal } of rows.expressions) {
    await db.query(
      sql`insert into expression (state, signal) values (${state}, ${signal})`,
    );
  }
  if (rows.start !== null) {
    await db.query(sql`insert into start_state (only, state) values (1, ${rows.start})`);
  }
  return db;
}

export async function loadLearned(db) {
  const start = await rowsOf(db, sql`select state from start_state where only = 1`);
  return Learned.fromRows({
    signals: (await rowsOf(db, sql`select name from signal`)).map((r) => r.name),
    states: (await rowsOf(db, sql`select name from state`)).map((r) => r.name),
    effects: await rowsOf(db, sql`select state, signal, next from effect`),
    expressions: await rowsOf(db, sql`select state, signal from expression`),
    start: start.length > 0 ? start[0].state : null,
  });
}

/**
 * An experience log backed by the same database.
 *
 * `append` does not block: a turn's answer must not depend on whether the disk
 * was quick, and nothing ever reads this back to decide anything. But the
 * writes are chained rather than merely launched, for two reasons — they land
 * in the order they happened, which is the only thing a log owes anybody, and
 * `settled()` gives a reader a point at which everything so far is really
 * there. `all()` waits on it, so a read can never outrun a write.
 */
export function experienceIn(db, onError = () => {}) {
  let pending = Promise.resolve();

  return {
    append({ from, atom, signal, to }) {
      pending = pending
        .then(() =>
          db.query(
            sql`insert into experience (from_state, atom, signal, to_state)
                values (${from}, ${atom}, ${signal}, ${to})`,
          ),
        )
        .catch(onError);
    },
    /** Resolves once every append made so far has landed. */
    async settled() {
      await pending;
    },
    async all() {
      await pending;
      return await rowsOf(
        db,
        sql`select seq, from_state, atom, signal, to_state from experience order by seq`,
      ).then((rows) =>
        rows.map((r) => ({
          seq: r.seq,
          from: r.from_state,
          atom: r.atom,
          signal: r.signal,
          to: r.to_state,
        })),
      );
    },
  };
}

async function rowsOf(db, statement) {
  const result = await db.query(statement);
  return await result.toArray();
}
