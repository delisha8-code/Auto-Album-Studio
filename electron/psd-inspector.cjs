// Strict structural inspection of PSD v1 files, independent of the exporter.
function inspectPsd(buffer){
 if(!Buffer.isBuffer(buffer)||buffer.length<40)throw Error('Truncated PSD');
 let at=0;
 const need=n=>{if(!Number.isSafeInteger(n)||n<0||at+n>buffer.length)throw Error('Truncated PSD section')};
 const read16=()=>{need(2);const v=buffer.readUInt16BE(at);at+=2;return v};
 const read32=()=>{need(4);const v=buffer.readUInt32BE(at);at+=4;return v};
 const skip=n=>{need(n);at+=n};
 const tag=()=>{need(4);const v=buffer.toString('ascii',at,at+4);at+=4;return v};
 if(tag()!=='8BPS'||read16()!==1)throw Error('Invalid PSD signature/version');
 skip(6);
 const channels=read16(),height=read32(),width=read32(),depth=read16(),mode=read16();
 if(channels!==3||!width||!height||depth!==8||mode!==3)throw Error('Unsupported PSD color mode');
 skip(read32());skip(read32());
 const layerSectionSize=read32(),layerEnd=at+layerSectionSize;
 if(layerEnd>buffer.length)throw Error('Truncated layer and mask section');
 const layerInfoSize=read32(),infoEnd=at+layerInfoSize;
 if(infoEnd>layerEnd)throw Error('Invalid layer info size');
 need(2);const count=buffer.readInt16BE(at);at+=2;
 if(count<0||count>100)throw Error('Unsupported layer count');
 const layers=[];
 for(let i=0;i<count;i++){
  need(18);
  const top=buffer.readInt32BE(at),left=buffer.readInt32BE(at+4),bottom=buffer.readInt32BE(at+8),right=buffer.readInt32BE(at+12);at+=16;
  if(top<0||left<0||bottom<top||right<left||bottom>height||right>width)throw Error('Invalid layer bounds');
  const channelCount=read16(),channelsInfo=[];
  for(let ch=0;ch<channelCount;ch++){need(6);const id=buffer.readInt16BE(at);at+=2;const size=read32();channelsInfo.push({id,size})}
  if(tag()!=='8BIM'||tag()!=='norm')throw Error('Invalid layer blend signature');
  skip(4);
  const extra=read32(),extraEnd=at+extra;
  if(extraEnd>infoEnd)throw Error('Invalid layer extra');
  const mask=read32();skip(mask);
  const blending=read32();skip(blending);
  need(1);const nameLength=buffer[at],nameStart=at+1;skip(1+nameLength);
  const name=buffer.toString('utf8',nameStart,nameStart+nameLength);
  at+=((4-(1+nameLength)%4)%4);
  if(at>extraEnd)throw Error('Invalid layer name');
  at=extraEnd;
  layers.push({name,width:right-left,height:bottom-top,channels:channelsInfo});
 }
 for(const layer of layers)for(const channel of layer.channels){
  if(channel.size<2)throw Error('Invalid layer channel size');
  const start=at,compression=read16();
  if(compression!==0)throw Error('Unsupported layer compression');
  const pixels=layer.width*layer.height;
  if(channel.size!==pixels+2)throw Error('Invalid channel pixel count');
  skip(channel.size-2);
  if(at-start!==channel.size)throw Error('Channel size mismatch');
 }
 if(at!==infoEnd&&!(at+1===infoEnd&&buffer[at]===0))throw Error('Layer data size mismatch');
 at=layerEnd;
 const compression=read16();
 if(compression!==0)throw Error('Unsupported merged compression');
 const expected=width*height*channels;
 if(buffer.length-at!==expected)throw Error('Invalid merged image length');
 return {width,height,channels,depth,layerCount:count,layers};
}
module.exports={inspectPsd};
