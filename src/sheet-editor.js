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
