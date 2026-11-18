import {TEMPLATES,templateSlots,matchPhotosToSlots,generateAlbum} from './layout.js';
export function swapSheetPhotos(sheets,sourceSheet,sourceIndex,targetSheet,targetIndex){
 if(!Array.isArray(sheets))throw Error('Invalid sheets');
 const a=sheets[sourceSheet]?.items?.[sourceIndex],b=sheets[targetSheet]?.items?.[targetIndex];
 if(!a||!b)throw Error('Invalid photo slot');
 if(sourceSheet===targetSheet&&sourceIndex===targetIndex)return sheets;
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
 if(!target)throw Error('Invalid photo slot');
 let existing=null;
 for(let si=0;si<sheets.length;si++)for(let ii=0;ii<sheets[si].items.length;ii++)
  if(sheets[si].items[ii].photoId===photoId)existing=[si,ii];
 if(existing)return swapSheetPhotos(sheets,existing[0],existing[1],sheetIndex,itemIndex);
 return sheets.map((sheet,si)=>si!==sheetIndex?sheet:{...sheet,items:sheet.items.map((item,ii)=>ii===itemIndex?{...item,photoId}:item)});
}

/**
 * Change one spread's left/right photo counts and reflow every following sheet.
 * Previous sheets remain untouched; no photo is duplicated or silently discarded.
 */
export function reflowFromSheet(sheets,photos,settings,sheetIndex,left,right){
 if(!Array.isArray(sheets)||!Array.isArray(photos)||!Number.isInteger(sheetIndex)||sheetIndex<0||sheetIndex>=sheets.length)throw Error('Invalid sheet');
 if(!Number.isInteger(left)||!Number.isInteger(right)||left<1||right<1||left>10||right>10)throw Error('Each page requires 1–10 photos');
 const prefix=sheets.slice(0,sheetIndex);
 const used=new Set(prefix.flatMap(s=>s.items.map(i=>i.photoId)));
 const pool=sheets.slice(sheetIndex).flatMap(s=>s.items.map(i=>photos.find(p=>p.id===i.photoId))).filter(p=>p&&!used.has(p.id));
 const unique=[...new Map(pool.map(p=>[p.id,p])).values()];
 const count=left+right;
 if(unique.length<count)throw Error('Not enough remaining photographs for this grid');
 const template={left,right,capacity:count,id:'manual-'+left+'-'+right};
 const slots=templateSlots(template,settings,{left,right});
 const current={...sheets[sheetIndex],layoutMode:'manual',templateId:template.id,items:matchPhotosToSlots(unique.slice(0,count),slots,settings)};
 const rest=unique.slice(count);
 const next=rest.length?generateAlbum(rest,settings):[];
 const usedIds=new Set([...prefix,current,...next].flatMap(s=>s.items.map(i=>i.photoId)));
 if(usedIds.size!==new Set([...prefix.flatMap(s=>s.items.map(i=>i.photoId)),...unique.map(p=>p.id)]).size)throw Error('Reflow lost photographs');
 return [...prefix,current,...next.map((s,i)=>({...s,id:'sheet-'+(sheetIndex+i+2)}))];
}

/** Rebuild only the selected spread automatically; earlier spreads remain fixed. */
export function autoReflowFromSheet(sheets,photos,settings,sheetIndex){
 if(!Array.isArray(sheets)||!Array.isArray(photos)||!Number.isInteger(sheetIndex)||sheetIndex<0||sheetIndex>=sheets.length)throw Error('Invalid sheet');
 const prefix=sheets.slice(0,sheetIndex);
 const used=new Set(prefix.flatMap(s=>s.items.map(i=>i.photoId)));
 const photoMap=new Map(photos.map(p=>[p.id,p]));
 const pool=[...new Set(sheets.slice(sheetIndex).flatMap(s=>s.items.map(i=>i.photoId)))].filter(id=>!used.has(id)).map(id=>photoMap.get(id)).filter(Boolean);
 if(!pool.length)throw Error('No remaining photographs');
 const count=Math.min(8,pool.length);
 const template=TEMPLATES.filter(t=>t.capacity>=count).sort((a,b)=>a.capacity-b.capacity)[0];
 const left=count===1?1:Math.max(1,Math.min(count-1,Math.round(count*template.left/template.capacity)));
 const slots=templateSlots(template,settings,{left,right:count-left});
 const current={...sheets[sheetIndex],layoutMode:'auto',templateId:template.id,items:matchPhotosToSlots(pool.slice(0,count),slots,settings)};
 const next=pool.length>count?generateAlbum(pool.slice(count),settings):[];
 return [...prefix,current,...next.map((s,i)=>({...s,layoutMode:'auto',id:'sheet-'+(sheetIndex+i+2)}))];
}
