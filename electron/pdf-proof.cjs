const fs=require('node:fs/promises');
const sharp=require('sharp');
function pdfPagePoints(settings){
 const a=Number(settings?.width),b=Number(settings?.height);
 if(!Number.isFinite(a)||!Number.isFinite(b)||a<=0||b<=0||Math.max(a,b)>200)throw Error('Invalid PDF page dimensions');
 return {width:Math.max(a,b)*72,height:Math.min(a,b)*72};
}
async function writeProofPdf(destination,sheets,settings,renderSheet,onProgress=()=>{},isCancelled=()=>false){
 if(!Array.isArray(sheets)||!sheets.length)throw Error('No sheets to export');
 const page=pdfPagePoints(settings);
 const file=await fs.open(destination,'wx');
 let offset=0;
 const positions=[0];
 const put=async data=>{const b=Buffer.isBuffer(data)?data:Buffer.from(data,'latin1');let written=0;while(written<b.length){const result=await file.write(b,written,b.length-written,offset+written);if(result.bytesWritten===0)throw Error('PDF write made no progress');written+=result.bytesWritten}offset+=b.length};
 const object=async(id,body)=>{positions[id]=offset;await put(id+' 0 obj\n');await put(body);await put('\nendobj\n')};
 const n=sheets.length,first=3;
 try{
  await put('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  await object(1,'<< /Type /Catalog /Pages 2 0 R >>');
  await object(2,`<< /Type /Pages /Count ${n} /Kids [${sheets.map((_,i)=>first+i*3+' 0 R').join(' ')}] >>`);
  for(let i=0;i<n;i++){
   if(isCancelled())throw Error('PDF export cancelled');
   const pageId=first+i*3,contentId=pageId+1,imageId=pageId+2;
   const jpeg=await renderSheet(sheets[i],{dpi:100});
   const info=await sharp(jpeg).metadata();
   if(info.format!=='jpeg'||info.channels!==3)throw Error('Proof renderer must return RGB JPEG');
   await object(pageId,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.width} ${page.height}] /Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`);
   const commands=`q ${page.width} 0 0 ${page.height} 0 0 cm /Im0 Do Q\n`;
   await object(contentId,`<< /Length ${Buffer.byteLength(commands)} >>\nstream\n${commands}endstream`);
   positions[imageId]=offset;
   await put(`${imageId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${info.width} /Height ${info.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
   await put(jpeg);await put('\nendstream\nendobj\n');
   onProgress(i+1,n);
  }
  const xref=offset,last=first+n*3-1;
  await put(`xref\n0 ${last+1}\n0000000000 65535 f \n`);
  for(let i=1;i<=last;i++)await put(String(positions[i]).padStart(10,'0')+' 00000 n \n');
  await put(`trailer\n<< /Size ${last+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return {pages:n};
 }catch(e){await file.close();await fs.rm(destination,{force:true}).catch(()=>{});throw e}
 finally{await file.close().catch(()=>{})}
}
module.exports={pdfPagePoints,writeProofPdf};
