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
 for(const n of [1,2,3,5,7,8,11,17,18]){
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

test('photo matching uses physical landscape spread ratio',async()=>{
 const {matchPhotosToSlots}=await import('../src/layout.js');
 const slots=[{x:0,y:0,w:.4,h:1},{x:.4,y:0,w:.2,h:1}];
 const photos=[{id:'portrait',width:600,height:1200},{id:'landscape',width:1800,height:1000}];
 const assigned=matchPhotosToSlots(photos,slots,settings);
 assert.equal(assigned[0].photoId,'landscape');
 assert.equal(assigned[1].photoId,'portrait');
});

test('hero layouts feature a larger photo without blank space or overlap',()=>{
 const template=TEMPLATES.find(t=>t.left===4&&t.right===4);
 const slots=templateSlots(template,settings,{left:4,right:4},'hero');
 assert.equal(slots.length,8);
 assert.ok(slots[0].w>slots[1].w);
 assert.ok(slots[4].w>slots[5].w);
 for(let i=0;i<slots.length;i++)for(let j=i+1;j<slots.length;j++){
  const a=slots[i],b=slots[j];
  const overlapX=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x);
  const overlapY=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y);
  assert.ok(overlapX<0.00001||overlapY<0.00001,'hero slots must not overlap');
 }
});
test('multi-sheet albums alternate grid and hero compositions',()=>{
 const photos=Array.from({length:32},(_,i)=>({id:'p'+i,width:1600,height:1000}));
 const sheets=generateAlbum(photos,settings,4);
 assert.equal(sheets.length,4);
 assert.equal(sheets.flatMap(s=>s.items).length,32);
 assert.ok(sheets[1].items.some(i=>i.slot.w>.25),'second sheet should have a large hero slot');
});

test('global photo assignment beats greedy placement on competing slots',async()=>{
 const {matchPhotosToSlots}=await import('../src/layout.js');
 const slots=[{x:0,y:0,w:0.5,h:1},{x:0.5,y:0,w:0.25,h:1}];
 const photos=[{id:'flexible',width:1300,height:1000},{id:'wide',width:2000,height:1000}];
 const result=matchPhotosToSlots(photos,slots,{width:12,height:36});
 assert.deepEqual(result.map(i=>i.photoId),['wide','flexible']);
});
test('photo assignment remains deterministic for identical aspect ratios',async()=>{
 const {matchPhotosToSlots}=await import('../src/layout.js');
 const photos=Array.from({length:8},(_,i)=>({id:'p'+i,width:1000,height:1000}));
 const slots=templateSlots(TEMPLATES.find(t=>t.capacity===8),settings);
 assert.deepEqual(matchPhotosToSlots(photos,slots,settings),matchPhotosToSlots(photos,slots,settings));
});

test('single-photo sheets never cross the center fold',()=>{
 const s={width:12,height:36,bleed:.2,gutter:1};
 const slots=templateSlots({left:1,right:0},s,{left:1,right:0});
 const center=0.5;
 assert.equal(slots.length,1);
 assert.ok(slots[0].x+slots[0].w<center);
});
test('independent four-sided margins constrain all slots',()=>{
 const s={width:12,height:36,bleed:.1,gutter:1,margins:{left:1,right:1.5,top:.5,bottom:.75}};
 const slots=templateSlots({left:4,right:3},s,{left:4,right:3});
 const left=1/36,right=1.5/36,top=.5/12,bottom=.75/12;
 for(const slot of slots){
  assert.ok(slot.x>=left-1e-5);
  assert.ok(slot.x+slot.w<=1-right+1e-5);
  assert.ok(slot.y>=top-1e-5);
  assert.ok(slot.y+slot.h<=1-bottom+1e-5);
  assert.ok(slot.x+slot.w<=.5-1/72+1e-5||slot.x>=.5+1/72-1e-5);
 }
});
test('invalid negative custom margins are rejected',()=>{
 assert.throws(()=>templateSlots({left:2,right:2},{width:12,height:36,bleed:.1,gutter:1,margins:{top:-1}}),/Invalid page margin/);
});
