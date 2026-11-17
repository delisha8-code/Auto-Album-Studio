import test from 'node:test';
import assert from 'node:assert/strict';
import {photoPage,PHOTO_PAGE_SIZE} from '../src/photo-pages.js';
const photos=Array.from({length:400},(_,i)=>({id:'p'+i}));
test('first page is bounded to 90 thumbnails',()=>{const p=photoPage(photos,1);assert.equal(PHOTO_PAGE_SIZE,90);assert.equal(p.photos.length,90);assert.equal(p.totalPages,5);assert.equal(p.start,1);assert.equal(p.end,90)});
test('last page contains the remaining photos',()=>{const p=photoPage(photos,5);assert.equal(p.photos.length,40);assert.equal(p.start,361);assert.equal(p.end,400)});
test('out of range pages are clamped',()=>{assert.equal(photoPage(photos,100).page,5);assert.equal(photoPage(photos,-3).page,1)});
test('empty photo library has safe bounds',()=>{const p=photoPage([],1);assert.deepEqual(p.photos,[]);assert.equal(p.start,0);assert.equal(p.end,0);assert.equal(p.totalPages,1)});
test('invalid page size is rejected',()=>assert.throws(()=>photoPage(photos,1,0),/Invalid page size/));
