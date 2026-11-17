import test from 'node:test';
import assert from 'node:assert/strict';
import {createHistory,editHistory,undoHistory,redoHistory,HISTORY_LIMIT} from '../src/edit-history.js';
test('undo and redo restore photo arrangements',()=>{
 const a=[{id:'a'}],b=[{id:'b'}],c=[{id:'c'}];
 let h=createHistory(a);h=editHistory(h,b);h=editHistory(h,c);
 h=undoHistory(h);assert.equal(h.present,b);
 h=undoHistory(h);assert.equal(h.present,a);
 h=redoHistory(h);assert.equal(h.present,b);
});
test('new edit after undo clears redo history',()=>{
 let h=editHistory(createHistory([]),[1]);h=undoHistory(h);h=editHistory(h,[2]);assert.equal(h.future.length,0);assert.equal(redoHistory(h),h);
});
test('history is capped to avoid unbounded growth',()=>{
 let h=createHistory([]);for(let i=0;i<100;i++)h=editHistory(h,[i]);assert.equal(h.past.length,HISTORY_LIMIT);
});
test('no-op edits do not create undo entries',()=>{
 const p=[];const h=createHistory(p);assert.equal(editHistory(h,p),h);assert.equal(undoHistory(h),h);
});
