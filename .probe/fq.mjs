import { connect, sqlite, sql } from 'runtime:db';
const db = await connect('sqlite::memory:', { driver: sqlite });
await db.execute(sql`create table q (id integer primary key, quantity integer)`);
for (const [i, v] of [[1, 3], [2, '1.5'], [3, '0.30000000000000004'], [4, '10']].entries()) {
  await db.execute(sql`insert into q (id, quantity) values (${v[0]}, ${v[1]})`);
}
const c = await db.query(sql`select id, quantity, typeof(quantity) as t from q`);
console.log(JSON.stringify(await c.toArray())); await c.close();
