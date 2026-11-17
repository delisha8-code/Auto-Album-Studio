import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {saveProject,listProjects,loadProject}=require('../electron/project-library.cjs');
const album={schemaVersion:1,name:'Wedding Album',settings:{width:12,height:36},photos:[{id:'p1'}],sheets:[]};
test('save, list, reopen and update multiple albums',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'aas-lib-'));
 try{
  assert.deepEqual(await listProjects(root),[]);
  const first=await saveProject(root,album);
  const second=await saveProject(root,{...album,name:'Second Album'});
  assert.equal((await listProjects(root)).length,2);
  assert.deepEqual(await loadProject(root,first.id),album);
  const updated=await saveProject(root,{...album,name:'Renamed'},first.id);
  assert.equal(updated.id,first.id);
  assert.equal(updated.createdAt,first.createdAt);
  assert.equal((await loadProject(root,first.id)).name,'Renamed');
  assert.equal((await loadProject(root,second.id)).name,'Second Album');
 }finally{await fs.rm(root,{recursive:true,force:true})}
});
test('reject invalid project and unsafe IDs',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'aas-lib-'));
 try{
  await assert.rejects(saveProject(root,{...album,photos:null}),/Invalid album project/);
  await assert.rejects(loadProject(root,'../../outside'),/Invalid project ID/);
 }finally{await fs.rm(root,{recursive:true,force:true})}
});
