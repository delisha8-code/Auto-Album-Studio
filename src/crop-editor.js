export function cropFor(item){
 const crop=item?.crop||{};
 return {zoom:Number.isFinite(crop.zoom)?Math.max(1,Math.min(3,crop.zoom)):1,x:Number.isFinite(crop.x)?Math.max(0,Math.min(100,crop.x)):50,y:Number.isFinite(crop.y)?Math.max(0,Math.min(100,crop.y)):50};
}
export function updateCrop(sheets,sheetIndex,itemIndex,patch){
 const item=sheets?.[sheetIndex]?.items?.[itemIndex];
 if(!item)throw Error('Invalid photo slot');
 const previous=cropFor(item),next=cropFor({crop:{...previous,...patch}});
 if(Object.keys(next).every(k=>next[k]===previous[k]))return sheets;
 return sheets.map((sheet,si)=>si!==sheetIndex?sheet:{...sheet,items:sheet.items.map((entry,ii)=>ii!==itemIndex?entry:{...entry,crop:next})});
}
export function cropImageStyle(item){
 const {zoom,x,y}=cropFor(item);
 return {objectFit:'cover',objectPosition:`${x}% ${y}%`,transform:`scale(${zoom})`,transformOrigin:`${x}% ${y}%`};
}
