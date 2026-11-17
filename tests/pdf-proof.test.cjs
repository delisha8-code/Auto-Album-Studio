const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const sharp=require('sharp');
const {pdfPagePoints,writeProofPdf}=require('../electron/pdf-proof.cjs');
test('PDF page dimensions use original inches',()=>assert.deepEqual(pdfPagePoints({width:12,height:36}),{width:2592,height:864}));
test('PDF proof embeds one JPEG per page with correct page tree',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'aas-pdf-'));
 const dest=path.join(dir,'proof.pdf');
 try{
  const jpeg=await sharp({create:{width:30,height:10,channels:3,background:'red'}}).jpeg().toBuffer();
  const updates=[];
  const result=await writeProofPdf(dest,[{},{}],{width:12,height:36},async()=>jpeg,(done,total)=>updates.push([done,total]));
  const pdf=await fs.readFile(dest);
  assert.equal(result.pages,2);
  assert.ok(pdf.subarray(0,8).toString('latin1').startsWith('%PDF-1.4'));
  assert.match(pdf.toString('latin1'),/\/Count 2/);
  assert.equal((pdf.toString('latin1').match(/\/Subtype \/Image/g)||[]).length,2);
  assert.deepEqual(updates,[[1,2],[2,2]]);
  const text=pdf.toString('latin1');
  const match=/startxref\n(\d+)\n%%EOF/.exec(text);
  assert.ok(match,'PDF cross-reference pointer exists');
  const xrefAt=Number(match[1]);
  assert.equal(text.slice(xrefAt,xrefAt+5),'xref\n');
  const entries=text.slice(xrefAt).match(/^\d{10} 00000 n $/gm)||[];
  assert.equal(entries.length,8,'all PDF objects have xref entries');

  await assert.rejects(writeProofPdf(dest,[{}],{width:12,height:36},async()=>jpeg),{code:'EEXIST'});
 }finally{await fs.rm(dir,{recursive:true,force:true})}
});
test('cancellation deletes incomplete PDF',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'aas-pdf-'));
 const dest=path.join(dir,'cancel.pdf');
 try{
  const jpeg=await sharp({create:{width:20,height:20,channels:3,background:'white'}}).jpeg().toBuffer();
  await assert.rejects(writeProofPdf(dest,[{},{}],{width:12,height:36},async()=>jpeg,()=>{},()=>true),/cancelled/);
  await assert.rejects(fs.access(dest),{code:'ENOENT'});
 }finally{await fs.rm(dir,{recursive:true,force:true})}
});
