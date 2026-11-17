const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const sharp=require('sharp');
const {renderSheet}=require('../electron/sheet-renderer.cjs');
const {writeProofPdf}=require('../electron/pdf-proof.cjs');
const {buildLayeredPsd}=require('../electron/psd-export.cjs');
const {inspectPsd}=require('../electron/psd-inspector.cjs');

test('12x36 album sheet exports JPG, PDF proof and layered PSD from real image files',async()=>{
 const folder=await fs.mkdtemp(path.join(os.tmpdir(),'aas-acceptance-'));
 try{
  const first=path.join(folder,'first.png'),second=path.join(folder,'second.png');
  await sharp({create:{width:96,height:64,channels:3,background:'#c82b42'}}).png().toFile(first);
  await sharp({create:{width:64,height:96,channels:3,background:'#2566ac'}}).png().toFile(second);
  const photos=[{id:'a',path:first,name:'First'},{id:'b',path:second,name:'Second'}];
  const sheet={items:[
   {photoId:'a',slot:{x:0,y:0,w:0.5,h:1},crop:{zoom:1.1,x:40,y:60}},
   {photoId:'b',slot:{x:0.5,y:0,w:0.5,h:1},crop:{zoom:1,x:50,y:50}}
  ]};
  const settings={width:12,height:36};
  const jpg=await renderSheet(sheet,photos,settings,{dpi:20});
  const jpgMeta=await sharp(jpg).metadata();
  assert.equal(jpgMeta.format,'jpeg');
  assert.deepEqual([jpgMeta.width,jpgMeta.height],[720,240]);
  const pdfPath=path.join(folder,'proof.pdf');
  const result=await writeProofPdf(pdfPath,[sheet],settings,async s=>renderSheet(s,photos,settings,{dpi:20}));
  assert.equal(result.pages,1);
  const pdf=await fs.readFile(pdfPath);
  assert.ok(pdf.toString('latin1',0,8).startsWith('%PDF-1.4'));
  assert.match(pdf.toString('latin1'),/\/MediaBox \[0 0 2592 864\]/);
  const psd=await buildLayeredPsd(sheet,photos,settings,{dpi:20});
  const inspected=inspectPsd(psd);
  assert.deepEqual([inspected.width,inspected.height,inspected.layerCount],[720,240,2]);
  assert.deepEqual(inspected.layers.map(l=>l.name),['First','Second']);
 }finally{await fs.rm(folder,{recursive:true,force:true})}
});
