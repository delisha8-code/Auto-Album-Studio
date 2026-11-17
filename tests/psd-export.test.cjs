const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const sharp=require('sharp');
const {buildLayeredPsd,pascalName,planar}=require('../electron/psd-export.cjs');
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
 }finally{await fs.rm(folder,{recursive:true,force:true})}
});
test('rejects production-sized PSD requests',async()=>await assert.rejects(buildLayeredPsd({items:[]},[],{width:12,height:36},{dpi:300}),/proof resolution/));
