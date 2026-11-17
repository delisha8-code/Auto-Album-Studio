const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
function validateProject(p){if(!p||p.schemaVersion!==1||typeof p.name!=='string'||!p.name.trim()||!p.settings||!Array.isArray(p.photos)||!Array.isArray(p.sheets))throw Error('Invalid album project');return p}
function validId(id){if(typeof id!=='string'||!/^[a-f0-9-]{36}$/.test(id))throw Error('Invalid project ID');return id}
function filePath(root,id){return path.join(root,'album-library',validId(id)+'.aas.json')}
async function saveProject(root,project,id=null){
 validateProject(project);const projectId=id?validId(id):crypto.randomUUID(),dest=filePath(root,projectId);let createdAt=new Date().toISOString();
 if(id){try{createdAt=JSON.parse(await fs.readFile(dest,'utf8')).createdAt||createdAt}catch(e){if(e.code==='ENOENT')throw Error('Project does not exist');throw e}}
 const record={id:projectId,createdAt,updatedAt:new Date().toISOString(),project};await fs.mkdir(path.dirname(dest),{recursive:true});
 const temp=dest+'.'+crypto.randomUUID()+'.tmp';try{await fs.writeFile(temp,JSON.stringify(record),{encoding:'utf8',flag:'wx'});await fs.rename(temp,dest)}finally{await fs.rm(temp,{force:true}).catch(()=>{})}
 return {id:projectId,name:project.name,createdAt,updatedAt:record.updatedAt,photoCount:project.photos.length,sheetCount:project.sheets.length};
}
async function listProjects(root){
 let names;const dir=path.join(root,'album-library');try{names=await fs.readdir(dir)}catch(e){if(e.code==='ENOENT')return [];throw e}
 const records=[];for(const name of names.filter(n=>/^[a-f0-9-]{36}\.aas\.json$/.test(n))){try{const record=JSON.parse(await fs.readFile(path.join(dir,name),'utf8'));validateProject(record.project);records.push({id:record.id,name:record.project.name,createdAt:record.createdAt,updatedAt:record.updatedAt,photoCount:record.project.photos.length,sheetCount:record.project.sheets.length})}catch{}}
 return records.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
}
async function loadProject(root,id){const record=JSON.parse(await fs.readFile(filePath(root,id),'utf8'));return validateProject(record.project)}
module.exports={saveProject,listProjects,loadProject,validateProject};
