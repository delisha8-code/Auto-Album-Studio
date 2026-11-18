export const PRESETS=[{label:'12 × 36',width:12,height:36},{label:'14 × 40',width:14,height:40},{label:'16 × 24',width:16,height:24},{label:'12 × 24',width:12,height:24},{label:'15 × 30',width:15,height:30}];
// The physical sheet is landscape in the editor: long dimension runs horizontally.
export function validateSettings(s){const width=Number(s.width),height=Number(s.height),bleed=Number(s.bleed),gutter=Number(s.gutter);if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw Error('Sheet dimensions must be positive');if(!Number.isFinite(bleed)||bleed<0||bleed>=Math.min(width,height)/2)throw Error('Invalid bleed');if(!Number.isFinite(gutter)||gutter<0||gutter>=Math.max(width,height)-2*bleed)throw Error('Invalid gutter');return {width,height,bleed,gutter}}
export function sheetPixels(s,dpi=300){const v=validateSettings(s);return {width:Math.round(Math.max(v.width,v.height)*dpi),height:Math.round(Math.min(v.width,v.height)*dpi)}}
const patterns=[ [1,4],[4,4],[4,9],[2,4],[1,1],[3,3],[2,6],[6,6],[1,6],[3,6],[4,6],[2,9],[6,9],[9,9],[1,9],[2,2],[3,4],[1,3] ];
export const TEMPLATES=patterns.map(([left,right],i)=>({id:`spread-${String(i+1).padStart(2,'0')}`,name:`${left} + ${right}`,left,right,capacity:left+right}));
function grid(n,x,y,w,h){
 if(n===0)return [];
 const cols=Math.min(n,Math.max(1,Math.ceil(Math.sqrt(n*w/h))));
 const rows=Math.ceil(n/cols),slots=[];
 for(let row=0,used=0;row<rows;row++){
  const count=Math.min(cols,n-used);
  for(let col=0;col<count;col++)slots.push({x:x+col*w/count,y:y+row*h/rows,w:w/count,h:h/rows});
  used+=count;
 }
 return slots;
}
// A large hero photo beside a compact stack of supporting photos.
function heroGrid(n,x,y,w,h,heroOnRight=false){
 if(n<3||n>6)return grid(n,x,y,w,h);
 const heroWidth=w*0.58,smallWidth=w-heroWidth;
 const large={x:x+(heroOnRight?smallWidth:0),y,w:heroWidth,h};
 const small=grid(n-1,x+(heroOnRight?0:heroWidth),y,smallWidth,h);
 return [large,...small];
}
export function templateSlots(template,settings,counts=null,style='grid'){
 const s=validateSettings(settings),long=Math.max(s.width,s.height),short=Math.min(s.width,s.height);
 const padX=s.bleed/long,padY=s.bleed/short,g=s.gutter/long,half=(1-2*padX-g)/2;
 if(half<=0)throw Error('Not enough room for both pages');
 const left=counts?counts.left:template.left,right=counts?counts.right:template.right;
 if(!Number.isInteger(left)||!Number.isInteger(right)||left<0||right<0||left+right<1)throw Error('Invalid photo counts');
 if(left===0||right===0){
  const n=left+right;
  return grid(n,padX,padY,1-2*padX,1-2*padY).map(roundSlot);
 }
 const make=(n,x,side)=>style==='hero'?heroGrid(n,x,padY,half,1-2*padY,side==='right'):grid(n,x,padY,half,1-2*padY);
 return [...make(left,padX,'left'),...make(right,padX+half+g,'right')].map(roundSlot);
}
function roundSlot(slot){return Object.fromEntries(Object.entries(slot).map(([k,v])=>[k,Number(v.toFixed(6))]))}
// Match photo aspect ratios to slots while keeping each sheet's photo group intact.
// When dimensions are unavailable, preserve the original import order.
// Minimum-cost assignment avoids a greedy first slot consuming the best photo for another slot.
// Dynamic programming is bounded by the 18-photo maximum template capacity.
export function matchPhotosToSlots(photos,slots,settings=null){
 if(photos.length>slots.length)throw Error('Not enough slots for photos');
 if(!photos.length)return [];
 const canvasRatio=settings?Math.max(Number(settings.width),Number(settings.height))/Math.min(Number(settings.width),Number(settings.height)):1;
 const n=photos.length;
 if(n>18)throw Error('Too many photos for automatic slot matching');
 const costs=Array.from({length:n},(_,i)=>slots.slice(0,n).map(slot=>{
  const width=Number(photos[i].width),height=Number(photos[i].height);
  const known=Number.isFinite(width)&&Number.isFinite(height)&&width>0&&height>0;
  const ratio=slot.w/slot.h*canvasRatio;
  return known?Math.abs(Math.log((width/height)/ratio)):0;
 }));
 const size=1<<n,dp=new Float64Array(size).fill(Infinity),parent=new Int32Array(size).fill(-1);
 dp[0]=0;
 const bits=new Uint8Array(size);
 for(let mask=1;mask<size;mask++)bits[mask]=bits[mask>>1]+(mask&1);
 for(let mask=0;mask<size-1;mask++){
  if(!Number.isFinite(dp[mask]))continue;
  const slotIndex=bits[mask];
  for(let photoIndex=0;photoIndex<n;photoIndex++){
   if(mask&(1<<photoIndex))continue;
   const next=mask|(1<<photoIndex),candidate=dp[mask]+costs[photoIndex][slotIndex];
   if(candidate<dp[next]-1e-10){dp[next]=candidate;parent[next]=photoIndex}
  }
 }
 const result=new Array(n);let mask=size-1;
 for(let slotIndex=n-1;slotIndex>=0;slotIndex--){
  const photoIndex=parent[mask];
  if(photoIndex<0)throw Error('Could not match photos to slots');
  result[slotIndex]={photoId:photos[photoIndex].id,slot:slots[slotIndex]};
  mask^=1<<photoIndex;
 }
 return result;
}
export function generateAlbum(photos,settings,targetSheets=0){
  validateSettings(settings);
  if(!Array.isArray(photos))throw Error('Photos must be an array');
  if(!Number.isInteger(targetSheets)||targetSheets<0)throw Error('Invalid sheet target');
  if(!photos.length){if(targetSheets)throw Error('Cannot create sheets without photos');return [];}
  const ids=new Set();
  for(const photo of photos){if(!photo||typeof photo.id!=='string'||!photo.id||ids.has(photo.id))throw Error('Each photo needs a unique non-empty ID');ids.add(photo.id);}
  const maxCapacity=Math.max(...TEMPLATES.map(t=>t.capacity));
  const minSheets=Math.ceil(photos.length/maxCapacity);
  if(targetSheets&&(targetSheets<minSheets||targetSheets>photos.length))throw Error(`Cannot place ${photos.length} photos in exactly ${targetSheets} sheets (valid range: ${minSheets}–${photos.length})`);
  const total=targetSheets||Math.ceil(photos.length/8);
  const sheets=[];let cursor=0;
  for(let idx=0;idx<total;idx++){
    const remaining=photos.length-cursor,remainingSheets=total-idx;
    const count=Math.min(maxCapacity,Math.ceil(remaining/remainingSheets));
    const candidates=TEMPLATES.filter(t=>t.capacity>=count).sort((a,b)=>a.capacity-b.capacity||a.id.localeCompare(b.id));
    const template=candidates[idx%Math.min(3,candidates.length)];
    // Distribute exactly the available photos, not the template's maximum capacity.
    // This avoids blank cells when a sheet contains fewer photos than its template.
    const left=count===1?1:Math.max(1,Math.min(count-1,Math.round(count*template.left/template.capacity)));
    const style=idx%3===1?'hero':'grid';
    const slots=templateSlots(template,settings,{left,right:count-left},style);
    sheets.push({id:`sheet-${idx+1}`,templateId:template.id,items:matchPhotosToSlots(photos.slice(cursor,cursor+count),slots,settings)});
    cursor+=count;
  }
  return sheets;
}
