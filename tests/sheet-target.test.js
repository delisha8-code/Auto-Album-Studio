import test from 'node:test';
import assert from 'node:assert/strict';
import {generateAlbum,TEMPLATES} from '../src/layout.js';
const settings={width:12,height:36,bleed:0.2,gutter:1};
const photos=n=>Array.from({length:n},(_,i)=>({id:'photo-'+i}));
test('exact target count for 300 photos',()=>{
 const sheets=generateAlbum(photos(300),settings,40);
 assert.equal(sheets.length,40);
 assert.equal(sheets.flatMap(s=>s.items).length,300);
});
test('exact one-photo-per-sheet target',()=>assert.equal(generateAlbum(photos(7),settings,7).length,7));
test('rejects too few sheets for available templates',()=>{
 const capacity=Math.max(...TEMPLATES.map(t=>t.capacity));
 assert.throws(()=>generateAlbum(photos(capacity+1),settings,1),/Cannot place/);
});
test('rejects more sheets than photos',()=>assert.throws(()=>generateAlbum(photos(2),settings,3),/Cannot place/));
test('rejects duplicate photo IDs',()=>assert.throws(()=>generateAlbum([{id:'same'},{id:'same'}],settings),/unique/));
test('rejects blank photo IDs',()=>assert.throws(()=>generateAlbum([{id:''}],settings),/unique/));
test('target output is deterministic',()=>assert.deepEqual(generateAlbum(photos(33),settings,6),generateAlbum(photos(33),settings,6)));
