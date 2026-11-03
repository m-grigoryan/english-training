/* Private GitHub storage. Credentials stay in this browser tab, never in synced data. */
(function(root){
'use strict';
const C=root.TrainingCore,FORMAT='english-training-github-sync',FILE='.english-training/progress.json',LIMIT=900000;
const copy=C.clone,stable=x=>JSON.stringify(x),assert=(x,m)=>{if(!x)throw Error(m)};
function pack(text){const bytes=encodeURIComponent(text).replace(/%([0-9A-F]{2})/g,(_,h)=>String.fromCharCode(parseInt(h,16)));let out='',abc='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';for(let i=0;i<bytes.length;i+=3){const a=bytes.charCodeAt(i),b=bytes.charCodeAt(i+1),c=bytes.charCodeAt(i+2),n=(a<<16)|((b||0)<<8)|(c||0);out+=abc[n>>>18]+abc[(n>>>12)&63]+(i+1<bytes.length?abc[(n>>>6)&63]:'=')+(i+2<bytes.length?abc[n&63]:'=')}return out}
function unpack(value){const s=value.replace(/\s/g,''),abc='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';assert(s.length%4===0&&/^[A-Za-z0-9+/]*={0,2}$/.test(s),'Invalid GitHub file encoding.');let out='';for(let i=0;i<s.length;i+=4){const n=(abc.indexOf(s[i])<<18)|(abc.indexOf(s[i+1])<<12)|((s[i+2]==='='?0:abc.indexOf(s[i+2]))<<6)|(s[i+3]==='='?0:abc.indexOf(s[i+3]));out+='%'+((n>>>16)&255).toString(16).padStart(2,'0');if(s[i+2]!=='=')out+='%'+((n>>>8)&255).toString(16).padStart(2,'0');if(s[i+3]!=='=')out+='%'+(n&255).toString(16).padStart(2,'0')}return decodeURIComponent(out)}
function validate(s){
 C.validateState(s);assert(Number.isSafeInteger(s.revision)&&s.revision>=0&&s.words.length<=10000&&s.sessions.length<=10000&&Array.isArray(s.imports)&&s.settings&&typeof s.settings==='object','Unsupported learning data.');
 const ids=new Set();for(const w of s.words){assert(w&&typeof w.id==='string'&&!ids.has(w.id)&&w.content&&typeof w.content.english_term==='string'&&Array.isArray(w.content.russian_translations)&&Array.isArray(w.content.examples)&&w.content.examples.every(e=>e&&typeof e.en==='string'&&typeof e.ru==='string')&&w.content.russian_translations.every(t=>typeof t==='string')&&typeof w.content.explanation_en==='string'&&typeof w.content.explanation_ru==='string'&&['draft','ready'].includes(w.status)&&Number.isFinite(w.updatedAt)&&Number.isFinite(w.createdAt)&&(w.deletedAt===null||Number.isFinite(w.deletedAt)),'Invalid synced word.');ids.add(w.id);if(w.status==='ready')C.validate(w.content)}
 const quizzes=new Set();for(const q of s.sessions){assert(typeof q.id==='string'&&!quizzes.has(q.id)&&['enRu','ruEn'].includes(q.direction)&&['in_progress','completed'].includes(q.status)&&Number.isFinite(q.startedAt)&&Number.isInteger(q.currentIndex)&&q.currentIndex>=0&&q.currentIndex<q.questions.length&&q.answers.length<=q.questions.length,'Invalid synced quiz.');quizzes.add(q.id);for(const a of q.answers){const question=q.questions.find(x=>x.id===a.questionID);assert(question&&['correct','incorrect','unknown'].includes(a.outcome)&&Number.isFinite(a.submittedAt)&&a.outcome===(a.selectedID===null?'unknown':a.selectedID===question.correctID?'correct':'incorrect')&&(a.selectedID===null||question.choices.some(x=>x.id===a.selectedID)),'Invalid synced response.')}assert(q.status!=='completed'||(q.answers.length===q.questions.length&&Number.isFinite(q.completedAt)),'Incomplete synced result.')}
 return s;
}
function merge(local,remote){
 validate(local);if(!remote)return copy(local);validate(remote);
 const out=C.initial(),all=[...local.words,...remote.words].map(copy),parent=new Map(),byTerm=new Map();
 const find=id=>{if(!parent.has(id))parent.set(id,id);if(parent.get(id)!==id)parent.set(id,find(parent.get(id)));return parent.get(id)};
 const union=(a,b)=>{a=find(a);b=find(b);if(a!==b)parent.set(a<b?b:a,a<b?a:b)};
 for(const w of all){find(w.id);const term=C.norm(w.content.english_term);if(term){if(byTerm.has(term))union(w.id,byTerm.get(term));else byTerm.set(term,w.id)}}
 const aliases=new Map(),groups=new Map();for(const w of all){const id=find(w.id);aliases.set(w.id,id);if(!groups.has(id))groups.set(id,[]);groups.get(id).push(w)}
 const conflicts=new Map();for(const x of [...(local.syncConflicts||[]),...(remote.syncConflicts||[])]){assert(x&&typeof x.key==='string'&&x.word,'Invalid saved conflict.');conflicts.set(x.key,copy(x))}
 for(const [id,versions] of groups){versions.sort((a,b)=>a.updatedAt-b.updatedAt||Number(!!a.deletedAt)-Number(!!b.deletedAt)||stable(a).localeCompare(stable(b)));const winner=copy(versions.at(-1));winner.id=id;winner.createdAt=Math.min(...versions.map(w=>w.createdAt));out.words.push(winner);for(const w of versions){if(stable(w.content)!==stable(winner.content)){const key=stable([w.id,w.updatedAt,w.content]);conflicts.set(key,{key,word:copy(w)})}}}
 out.syncConflicts=[...conflicts.values()].sort((a,b)=>a.key.localeCompare(b.key));
 out.words.sort((a,b)=>a.id.localeCompare(b.id));
 for(const w of out.words){const sense=C.resolve(w.content,root.TRAINING_DICTIONARY||[]);if(sense)aliases.set('dictionary:'+sense.id,w.id)}
 const sessions=new Map();
 for(const original of [...local.sessions,...remote.sessions]){
  const q=copy(original);q.questions.forEach(x=>x.wordID=aliases.get(x.wordID)||x.wordID);const old=sessions.get(q.id);
  if(!old){sessions.set(q.id,q);continue}
  assert(stable(old.questions)===stable(q.questions)&&old.direction===q.direction&&old.kind===q.kind,'A quiz has incompatible versions. Your local data is unchanged; use separate quiz sessions on each device.');
  const responses=new Map(old.answers.map(a=>[a.questionID,a]));for(const a of q.answers){const prev=responses.get(a.questionID);assert(!prev||prev.selectedID===a.selectedID,'The same quiz was answered differently on two devices. Your local data is unchanged. Finish quizzes on one device before switching.');if(!prev||a.submittedAt<prev.submittedAt)responses.set(a.questionID,a)}
  old.answers=old.questions.map(x=>responses.get(x.id)).filter(Boolean);old.currentIndex=Math.max(old.currentIndex,q.currentIndex);if(old.kind==='quick_match'){old.currentIndex=Math.min(old.answers.length,old.questions.length-1);old.deadline=old.answers.length===old.questions.length?null:Math.max(old.deadline||0,q.deadline||0)}old.score=old.answers.filter(a=>a.outcome==='correct').length;
  if(old.answers.length===old.questions.length){old.status='completed';if(old.kind==='quick_match')old.deadline=null;old.completedAt=Math.max(...old.answers.map(a=>a.submittedAt))}else{old.status='in_progress';old.completedAt=null}
 }
 out.sessions=[...sessions.values()].sort((a,b)=>a.startedAt-b.startedAt||a.id.localeCompare(b.id));
 // Rebuild schedules from unique completed sessions, so repeated sync never double-counts learning.
 for(const w of out.words)for(const d of ['enRu','ruEn'])out.learning[w.id+':'+d]=C.initialLearning();
 for(const q of out.sessions.filter(q=>q.status==='completed').sort((a,b)=>a.completedAt-b.completedAt||a.id.localeCompare(b.id))){
  q.score=q.answers.filter(a=>a.outcome==='correct').length;
  for(const id of new Set(q.questions.map(x=>x.wordID))){const key=id+':'+q.direction,questionIDs=new Set(q.questions.filter(x=>x.wordID===id).map(x=>x.id)),outcomes=q.answers.filter(a=>questionIDs.has(a.questionID)).map(a=>a.outcome);out.learning[key]=C.schedule(out.learning[key]||C.initialLearning(),outcomes,q.completedAt);out.scheduling[q.id+':'+id+':'+q.direction]={sessionID:q.id,wordID:id,direction:q.direction,appliedAt:q.completedAt}}
 }
 const imports=new Map();for(const r of [...remote.imports,...local.imports]){const x=copy(r);if(x.wordID)x.wordID=aliases.get(x.wordID)||x.wordID;const old=imports.get(x.id);if(!old||x.date>old.date)imports.set(x.id,x)}out.imports=[...imports.values()].sort((a,b)=>a.date-b.date||a.id.localeCompare(b.id));
 out.settings=copy(local.settings);out.revision=Math.max(local.revision,remote.revision);
 return validate(out);
}
function portable(s){const out=merge(validate(s),C.initial());out.settings={folderName:''};out.imports=[];out.revision=0;return out}
class GitHubSync {
 constructor(store,{fetch:request=root.fetch.bind(root),onStatus=()=>{},onData=()=>{}}={}){
  this.store=store;this.request=request;this.onStatus=onStatus;this.onData=onData;this.token='';this.repo='m-grigoryan/english-training';this.branch='';this.epoch=0;this.pending=false;this.running=null;this.timer=null;this.lastError='';this.status='Not connected. Words are saved on this device.';
  this.localTransact=store.transact.bind(store);store.transact=async fn=>{const result=await this.localTransact(fn);this.schedule();return result};
 }
 say(text){this.status=text;this.onStatus(text)}
 schedule(){if(!this.token)return;this.pending=true;if(this.timer)root.clearTimeout(this.timer);this.timer=root.setTimeout(()=>{this.timer=null;this.sync().catch(()=>{})},1800)}
 async api(path,options={}){
  const controller=new root.AbortController(),timer=root.setTimeout(()=>controller.abort(),20000);
  try{const response=await this.request('https://api.github.com/repos/'+this.repo+path,{...options,headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+this.token,'X-GitHub-Api-Version':'2022-11-28',...(options.body?{'Content-Type':'application/json'}:{})},signal:controller.signal,cache:'no-store',redirect:'error'});
   if(response.status===401)throw Error('GitHub connection expired. Connect again with a valid token.');
   if(response.status===403)throw Error('GitHub denied access or paused requests. Check this repository’s Contents read/write permission and retry later.');
   return response;
  }catch(e){if(e.name==='AbortError')throw Error('GitHub did not respond. Your changes are still saved on this device.');throw e}finally{root.clearTimeout(timer)}
 }
 async privateRepository(){const r=await this.api('');assert(r.ok,'Could not open the GitHub repository. Check your token’s repository selection.');const metadata=await r.json();assert(metadata.private===true,'Sync stopped: the storage repository must be private. No data was uploaded.');assert(metadata.permissions?.push!==false,'This connection cannot save to the repository.');return metadata}
 async connect(token){
  assert(/^github_pat_[A-Za-z0-9_]{20,}$/.test(token),'Enter a fine-grained GitHub token that can read and write Contents in this private repository.');
  assert(!this.running,'A sync is already running. Wait before reconnecting.');this.epoch++;this.token=token;this.say('Connecting to your private GitHub repository…');
  try{const metadata=await this.privateRepository();this.branch=metadata.default_branch;assert(typeof this.branch==='string'&&this.branch.length,'GitHub returned no default branch.');await this.sync()}catch(e){this.token='';this.say(e.message);throw e}
 }
 disconnect(){this.epoch++;this.token='';this.pending=false;if(this.timer)root.clearTimeout(this.timer);this.timer=null;this.say('Disconnected. Existing words remain on this device and in GitHub.')}
 async sync(){
  if(!this.token)return;if(this.running){this.pending=true;return this.running}
  const epoch=this.epoch;this.pending=false;this.say('Syncing words and history with GitHub…');
  this.running=this.perform(epoch).catch(e=>{if(epoch===this.epoch){this.lastError=e.message;this.say('Not synced: '+e.message)}throw e}).finally(()=>{this.running=null;this.onStatus(this.status);if(this.pending&&this.token)this.schedule()});return this.running;
 }
 async perform(epoch){
  const metadata=await this.privateRepository();assert(metadata.default_branch===this.branch,'The repository branch changed. Disconnect and reconnect.');
  const path='/contents/'+FILE+'?ref='+encodeURIComponent(this.branch);
  for(let retry=0;retry<4;retry++){
   assert(epoch===this.epoch&&this.token,'Connection was closed.');const response=await this.api(path);let remote=null,sha=null;
   if(response.status!==404){assert(response.ok,'Could not read saved GitHub progress. Your local data is unchanged.');const file=await response.json();assert(file.encoding==='base64'&&typeof file.content==='string'&&file.size<=LIMIT,'The GitHub progress file is too large or unsupported. Your local data is unchanged.');const envelope=JSON.parse(unpack(file.content));assert(envelope.format===FORMAT&&envelope.version===1,'Unrecognized GitHub progress file. It was not overwritten.');remote=validate(envelope.state);sha=file.sha}
   const before=await this.store.read(),merged=merge(before,remote),uploaded=portable(merged);
   assert(epoch===this.epoch&&this.token,'Connection was closed.');
   if(!remote||stable(portable(remote))!==stable(uploaded)){
    // Recheck privacy immediately before every write.
    await this.privateRepository();assert(epoch===this.epoch&&this.token,'Connection was closed.');
    const text=stable({format:FORMAT,version:1,state:uploaded}),content=pack(text);assert(content.length*3/4<=LIMIT,'GitHub progress has reached this app’s 900 KB sync limit. Your changes remain local.');
    const result=await this.api('/contents/'+FILE,{method:'PUT',body:stable({message:'Sync English Training words and learning history [skip ci]',branch:this.branch,content,...(sha?{sha}:{})})});
    if(result.status===409||result.status===422){if(retry<3)continue;throw Error('Another device is saving. Wait a moment and press Sync now.')}
    assert(result.ok,'GitHub could not save your progress. Your changes remain on this device.');
   }
   assert(epoch===this.epoch&&this.token,'Connection was closed.');
   const confirmedAt=Date.now(),receipt={repository:this.repo,confirmedAt,words:Object.fromEntries(uploaded.words.map(w=>[w.id,stable([w.content,w.status,w.deletedAt,w.updatedAt])]))};
   const applied=await this.localTransact(current=>{const next=merge(current,merged);Object.keys(current).forEach(k=>delete current[k]);Object.assign(current,next)});
   if(stable(portable(applied.state))!==stable(uploaded))this.pending=true;
   this.lastError='';this.say('Synced with private GitHub · '+new Date().toLocaleTimeString());await this.onData(applied.state,receipt);return;
  }
 }
}
root.TrainingGitHub={GitHubSync,merge,validate,portable,pack,unpack,FILE,FORMAT};
})(globalThis);
