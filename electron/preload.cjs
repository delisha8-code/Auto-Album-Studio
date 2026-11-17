const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('studio',{
 importPhotos:()=>ipcRenderer.invoke('photos:import'),
 saveProject:(data)=>ipcRenderer.invoke('project:save',data),
 openProject:()=>ipcRenderer.invoke('project:open'),
 saveDraft:(data)=>ipcRenderer.invoke('draft:write',data),
 readDraft:()=>ipcRenderer.invoke('draft:read'),
 clearDraft:()=>ipcRenderer.invoke('draft:clear')
});
