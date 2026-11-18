import test from 'node:test';
import assert from 'node:assert/strict';
import {backgroundFor,backgroundSvg,BACKGROUND_PRESETS} from '../src/backgrounds.js';
import sharp from 'sharp';
test('background presets are available offline',()=>{assert.ok(BACKGROUND_PRESETS.length>=4);assert.ok(BACKGROUND_PRESETS.some(x=>x.id==='rose'))});
test('background opacity is clamped and unknown presets rejected',()=>{assert.deepEqual(backgroundFor({background:{preset:'invalid',opacity:4}}),{preset:'plain',opacity:1});assert.equal(backgroundFor({background:{preset:'rose',opacity:-2}}).opacity,0)});
test('floral vector backgrounds render at export size',async()=>{for(const preset of ['plain','rose','leaves','gold']){const svg=backgroundSvg({background:{preset,opacity:.5}},720,240);const image=await sharp(Buffer.from(svg)).png().toBuffer();const info=await sharp(image).metadata();assert.equal(info.width,720);assert.equal(info.height,240)}});
test('floral opacity zero removes ornament paths',()=>{assert.ok(!backgroundSvg({background:{preset:'rose',opacity:0}},100,50).includes('<ellipse'))});
