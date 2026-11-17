import test from 'node:test';import assert from 'node:assert/strict';import {TEMPLATES,PRESETS,validateSettings,sheetPixels,templateSlots,generateAlbum} from '../src/layout.js';
const settings={width:12,height:36,bleed:.2,gutter:1};
test('at least 15 templates',()=>assert.ok(TEMPLATES.length>=15));
test('all specified presets',()=>assert.equal(PRESETS.length,5));
test('12x36 at 300 DPI',()=>assert.deepEqual(sheetPixels(settings),{width:10800,height:3600}));
test('invalid settings rejected',()=>{assert.throws(()=>validateSettings({...settings,bleed:99}));assert.throws(()=>validateSettings({...settings,gutter:-1}))});
test('all slots inside canvas',()=>{for(const t of TEMPLATES){const slots=templateSlots(t,settings);assert.equal(slots.length,t.capacity);for(const s of slots){assert.ok(s.x>=0&&s.y>=0&&s.x+s.w<=1.000002&&s.y+s.h<=1.000002)}}});
test('all 300 photos used exactly once',()=>{const photos=Array.from({length:300},(_,i)=>({id:`p${i}`}));const sheets=generateAlbum(photos,settings);const ids=sheets.flatMap(s=>s.items.map(i=>i.photoId));assert.equal(ids.length,300);assert.equal(new Set(ids).size,300)});
test('deterministic output',()=>{const photos=Array.from({length:33},(_,i)=>({id:`p${i}`}));assert.deepEqual(generateAlbum(photos,settings),generateAlbum(photos,settings))});
test('empty album',()=>assert.deepEqual(generateAlbum([],settings),[]));

test('generated spreads use exact photo count without unfilled template cells',()=>{
 for(const n of [1,2,3,5,7,8,11,17,25]){
  const photos=Array.from({length:n},(_,i)=>({id:'photo-'+i,width:1600,height:1000}));
  const sheets=generateAlbum(photos,settings,1);
  assert.equal(sheets.length,1);
  assert.equal(sheets[0].items.length,n);
  const slots=sheets[0].items.map(i=>i.slot);
  for(const slot of slots)assert.ok(slot.w>0&&slot.h>0);
  for(let i=0;i<slots.length;i++)for(let j=i+1;j<slots.length;j++){
   const a=slots[i],b=slots[j];
   const overlapX=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x);
   const overlapY=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y);
   assert.ok(overlapX<0.00001||overlapY<0.00001,'slots must not overlap');
  }
 }
});
test('incomplete grid rows expand to fill the page width',()=>{
 const template=TEMPLATES.find(t=>t.left===3&&t.right===3);
 const slots=templateSlots(template,settings);
 const left=slots.slice(0,3);
 assert.ok(left[2].w>left[0].w,'last row spans the unused column');
});
