(function(root){
'use strict';
function sha256(bytes){
 const k=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
 const n=Math.ceil((bytes.length+9)/64)*64,p=new Uint8Array(n);p.set(bytes);p[bytes.length]=128;const v=new DataView(p.buffer);v.setUint32(n-8,Math.floor(bytes.length/0x20000000));v.setUint32(n-4,(bytes.length*8)>>>0);
 const h=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19],w=new Uint32Array(64),r=(x,n)=>(x>>>n)|(x<<(32-n));
 for(let block=0;block<n;block+=64){for(let i=0;i<16;i++)w[i]=v.getUint32(block+i*4);for(let i=16;i<64;i++){const a=w[i-15],b=w[i-2];w[i]=(w[i-16]+(r(a,7)^r(a,18)^(a>>>3))+w[i-7]+(r(b,17)^r(b,19)^(b>>>10)))>>>0;}let [a,b,c,d,e,f,g,j]=h;for(let i=0;i<64;i++){const t1=(j+(r(e,6)^r(e,11)^r(e,25))+((e&f)^(~e&g))+k[i]+w[i])>>>0,t2=((r(a,2)^r(a,13)^r(a,22))+((a&b)^(a&c)^(b&c)))>>>0;j=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;}[a,b,c,d,e,f,g,j].forEach((x,i)=>h[i]=(h[i]+x)>>>0);}
 return h.map(x=>x.toString(16).padStart(8,'0')).join('');
}
class FolderImporter {
 constructor(store,onChange){this.store=store;this.onChange=onChange;this.folder=null;this.status='No watched folder selected';this.busy=false;this.observations=new Map();this.attempted=new Set();this.pending=0;}
 async restore(){this.folder=await this.store.handle();if(this.folder){this.status='Folder saved · reconnect if permission is needed';await this.scan();}}
 async choose(){if(!root.showDirectoryPicker)throw new Error('Automatic folder watching is not available in this browser. Use Import JSON Files, or open this app in a browser that supports folder access.');const handle=await root.showDirectoryPicker({id:'english-training-inbox',mode:'read'});await this.store.handle(handle);await this.store.transact(s=>{s.settings.folderName=handle.name;});this.folder=handle;this.observations.clear();this.attempted.clear();await this.scan();}
 async reconnect(){if(!this.folder)return this.choose();const p=await this.folder.requestPermission({mode:'read'});if(p!=='granted')throw new Error('Read access was not granted. Choose the folder again or import completed JSON files manually.');this.attempted.clear();await this.scan();}
 async processFile(file,path=file.name){
  let hash=`size:${file.size}`,failure=null,content=null,existingID=null;
  if(!/\.json$/i.test(file.name))throw new Error('Only .json files are accepted.');
  try{
   if(file.size>TrainingCore.MAX_BYTES)throw new Error('File exceeds 1 MiB. Use one entry per file.');
   const data=new Uint8Array(await file.arrayBuffer());if(data.byteLength>TrainingCore.MAX_BYTES)throw new Error('File exceeds 1 MiB.');
   hash=sha256(data);const key=path+':'+hash;if(this.attempted.has(key))return {skipped:true};
   let text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(data);}catch{throw new Error('File must use valid UTF-8 encoding.');}
   content=TrainingCore.parseJSON(text,data.byteLength);
  }catch(e){failure=e;}
  const result=await this.store.transact(s=>{
   if(s.imports.some(r=>r.hash===hash&&r.status==='success'))return {skipped:true};
   if(!failure){try{return {word:TrainingCore.importContent(s,content,path,hash)};}catch(e){failure=e;existingID=e.existingID||null;}}
   TrainingCore.recordImport(s,path,hash,'failed',failure.message,existingID);return {error:failure.message};
  });
  this.attempted.add(path+':'+hash);this.onChange?.(result.state);return result.result;
 }
 async manual(files){let success=0,failed=0,skipped=0;for(const file of files){if(!/\.json$/i.test(file.name)){failed++;continue;}for(const key of this.attempted)if(key.startsWith(file.name+':'))this.attempted.delete(key);const result=await this.processFile(file);if(result.error)failed++;else if(result.word)success++;else skipped++;}return {success,failed,skipped};}
 async scan(now=Date.now()){
  if(this.busy||!this.folder)return;this.busy=true;let changed=false;
  try{
   if(await this.folder.queryPermission({mode:'read'})!=='granted'){this.status='Read permission needed · click Reconnect Folder';return;}
   this.pending=0;const seen=new Set();
   for await(const [name,handle] of this.folder.entries()){
    if(handle.kind!=='file'||name.startsWith('.')||!/\.json$/i.test(name))continue;seen.add(name);
    const file=await handle.getFile(),signature=`${file.size}:${file.lastModified}`,prior=this.observations.get(name);
    if(!prior||prior.signature!==signature){this.observations.set(name,{signature,since:now,count:1});this.pending++;continue;}
    prior.count++;if(prior.count<3||now-prior.since<4000){this.pending++;continue;}
    // A second metadata check catches replacement during file acquisition. Producers use atomic handoff.
    const check=await handle.getFile();if(check.size!==file.size||check.lastModified!==file.lastModified){this.observations.delete(name);this.pending++;continue;}
    await this.processFile(file,`${this.folder.name}/${name}`);changed=true;
   }
   for(const key of this.observations.keys())if(!seen.has(key))this.observations.delete(key);
   this.status=`Watching ${this.folder.name}${this.pending?` · ${this.pending} file(s) settling`:' · up to date'}`;
  }catch(e){this.status=`Folder unavailable: ${e.message}. Reconnect the folder or finish synchronization.`;try{await this.store.transact(s=>TrainingCore.recordImport(s,this.folder.name,'folder-access','failed',this.status));changed=true;}catch{} }
  finally{this.busy=false;this.onChange?.(null,changed);}
 }
}
root.TrainingSHA256=sha256;root.TrainingImporter=FolderImporter;
})(globalThis);
