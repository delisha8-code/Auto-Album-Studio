const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('studio',{
 importPhotos:()=>ipcRenderer.invoke('photos:import'),
 exportJpg:(project)=>ipcRenderer.invoke('export:jpg',project),
 onExportProgress:(callback)=>{const handler=(_event,progress)=>callback(progress);ipcRenderer.on('export:progress',handler);return ()=>ipcRenderer.removeListener('export:progress',handler)},
 cancelImport:()=>ipcRenderer.invoke('photos:cancel'),
 onImportProgress:(callback)=>{const handler=(_event,progress)=>callback(progress);ipcRenderer.on('photos:progress',handler);return ()=>ipcRenderer.removeListener('photos:progress',handler)},
 saveProject:(data)=>ipcRenderer.invoke('project:save',data),
 openProject:()=>ipcRenderer.invoke('project:open'),
 saveDraft:(data)=>ipcRenderer.invoke('draft:write',data),
 readDraft:()=>ipcRenderer.invoke('draft:read'),
 clearDraft:()=>ipcRenderer.invoke('draft:clear'),
 listAlbums:()=>ipcRenderer.invoke('library:list'),
 saveAlbum:(project,id)=>ipcRenderer.invoke('library:save',project,id),
 loadAlbum:(id)=>ipcRenderer.invoke('library:load',id)
});
