import { connect, sqlite, sql } from 'runtime:db';
const db = await connect('sqlite::memory:', { driver: sqlite });
await db.execute(sql`create table t (id integer primary key, name text not null unique)`);
const N = 6000;
let t0 = Date.now();
await db.execute(sql`begin immediate`);
for (let i = 0; i < N; i++) await db.execute(sql`insert into t (id, name) values (${i}, ${'n'+i})`);
await db.execute(sql`commit`);
console.log('row at a time in one transaction:', Date.now() - t0, 'ms for', N);
