import test from 'node:test';
import assert from 'node:assert/strict';
import {swapSheetPhotos,replaceSheetPhoto} from '../src/sheet-editor.js';
const sheets=[{id:'s1',items:[{photoId:'a',slot:{x:0}},{photoId:'b',slot:{x:1}}]},{id:'s2',items:[{photoId:'c',slot:{x:2}}]}];
const photos=['a','b','c','d'].map(id=>({id}));
test('swaps photos without changing slots or input',()=>{
 const out=swapSheetPhotos(sheets,0,0,0,1);
 assert.deepEqual(out[0].items.map(x=>x.photoId),['b','a']);
 assert.equal(out[0].items[0].slot.x,0);
 assert.equal(sheets[0].items[0].photoId,'a');
});
test('swaps photos between sheets',()=>{
 const out=swapSheetPhotos(sheets,0,0,1,0);
 assert.equal(out[0].items[0].photoId,'c');
 assert.equal(out[1].items[0].photoId,'a');
});
test('replacing with a photo already placed swaps instead of duplicating',()=>{
 const out=replaceSheetPhoto(sheets,photos,0,0,'c');
 assert.deepEqual(out.flatMap(s=>s.items.map(i=>i.photoId)),['c','b','a']);
});
test('unplaced photo replaces target',()=>{
 const out=replaceSheetPhoto(sheets,photos,0,0,'d');
 assert.equal(out[0].items[0].photoId,'d');
});
test('invalid slots and unknown photos are rejected',()=>{
 assert.throws(()=>swapSheetPhotos(sheets,0,99,1,0),/Invalid photo slot/);
 assert.throws(()=>replaceSheetPhoto(sheets,photos,0,0,'missing'),/Photo not found/);
});
