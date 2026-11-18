import test from 'node:test';
import assert from 'node:assert/strict';
import {swapSheetPhotos,replaceSheetPhoto,toggleSheetLock,reflowFromSheet} from '../src/sheet-editor.js';
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

test('locking a sheet prevents photo swaps and replacement',()=>{const locked=toggleSheetLock(sheets,1);assert.equal(locked[1].locked,true);assert.equal(sheets[1].locked,undefined);assert.throws(()=>swapSheetPhotos(locked,0,0,1,0),/Unlock/);assert.throws(()=>replaceSheetPhoto(locked,photos,1,0,'d'),/Unlock/);assert.equal(toggleSheetLock(locked,1)[1].locked,false)});
test('reflow preserves locked sheet and its later sheets unchanged',()=>{const settings={width:12,height:36,bleed:.2,gutter:1};const list=['a','b','c','d','e','f','g','h','i','j'].map(id=>({id,width:800,height:600}));const first={id:'s1',items:list.slice(0,4).map(p=>({photoId:p.id,slot:{x:0,y:0,w:.1,h:.1}}))};const locked={id:'s2',locked:true,items:list.slice(4,7).map(p=>({photoId:p.id,slot:{x:.5,y:0,w:.1,h:.1}})),background:{preset:'rose'},border:{width:8}};const later={id:'s3',items:list.slice(7).map(p=>({photoId:p.id,slot:{x:.6,y:0,w:.1,h:.1}}))};const out=reflowFromSheet([first,locked,later],list,settings,0,2,2);assert.deepEqual(out.slice(1),[locked,later]);assert.deepEqual(out.flatMap(s=>s.items.map(i=>i.photoId)).sort(),list.map(p=>p.id).sort());assert.throws(()=>reflowFromSheet([first,locked,later],list,settings,1,1,2),/Unlock/)});
