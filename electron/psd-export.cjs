const sharp=require('sharp');
const {dimensions,slotBounds,cropValues}=require('./sheet-renderer.cjs');
const path=require('node:path');
// A dependency-free layered PSD writer. PSD v1, 8-bit RGB, raw planar channels.
// Deliberately limited to proof resolution to keep memory bounded.
const u16=n=>{const b=Buffer.alloc(2);b.writeUInt16BE(n);return b};
const i16=n=>{const b=Buffer.alloc(2);b.writeInt16BE(n);return b};
const u32=n=>{const b=Buffer.alloc(4);b.writeUInt32BE(n);return b};
const i32=n=>{const b=Buffer.alloc(4);b.writeInt32BE(n);return b};
function pascalName(name){
 const text=Buffer.from(String(name||'Photo').slice(0,200),'utf8').subarray(0,255);
 const size=1+text.length,padding=(4-size%4)%4;
 return Buffer.concat([Buffer.from([text.length]),text,Buffer.alloc(padding)]);
}
function planar(raw,width,height,channels=4){
 const count=width*height;
 return Array.from({length:channels},(_,channel)=>{
  const out=Buffer.alloc(count);
  for(let i=0;i<count;i++)out[i]=raw[i*channels+channel];
  return out;
 });
}
async function makeLayer(item,photo,canvas){
 if(!photo||!path.isAbsolute(photo.path||''))throw Error('Missing photo for PSD layer');
 const box=slotBounds(item.slot,canvas.width,canvas.height);
 const meta=await sharp(photo.path).metadata();
 const rotated=[5,6,7,8].includes(meta.orientation);
 const sw=rotated?meta.height:meta.width,sh=rotated?meta.width:meta.height;
 if(!sw||!sh)throw Error('Invalid source photo');
 const {zoom,x,y}=cropValues(item);
 const scale=Math.max(box.width/sw,box.height/sh)*zoom;
 const rw=Math.max(box.width,Math.ceil(sw*scale)),rh=Math.max(box.height,Math.ceil(sh*scale));
 const left=Math.round((rw-box.width)*x/100),top=Math.round((rh-box.height)*y/100);
 const {data,info}=await sharp(photo.path).rotate().resize(rw,rh,{fit:'fill'})
  .extract({left,top,width:box.width,height:box.height}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 return {name:photo.name||'Photo',box,planes:planar(data,info.width,info.height)};
}
function layerRecord(layer){
 const {left,top,width,height}=layer.box;
 const rect=Buffer.concat([i32(top),i32(left),i32(top+height),i32(left+width)]);
 const channels=Buffer.concat([i16(0),i16(1),i16(2),i16(-1)].map((id,index)=>Buffer.concat([id,u32(2+layer.planes[index].length)])));
 const extra=Buffer.concat([u32(0),u32(0),pascalName(layer.name)]);
 return Buffer.concat([rect,u16(4),channels,Buffer.from('8BIMnorm','ascii'),Buffer.from([255,0,0,0]),u32(extra.length),extra]);
}
async function buildLayeredPsd(sheet,photos,settings,{dpi=72}={}){
 if(dpi>100||dpi<1)throw Error('Layered PSD proof resolution must be 1–100 DPI');
 const canvas=dimensions(settings,dpi);
 if(canvas.width*canvas.height>15000000)throw Error('PSD proof exceeds memory limit');
 const map=new Map(photos.map(p=>[p.id,p]));
 const layers=[];
 for(const item of sheet.items)layers.push(await makeLayer(item,map.get(item.photoId),canvas));
 if(layers.length>100)throw Error('Too many PSD layers');
 const records=Buffer.concat(layers.map(layerRecord));
 const channelData=Buffer.concat(layers.flatMap(l=>l.planes.map(p=>Buffer.concat([u16(0),p]))));
 const layerInfo=Buffer.concat([i16(layers.length),records,channelData]);
 const layerSection=Buffer.concat([u32(layerInfo.length),layerInfo,u32(0)]);
 const layerAndMask=Buffer.concat([u32(layerSection.length),layerSection]);
 // Merged composite uses a white background and the same cropped slot rasters.
 const composites=layers.map(l=>{
  const {left,top,width,height}=l.box;
  const rgba=Buffer.alloc(width*height*4);
  for(let i=0;i<width*height;i++)for(let ch=0;ch<4;ch++)rgba[i*4+ch]=l.planes[ch][i];
  return {input:rgba,raw:{width,height,channels:4},left,top};
 });
 const merged=await sharp({create:{...canvas,channels:3,background:'#ffffff'}}).composite(composites).raw().toBuffer();
 const rgb=planar(merged,canvas.width,canvas.height,3);
 const header=Buffer.concat([Buffer.from('8BPS','ascii'),u16(1),Buffer.alloc(6),u16(3),u32(canvas.height),u32(canvas.width),u16(8),u16(3)]);
 return Buffer.concat([header,u32(0),u32(0),layerAndMask,u16(0),...rgb]);
}
module.exports={buildLayeredPsd,pascalName,planar};
