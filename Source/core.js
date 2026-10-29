/* English Training: pure, browser-independent domain rules. No network or DOM access. */
(function (root) {
'use strict';
const DAY=86400000, MAX_BYTES=1048576;
const norm=s=>String(s??'').trim().normalize('NFC').toLocaleLowerCase('en-US');
const clone=o=>JSON.parse(JSON.stringify(o));
const uid=()=>{const b=new Uint8Array(16); if(root.crypto?.getRandomValues)root.crypto.getRandomValues(b);else for(let i=0;i<16;i++)b[i]=Math.floor(Math.random()*256); b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const h=Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;};
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const blankContent=()=>({english_term:'',russian_translations:[],explanation_en:'',explanation_ru:'',examples:[]});
const initial=()=>({schema:1,revision:0,words:[],sessions:[],learning:{},scheduling:{},imports:[],settings:{folderName:''}});
const initialLearning=()=>({repetitions:0,intervalDays:0,ease:2.5,nextReview:null,lastPracticed:null,correctCount:0,incorrectCount:0,unknownCount:0});
function invalid(message,existingID){const e=new Error(message);e.existingID=existingID;throw e;}
function validate(c) {
 if(!c||typeof c!=='object'||Array.isArray(c))invalid('One JSON object is required per vocabulary entry.');
 const strings=['english_term','explanation_en','explanation_ru'];
 if(strings.some(k=>typeof c[k]!=='string')||!Array.isArray(c.russian_translations)||c.russian_translations.some(x=>typeof x!=='string')||!Array.isArray(c.examples)||c.examples.some(x=>!x||typeof x.en!=='string'||typeof x.ru!=='string'))invalid('Field types do not match the vocabulary JSON schema.');
 if(!norm(c.english_term))invalid('Enter an English word or phrase.');
 if(!c.russian_translations.length||c.russian_translations.some(x=>!norm(x)))invalid('Add at least one nonempty Russian translation.');
 if(!norm(c.explanation_en)||!norm(c.explanation_ru))invalid('Complete both English and Russian explanations.');
 if(!c.examples.length||c.examples.some(x=>!norm(x.en)||!norm(x.ru)))invalid('Add at least one complete bilingual example; finish both languages of every pair.');
 if(c.english_term.length>300||c.russian_translations.length>50||c.examples.length>50||c.explanation_en.length>20000||c.explanation_ru.length>20000||c.russian_translations.some(x=>x.length>1000)||c.examples.some(x=>x.en.length>10000||x.ru.length>10000))invalid('Entry exceeds the content limits. Shorten its text or reduce the number of examples/translations.');
 return true;
}
function trim(c){return {english_term:c.english_term.trim(),russian_translations:c.russian_translations.map(x=>x.trim()),explanation_en:c.explanation_en.trim(),explanation_ru:c.explanation_ru.trim(),examples:c.examples.map(x=>({en:x.en.trim(),ru:x.ru.trim()}))};}
function duplicate(state,term,excluding){const n=norm(term);return n?state.words.find(w=>w.deletedAt==null&&w.id!==excluding&&norm(w.content.english_term)===n):undefined;}
function saveWord(s,word,status,now=Date.now()) {
 if(!['draft','ready'].includes(status))invalid('Invalid vocabulary status.');
 const c=trim(word.content);
 if(status==='ready')validate(c);
 const existing=duplicate(s,c.english_term,word.id);
 if(existing)invalid('This English term already exists. Open the existing entry to edit its meaning.',existing.id);
 const old=s.words.find(w=>w.id===word.id);
 if(old&&old.deletedAt!=null)invalid('This entry was deleted. Create a new entry instead.');
 const w={id:old?.id||word.id||uid(),content:c,status,createdAt:old?.createdAt??now,updatedAt:now,deletedAt:null};
 if(old)s.words[s.words.indexOf(old)]=w;else s.words.push(w);
 for(const d of ['enRu','ruEn'])s.learning[`${w.id}:${d}`]??=initialLearning();
 return w;
}
function deleteWord(s,id,now=Date.now()){const w=s.words.find(w=>w.id===id);if(w){w.deletedAt=now;w.updatedAt=now;}}
function resolve(c,dictionary){const ru=new Set(c.russian_translations.map(norm));const found=dictionary.filter(m=>m.aliases.map(norm).includes(norm(c.english_term))&&ru.size&&[...ru].every(t=>m.content.russian_translations.map(norm).includes(t)));return found.length===1?found[0]:null;}
function hideAnswers(sentence,aliases){let text=sentence;for(const a of aliases.slice().sort((a,b)=>b.length-a.length)){if(!a.trim())continue;const escaped=a.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const re=new RegExp('(^|[^\\p{L}\\p{N}])('+escaped+')(?=$|[^\\p{L}\\p{N}])','giu');text=text.replace(re,(_,prefix)=>prefix+'____');}return text;}
function makeChoice(c,meaningID,d,example){return {id:uid(),label:d==='enRu'?c.russian_translations.join('; '):c.english_term,definition:d==='enRu'?c.explanation_ru:c.explanation_en,example:d==='enRu'?example.ru:example.en,meaningID};}
function generate(s,d,dictionary,now=Date.now()){
 if(!['enRu','ruEn'].includes(d))invalid('Choose a quiz direction.');
 const words=shuffle(s.words.filter(w=>w.deletedAt==null&&w.status==='ready'));
 if(!words.length)invalid('Add a ready word before starting a quiz.');
 const rank=w=>{const l=s.learning[`${w.id}:${d}`]||initialLearning();return l.lastPracticed===null?0:(l.nextReview??0)<=now?1:2;};
 words.sort((a,b)=>{const ra=rank(a),rb=rank(b);if(ra!==rb)return ra-rb;if(ra===1){const x=s.learning[`${a.id}:${d}`],y=s.learning[`${b.id}:${d}`];return (y.incorrectCount+y.unknownCount)-(x.incorrectCount+x.unknownCount)||(x.nextReview??0)-(y.nextReview??0);}return 0;});
 const selected=words.slice(0,5),questions=[];
 for(let i=0;i<5;i++){
  const w=selected[i%selected.length],c=w.content;validate(c);const sense=resolve(c,dictionary);
  if(!sense)invalid(`Cannot verify a safe offline quiz for “${c.english_term}”. Check Supported Meanings in Settings and the stored Russian translations. Your entry is saved; no quiz has been created.`);
  const en=new Set(sense.aliases.map(norm)),ru=new Set(sense.content.russian_translations.map(norm));
  const safe=dictionary.filter(m=>m.id!==sense.id&&m.partOfSpeech===sense.partOfSpeech&&!sense.conflicts.includes(m.id)&&!m.conflicts.includes(sense.id)&&!m.aliases.some(a=>en.has(norm(a)))&&!m.content.russian_translations.some(a=>ru.has(norm(a))));
  let question=null;
  for(let attempt=0;attempt<12&&!question;attempt++){
   const candidates=[...shuffle(safe.filter(m=>m.family===sense.family)),...shuffle(safe.filter(m=>m.family!==sense.family))].slice(0,4);
   if(candidates.length!==4)continue;
   const example=c.examples[(i+attempt)%c.examples.length],feedback=c.examples.length>1?c.examples[(i+attempt+1)%c.examples.length]:example;
   const correct=makeChoice(c,sense.id,d,feedback),choices=shuffle([correct,...candidates.map(m=>makeChoice(m.content,m.id,d,m.content.examples[0]))]);
   if(new Set(choices.map(x=>norm(x.label))).size!==5||new Set(choices.map(x=>x.meaningID)).size!==5)continue;
   question={id:uid(),wordID:w.id,prompt:d==='enRu'?c.english_term:c.russian_translations.join('; '),context:hideAnswers(d==='enRu'?example.en:example.ru,d==='enRu'?sense.content.russian_translations:sense.aliases),choices,correctID:correct.id};
  }
  if(!question)invalid(`Could not generate five unambiguous choices for “${c.english_term}” after 12 attempts. Edit its meaning or examples.`);
  questions.push(question);
 }
 return shuffle(questions);
}
function start(s,d,dictionary,now=Date.now()){const active=s.sessions.find(x=>x.status==='in_progress');if(active)return active;const questions=generate(s,d,dictionary,now);const session={id:uid(),direction:d,status:'in_progress',startedAt:now,completedAt:null,currentIndex:0,questions,answers:[],score:0};s.sessions.push(session);return session;}
function schedule(previous,outcomes,now){const s=clone(previous);for(const o of outcomes)s[o==='correct'?'correctCount':o==='incorrect'?'incorrectCount':'unknownCount']++;if(outcomes.every(o=>o==='correct')){s.repetitions++;s.intervalDays=s.repetitions===1?1:s.repetitions===2?6:Math.max(1,Math.round(s.intervalDays*s.ease));}else{s.repetitions=0;s.ease=Math.max(1.3,s.ease-0.2);s.intervalDays=1;}s.lastPracticed=now;s.nextReview=now+s.intervalDays*DAY;return s;}
function submit(s,id,qid,selectedID,now=Date.now()){
 const quiz=s.sessions.find(x=>x.id===id);if(!quiz)invalid('Quiz not found.');
 if(quiz.answers.some(a=>a.questionID===qid))return quiz;
 const q=quiz.questions[quiz.currentIndex];if(quiz.status!=='in_progress'||q.id!==qid)invalid('This is not the current question.');
 const chosen=q.choices.find(x=>x.id===selectedID),correct=q.choices.find(x=>x.id===q.correctID);
 if(selectedID!==null&&!chosen)invalid('Select one of the saved answer choices.');
 const outcome=selectedID===null?'unknown':selectedID===q.correctID?'correct':'incorrect';
 quiz.answers.push({questionID:qid,selectedID,outcome,submittedAt:now,correctFeedback:clone(correct),selectedFeedback:chosen?clone(chosen):null});
 if(quiz.answers.length===5){
  for(const wordID of new Set(quiz.questions.map(q=>q.wordID))){
   const key=`${id}:${wordID}:${quiz.direction}`;if(s.scheduling[key])continue;
   const ids=new Set(quiz.questions.filter(q=>q.wordID===wordID).map(q=>q.id)),outcomes=quiz.answers.filter(a=>ids.has(a.questionID)).map(a=>a.outcome),lk=`${wordID}:${quiz.direction}`;
   s.learning[lk]=schedule(s.learning[lk]||initialLearning(),outcomes,now);s.scheduling[key]={sessionID:id,wordID,direction:quiz.direction,appliedAt:now};
  }
  quiz.status='completed';quiz.completedAt=now;quiz.score=quiz.answers.filter(a=>a.outcome==='correct').length;
 }
 return quiz;
}
function next(s,id){const q=s.sessions.find(x=>x.id===id);if(!q)invalid('Quiz not found.');if(q.status==='completed')return q;if(!q.answers.some(a=>a.questionID===q.questions[q.currentIndex].id))invalid('Apply a response before continuing.');q.currentIndex=Math.min(4,q.currentIndex+1);return q;}
function parseJSON(text,bytes){if(bytes>MAX_BYTES)invalid('File exceeds 1 MiB. Use one vocabulary entry per file.');let c;try{c=JSON.parse(text);}catch{invalid('Malformed or incomplete JSON. Finish the temporary file before renaming it to .json.');}const keys=['english_term','russian_translations','explanation_en','explanation_ru','examples'];if(!c||typeof c!=='object'||Array.isArray(c)||Object.keys(c).sort().join('|')!==keys.sort().join('|')||!Array.isArray(c.examples)||c.examples.some(x=>!x||Object.keys(x).sort().join('|')!=='en|ru'))invalid('JSON must contain exactly english_term, russian_translations, explanation_en, explanation_ru, and examples with en/ru pairs.');validate(c);return trim(c);}
function recordImport(s,path,hash,status,message,wordID=null,now=Date.now()){let r=s.imports.find(x=>x.path===path&&x.hash===hash&&x.status===status);if(!r){r={id:uid(),path,hash,status};s.imports.push(r);}Object.assign(r,{message,wordID,date:now});}
function importContent(s,c,path,hash,now=Date.now()){if(s.imports.some(r=>r.hash===hash&&r.status==='success'))return null;validate(c);const word=saveWord(s,{content:c},'ready',now);recordImport(s,path,hash,'success',`Imported ${word.content.english_term}.`,word.id,now);return word;}
function validateState(s){if(s.schema!==1||!Array.isArray(s.words)||!Array.isArray(s.sessions)||!s.learning||!s.scheduling)invalid('Stored data format is not supported. Use the original browser profile or a compatible app version.');const terms=new Set();for(const w of s.words.filter(w=>!w.deletedAt)){const n=norm(w.content.english_term);if(n&&terms.has(n))invalid('Duplicate active vocabulary detected; no changes were saved.');if(n)terms.add(n);}for(const q of s.sessions){if(q.questions.length!==5||q.questions.some(x=>x.choices.length!==5||!x.choices.some(c=>c.id===x.correctID)))invalid('Saved quiz is invalid. No questions were regenerated.');if(new Set(q.answers.map(x=>x.questionID)).size!==q.answers.length)invalid('Duplicate saved answer.');}}
root.TrainingCore={DAY,MAX_BYTES,norm,clone,uid,shuffle,blankContent,initial,initialLearning,validate,saveWord,deleteWord,duplicate,resolve,hideAnswers,generate,start,schedule,submit,next,parseJSON,recordImport,importContent,validateState};
})(globalThis);
