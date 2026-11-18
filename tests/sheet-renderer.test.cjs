const test=require('node:test');
const assert=require('node:assert/strict');
const {dimensions,slotBounds,cropValues}=require('../electron/sheet-renderer.cjs');
test('12x36 inches renders landscape at 300 DPI',()=>assert.deepEqual(dimensions({width:12,height:36}),{width:10800,height:3600}));
test('slot geometry rounds shared boundaries',()=>{assert.deepEqual(slotBounds({x:0,y:0,w:.5,h:1},10800,3600),{left:0,top:0,width:5400,height:3600});assert.deepEqual(slotBounds({x:.5,y:0,w:.5,h:1},10800,3600),{left:5400,top:0,width:5400,height:3600})});
test('invalid geometry is rejected',()=>assert.throws(()=>slotBounds({x:.9,y:0,w:.2,h:1},100,100),/Invalid sheet slot/));
test('crop defaults and clamps',()=>assert.deepEqual(cropValues({crop:{zoom:5,x:-5,y:200}}),{zoom:3,x:0,y:100,fit:'cover',rotation:0,flipH:false,flipV:false}));

test('border settings are clamped and invalid colors rejected',()=>{const {borderFor}=require('../electron/sheet-renderer.cjs');assert.deepEqual(borderFor({border:{width:5,color:'#123abc'}},300),{width:5,color:'#123abc',radius:0,shadow:false});assert.deepEqual(borderFor({border:{width:500,color:'red;bad'}},300),{width:60,color:'#ffffff',radius:0,shadow:false});assert.deepEqual(borderFor({},300),{width:0,color:'#ffffff',radius:0,shadow:false});assert.equal(borderFor({border:{width:10,color:'#000000'}},72).width,2)});

test('rounded and shadow borders produce safe vector overlays',()=>{const {borderFor,borderSvg}=require('../electron/sheet-renderer.cjs');const b=borderFor({border:{width:8,color:'#d6a622',radius:'rounded',shadow:true}},300);assert.equal(b.radius,12);assert.equal(b.shadow,true);const svg=borderSvg({width:300,height:180},b).toString();assert.match(svg,/rx="12"/);assert.match(svg,/#d6a622/);assert.equal(borderSvg({width:300,height:180},borderFor({})),null)});
