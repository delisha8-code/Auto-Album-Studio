export function cropFor(item){
 const crop=item?.crop||{};
 return {zoom:Number.isFinite(crop.zoom)?Math.max(1,Math.min(3,crop.zoom)):1,x:Number.isFinite(crop.x)?Math.max(0,Math.min(100,crop.x)):50,y:Number.isFinite(crop.y)?Math.max(0,Math.min(100,crop.y)):50,fit:crop.fit==='contain'?'contain':'cover',rotation:[0,90,180,270].includes(crop.rotation)?crop.rotation:0,flipH:crop.flipH===true,flipV:crop.flipV===true};
}
export function updateCrop(sheets,sheetIndex,itemIndex,patch){
 const item=sheets?.[sheetIndex]?.items?.[itemIndex];
 if(!item)throw Error('Invalid photo slot');
 const previous=cropFor(item),next=cropFor({crop:{...previous,...patch}});
 if(Object.keys(next).every(k=>next[k]===previous[k]))return sheets;
 return sheets.map((sheet,si)=>si!==sheetIndex?sheet:{...sheet,items:sheet.items.map((entry,ii)=>ii!==itemIndex?entry:{...entry,crop:next})});
}
export function cropImageStyle(item){
 const {zoom,x,y,rotation,flipH,flipV}=cropFor(item);
 return {objectFit:cropFor(item).fit,objectPosition:`${x}% ${y}%`,transform:`rotate(${rotation}deg) scale(${flipH?-zoom:zoom}, ${flipV?-zoom:zoom})`,transformOrigin:`${x}% ${y}%`};
}
