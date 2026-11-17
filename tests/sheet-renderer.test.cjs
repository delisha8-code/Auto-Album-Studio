const test=require('node:test');
const assert=require('node:assert/strict');
const {dimensions,slotBounds,cropValues}=require('../electron/sheet-renderer.cjs');
test('12x36 inches renders landscape at 300 DPI',()=>assert.deepEqual(dimensions({width:12,height:36}),{width:10800,height:3600}));
test('slot geometry rounds shared boundaries',()=>{assert.deepEqual(slotBounds({x:0,y:0,w:.5,h:1},10800,3600),{left:0,top:0,width:5400,height:3600});assert.deepEqual(slotBounds({x:.5,y:0,w:.5,h:1},10800,3600),{left:5400,top:0,width:5400,height:3600})});
test('invalid geometry is rejected',()=>assert.throws(()=>slotBounds({x:.9,y:0,w:.2,h:1},100,100),/Invalid sheet slot/));
test('crop defaults and clamps',()=>assert.deepEqual(cropValues({crop:{zoom:5,x:-5,y:200}}),{zoom:3,x:0,y:100}));
