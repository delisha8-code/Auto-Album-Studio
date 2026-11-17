export const HISTORY_LIMIT=40;
export function createHistory(present=[]){return {past:[],present,future:[]}}
export function editHistory(history,next){
 if(next===history.present)return history;
 return {past:[...history.past,history.present].slice(-HISTORY_LIMIT),present:next,future:[]};
}
export function undoHistory(history){
 if(!history.past.length)return history;
 return {past:history.past.slice(0,-1),present:history.past.at(-1),future:[history.present,...history.future]};
}
export function redoHistory(history){
 if(!history.future.length)return history;
 return {past:[...history.past,history.present].slice(-HISTORY_LIMIT),present:history.future[0],future:history.future.slice(1)};
}
