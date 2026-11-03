/* Shared content, safe upgrades and compatibility with the existing quiz/sync rules. */
(function(){
 const C=TrainingCore,V=TrainingVocabulary,D=TRAINING_DICTIONARY,G=TrainingGitHub,entries=TRAINING_VOCABULARY;
 const equal=(a,b)=>{if(JSON.stringify(a)!==JSON.stringify(b))throw Error('Values differ');};
 const ok=(value,message)=>{if(!value)throw Error(message||'Assertion failed');};
 const test=(name,run)=>{run();print('PASS '+name);};
 test('All 76 shared entries retain the complete bilingual schema',()=>{
  equal(entries.length,76);equal(new Set(entries.map(e=>C.norm(e.english_term))).size,76);
  equal(entries.reduce((n,e)=>n+e.examples.length,0),91);
  for(const content of entries){C.validate(content);equal(Object.keys(content),['english_term','russian_translations','explanation_en','explanation_ru','examples']);ok(C.resolve(content,D),'Unsupported supplied translations: '+content.english_term);}
  equal(entries[0].examples[0].en,'The region has an abundance of natural resources.');
  equal(entries.at(-1).english_term,'Without precedent');
 });
 test('Independent visitors receive identical ready vocabulary without imports or accounts',()=>{
  const a=C.initial(),b=C.initial();equal(V.seed(a),76);equal(V.seed(b),76);equal(a,b);
  equal(a.words.map(w=>w.content),entries);ok(a.words.every(w=>w.status==='ready'&&V.isShared(w)));
  equal(a.sessions,[]);equal(a.imports,[]);equal(Object.keys(a.learning).length,152);G.validate(a);
 });
 test('Upgrading preserves existing vocabulary, drafts, answers, settings and schedules',()=>{
  const s=C.initial(),existing=C.saveWord(s,{id:'existing',content:C.clone(entries[0])},'ready',1000);
  const q=C.start(s,'enRu',D,2000),x=q.questions[0];C.submit(s,q.id,x.id,x.correctID,2100);
  const draft=C.saveWord(s,{id:'draft',content:{...C.clone(entries[1]),english_term:' AFFIRMATION ',explanation_en:'My unfinished explanation'}},'draft',2200);
  const personal=C.saveWord(s,{id:'personal',content:C.clone(D.find(m=>m.id==='attempt').content)},'ready',2300);
  s.settings.folderName='My folder';s.imports.push({id:'previous-import',date:1000});
  const before=C.clone(s);equal(V.seed(s),74);
  equal(s.words.find(w=>w.id===existing.id),before.words[0]);equal(s.words.find(w=>w.id===draft.id),before.words[1]);equal(s.words.find(w=>w.id===personal.id),before.words[2]);
  equal(s.sessions,before.sessions);equal(s.scheduling,before.scheduling);equal(s.settings,before.settings);equal(s.imports,before.imports);
  for(const key of Object.keys(before.learning))equal(s.learning[key],before.learning[key]);
  equal(s.words.length,77);C.validateState(s);
 });
 test('Reloads never duplicate words, replace edits, undo renames or resurrect deletions',()=>{
  const s=C.initial();V.seed(s);const edited=s.words[0],renamed=s.words[1],removed=s.words[2];
  edited.content.explanation_en='My own notes';C.saveWord(s,edited,'ready',Date.now());
  renamed.content.english_term='My affirmation';C.saveWord(s,renamed,'ready',Date.now());C.deleteWord(s,removed.id);
  const before=C.clone(s);equal(V.seed(s),0);equal(s,before);ok(!V.isShared(edited));
 });
 test('Every supplied meaning completes a contextual quiz in both directions',()=>{
  for(const content of entries)for(const direction of ['enRu','ruEn']){
   const s=C.initial();C.saveWord(s,{content:C.clone(content)},'ready',1000);const q=C.start(s,direction,D,2000);
   for(let i=0;i<5;i++){const x=q.questions[q.currentIndex];C.submit(s,q.id,x.id,x.correctID,2100+i);if(i<4)C.next(s,q.id);}
   equal(q.status,'completed');equal(q.score,5);G.validate(s);
  }
 });
 test('Seeded vocabulary merges between devices without duplicates or lost progress',()=>{
  const a=C.initial(),b=C.initial();V.seed(a);V.seed(b);
  const q=C.start(a,'enRu',D,Date.now()),x=q.questions[0];C.submit(a,q.id,x.id,x.correctID);
  const merged=G.merge(a,b);equal(merged.words.length,76);equal(merged.syncConflicts,[]);equal(merged.sessions.length,1);equal(merged.sessions[0].answers,q.answers);
  equal(V.seed(merged),0);equal(G.merge(merged,b).words,merged.words);
 });
})();
