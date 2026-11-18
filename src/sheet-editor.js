import {TEMPLATES,templateSlots,matchPhotosToSlots,generateAlbum} from './layout.js';
export function toggleSheetLock(sheets,index){if(!Array.isArray(sheets)||!sheets[index])throw Error('Invalid sheet');return sheets.map((s,i)=>i===index?{...s,locked:!s.locked}:s)}
export function swapSheetPhotos(sheets,sourceSheet,sourceIndex,targetSheet,targetIndex){
 if(!Array.isArray(sheets))throw Error('Invalid sheets');
 const a=sheets[sourceSheet]?.items?.[sourceIndex],b=sheets[targetSheet]?.items?.[targetIndex];
 if(!a||!b)throw Error('Invalid photo slot');
 if(sourceSheet===targetSheet&&sourceIndex===targetIndex)return sheets;
 if(sheets[sourceSheet].locked||sheets[targetSheet].locked)throw Error('Unlock the sheet before changing photos');
 return sheets.map((sheet,si)=>{
  if(si!==sourceSheet&&si!==targetSheet)return sheet;
  return {...sheet,items:sheet.items.map((item,ii)=>{
   if(si===sourceSheet&&ii===sourceIndex)return {...item,photoId:b.photoId};
   if(si===targetSheet&&ii===targetIndex)return {...item,photoId:a.photoId};
   return item;
  })};
 });
}
export function replaceSheetPhoto(sheets,photos,sheetIndex,itemIndex,photoId){
 if(!Array.isArray(sheets)||!Array.isArray(photos))throw Error('Invalid album');
 if(!photos.some(p=>p.id===photoId))throw Error('Photo not found');
 const target=sheets[sheetIndex]?.items?.[itemIndex];
 if(sheets[sheetIndex]?.locked)throw Error('Unlock the sheet before changing photos');
 if(!target)throw Error('Invalid photo slot');
 let existing=null;
 for(let si=0;si<sheets.length;si++)for(let ii=0;ii<sheets[si].items.length;ii++)
  if(sheets[si].items[ii].photoId===photoId)existing=[si,ii];
 if(existing)return swapSheetPhotos(sheets,existing[0],existing[1],sheetIndex,itemIndex);
 return sheets.map((sheet,si)=>si!==sheetIndex?sheet:{...sheet,items:sheet.items.map((item,ii)=>ii===itemIndex?{...item,photoId}:item)});
}


/** Reflow a selected spread without erasing later manual layout choices. */
function reflow(sheets,photos,settings,sheetIndex,mode,left=0,right=0){
 if(!Array.isArray(sheets)||!Array.isArray(photos)||!Number.isInteger(sheetIndex)||sheetIndex<0||sheetIndex>=sheets.length)throw Error('Invalid sheet');
 if(sheets[sheetIndex].locked)throw Error('Unlock the sheet before changing its grid');
 if(mode==='manual'&&(!Number.isInteger(left)||!Number.isInteger(right)||left<1||right<1||left>10||right>10))throw Error('Each page requires 1–10 photos');
 const boundary=sheets.findIndex((s,i)=>i>sheetIndex&&s.locked);
 const end=boundary<0?sheets.length:boundary;
 const suffix=sheets.slice(end);
 const prefix=sheets.slice(0,sheetIndex);
 const ids=new Set(prefix.flatMap(s=>s.items.map(i=>i.photoId)));
 const map=new Map(photos.map(p=>[p.id,p]));
 const pool=[...new Set(sheets.slice(sheetIndex,end).flatMap(s=>s.items.map(i=>i.photoId)))].filter(id=>!ids.has(id)).map(id=>map.get(id)).filter(Boolean);
 if(!pool.length)throw Error('No remaining photographs');
 let cursor=0;const result=[...prefix];
 for(let i=sheetIndex;i<end&&cursor<pool.length;i++){
  const old=sheets[i],requested=i===sheetIndex?mode:(old.layoutMode||'auto');
  let nLeft,nRight,template,style='grid';
  if(requested==='manual'){
   if(i===sheetIndex){nLeft=left;nRight=right}
   else {
    const parts=/^manual-(\d+)-(\d+)$/.exec(old.templateId||'');
    if(!parts){nLeft=old.leftCount;nRight=old.rightCount}
    else{nLeft=Number(parts[1]);nRight=Number(parts[2])}
   }
   if(!Number.isInteger(nLeft)||!Number.isInteger(nRight)||nLeft<1||nRight<1||nLeft>10||nRight>10)throw Error('Invalid saved manual grid');
   if(cursor+nLeft+nRight>pool.length){
    if(i===sheetIndex)throw Error('Not enough remaining photographs for this grid');
    throw Error('Not enough photos to preserve manual grid on sheet '+(i+1));
   }
   template={id:'manual-'+nLeft+'-'+nRight,left:nLeft,right:nRight};
  }else{
   const remaining=pool.length-cursor;
   const laterManual=sheets.slice(i+1,end).filter(s=>s.layoutMode==='manual').reduce((sum,s)=>{
    const m=/^manual-(\d+)-(\d+)$/.exec(s.templateId||'');
    return sum+(m?Number(m[1])+Number(m[2]):s.items.length);
   },0);
   const available=remaining-laterManual;
   if(available<1)continue;
   const count=Math.min(8,available);
   template=TEMPLATES.filter(t=>t.capacity>=count).sort((a,b)=>a.capacity-b.capacity)[0];
   nLeft=count===1?1:Math.max(1,Math.min(count-1,Math.round(count*template.left/template.capacity)));
   nRight=count-nLeft;
  }
  const count=nLeft+nRight,slots=templateSlots(template,settings,{left:nLeft,right:nRight},style);
  result.push({...old,id:'sheet-'+(result.length+1),layoutMode:requested,templateId:template.id,leftCount:nLeft,rightCount:nRight,items:matchPhotosToSlots(pool.slice(cursor,cursor+count),slots,settings)});
  cursor+=count;
 }
 if(cursor<pool.length){
  const next=generateAlbum(pool.slice(cursor),settings);
  result.push(...next.map(s=>({...s,id:'sheet-'+(result.length+1),layoutMode:'auto'})));
 }
 result.push(...suffix);
 const all=result.flatMap(s=>s.items.map(i=>i.photoId));
 if(all.length!==new Set(all).size||all.length!==ids.size+pool.length+suffix.reduce((n,s)=>n+s.items.length,0))throw Error('Reflow photo integrity check failed');
 return result;
}
export function reflowFromSheet(sheets,photos,settings,sheetIndex,left,right){return reflow(sheets,photos,settings,sheetIndex,'manual',left,right)}
export function autoReflowFromSheet(sheets,photos,settings,sheetIndex){return reflow(sheets,photos,settings,sheetIndex,'auto')}
