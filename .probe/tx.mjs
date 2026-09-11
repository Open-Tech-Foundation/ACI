import { connect, sqlite, sql } from 'runtime:db';
const db = await connect('sqlite::memory:', { driver: sqlite });
await db.execute(sql`create table t (id integer primary key, name text not null unique)`);
await db.execute(sql`begin immediate`);
try {
  await db.executeMany(sql`insert into t (id, name) values (?, ?)`, [[1,'a'],[2,'b']]);
  console.log('executeMany inside a transaction: ok');
  await db.execute(sql`rollback`);
} catch (e) {
  console.log('executeMany inside a transaction FAILED:', e.message);
  try { await db.execute(sql`rollback`); } catch {}
}
const c = await db.query(sql`select count(*) as n from t`); const r = await c.toArray(); await c.close();
console.log('rows after rollback:', r[0].n);
