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
        individual integer not null default 0,
        disjoint integer not null default 0,
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
  await db.query(sql`pragma foreign_keys = on`);
  for (const statement of SCHEMA) await db.query(statement);
  return db;
}

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

// Put a world in, once. Terms first, then everything that points at one.
export async function seed(db, world) {
  const learned = 0;
  for (const t of world.terms) {
    await db.query(sql`insert into term (id, name, value, individual, disjoint, learned)
                       values (${t.id}, ${t.name}, ${t.value ?? null},
                               ${t.individual ? 1 : 0}, ${t.disjoint ? 1 : 0}, ${learned})`);
  }
  for (const t of world.terms) {
    for (const l of t.links || []) await putLink(db, t.id, l, learned);
  }
  for (const [name, id] of Object.entries(world.anchors || {})) {
    await db.query(sql`insert into anchor (name, term) values (${name}, ${id})`);
  }
  for (const [name, id] of Object.entries(world.relations || {})) {
    await db.query(sql`insert into relation (name, term) values (${name}, ${id})`);
  }
}

// Read the whole world back in the one shape everything else speaks.
export async function readWorld(db) {
  const terms = await rows(
    db,
    sql`select id, name, value, individual, disjoint from term order by id`,
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
    if (t.individual) term.individual = true;
    if (t.disjoint) term.disjoint = true;
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
  for (const t of learned.terms || []) {
    const seen = await rows(db, sql`select id from term where id = ${t.id}`);
    if (seen.length === 0) {
      await db.query(sql`insert into term (id, name, value, individual, disjoint, learned)
                         values (${t.id}, ${t.name}, ${t.value ?? null},
                                 ${t.individual ? 1 : 0}, ${t.disjoint ? 1 : 0}, 1)`);
    }
    for (const l of t.links || []) await putLink(db, t.id, l, 1);
  }
}

// Put the world back as it was born and taught, dropping everything learned
// since. What was seeded is not touched.
export async function forgetLearned(db) {
  await db.query(sql`delete from link where learned = 1`);
  await db.query(sql`delete from term where learned = 1`);
}

async function putLink(db, term, l, learned) {
  await db.query(sql`insert or ignore into link
                       (term, rel, target, quantity, moment, denied, learned)
                     values (${term}, ${l.rel}, ${l.to}, ${l.quantity ?? null},
                             ${l.at ?? -1}, ${l.not ? 1 : 0}, ${learned})`);
}
