const sharp=require('sharp');
const path=require('node:path');
function dimensions(settings,dpi=300){
 const a=Number(settings?.width),b=Number(settings?.height);
 if(!Number.isFinite(a)||!Number.isFinite(b)||a<=0||b<=0||!Number.isFinite(dpi)||dpi<=0)throw Error('Invalid export dimensions');
 const width=Math.round(Math.max(a,b)*dpi),height=Math.round(Math.min(a,b)*dpi);
 if(width*height>200000000)throw Error('Sheet exceeds export pixel limit');
 return {width,height};
}
function cropValues(item){
 const c=item.crop||{};
 return {zoom:Number.isFinite(c.zoom)?Math.max(1,Math.min(3,c.zoom)):1,x:Number.isFinite(c.x)?Math.max(0,Math.min(100,c.x)):50,y:Number.isFinite(c.y)?Math.max(0,Math.min(100,c.y)):50,fit:c.fit==='contain'?'contain':'cover'};
}
function borderFor(sheet,dpi=300){const b=sheet?.border||{};const width=Number(b.width);return {width:Number.isFinite(width)?Math.max(0,Math.min(60,Math.round(width*dpi/300))):0,color:/^#[0-9a-fA-F]{6}$/.test(b.color||'')?b.color:'#ffffff'};}
function slotBounds(slot,width,height){
 if(!slot||![slot.x,slot.y,slot.w,slot.h].every(Number.isFinite)||slot.w<=0||slot.h<=0||slot.x<0||slot.y<0||slot.x+slot.w>1.00001||slot.y+slot.h>1.00001)throw Error('Invalid sheet slot geometry');
 const left=Math.round(slot.x*width),top=Math.round(slot.y*height);
 const right=Math.round((slot.x+slot.w)*width),bottom=Math.round((slot.y+slot.h)*height);
 return {left,top,width:right-left,height:bottom-top};
}
async function renderSheet(sheet,photos,settings,options={}){
 const {width,height}=dimensions(settings,options.dpi||300);
 if(!sheet||!Array.isArray(sheet.items)||!Array.isArray(photos))throw Error('Invalid sheet');
 const photoMap=new Map(photos.map(p=>[p.id,p]));
 const layers=[];
 for(const item of sheet.items){
  const photo=photoMap.get(item.photoId);
  if(!photo||typeof photo.path!=='string'||!path.isAbsolute(photo.path))throw Error('Missing source photo: '+item.photoId);
  const box=slotBounds(item.slot,width,height);
  if(box.width<1||box.height<1)throw Error('Photo slot too small');
  const {zoom,x,y,fit}=cropValues(item);
  const meta=await sharp(photo.path).metadata();
  const oriented=[5,6,7,8].includes(meta.orientation);
  const sw=oriented?meta.height:meta.width,sh=oriented?meta.width:meta.height;
  if(!sw||!sh)throw Error('Invalid source image dimensions');
  const scale=(fit==='contain'?Math.min(box.width/sw,box.height/sh):Math.max(box.width/sw,box.height/sh))*zoom;
  const rw=Math.max(1,Math.ceil(sw*scale)),rh=Math.max(1,Math.ceil(sh*scale));
  const offsetX=Math.max(0,Math.round((rw-box.width)*x/100));
  const offsetY=Math.max(0,Math.round((rh-box.height)*y/100));
  const resized=sharp(photo.path).rotate().resize(rw,rh,{fit:'fill'});
  let input;
  if(rw>=box.width&&rh>=box.height){
   input=await resized.extract({left:offsetX,top:offsetY,width:box.width,height:box.height}).png().toBuffer();
  }else{
   const small=await resized.extract({left:rw>box.width?offsetX:0,top:rh>box.height?offsetY:0,width:Math.min(rw,box.width),height:Math.min(rh,box.height)}).png().toBuffer();
   input=await sharp({create:{width:box.width,height:box.height,channels:4,background:'#ffffff'}})
    .composite([{input:small,left:Math.round(Math.max(0,box.width-rw)*x/100),top:Math.round(Math.max(0,box.height-rh)*y/100)}]).png().toBuffer();
  }
  layers.push({input,left:box.left,top:box.top});
  const border=borderFor(sheet,options.dpi||300);
  if(border.width>0){const bw=Math.min(border.width,Math.floor(box.width/2),Math.floor(box.height/2));if(bw>0){const overlay=Buffer.from(`<svg width="${box.width}" height="${box.height}"><rect x="${bw/2}" y="${bw/2}" width="${box.width-bw}" height="${box.height-bw}" fill="none" stroke="${border.color}" stroke-width="${bw}"/></svg>`);layers.push({input:overlay,left:box.left,top:box.top})}}
 }
 return sharp({create:{width,height,channels:3,background:'#ffffff'}}).composite(layers).jpeg({quality:92,mozjpeg:true}).withMetadata({density:options.dpi||300}).toBuffer();
}
module.exports={dimensions,slotBounds,cropValues,borderFor,renderSheet};
