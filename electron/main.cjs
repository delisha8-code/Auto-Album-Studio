const {app,BrowserWindow,dialog,ipcMain,protocol}=require('electron');
const library=require('./project-library.cjs');
const path=require('node:path');const fs=require('node:fs/promises');const crypto=require('node:crypto');const sharp=require('sharp');
protocol.registerSchemesAsPrivileged([{scheme:'albumthumb',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
let win;
function createWindow(){win=new BrowserWindow({width:1450,height:950,minWidth:960,minHeight:650,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:false}});if(!app.isPackaged)win.loadURL('http://127.0.0.1:5173');else win.loadFile(path.join(__dirname,'../dist/index.html'));}
app.whenReady().then(()=>{protocol.registerFileProtocol('albumthumb',(request,callback)=>{const hash=new URL(request.url).hostname;if(!/^[a-f0-9]{64}$/.test(hash))return callback({error:-10});callback({path:path.join(app.getPath('userData'),'thumb-cache',hash+'.jpg')})});createWindow();app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow()})});app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()});
async function walk(dir){const out=[];for(const ent of await fs.readdir(dir,{withFileTypes:true})){const full=path.join(dir,ent.name);if(ent.isDirectory())out.push(...await walk(full));else if(ent.isFile()&&/\.(jpe?g|png|webp|tiff?)$/i.test(ent.name))out.push(full)}return out}
let activeImport=null;
ipcMain.handle('photos:cancel',()=>{if(!activeImport)return false;activeImport.cancelled=true;return true});
ipcMain.handle('photos:import',async(event)=>{
 if(activeImport)throw Error('An import is already running');
 const selected=await dialog.showOpenDialog(win,{properties:['openDirectory','multiSelections']});
 if(selected.canceled)return null;
 const job={cancelled:false};activeImport=job;
 const notify=(completed,total,stage)=>{if(!event.sender.isDestroyed())event.sender.send('photos:progress',{completed,total,stage})};
 try{
  const paths=[];const errors=[];
  async function walkFolder(dir){if(job.cancelled)return;let entries;try{entries=await fs.readdir(dir,{withFileTypes:true})}catch(e){errors.push({file:dir,message:e.message});return}
   for(const ent of entries){if(job.cancelled)return;const full=path.join(dir,ent.name);if(ent.isDirectory())await walkFolder(full);else if(ent.isFile()&&/\\.(jpe?g|png|webp|tiff?)$/i.test(ent.name))paths.push(full)}
  }
  notify(0,0,'Scanning folders');
  for(const folder of selected.filePaths){if(job.cancelled)break;await walkFolder(folder)}
  const unique=[...new Set(paths)],total=unique.length;
  const cache=path.join(app.getPath('userData'),'thumb-cache');await fs.mkdir(cache,{recursive:true});
  const photos=[];let completed=0;
  notify(0,total,'Creating thumbnails');
  for(const file of unique){
   if(job.cancelled)break;
   try{
    const stat=await fs.stat(file);
    const hash=crypto.createHash('sha256').update(file+'|'+stat.size+'|'+stat.mtimeMs).digest('hex');
    const thumbnail=path.join(cache,hash+'.jpg');
    try{await fs.access(thumbnail)}catch{await sharp(file,{failOn:'error'}).rotate().resize({width:600,height:600,fit:'inside',withoutEnlargement:true}).jpeg({quality:75}).toFile(thumbnail)}
    const meta=await sharp(file).metadata(),rotated=[5,6,7,8].includes(meta.orientation);
    const width=rotated?meta.height:meta.width,height=rotated?meta.width:meta.height;
    photos.push({id:hash,path:file,name:path.basename(file),width,height,orientation:width>height?'landscape':width<height?'portrait':'square',thumbnail:'albumthumb://'+hash});
   }catch(e){errors.push({file,message:e.message})}
   completed++;notify(completed,total,'Creating thumbnails');
  }
  notify(completed,total,job.cancelled?'Cancelled':'Complete');
  return {photos,errors,cancelled:job.cancelled,total,completed};
 }finally{activeImport=null}
});
ipcMain.handle('project:save',async(_e,project)=>{if(!project||project.schemaVersion!==1||!Array.isArray(project.photos)||!Array.isArray(project.sheets))throw new Error('Invalid project');const result=await dialog.showSaveDialog(win,{defaultPath:(project.name||'album')+'.aas.json',filters:[{name:'Auto Album Studio Project',extensions:['json']}]});if(result.canceled)return null;await fs.writeFile(result.filePath,JSON.stringify(project,null,2),'utf8');return result.filePath});
ipcMain.handle('project:open',async()=>{const result=await dialog.showOpenDialog(win,{properties:['openFile'],filters:[{name:'Auto Album Studio Project',extensions:['json']}]});if(result.canceled)return null;const project=JSON.parse(await fs.readFile(result.filePaths[0],'utf8'));if(project.schemaVersion!==1||!Array.isArray(project.photos)||!Array.isArray(project.sheets))throw new Error('Unsupported project file');const missingPhotos=[];for(const photo of project.photos){if(!photo||typeof photo.path!=='string'||!path.isAbsolute(photo.path)){missingPhotos.push({id:photo?.id||null,name:photo?.name||'Unknown',reason:'Invalid source path'});continue;}try{const stat=await fs.stat(photo.path);if(!stat.isFile())throw new Error('Not a file')}catch{missingPhotos.push({id:photo.id,name:photo.name||path.basename(photo.path),reason:'Source file not found'})}}return {project,missingPhotos};});

function validateDraft(project){if(!project||project.schemaVersion!==1||typeof project.name!=='string'||!project.settings||!Array.isArray(project.photos)||!Array.isArray(project.sheets))throw Error('Invalid recovery draft');return project}
function draftPath(){return path.join(app.getPath('userData'),'recovery','latest.aas.json')}
let draftQueue=Promise.resolve();
ipcMain.handle('draft:write',async(_event,project)=>{validateDraft(project);const serialized=JSON.stringify({...project,recoveredAt:new Date().toISOString()});if(Buffer.byteLength(serialized)>25*1024*1024)throw Error('Recovery draft exceeds 25 MB');const task=draftQueue.catch(()=>{}).then(async()=>{const dest=draftPath();await fs.mkdir(path.dirname(dest),{recursive:true});const temp=dest+'.tmp';await fs.writeFile(temp,serialized,'utf8');await fs.rename(temp,dest);return true});draftQueue=task;return task});
ipcMain.handle('draft:read',async()=>{await draftQueue.catch(()=>{});let raw;try{raw=await fs.readFile(draftPath(),'utf8')}catch(e){if(e.code==='ENOENT')return null;throw e}return validateDraft(JSON.parse(raw))});
ipcMain.handle('draft:clear',async()=>{await draftQueue.catch(()=>{});try{await fs.unlink(draftPath())}catch(e){if(e.code!=='ENOENT')throw e}return true});

ipcMain.handle('library:list',()=>library.listProjects(app.getPath('userData')));
ipcMain.handle('library:save',(_event,project,id)=>library.saveProject(app.getPath('userData'),project,id));
ipcMain.handle('library:load',async(_event,id)=>{const project=await library.loadProject(app.getPath('userData'),id);const missingPhotos=[];for(const photo of project.photos){try{if(!photo||typeof photo.path!=='string'||!path.isAbsolute(photo.path))throw Error('Invalid source path');const stat=await fs.stat(photo.path);if(!stat.isFile())throw Error('Not a file')}catch{missingPhotos.push({id:photo?.id||null,name:photo?.name||'Unknown'})}}return {project,missingPhotos}});
