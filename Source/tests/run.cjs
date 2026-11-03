const fs=require('fs'),path=require('path'),vm=require('vm');
(async()=>{
 const root=path.resolve(__dirname,'..');let groups=0;const ctx=vm.createContext({console,TRAINING_VOCABULARY:JSON.parse(fs.readFileSync(path.join(root,'../data/vocabulary.json'),'utf8')),print(value){console.log(value);if(String(value).startsWith('PASS '))groups++},nativeEncode:text=>Array.from(Buffer.from(text,'utf8')),nativeDecode:values=>{try{return new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(values))}catch{return null}},setTimeout,clearTimeout,AbortController});
 for(const name of ['dictionary.js','core.js','vocabulary.js','github-sync.js','quick-clock.js','importer.js','tests/vocabulary-tests.js','tests/core-tests.js'])vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),ctx,{filename:name});
 const html=fs.readFileSync(path.join(root,'..','EnglishTraining.html'),'utf8');new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
 await vm.runInContext(fs.readFileSync(path.join(root,'tests/import-tests.js'),'utf8'),ctx,{filename:'tests/import-tests.js'});
 await vm.runInContext(fs.readFileSync(path.join(root,'tests/github-sync-tests.js'),'utf8'),ctx,{filename:'tests/github-sync-tests.js'});
 vm.runInContext(fs.readFileSync(path.join(root,'tests/quick-match-tests.js'),'utf8'),ctx,{filename:'tests/quick-match-tests.js',timeout:120000});
 if(ctx.QUICK_TEST_FAILURES||ctx.GITHUB_TEST_FAILURES||!ctx.ASYNC_DONE||ctx.TEST_FAILURES)throw Error('Application tests failed.');
 if(fs.readFileSync(path.join(root,'..','index.html'),'utf8')!==html)throw Error('GitHub Pages entry point differs from the selected app.');
 console.log('PASS Delivered HTML syntax and identical GitHub Pages entry point.');console.log('Total passing groups: '+groups);
})().catch(error=>{console.error(error);process.exitCode=1});
