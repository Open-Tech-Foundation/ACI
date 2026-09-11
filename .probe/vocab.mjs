import { speaking } from '../src/knowledge.js';
const { file } = await import('runtime:fs');
const en = await file(new URL('../languages/en.json', import.meta.url).pathname).json();
const words = new Set(Object.keys(en.words).map((w) => w.toLowerCase()));
const { args } = await import('runtime:process');
const sets = {
  verbs: 'be have do say get make go know take see come think look want give use find tell ask work seem feel try leave call keep let begin help talk turn start show hear play run move like live believe hold bring happen write provide sit stand lose pay meet include continue set learn change lead understand watch follow stop create speak read allow add spend grow open walk win offer remember love consider appear buy wait serve die send expect build stay fall cut reach kill remain suggest raise pass sell require report decide pull break carry drive push throw catch drop fill cover close cook clean wash cry laugh jump climb swim fly sleep wake eat drink burn freeze melt shine ring knock tie lift bend fold pour dig plant pick count draw paint sing dance ride sail'.split(' '),
  adjectives: 'good new first last long great little own other old right big high different small large next early young important few public bad same able hot cold wet dry clean dirty full empty heavy light hard soft loud quiet fast slow strong weak happy sad easy difficult near far deep shallow thick thin wide narrow tall short round flat sharp dull sweet sour bitter salty bright dark warm cool fresh stale rough smooth straight curved tight loose rich poor safe dangerous alive dead awake asleep busy free ready sick healthy tired hungry thirsty angry calm brave afraid kind cruel quick late'.split(' '),
};
for (const [name, list] of Object.entries(sets)) {
  const missing = list.filter((w) => !words.has(w));
  console.log(`${name}: ${list.length - missing.length}/${list.length} known`);
  console.log('  missing:', missing.join(' '));
}
