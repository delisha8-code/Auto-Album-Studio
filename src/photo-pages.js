export const PHOTO_PAGE_SIZE=90;
export function photoPage(photos,page,pageSize=PHOTO_PAGE_SIZE){
 if(!Array.isArray(photos))throw Error('Photos must be an array');
 if(!Number.isInteger(pageSize)||pageSize<1)throw Error('Invalid page size');
 const totalPages=Math.max(1,Math.ceil(photos.length/pageSize));
 const current=Math.min(totalPages,Math.max(1,Number.isInteger(page)?page:1));
 const start=(current-1)*pageSize;
 return {photos:photos.slice(start,start+pageSize),page:current,totalPages,total:photos.length,start:photos.length?start+1:0,end:Math.min(photos.length,start+pageSize)};
}
