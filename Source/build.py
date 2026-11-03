from pathlib import Path
import json
root=Path(__file__).resolve().parent
entries=json.loads((root.parent/'data/vocabulary.json').read_text(encoding='utf-8'))
vocabulary='globalThis.TRAINING_VOCABULARY = '+json.dumps(entries,ensure_ascii=False).replace('<',r'\u003c')+';'
script=vocabulary+'\n'+'\n'.join((root/name).read_text(encoding='utf-8') for name in ['dictionary.js','core.js','vocabulary.js','storage.js','github-sync.js','quick-clock.js','importer.js','app.js'])
assert '</script' not in script.lower()
html=(root/'template.html').read_text(encoding='utf-8').replace('__ENGLISH_STYLE__',(root/'style.css').read_text(encoding='utf-8')).replace('__ENGLISH_SCRIPT__',script)
(root/'dist').mkdir(exist_ok=True)
for output in [root/'dist/EnglishTraining.html',root.parent/'EnglishTraining.html',root.parent/'index.html']:output.write_text(html,encoding='utf-8')
print('Built the standalone English Training app.')
