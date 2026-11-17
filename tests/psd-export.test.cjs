const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const sharp=require('sharp');
const {buildLayeredPsd,pascalName,planar}=require('../electron/psd-export.cjs');
const {inspectPsd}=require('../electron/psd-inspector.cjs');
test('PSD layer names are 4-byte aligned',()=>assert.equal(pascalName('Wedding Photo').length%4,0));
test('interleaved RGBA converts to planar channels',()=>assert.deepEqual(planar(Buffer.from([1,2,3,4,5,6,7,8]),2,1).map(b=>[...b]),[[1,5],[2,6],[3,7],[4,8]]));
test('creates layered PSD with correct header and layer count',async()=>{
 const folder=await fs.mkdtemp(path.join(os.tmpdir(),'aas-psd-'));
 try{
  const file=path.join(folder,'photo.png');
  await sharp({create:{width:12,height:12,channels:3,background:'#fa4411'}}).png().toFile(file);
  const sheet={items:[{photoId:'p',slot:{x:0,y:0,w:1,h:1},crop:{zoom:1,x:50,y:50}}]};
  const psd=await buildLayeredPsd(sheet,[{id:'p',path:file,name:'Test Photo'}],{width:1,height:2},{dpi:10});
  assert.equal(psd.toString('ascii',0,4),'8BPS');
  assert.equal(psd.readUInt16BE(4),1);
  assert.equal(psd.readUInt16BE(12),3);
  assert.equal(psd.readUInt32BE(14),10);
  assert.equal(psd.readUInt32BE(18),20);
  assert.equal(psd.readUInt16BE(22),8);
  assert.equal(psd.readUInt16BE(24),3);
  const layerInfoOffset=26+4+4+4+4;
  assert.equal(psd.readInt16BE(layerInfoOffset),1);
  assert.ok(psd.includes(Buffer.from('Test Photo')));
  const inspected=inspectPsd(psd);
  assert.equal(inspected.layerCount,1);
  assert.equal(inspected.layers[0].name,'Test Photo');
  assert.deepEqual(inspected.layers[0].channels.map(c=>c.id),[0,1,2,-1]);
 }finally{await fs.rm(folder,{recursive:true,force:true})}
});
test('rejects production-sized PSD requests',async()=>await assert.rejects(buildLayeredPsd({items:[]},[],{width:12,height:36},{dpi:300}),/proof resolution/));

test('independent inspector rejects truncated PSD channel bytes',async()=>{
 const folder=await fs.mkdtemp(path.join(os.tmpdir(),'aas-psd-'));
 try{
  const file=path.join(folder,'p.png');
  await sharp({create:{width:8,height:8,channels:3,background:'#00ff00'}}).png().toFile(file);
  const sheet={items:[{photoId:'p',slot:{x:0,y:0,w:1,h:1}}]};
  const psd=await buildLayeredPsd(sheet,[{id:'p',path:file,name:'Green'}],{width:1,height:1},{dpi:8});
  assert.equal(inspectPsd(psd).layerCount,1);
  assert.throws(()=>inspectPsd(psd.subarray(0,psd.length-1)),/Invalid merged image length/);
 }finally{await fs.rm(folder,{recursive:true,force:true})}
});

test('rejects invalid PSD resolution and excessive layers before image decoding',async()=>{
 const sheet={items:[]};
 await assert.rejects(buildLayeredPsd(sheet,[],{width:1,height:1},{dpi:NaN}),/proof resolution/);
 await assert.rejects(buildLayeredPsd(sheet,[],{width:1,height:1},{dpi:Infinity}),/proof resolution/);
 await assert.rejects(buildLayeredPsd({items:Array.from({length:101},()=>({photoId:'missing'}))},[],{width:1,height:1},{dpi:10}),/Too many PSD layers/);
});

test('PSD inspector rejects invalid layer channel counts and identifiers',async()=>{
 const folder=await fs.mkdtemp(path.join(os.tmpdir(),'aas-psd-mutate-'));
 try{
  const file=path.join(folder,'photo.png');
  await sharp({create:{width:8,height:8,channels:3,background:'#224466'}}).png().toFile(file);
  const psd=await buildLayeredPsd({items:[{photoId:'p',slot:{x:0,y:0,w:1,h:1}}]},[{id:'p',path:file,name:'Check'}],{width:1,height:1},{dpi:8});
  assert.equal(inspectPsd(psd).layerCount,1);
  const layerStart=38;
  const invalidCount=Buffer.from(psd);
  invalidCount.writeUInt16BE(5,layerStart+18);
  assert.throws(()=>inspectPsd(invalidCount),/Unsupported layer channel count/);
  const invalidId=Buffer.from(psd);
  invalidId.writeInt16BE(7,layerStart+20);
  assert.throws(()=>inspectPsd(invalidId),/Invalid layer channel IDs/);
  const invalidInfo=Buffer.from(psd);
  invalidInfo.writeUInt32BE(1,34);
  assert.throws(()=>inspectPsd(invalidInfo),/Invalid layer info size/);
 }finally{await fs.rm(folder,{recursive:true,force:true})}
});
