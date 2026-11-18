import test from 'node:test';
import assert from 'node:assert/strict';
import {cropFor,updateCrop,cropImageStyle} from '../src/crop-editor.js';
const sheets=[{items:[{photoId:'a',slot:{x:0,y:0,w:1,h:1}}]}];
test('default crop is centered at 1x',()=>assert.deepEqual(cropFor(sheets[0].items[0]),{zoom:1,x:50,y:50,fit:'cover',rotation:0,flipH:false,flipV:false}));
test('crop edits preserve source and slot geometry',()=>{const out=updateCrop(sheets,0,0,{zoom:1.5,x:20});assert.equal(out[0].items[0].crop.zoom,1.5);assert.equal(out[0].items[0].crop.x,20);assert.deepEqual(out[0].items[0].slot,sheets[0].items[0].slot);assert.equal(sheets[0].items[0].crop,undefined)});
test('crop limits reject out of range values by clamping',()=>assert.deepEqual(cropFor({crop:{zoom:9,x:-10,y:200}}),{zoom:3,x:0,y:100,fit:'cover',rotation:0,flipH:false,flipV:false}));
test('invalid slot fails without mutation',()=>assert.throws(()=>updateCrop(sheets,5,0,{zoom:2}),/Invalid photo slot/));
test('crop style uses stored focal point',()=>{const style=cropImageStyle({crop:{zoom:2,x:30,y:70}});assert.equal(style.objectPosition,'30% 70%');assert.equal(style.transform,'rotate(0deg) scale(2, 2)')});

test('Fit mode preserves source and is reflected in preview',()=>{const out=updateCrop(sheets,0,0,{fit:'contain',rotation:0,flipH:false,flipV:false});assert.equal(out[0].items[0].crop.fit,'contain');assert.equal(cropImageStyle(out[0].items[0]).objectFit,'contain');assert.equal(sheets[0].items[0].crop,undefined)});

test('rotation and flips are non-destructive and normalized',()=>{const result=updateCrop(sheets,0,0,{rotation:90,flipH:true,flipV:true});assert.equal(result[0].items[0].crop.rotation,90);assert.match(cropImageStyle(result[0].items[0]).transform,/rotate\(90deg\)/);assert.equal(sheets[0].items[0].crop,undefined);assert.equal(cropFor({crop:{rotation:45}}).rotation,0)});
