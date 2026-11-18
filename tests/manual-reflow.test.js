import test from 'node:test';
import assert from 'node:assert/strict';
import {generateAlbum} from '../src/layout.js';
import {reflowFromSheet} from '../src/sheet-editor.js';
const settings={width:12,height:36,bleed:.2,gutter:1};
const photos=Array.from({length:48},(_,i)=>({id:'p'+i,width:1600,height:1000}));
test('manual left 4 right 3 reflows subsequent sheets without loss',()=>{
 const original=generateAlbum(photos,settings,6);
 const next=reflowFromSheet(original,photos,settings,1,4,3);
 assert.deepEqual(next[0],original[0]);
 assert.equal(next[1].items.length,7);
 const ids=next.flatMap(s=>s.items.map(i=>i.photoId));
 assert.equal(ids.length,48);
 assert.equal(new Set(ids).size,48);
 assert.ok(next.slice(2).every(s=>s.items.length>0));
});
test('manual 10 plus 10 supports twenty photos',()=>{
 const original=generateAlbum(photos,settings,3);
 const next=reflowFromSheet(original,photos,settings,0,10,10);
 assert.equal(next[0].items.length,20);
 assert.equal(new Set(next.flatMap(s=>s.items.map(i=>i.photoId))).size,48);
});
test('reject impossible counts without modifying existing sheets',()=>{
 const original=generateAlbum(photos.slice(0,8),settings,1);
 assert.throws(()=>reflowFromSheet(original,photos.slice(0,8),settings,0,5,5),/Not enough remaining/);
 assert.equal(original[0].items.length,8);
});

test('automatic sheet mode follows a manually configured spread',async()=>{
 const {autoReflowFromSheet}=await import('../src/sheet-editor.js');
 const original=generateAlbum(photos,settings,6);
 const manual=reflowFromSheet(original,photos,settings,1,4,3);
 const automatic=autoReflowFromSheet(manual,photos,settings,2);
 assert.deepEqual(automatic[0],manual[0]);
 assert.deepEqual(automatic[1],manual[1]);
 assert.equal(automatic[1].layoutMode,'manual');
 assert.equal(automatic[2].layoutMode,'auto');
 const ids=automatic.flatMap(s=>s.items.map(i=>i.photoId));
 assert.equal(ids.length,48);
 assert.equal(new Set(ids).size,48);
});

test('editing an earlier sheet preserves a later manual grid',()=>{
 const original=generateAlbum(photos,settings,6);
 const later=reflowFromSheet(original,photos,settings,3,2,5);
 const edited=reflowFromSheet(later,photos,settings,1,4,3);
 const saved=edited.find(s=>s.layoutMode==='manual'&&s.templateId==='manual-2-5');
 assert.ok(saved,'later manual grid must survive upstream edits');
 assert.equal(saved.items.length,7);
 const ids=edited.flatMap(s=>s.items.map(i=>i.photoId));
 assert.equal(ids.length,photos.length);
 assert.equal(new Set(ids).size,photos.length);
});
test('insufficient photos for later manual grid fails without mutation',()=>{
 const original=generateAlbum(photos.slice(0,16),settings,2);
 const later=reflowFromSheet(original,photos.slice(0,16),settings,1,4,4);
 assert.throws(()=>reflowFromSheet(later,photos.slice(0,16),settings,0,7,7),/Not enough photos/);
 assert.equal(later[1].templateId,'manual-4-4');
});
