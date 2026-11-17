import test from 'node:test';
import assert from 'node:assert/strict';
import {matchPhotosToSlots,generateAlbum} from '../src/layout.js';
const settings={width:12,height:36,bleed:0.2,gutter:1};
test('portrait photo fits portrait slot and landscape fits landscape slot',()=>{
 const photos=[{id:'wide',width:1600,height:900},{id:'tall',width:900,height:1600}];
 const slots=[{x:0,y:0,w:.2,h:.8},{x:.2,y:0,w:.8,h:.2}];
 assert.deepEqual(matchPhotosToSlots(photos,slots).map(i=>i.photoId),['tall','wide']);
});
test('unknown dimensions preserve original order',()=>{
 const photos=[{id:'a'},{id:'b'}],slots=[{w:.3,h:.7},{w:.7,h:.3}];
 assert.deepEqual(matchPhotosToSlots(photos,slots).map(i=>i.photoId),['a','b']);
});
test('every photo appears once for mixed 400-photo album',()=>{
 const photos=Array.from({length:400},(_,i)=>({id:'p'+i,width:i%2?800:1200,height:i%2?1200:800}));
 const sheets=generateAlbum(photos,settings,50);
 const ids=sheets.flatMap(s=>s.items.map(i=>i.photoId));
 assert.equal(sheets.length,50);
 assert.equal(ids.length,400);
 assert.equal(new Set(ids).size,400);
});
test('slot matching is deterministic',()=>{
 const photos=[{id:'1',width:800,height:1200},{id:'2',width:1200,height:800}];
 const slots=[{w:.4,h:.7},{w:.7,h:.4}];
 assert.deepEqual(matchPhotosToSlots(photos,slots),matchPhotosToSlots(photos,slots));
});
test('too few slots is rejected',()=>assert.throws(()=>matchPhotosToSlots([{id:'a'},{id:'b'}],[{w:1,h:1}]),/Not enough slots/));
