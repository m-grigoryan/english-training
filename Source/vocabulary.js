/* Repository-owned vocabulary, bundled into the offline app by build.py. */
(function(root){
'use strict';
const C=root.TrainingCore,entries=root.TRAINING_VOCABULARY,byTerm=new Map();
// A fixed publication time keeps independently initialized devices identical.
const publishedAt=Date.UTC(2026,10,3);
if(!Array.isArray(entries)||!entries.length)throw Error('The shared vocabulary is missing. Rebuild the app.');
for(const content of entries){
 C.validate(content);
 const term=C.norm(content.english_term);
 if(byTerm.has(term))throw Error('Duplicate shared vocabulary term: '+content.english_term);
 byTerm.set(term,content);
 // Keep earlier accepted translations while supporting every supplied synonym.
 const matches=root.TRAINING_DICTIONARY.filter(m=>m.aliases.some(a=>C.norm(a)===term));
 if(matches.length!==1)throw Error('Shared vocabulary needs one supported meaning: '+content.english_term);
 const meaning=matches[0],previous=meaning.content.russian_translations;
 meaning.content=C.clone(content);
 const translations=new Set(content.russian_translations.map(C.norm));
 for(const text of previous)if(!translations.has(C.norm(text))){meaning.content.russian_translations.push(text);translations.add(C.norm(text));}
}
function seed(state){
 const ids=new Set(state.words.map(w=>w.id)),terms=new Set(state.words.map(w=>C.norm(w.content.english_term)));
 let added=0;
 for(const content of entries){
  const term=C.norm(content.english_term),id='bundled:'+encodeURIComponent(term);
  // Drafts, edits, renamed entries and deletion tombstones belong to the user.
  if(ids.has(id)||terms.has(term))continue;
  C.saveWord(state,{id,content:C.clone(content)},'ready',publishedAt);
  ids.add(id);terms.add(term);added++;
 }
 return added;
}
function isShared(word){
 const content=byTerm.get(C.norm(word.content.english_term));
 return word.status==='ready'&&word.deletedAt==null&&!!content&&Object.keys(content).every(key=>JSON.stringify(content[key])===JSON.stringify(word.content[key]));
}
root.TrainingVocabulary={seed,isShared};
})(globalThis);
