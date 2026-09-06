// Where the world is kept.
//
// The brain never comes here. It is handed a world and asks that world
// questions; whether the answers came from a file or a table is not its
// business. What this module owes the rest of the system is the same shape
// everything else uses — `{ anchors, relations, terms }` — and it is checked on
// the way out like any other source.
//
// The schema carries the constraints the shape check walks for: a term's id is
// its key, its name is claimed once, and no link may point at a term that is not
// there. Two walls, not one.

import { connect, sqlite, sql } from 'runtime:db';

const SCHEMA = [
  sql`create table if not exists term (
        id integer primary key,
        name text not null unique,
        value integer,
        symbol text,
        individual integer not null default 0,
        disjoint integer not null default 0,
        transitive integer not null default 0,
        learned integer not null default 0
      )`,
  sql`create table if not exists link (
        term integer not null references term(id),
        rel integer not null references term(id),
        target integer not null references term(id),
        quantity integer,
        -- never null: sqlite holds two nulls to be different, so a link with no
        -- moment could be written twice under a unique index.
        moment integer not null default -1,
        denied integer not null default 0,
        learned integer not null default 0,
        unique (term, rel, target, moment, denied)
      )`,
  sql`create table if not exists anchor (
        name text primary key,
        term integer not null references term(id)
      )`,
  sql`create table if not exists relation (
        name text primary key,
        term integer not null references term(id)
      )`,
  sql`create index if not exists link_by_term on link (term)`,
  sql`create index if not exists link_by_target on link (target, rel)`,
];

export async function openStore(url) {
  const db = await connect(url, { driver: sqlite });
  await db.execute(sql`pragma foreign_keys = on`);
  for (const statement of SCHEMA) await db.execute(statement);
  // A store written before a column existed keeps its rows: `create table if
  // not exists` adds nothing to a table that is already there.
  const columns = await rows(db, sql`pragma table_info(term)`);
  if (!columns.some((c) => c.name === 'symbol')) {
    await db.execute(sql`alter table term add column symbol text`);
  }
  if (!columns.some((c) => c.name === 'transitive')) {
    await db.execute(sql`alter table term add column transitive integer not null default 0`);
  }
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

export async function isEmpty(db) {
  const [{ n }] = await rows(db, sql`select count(*) as n from term`);
  return n === 0;
}

// Put the authored world in — on the first open, and on every one after it.
//
// A world grows: a term is added, a link moved, one renamed. A store written
// before that would keep the old world for ever, since it is only ever seeded
// when empty. So what was seeded is laid down again each time, and what was
// learned is left exactly where it is: a memory that survived a restart is not
// thrown away to get the new world in.
//
// A whole world at once, and not a row at a time: every statement costs the
// same trip to the driver whether it writes one row or five thousand, and an
// authored world is thousands. One statement per kind of row, handed all of
// them, is the same writes in the same order.
export async function seed(db, world) {
  const learned = 0;
  await db.execute(sql`delete from link where learned = 0`);

  await db.executeMany(
    sql`insert into term (id, name, value, symbol, individual, disjoint, transitive, learned)
        values (?, ?, ?, ?, ?, ?, ?, ?)
        on conflict (id) do update set
          name = excluded.name,
          value = excluded.value,
          symbol = excluded.symbol,
          individual = excluded.individual,
          disjoint = excluded.disjoint,
          transitive = excluded.transitive
        where term.learned = 0`,
    world.terms.map((t) => [
      t.id,
      t.name,
      t.value ?? null,
      t.symbol ?? null,
      t.individual ? 1 : 0,
      t.disjoint ? 1 : 0,
      t.transitive ? 1 : 0,
      learned,
    ]),
  );

  await putLinks(
    db,
    world.terms.flatMap((t) => (t.links || []).map((l) => [t.id, l])),
    learned,
  );

  for (const [table, named] of [
    ['anchor', world.anchors || {}],
    ['relation', world.relations || {}],
  ]) {
    await db.executeMany(
      table === 'anchor'
        ? sql`insert into anchor (name, term) values (?, ?)
              on conflict (name) do update set term = excluded.term`
        : sql`insert into relation (name, term) values (?, ?)
              on conflict (name) do update set term = excluded.term`,
      Object.entries(named),
    );
  }
}

// Read the whole world back in the one shape everything else speaks.
export async function readWorld(db) {
  const terms = await rows(
    db,
    sql`select id, name, value, symbol, individual, disjoint, transitive from term order by id`,
  );
  const links = await rows(
    db,
    sql`select term, rel, target, quantity, moment, denied from link order by term, rowid`,
  );
  const anchors = await rows(db, sql`select name, term from anchor`);
  const relations = await rows(db, sql`select name, term from relation`);

  const byId = new Map();
  const out = terms.map((t) => {
    const term = { id: t.id, name: t.name, links: [] };
    if (t.value !== null) term.value = t.value;
    if (t.symbol !== null) term.symbol = t.symbol;
    if (t.individual) term.individual = true;
    if (t.disjoint) term.disjoint = true;
    if (t.transitive) term.transitive = true;
    byId.set(t.id, term);
    return term;
  });
  for (const l of links) {
    const link = { rel: l.rel, to: l.target };
    if (l.quantity !== null) link.quantity = l.quantity;
    if (l.moment >= 0) link.at = l.moment;
    if (l.denied) link.not = true;
    byId.get(l.term).links.push(link);
  }
  return {
    anchors: Object.fromEntries(anchors.map((a) => [a.name, a.term])),
    relations: Object.fromEntries(relations.map((r) => [r.name, r.term])),
    terms: out,
  };
}

// What the brain accepted, written down. A term already there gains the links;
// one that is not is made. Nothing here decides whether to keep it — that was
// settled before this was called.
export async function write(db, learned) {
  await db.execute(sql`begin immediate`);
  try {
    // Every term first, then every link. One signal may name two things and join
    // them to each other, and a link cannot reach a term that is not there yet.
    for (const t of learned.terms || []) {
      const seen = await rows(db, sql`select id from term where id = ${t.id}`);
      if (seen.length === 0) {
        await db.execute(sql`insert into term (id, name, value, symbol, individual, disjoint, transitive, learned)
                           values (${t.id}, ${t.name}, ${t.value ?? null}, ${t.symbol ?? null},
                                   ${t.individual ? 1 : 0}, ${t.disjoint ? 1 : 0},
                                   ${t.transitive ? 1 : 0}, 1)`);
      }
    }
    for (const t of learned.terms || []) {
      for (const l of t.links || []) {
        await db.execute(sql`insert or ignore into link
          (term, rel, target, quantity, moment, denied, learned)
          values (${t.id}, ${l.rel}, ${l.to}, ${l.quantity ?? null}, ${l.at ?? -1},
                  ${l.not ? 1 : 0}, 1)`);
      }
    }
    await db.execute(sql`commit`);
  } catch (why) {
    await db.execute(sql`rollback`);
    throw why;
  }
}

// Put the world back as it was born and taught, dropping everything learned
// since. What was seeded is not touched.
export async function forgetLearned(db) {
  await db.execute(sql`delete from link where learned = 1`);
  await db.execute(sql`delete from term where learned = 1`);
}

// Every link in one statement. A link a term already has is left as it is.
async function putLinks(db, links, learned) {
  if (links.length === 0) return;
  await db.executeMany(
    sql`insert or ignore into link
          (term, rel, target, quantity, moment, denied, learned)
        values (?, ?, ?, ?, ?, ?, ?)`,
    links.map(([term, l]) => [
      term,
      l.rel,
      l.to,
      l.quantity ?? null,
      l.at ?? -1,
      l.not ? 1 : 0,
      learned,
    ]),
  );
}
